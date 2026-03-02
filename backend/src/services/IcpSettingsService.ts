/**
 * IcpSettingsService
 *
 * CRUD for user-level ICP settings (target employee range, industries,
 * specialties, description, scoring weights).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger.js'
import type { IcpSettings, IcpSettingsInput } from '../types/customer.js'

export class IcpSettingsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get ICP settings for the authenticated user.
   */
  async getByUserId(userId: string): Promise<IcpSettings | null> {
    const { data, error } = await this.supabase
      .from('icp_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      logger.error('[IcpSettingsService] Error fetching settings', {
        sourceCode: 'IcpSettingsService.getByUserId',
        hasError: true,
      })
      throw error
    }

    return data as IcpSettings | null
  }

  /**
   * Upsert ICP settings for the authenticated user.
   * Uses ON CONFLICT(user_id) for atomic create-or-update.
   */
  async upsert(userId: string, input: IcpSettingsInput): Promise<IcpSettings> {
    const { data, error } = await this.supabase
      .from('icp_settings')
      .upsert(
        { user_id: userId, ...input },
        { onConflict: 'user_id' },
      )
      .select()
      .single()

    if (error) {
      logger.error('[IcpSettingsService] Error upserting settings', {
        sourceCode: 'IcpSettingsService.upsert',
        hasError: true,
      })
      throw error
    }

    return data as IcpSettings
  }
}
