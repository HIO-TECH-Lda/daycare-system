-- Migration: Create payments table for tracking payment records
-- Payments are recorded manually when received via traditional methods (cash, bank transfer, etc.)

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES users(id) NOT NULL,
  child_id uuid REFERENCES children(id) NOT NULL,
  amount decimal(10,2) NOT NULL,
  payment_date date NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'mobile_money', 'other')),
  payment_method_details text DEFAULT '', -- Additional details like bank name, reference number, etc.
  reference_number text DEFAULT '', -- Transaction reference, receipt number, etc.
  notes text DEFAULT '',
  recorded_by uuid REFERENCES users(id) NOT NULL, -- Admin who recorded the payment
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_parent ON payments(parent_id);
CREATE INDEX IF NOT EXISTS idx_payments_child ON payments(child_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- Update invoices table to track payment status better
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS paid_amount decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_date date;

-- Function to update invoice status when payment is recorded
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update invoice paid amount and last payment date
  UPDATE invoices
  SET 
    paid_amount = COALESCE(paid_amount, 0) + NEW.amount,
    last_payment_date = NEW.payment_date,
    status = CASE 
      WHEN COALESCE(paid_amount, 0) + NEW.amount >= amount THEN 'pago'
      ELSE 'pendente'
    END
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_payment_status
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_on_payment();

-- RLS Policies for payments

-- Admins can manage all payments
CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

-- Parents can read payments for their own invoices
CREATE POLICY "Parents can read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    parent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = payments.invoice_id 
      AND invoices.parent_id = auth.uid()
    )
  );

-- Staff can read payments (for reporting purposes)
CREATE POLICY "Staff can read payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'staff'
    )
  );

