-- Feature Rollout Capability
-- Two tables: feature_flags (flag definitions) and customer_features (per-account overrides)
-- Logic: feature active if default_state = true OR (default_state = false AND flag_state = true)

-- =============================================================================
-- Tables
-- =============================================================================

-- Feature flags - defines available feature flags
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_state BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer features - per-account feature flag overrides
CREATE TABLE customer_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  flag_state BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(uid, feature_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_feature_flags_name ON feature_flags(name);
CREATE INDEX idx_customer_features_uid ON customer_features(uid);
CREATE INDEX idx_customer_features_feature_id ON customer_features(feature_id);
CREATE INDEX idx_customer_features_uid_feature ON customer_features(uid, feature_id);

-- =============================================================================
-- Triggers
-- =============================================================================

CREATE TRIGGER feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customer_features_updated_at BEFORE UPDATE ON customer_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_features ENABLE ROW LEVEL SECURITY;

-- Feature flags: readable by all authenticated users (flags are public config)
CREATE POLICY feature_flags_select ON feature_flags FOR SELECT
  USING (auth.role() = 'authenticated');

-- Customer features: users can only see their own overrides
CREATE POLICY customer_features_select ON customer_features FOR SELECT
  USING (uid = auth.uid());

-- =============================================================================
-- Service Role Access (backend operations)
-- =============================================================================

GRANT ALL ON feature_flags TO service_role;
GRANT ALL ON customer_features TO service_role;

-- =============================================================================
-- Helper function: check if a feature is active for a given user
-- Returns true if: default_state = true OR (default_state = false AND flag_state = true)
-- =============================================================================

CREATE OR REPLACE FUNCTION is_feature_active(p_uid UUID, p_feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_default_state BOOLEAN;
  v_flag_state BOOLEAN;
BEGIN
  -- Get the flag's default state
  SELECT default_state INTO v_default_state
  FROM feature_flags
  WHERE name = p_feature_name;

  -- Flag doesn't exist = not active
  IF v_default_state IS NULL THEN
    RETURN false;
  END IF;

  -- If default is enabled, feature is active for everyone
  IF v_default_state = true THEN
    RETURN true;
  END IF;

  -- Check per-account override
  SELECT flag_state INTO v_flag_state
  FROM customer_features cf
  JOIN feature_flags ff ON cf.feature_id = ff.id
  WHERE cf.uid = p_uid AND ff.name = p_feature_name;

  RETURN COALESCE(v_flag_state, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
