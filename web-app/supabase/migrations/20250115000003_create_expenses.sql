-- Migration: Create expenses table for tracking childcare center expenses
-- Expenses track all costs related to maintaining and operating the childcare center

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Insert default categories
INSERT INTO expense_categories (name, description) VALUES
  ('Salários', 'Salários e benefícios do staff'),
  ('Alimentação', 'Compras de alimentos e merenda'),
  ('Material Escolar', 'Material pedagógico e didático'),
  ('Limpeza', 'Produtos de limpeza e higiene'),
  ('Manutenção', 'Reparos e manutenção de equipamentos e instalações'),
  ('Utilidades', 'Água, luz, internet, telefone'),
  ('Transporte', 'Combustível e manutenção de veículos'),
  ('Segurança', 'Seguros e segurança'),
  ('Outros', 'Outras despesas')
ON CONFLICT (name) DO NOTHING;

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES expense_categories(id) NOT NULL,
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  expense_date date NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'mobile_money', 'other')),
  payment_method_details text DEFAULT '',
  reference_number text DEFAULT '',
  supplier_name text DEFAULT '',
  notes text DEFAULT '',
  receipt_url text DEFAULT '', -- For storing receipt images/documents
  recorded_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_recorded_by ON expenses(recorded_by);

-- RLS Policies for expenses

-- Only admins can manage expenses
CREATE POLICY "Admins can manage expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

-- Staff can read expenses (for reporting purposes)
CREATE POLICY "Staff can read expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('staff', 'administrador')
    )
  );

-- RLS Policies for expense_categories
CREATE POLICY "Everyone can read categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

