import PickupPerson, { IPickupPersonDocument } from '../models/PickupPerson';
import mongoose from 'mongoose';

export class PickupPersonService {
  static async create(data: {
    child_id: string;
    name: string;
    relationship?: string;
    phone: string;
    email?: string;
    id_document?: string;
    photo_url?: string;
    is_authorized?: boolean;
  }): Promise<IPickupPersonDocument> {
    const pickupPersonData = {
      ...data,
      child_id: new mongoose.Types.ObjectId(data.child_id)
    };
    const pickupPerson = await PickupPerson.create(pickupPersonData);
    return await pickupPerson.populate('child_id', 'name birth_date');
  }

  static async findByChildId(childId: string): Promise<IPickupPersonDocument[]> {
    return await PickupPerson.find({ child_id: new mongoose.Types.ObjectId(childId) })
      .populate('child_id', 'name birth_date')
      .sort({ is_authorized: -1, name: 1 });
  }

  static async findById(id: string): Promise<IPickupPersonDocument | null> {
    return await PickupPerson.findById(id)
      .populate('child_id', 'name birth_date parent_id');
  }

  static async update(id: string, data: Partial<{
    name: string;
    relationship: string;
    phone: string;
    email: string;
    id_document: string;
    photo_url: string;
    is_authorized: boolean;
  }>): Promise<IPickupPersonDocument | null> {
    return await PickupPerson.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    }).populate('child_id', 'name birth_date');
  }

  static async delete(id: string): Promise<IPickupPersonDocument | null> {
    return await PickupPerson.findByIdAndDelete(id);
  }

  static async findAll(childId?: string, page = 1, limit = 20): Promise<{ pickupPersons: IPickupPersonDocument[]; total: number }> {
    const query = childId ? { child_id: new mongoose.Types.ObjectId(childId) } : {};
    const skip = (page - 1) * limit;
    const [pickupPersons, total] = await Promise.all([
      PickupPerson.find(query)
        .populate('child_id', 'name birth_date')
        .sort({ is_authorized: -1, name: 1 })
        .skip(skip)
        .limit(limit),
      PickupPerson.countDocuments(query)
    ]);
    return { pickupPersons, total };
  }
}
