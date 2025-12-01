/*
  # Daycare Management System Database Schema

  1. New Tables
    - `users` - System users (parents, staff, admins)
    - `classes` - Daycare classes
    - `children` - Children enrolled in daycare
    - `staff_classes` - Staff assignments to classes
    - `daily_reports` - Daily reports for children
    - `activities` - Activities within daily reports
    - `report_photos` - Photos attached to reports
    - `attendance` - Check-in/out tracking
    - `calendar_events` - Calendar events
    - `invoices` - Billing invoices
    - `messages` - Communication between users

  2. Security
    - Enable RLS on all tables
    - Add role-based access policies
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('responsavel', 'staff', 'administrador')),
  phone text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_age_months integer NOT NULL,
  max_age_months integer NOT NULL,
  capacity integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Create staff_classes junction table
CREATE TABLE IF NOT EXISTS staff_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES users(id) NOT NULL,
  class_id uuid REFERENCES classes(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_classes ENABLE ROW LEVEL SECURITY;

-- Create children table
CREATE TABLE IF NOT EXISTS children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  birth_date date NOT NULL,
  class_id uuid REFERENCES classes(id),
  parent_id uuid REFERENCES users(id),
  photo_url text DEFAULT '',
  allergies text DEFAULT '',
  medications text DEFAULT '',
  emergency_contact_name text DEFAULT '',
  emergency_contact_phone text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- Create daily_reports table
CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES children(id) NOT NULL,
  report_date date NOT NULL,
  mood text DEFAULT '',
  summary_note text DEFAULT '',
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid REFERENCES daily_reports(id) NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('nap', 'feeding', 'diaper', 'pedagogical')),
  time time NOT NULL,
  duration_minutes integer,
  food_item text DEFAULT '',
  amount text DEFAULT '',
  diaper_condition text DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create report_photos table
CREATE TABLE IF NOT EXISTS report_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid REFERENCES daily_reports(id) NOT NULL,
  photo_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES children(id) NOT NULL,
  attendance_date date NOT NULL,
  check_in_time time,
  check_out_time time,
  authorized_pickup_person text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  event_date date NOT NULL,
  event_type text NOT NULL,
  class_id uuid REFERENCES classes(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES users(id) NOT NULL,
  child_id uuid REFERENCES children(id) NOT NULL,
  amount decimal(10,2) NOT NULL,
  due_date date NOT NULL,
  issue_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('pendente', 'pago')) DEFAULT 'pendente',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES users(id) NOT NULL,
  receiver_id uuid REFERENCES users(id) NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

-- RLS Policies for classes
CREATE POLICY "Everyone can read classes"
  ON classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage classes"
  ON classes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

CREATE POLICY "Admins can update classes"
  ON classes FOR UPDATE
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

CREATE POLICY "Admins can delete classes"
  ON classes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

-- RLS Policies for staff_classes
CREATE POLICY "Staff can read own assignments"
  ON staff_classes FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

CREATE POLICY "Admins can read all assignments"
  ON staff_classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

CREATE POLICY "Admins can manage assignments"
  ON staff_classes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

CREATE POLICY "Admins can delete assignments"
  ON staff_classes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

-- RLS Policies for children
CREATE POLICY "Parents can read own children"
  ON children FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Staff can read assigned children"
  ON children FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_classes sc
      WHERE sc.staff_id = auth.uid() AND sc.class_id = children.class_id
    )
  );

CREATE POLICY "Admins can read all children"
  ON children FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

CREATE POLICY "Admins can manage children"
  ON children FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

CREATE POLICY "Admins can update children"
  ON children FOR UPDATE
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

-- RLS Policies for daily_reports
CREATE POLICY "Parents can read own children reports"
  ON daily_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children WHERE children.id = daily_reports.child_id AND children.parent_id = auth.uid()
    )
  );

CREATE POLICY "Staff can read assigned children reports"
  ON daily_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children c
      JOIN staff_classes sc ON c.class_id = sc.class_id
      WHERE c.id = daily_reports.child_id AND sc.staff_id = auth.uid()
    )
  );

CREATE POLICY "Staff can create reports"
  ON daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children c
      JOIN staff_classes sc ON c.class_id = sc.class_id
      WHERE c.id = daily_reports.child_id AND sc.staff_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update reports"
  ON daily_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children c
      JOIN staff_classes sc ON c.class_id = sc.class_id
      WHERE c.id = daily_reports.child_id AND sc.staff_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children c
      JOIN staff_classes sc ON c.class_id = sc.class_id
      WHERE c.id = daily_reports.child_id AND sc.staff_id = auth.uid()
    )
  );

-- RLS Policies for activities
CREATE POLICY "Parents can read activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports dr
      JOIN children c ON dr.child_id = c.id
      WHERE dr.id = activities.daily_report_id AND c.parent_id = auth.uid()
    )
  );

CREATE POLICY "Staff can read activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports dr
      JOIN children c ON dr.child_id = c.id
      JOIN staff_classes sc ON c.class_id = sc.class_id
      WHERE dr.id = activities.daily_report_id AND sc.staff_id = auth.uid()
    )
  );

CREATE POLICY "Staff can create activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_reports dr
      JOIN children c ON dr.child_id = c.id
      JOIN staff_classes sc ON c.class_id = sc.class_id
      WHERE dr.id = activities.daily_report_id AND sc.staff_id = auth.uid()
    )
  );

-- RLS Policies for report_photos
CREATE POLICY "Parents can read photos"
  ON report_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports dr
      JOIN children c ON dr.child_id = c.id
      WHERE dr.id = report_photos.daily_report_id AND c.parent_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage photos"
  ON report_photos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports dr
      JOIN children c ON dr.child_id = c.id
      JOIN staff_classes sc ON c.class_id = sc.class_id
      WHERE dr.id = report_photos.daily_report_id AND sc.staff_id = auth.uid()
    )
  );

-- RLS Policies for attendance
CREATE POLICY "Parents can read own children attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children WHERE children.id = attendance.child_id AND children.parent_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage attendance"
  ON attendance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children c
      JOIN staff_classes sc ON c.class_id = sc.class_id
      WHERE c.id = attendance.child_id AND sc.staff_id = auth.uid()
    )
  );

-- RLS Policies for calendar_events
CREATE POLICY "Everyone can read events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

CREATE POLICY "Admins can update events"
  ON calendar_events FOR UPDATE
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

CREATE POLICY "Admins can delete events"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

-- RLS Policies for invoices
CREATE POLICY "Parents can read own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'administrador'
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can read own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update received messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());
