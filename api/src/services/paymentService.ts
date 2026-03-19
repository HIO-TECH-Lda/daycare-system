import Payment, { IPaymentDocument } from '../models/Payment';
import { InvoiceService } from './invoiceService';
import mongoose from 'mongoose';

export class PaymentService {
  static async create(data: {
    invoice_id?: string;
    parent_id: string;
    child_id: string;
    amount: number;
    payment_date?: Date | string;
    payment_method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'mobile_money' | 'other';
    payment_method_details?: string;
    reference_number?: string;
    notes?: string;
    recorded_by: string;
  }): Promise<IPaymentDocument> {
    const paymentData: any = {
      ...data,
      parent_id: new mongoose.Types.ObjectId(data.parent_id),
      child_id: new mongoose.Types.ObjectId(data.child_id),
      recorded_by: new mongoose.Types.ObjectId(data.recorded_by)
    };
    if (data.invoice_id) {
      paymentData.invoice_id = new mongoose.Types.ObjectId(data.invoice_id);
    }
    if (data.payment_date) {
      paymentData.payment_date = typeof data.payment_date === 'string' ? new Date(data.payment_date) : data.payment_date;
    }
    const payment = await Payment.create(paymentData);
    
    // Update invoice status if fully paid
    if (data.invoice_id) {
      const invoice = await InvoiceService.findById(data.invoice_id);
      if (invoice) {
        const totalPaid = await this.getTotalPaidForInvoice(data.invoice_id);
        if (totalPaid >= invoice.amount) {
          await InvoiceService.updateStatus(data.invoice_id, 'paid');
        }
      }
    }
    
    await payment.populate([
      { path: 'invoice_id', select: 'invoice_number amount status' },
      { path: 'parent_id', select: 'firstName lastName email' },
      { path: 'child_id', select: 'name birth_date' },
      { path: 'recorded_by', select: 'firstName lastName' }
    ]);
    return payment;
  }

  static async findByInvoiceId(invoiceId: string): Promise<IPaymentDocument[]> {
    return await Payment.find({ invoice_id: new mongoose.Types.ObjectId(invoiceId) })
      .populate('recorded_by', 'firstName lastName')
      .sort({ payment_date: -1 });
  }

  static async findById(id: string): Promise<IPaymentDocument | null> {
    return await Payment.findById(id)
      .populate('invoice_id', 'invoice_number amount status child_id parent_id')
      .populate('recorded_by', 'firstName lastName');
  }

  static async getTotalPaidForInvoice(invoiceId: string): Promise<number> {
    const result = await Payment.aggregate([
      { $match: { invoice_id: new mongoose.Types.ObjectId(invoiceId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    return result.length > 0 ? result[0].total : 0;
  }

  static async findAll(startDate?: Date, endDate?: Date, page = 1, limit = 20): Promise<{ payments: IPaymentDocument[]; total: number }> {
    const query: any = {};
    if (startDate || endDate) {
      query.payment_date = {};
      if (startDate) query.payment_date.$gte = startDate;
      if (endDate) query.payment_date.$lte = endDate;
    }
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('invoice_id', 'invoice_number amount status')
        .populate('recorded_by', 'firstName lastName')
        .sort({ payment_date: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(query)
    ]);
    return { payments, total };
  }

  static async delete(id: string): Promise<IPaymentDocument | null> {
    return await Payment.findByIdAndDelete(id);
  }
}
