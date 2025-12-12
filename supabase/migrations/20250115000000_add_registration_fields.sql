-- Migration: Add comprehensive registration fields based on enrollment questionnaire
-- This migration extends the children table and creates new tables for guardians and documents

-- Add new fields to children table
ALTER TABLE children 
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Masculino', 'Feminino')),
  ADD COLUMN IF NOT EXISTS nationality text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS languages_spoken text DEFAULT '',
  ADD COLUMN IF NOT EXISTS dietary_restrictions text DEFAULT '',
  ADD COLUMN IF NOT EXISTS sleep_schedule text DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferred_foods text DEFAULT '',
  ADD COLUMN IF NOT EXISTS separation_reaction text DEFAULT '',
  ADD COLUMN IF NOT EXISTS plays_with_others boolean,
  ADD COLUMN IF NOT EXISTS behavior_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS previous_center text DEFAULT '',
  ADD COLUMN IF NOT EXISTS transfer_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_usage_authorized boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS enrollment_signature text DEFAULT '',
  ADD COLUMN IF NOT EXISTS enrollment_date date;

-- Create guardians table for storing parent/guardian information
CREATE TABLE IF NOT EXISTS guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  profession text DEFAULT '',
  workplace text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  guardian_type integer NOT NULL CHECK (guardian_type IN (1, 2)),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;

-- Create authorized_pickup_persons table
CREATE TABLE IF NOT EXISTS authorized_pickup_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  kinship_degree text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE authorized_pickup_persons ENABLE ROW LEVEL SECURITY;

-- Create enrollment_documents table for tracking required documents
CREATE TABLE IF NOT EXISTS enrollment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN (
    'birth_certificate',
    'guardian_id',
    'proof_of_residence',
    'child_photo',
    'vaccination_record'
  )),
  status text NOT NULL CHECK (status IN ('pending', 'verified')) DEFAULT 'pending',
  file_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE enrollment_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guardians
CREATE POLICY "Parents can read own children guardians"
  ON guardians FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children WHERE children.id = guardians.child_id AND children.parent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage guardians"
  ON guardians FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

CREATE POLICY "Staff can read assigned children guardians"
  ON guardians FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children c
      JOIN staff_classes sc ON c.class_id = sc.class_id
      WHERE c.id = guardians.child_id AND sc.staff_id = auth.uid()
    )
  );

-- RLS Policies for authorized_pickup_persons
CREATE POLICY "Parents can read own children pickup persons"
  ON authorized_pickup_persons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children WHERE children.id = authorized_pickup_persons.child_id AND children.parent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage pickup persons"
  ON authorized_pickup_persons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

CREATE POLICY "Staff can read assigned children pickup persons"
  ON authorized_pickup_persons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children c
      JOIN staff_classes sc ON c.class_id = sc.class_id
      WHERE c.id = authorized_pickup_persons.child_id AND sc.staff_id = auth.uid()
    )
  );

-- RLS Policies for enrollment_documents
CREATE POLICY "Parents can read own children documents"
  ON enrollment_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children WHERE children.id = enrollment_documents.child_id AND children.parent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage documents"
  ON enrollment_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

CREATE POLICY "Staff can read assigned children documents"
  ON enrollment_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children c
      JOIN staff_classes sc ON c.class_id = sc.class_id
      WHERE c.id = enrollment_documents.child_id AND sc.staff_id = auth.uid()
    )
  );

