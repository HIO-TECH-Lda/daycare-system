import mongoose, { Document, Schema } from 'mongoose';

interface ICounter extends Document {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

export default mongoose.model<ICounter>('Counter', counterSchema);
