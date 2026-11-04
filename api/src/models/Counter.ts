import mongoose, { Document, Schema } from 'mongoose';

// Counters are keyed by name (e.g. 'enrollment-2026'), not ObjectId
interface ICounter extends Document<string> {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

export default mongoose.model<ICounter>('Counter', counterSchema);
