import mongoose from 'mongoose';
import Enrollment, { IEnrollmentDocument, EnrollmentStatus } from '../models/Enrollment';
import Counter from '../models/Counter';
import Class from '../models/Class';
import Child, { IChildDocument } from '../models/Child';
import Guardian from '../models/Guardian';
import PickupPerson from '../models/PickupPerson';
import User, { IUserDocument } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { withTransaction } from '../utils/transaction';
import { runInBackground } from '../utils/background';
import { Delivery, NotificationService } from './notificationService';
import { UserService } from './userService';
import { setWhatsAppConsent } from './authService';

const OPEN: EnrollmentStatus[] = ['submitted', 'under_review'];

const Msg = {
  NOT_FOUND: 'Pedido de matrícula não encontrado',
  CLOSED: 'Este pedido já foi decidido e não pode ser alterado',
  CLASS_NOT_FOUND: 'Turma não encontrada',
  CLASS_FULL: 'A turma está completa. Escolha outra turma ou confirme que quer ultrapassar a capacidade.',
  CONTACT_CONFLICT: 'O telefone e o email do encarregado pertencem a contas diferentes. Corrija o pedido.',
  CONTACT_NOT_PARENT: 'O contacto do encarregado pertence a uma conta de staff ou administração. Corrija o pedido.'
};

type SubmitData = Pick<IEnrollmentDocument,
  'child' | 'guardians' | 'pickup_persons' | 'consents' | 'notes' | 'signature' | 'requested_start_date'
> & { requested_class_id?: string };

