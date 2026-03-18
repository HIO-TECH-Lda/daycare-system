-- Migration: Create monthly reports table
-- Monthly reports track child progress over a month and require admin validation before parents can view them

-- Create monthly_reports table
CREATE TABLE IF NOT EXISTS monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  report_month integer NOT NULL CHECK (report_month >= 1 AND report_month <= 12),
  report_year integer NOT NULL,
  -- Development areas
  physical_development text DEFAULT '',
  cognitive_development text DEFAULT '',
  social_development text DEFAULT '',
  emotional_development text DEFAULT '',
  -- General information
  general_notes text DEFAULT '',
  achievements text DEFAULT '',
  areas_for_improvement text DEFAULT '',
  -- Status and validation
  status text NOT NULL CHECK (status IN ('draft', 'submitted', 'validated', 'rejected')) DEFAULT 'draft',
  created_by uuid REFERENCES users(id) NOT NULL,
  validated_by uuid REFERENCES users(id),
  validated_at timestamptz,
  rejection_reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(child_id, report_month, report_year)
);

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_monthly_reports_child_month_year ON monthly_reports(child_id, report_year, report_month);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_status ON monthly_reports(status);

-- RLS Policies for monthly_reports

-- Staff can create and edit their own reports
CREATE POLICY "Staff can create monthly reports"
  ON monthly_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'staff'
      AND users.id = monthly_reports.created_by
    )
  );

CREATE POLICY "Staff can update own draft reports"
  ON monthly_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'staff'
      AND users.id = monthly_reports.created_by
      AND monthly_reports.status IN ('draft', 'rejected')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'staff'
      AND users.id = monthly_reports.created_by
    )
  );

CREATE POLICY "Staff can read assigned children reports"
  ON monthly_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children c
      JOIN staff_classes sc ON c.class_id = sc.class_id
      WHERE c.id = monthly_reports.child_id AND sc.staff_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'staff'
      AND users.id = monthly_reports.created_by
    )
  );

-- Admins can read and validate all reports
CREATE POLICY "Admins can read all monthly reports"
  ON monthly_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

CREATE POLICY "Admins can validate reports"
  ON monthly_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

-- Parents can only read validated reports for their children
CREATE POLICY "Parents can read validated reports"
  ON monthly_reports FOR SELECT
  TO authenticated
  USING (
    monthly_reports.status = 'validated'
    AND EXISTS (
      SELECT 1 FROM children 
      WHERE children.id = monthly_reports.child_id 
      AND children.parent_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monthly_reports_timestamp
  BEFORE UPDATE ON monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_reports_updated_at();

