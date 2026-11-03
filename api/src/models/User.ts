import mongoose, { Document, Schema } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { IUser } from '../types';
import { normalisePhone } from '../utils/phone';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  fullName: string;
}

const userSchema = new Schema<IUserDocument>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    // A user has an email, a phone number, or both (checked in pre('validate')); either can be used to log in
    email: {
      type: String,
      set: (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined),
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Email inválido']
    },
    password: {
      type: String,
      // Invited users have no password until they accept the invite
      required: [
        function (this: IUserDocument) { return this.status !== 'invited'; },
        'Password is required'
      ],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false
    },
    role: {
      type: String,
      enum: ['responsavel', 'staff', 'administrador'],
      default: 'responsavel'
    },
    // Stored in E.164 format (+258841234567); unparseable input is kept as typed so validation reports it
    phone: {
      type: String,
      set: (value: unknown) => {
        if (typeof value !== 'string' || !value.trim()) return undefined;
        return normalisePhone(value) ?? value.trim();
      },
      validate: {
        validator: (value?: string) => !value || /^\+[1-9]\d{7,14}$/.test(value),
        message: 'Número de telefone inválido'
      }
    },
    status: {
      type: String,
      enum: ['invited', 'active', 'inactive', 'suspended'],
      default: 'active'
    },
    emailVerified: { type: Boolean, default: false },
    avatar: { type: String, default: null },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    inviteTokenHash: { type: String, select: false },
    inviteExpires: { type: Date, select: false },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    invitedAt: { type: Date },
    activatedAt: { type: Date },
    whatsappOptIn: { type: Boolean, default: false },
    whatsappOptInAt: { type: Date },
    notificationPrefs: { type: Schema.Types.Mixed, default: undefined },
    // Bumped on password change/reset: tokens issued with an older version stop working
    tokenVersion: { type: Number, default: 0 }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Unique when present; users without an email (or phone) don't collide with each other
userSchema.index({ email: 1 }, { unique: true, name: 'email_unique_if_set', partialFilterExpression: { email: { $gt: '' } } });
userSchema.index({ phone: 1 }, { unique: true, name: 'phone_unique_if_set', partialFilterExpression: { phone: { $gt: '' } } });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.pre('validate', function (next) {
  if (!this.email && !this.phone) {
    this.invalidate('email', 'Indique um email ou um número de telefone');
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.inviteTokenHash;
  delete obj.inviteExpires;
  return obj;
};

export default mongoose.model<IUserDocument>('User', userSchema);