export interface ApprovalResult {
  enrollment: IEnrollmentDocument;
  child: IChildDocument;
  parent: { id: string; created: boolean };
  /** Present when a parent account was created: the link to share if `delivery` shows nothing went out */
  inviteLink?: string;
  delivery?: Delivery;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export class EnrollmentService {
  /** MAT-2026-0001, numbered per year. */
  static async nextReference(): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await Counter.findOneAndUpdate(
      { _id: `enrollment-${year}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return `MAT-${year}-${String(counter!.seq).padStart(4, '0')}`;
  }

  /** New request, from the public form or an admin. Sends the family a confirmation after the response. */
  static async submit(data: SubmitData, submittedBy?: string): Promise<IEnrollmentDocument> {
    const enrollment = await Enrollment.create({
      ...data,
      reference: await this.nextReference(),
      source: submittedBy ? 'admin' : 'public',
      submitted_by: submittedBy
    });

    const guardian = enrollment.guardians[0];
    runInBackground('enrollment received', () => NotificationService.enrollmentReceived({
      email: guardian.email,
      whatsappPhone: enrollment.consents.whatsapp_opt_in ? guardian.phone : undefined,
      guardianName: guardian.name,
      childName: enrollment.child.name,
      reference: enrollment.reference
    }));

    return enrollment;
  }

  static async list(status: EnrollmentStatus | undefined, page = 1, limit = 20) {
    const query = status ? { status } : {};
    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .populate('requested_class_id', 'name')
        .populate('assigned_class_id', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Enrollment.countDocuments(query)
    ]);
    return { enrollments, total };
  }

  static async findById(id: string): Promise<IEnrollmentDocument> {
    const enrollment = await Enrollment.findById(id)
      .populate('requested_class_id', 'name')
      .populate('assigned_class_id', 'name')
      .populate('reviewed_by', 'firstName lastName');
    if (!enrollment) throw new ApiError(404, Msg.NOT_FOUND);
    return enrollment;
  }

  private static async findOpen(id: string): Promise<IEnrollmentDocument> {
    const enrollment = await Enrollment.findById(id);
    if (!enrollment) throw new ApiError(404, Msg.NOT_FOUND);
    if (!OPEN.includes(enrollment.status)) throw new ApiError(409, Msg.CLOSED);
    return enrollment;
  }

  /** Admin corrections while the request is open (and moving it to "under review"). */
  static async update(id: string, data: Partial<SubmitData> & { status?: 'under_review' }, adminId: string): Promise<IEnrollmentDocument> {
    const enrollment = await this.findOpen(id);
    enrollment.set(data);
    if (data.status === 'under_review') enrollment.reviewed_by = new mongoose.Types.ObjectId(adminId);
    await enrollment.save();
    return enrollment;
  }

  static async reject(id: string, reason: string, adminId: string): Promise<IEnrollmentDocument> {
    const enrollment = await this.findOpen(id);
    enrollment.status = 'rejected';
    enrollment.rejection_reason = reason;
    enrollment.reviewed_by = new mongoose.Types.ObjectId(adminId);
    enrollment.reviewed_at = new Date();
    await enrollment.save();
    return enrollment;
  }

  /**
   * The parent account for the main guardian: an existing account with the same phone or email
   * (a family enrolling a second child), or null when one must be created.
   */
  private static async existingParent(guardian: { phone?: string; email?: string }): Promise<IUserDocument | null> {
    const conditions = [
      ...(guardian.phone ? [{ phone: guardian.phone }] : []),
      ...(guardian.email ? [{ email: guardian.email }] : [])
    ];
    const matches = await User.find({ $or: conditions });
    if (matches.length > 1) throw new ApiError(409, Msg.CONTACT_CONFLICT);
    if (matches[0] && matches[0].role !== 'responsavel') throw new ApiError(409, Msg.CONTACT_NOT_PARENT);
    return matches[0] ?? null;
  }

  /**
   * Approve: in one transaction, create (or link) the parent account, the child, the guardians and
   * the pickup persons, and close the request. Messages go out only after everything is saved.
   */
  static async approve(
    id: string,
    options: { class_id: string; start_date?: Date; override_capacity?: boolean },
    adminId: string
  ): Promise<ApprovalResult> {
    const enrollment = await this.findOpen(id);
    const klass = await Class.findById(options.class_id);
    if (!klass) throw new ApiError(404, Msg.CLASS_NOT_FOUND);
    if (!options.override_capacity && (await Child.countDocuments({ class_id: klass._id })) >= klass.capacity) {
      throw new ApiError(409, Msg.CLASS_FULL);
    }

    const [main, ...others] = enrollment.guardians;
    const existing = await this.existingParent(main);
    const startDate = options.start_date ?? enrollment.requested_start_date ?? new Date();

    let inviteToken: string | undefined;
    const { child, parent } = await withTransaction(async (session) => {
      let parent = existing ? await User.findById(existing._id).session(session ?? null) : null;
      if (!parent) {
        const [firstName, ...rest] = main.name.trim().split(/\s+/);
        parent = new User({
          firstName,
          lastName: rest.join(' ') || firstName,
          email: main.email,
          phone: main.phone,
          role: 'responsavel',
          status: 'invited',
          invitedBy: adminId
        });
        setWhatsAppConsent(parent, enrollment.consents.whatsapp_opt_in);
        inviteToken = UserService.prepareInvite(parent);
        await parent.save({ session });
      }

      const [child] = await Child.create([{
        ...enrollment.toObject().child,
        class_id: klass._id,
        parent_id: parent._id,
        image_usage_authorized: enrollment.consents.image_usage_authorized,
        enrollment_signature: enrollment.signature,
        enrollment_date: startDate
      }], { session });

      await Guardian.create(
        [main, ...others].map((g, index) => ({
          child_id: child._id,
          name: g.name,
          relationship: g.relationship,
          phone: g.phone,
          email: g.email,
          profession: g.profession,
          workplace: g.workplace,
          address: g.address,
          guardian_type: index === 0 ? 1 : 2
        })),
        { session, ordered: true }
      );

      if (enrollment.pickup_persons.length > 0) {
        await PickupPerson.create(
          enrollment.pickup_persons.map((p) => ({
            child_id: child._id,
            name: p.name,
            relationship: p.relationship,
            phone: p.phone,
            id_document: p.id_document,
            is_authorized: true
          })),
          { session, ordered: true }
        );
      }

      enrollment.status = 'approved';
      enrollment.assigned_class_id = klass._id as mongoose.Types.ObjectId;
      enrollment.child_id = child._id as mongoose.Types.ObjectId;
      enrollment.parent_user_id = parent._id as mongoose.Types.ObjectId;
      enrollment.reviewed_by = new mongoose.Types.ObjectId(adminId);
      enrollment.reviewed_at = new Date();
      await enrollment.save({ session });

      return { child, parent };
    });

    // After the commit: the account invite (new parents) is awaited so the admin sees how it went;
    // the approval message goes out in the background
    const invite = inviteToken ? await UserService.sendInvite(parent, inviteToken) : undefined;
    runInBackground('enrollment approved', () => NotificationService.enrollmentApproved({
      email: main.email,
      whatsappPhone: enrollment.consents.whatsapp_opt_in ? main.phone : undefined,
      guardianName: main.name,
      childName: child.name,
      className: klass.name,
      startDate: formatDate(startDate)
    }));

    return {
      enrollment,
      child,
      parent: { id: String(parent._id), created: !!inviteToken },
      ...(invite && { inviteLink: invite.inviteLink, delivery: invite.delivery })
    };
  }
}
