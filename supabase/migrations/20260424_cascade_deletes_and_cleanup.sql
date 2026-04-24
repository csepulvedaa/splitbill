-- Add ON DELETE CASCADE to all bill-related foreign keys
-- so deleting a bill automatically removes items, participants, and assignments.

-- items → bills
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_bill_id_fkey;
ALTER TABLE items ADD CONSTRAINT items_bill_id_fkey
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE;

-- participants → bills
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_bill_id_fkey;
ALTER TABLE participants ADD CONSTRAINT participants_bill_id_fkey
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE;

-- assignments → items
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_item_id_fkey;
ALTER TABLE assignments ADD CONSTRAINT assignments_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- assignments → participants
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_participant_id_fkey;
ALTER TABLE assignments ADD CONSTRAINT assignments_participant_id_fkey
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE;
