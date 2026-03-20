-- =============================================================================
-- Expand customer_events event_type CHECK constraint
-- =============================================================================
-- The original constraint only allowed 7 event types (meeting, call, email,
-- note, status_change, milestone, other). The AI agent tool defines additional
-- types (workshop, decision, delivery, feedback, escalation, win, update,
-- analysis, planning) which caused repeated constraint violations and agent
-- retry loops.

ALTER TABLE customer_events DROP CONSTRAINT IF EXISTS customer_events_event_type_check;
ALTER TABLE customer_events ADD CONSTRAINT customer_events_event_type_check
  CHECK (event_type IN (
    'meeting', 'call', 'email', 'note', 'status_change', 'milestone', 'other',
    'workshop', 'decision', 'delivery', 'feedback', 'escalation', 'win', 'update', 'analysis', 'planning'
  ));
