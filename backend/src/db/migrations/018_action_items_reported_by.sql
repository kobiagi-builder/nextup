-- Add reported_by field to track who reported/raised each action item
-- (e.g., from meeting notes or customer feedback)
ALTER TABLE customer_action_items ADD COLUMN reported_by TEXT;
