-- Migration: 011_merge_customer_info_function
-- Description: Atomic JSONB merge for customer info (avoids read-modify-write race conditions)
-- Used by: Customer AI Chat tools (updateCustomerInfo)

CREATE OR REPLACE FUNCTION merge_customer_info(cid UUID, new_info JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rows_affected INT;
BEGIN
  UPDATE public.customers
  SET info = COALESCE(info, '{}'::jsonb) || new_info,
      updated_at = NOW()
  WHERE id = cid
    AND user_id = auth.uid();
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$$;
