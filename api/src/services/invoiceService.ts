import Invoice, { IInvoiceDocument } from '../models/Invoice';
import Counter from '../models/Counter';
import mongoose from 'mongoose';

export class InvoiceService {
  static async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const counterId = `invoice_${year}`;
    const counter = await Counter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    return `INV-${year}-${String(counter.seq).padStart(4, '0')}`;
  }

  static async create(data: {
    child_id: string;
    parent_id: string;
    issue_date?: Date | string;
    due_date: Date | string;
    amount: number;
    items: Array<{
      description: string;
      quantity?: number;
      unit_price: number;
      total: number;
    }>;
    notes?: string;
    created_by: string;
  }): Promise<IInvoiceDocument> {
    const invoiceNumber = await this.generateInvoiceNumber();
    const invoiceData: any = {
      ...data,
      invoice_number: invoiceNumber,
      child_id: new mongoose.Types.ObjectId(data.child_id),
      parent_id: new mongoose.Types.ObjectId(data.parent_id),
      created_by: new mongoose.Types.ObjectId(data.created_by),
      due_date: typeof data.due_date === 'string' ? new Date(data.due_date) : data.due_date
    };
    if (data.issue_date) {
      invoiceData.issue_date = typeof data.issue_date === 'string' ? new Date(data.issue_date) : data.issue_date;
    }
    const invoice = await Invoice.create(invoiceData);
    await invoice.populate([
      { path: 'child_id', select: 'name birth_date' },
      { path: 'parent_id', select: 'firstName lastName email' },
      { path: 'created_by', select: 'firstName lastName' }
    ]);
    return invoice;
  }

  static async findAll(parentId?: string, status?: string, page = 1, limit = 20): Promise<{ invoices: IInvoiceDocument[]; total: number }> {
    const query: any = {};
    if (parentId) query.parent_id = new mongoose.Types.ObjectId(parentId);
    if (status) query.status = status;
    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('child_id', 'name birth_date')
        .populate('parent_id', 'firstName lastName email')
        .populate('created_by', 'firstName lastName')
        .sort({ issue_date: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(query)
    ]);
    return { invoices, total };
  }

  static async findById(id: string): Promise<IInvoiceDocument | null> {
    return await Invoice.findById(id)
      .populate('child_id', 'name birth_date')
      .populate('parent_id', 'firstName lastName email phone')
      .populate('created_by', 'firstName lastName');
  }

  static async update(id: string, data: Partial<any>): Promise<IInvoiceDocument | null> {
    const updateData: any = { ...data };
    if (data.due_date && typeof data.due_date === 'string') {
      updateData.due_date = new Date(data.due_date);
    }
    return await Invoice.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('child_id', 'name birth_date')
      .populate('parent_id', 'firstName lastName email')
      .populate('created_by', 'firstName lastName');
  }

  static async delete(id: string): Promise<IInvoiceDocument | null> {
    return await Invoice.findByIdAndDelete(id);
  }

  static async updateStatus(id: string, status: 'pending' | 'paid' | 'overdue' | 'cancelled'): Promise<IInvoiceDocument | null> {
    return await Invoice.findByIdAndUpdate(id, { status }, { new: true });
  }
}
