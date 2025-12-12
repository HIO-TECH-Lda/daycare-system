-- Migration: Update attendance table to track who brought and picked up the child

-- Add brought_by field for check-in
ALTER TABLE attendance 
  ADD COLUMN IF NOT EXISTS brought_by text DEFAULT '';

-- Rename authorized_pickup_person to picked_up_by for clarity
ALTER TABLE attendance 
  RENAME COLUMN authorized_pickup_person TO picked_up_by;

-- Update the column to be more descriptive
ALTER TABLE attendance 
  ALTER COLUMN picked_up_by SET DEFAULT '';

