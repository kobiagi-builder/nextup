/**
 * Overview Tab
 *
 * Composes QuickStats, CustomerInfoSection, TeamSection, and EventTimeline.
 */

import type { CustomerWithCounts, CustomerInfo, TeamMember } from '../../types'
import { useCustomerEvents, useReceivableSummary } from '../../hooks'
import { QuickStats } from './QuickStats'
import { CustomerInfoSection } from './CustomerInfoSection'
import { TeamSection } from './TeamSection'
import { EventTimeline } from './EventTimeline'

interface OverviewTabProps {
  customer: CustomerWithCounts
  onUpdateInfo: (info: CustomerInfo) => void
  isUpdating?: boolean
  isEnriching?: boolean
}

export function OverviewTab({ customer, onUpdateInfo, isUpdating, isEnriching }: OverviewTabProps) {
  const { data: events = [], isLoading: eventsLoading } = useCustomerEvents(customer.id)
  const { data: financialSummary } = useReceivableSummary(customer.id)

  // Filter out hidden members before display
  const visibleTeam = (customer.info?.team || []).filter(m => !m.hidden)

  const handleTeamSave = (team: TeamMember[]) => {
    // Preserve hidden members in the save payload
    const hiddenMembers = (customer.info?.team || []).filter(m => m.hidden)
    onUpdateInfo({ ...customer.info, team: [...team, ...hiddenMembers] })
  }

  return (
    <div className="space-y-8">
      <QuickStats
        counts={{
          agreements: customer.agreements_count,
          receivables: customer.receivables_count,
          projects: customer.projects_count,
          action_items: customer.action_items_count,
        }}
        financialSummary={financialSummary ?? undefined}
      />

      <div className="rounded-lg border border-border/50 bg-card p-5">
        <CustomerInfoSection
          info={customer.info || {}}
          onSave={onUpdateInfo}
          isSaving={isUpdating}
          isEnriching={isEnriching}
        />
      </div>

      <div className="rounded-lg border border-border/50 bg-card p-5">
        <TeamSection
          team={visibleTeam}
          onSave={handleTeamSave}
          isSaving={isUpdating}
          customerId={customer.id}
          linkedinCompanyUrl={customer.info?.linkedin_company_url}
        />
      </div>

      <div className="rounded-lg border border-border/50 bg-card p-5">
        <EventTimeline
          customerId={customer.id}
          events={events}
          isLoading={eventsLoading}
        />
      </div>
    </div>
  )
}
