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
}

export function OverviewTab({ customer, onUpdateInfo, isUpdating }: OverviewTabProps) {
  const { data: events = [], isLoading: eventsLoading } = useCustomerEvents(customer.id)
  const { data: financialSummary } = useReceivableSummary(customer.id)

  const handleTeamSave = (team: TeamMember[]) => {
    onUpdateInfo({ ...customer.info, team })
  }

  return (
    <div className="space-y-6">
      <QuickStats
        counts={{
          agreements: customer.agreements_count,
          receivables: customer.receivables_count,
          projects: customer.projects_count,
          action_items: customer.action_items_count,
        }}
        financialSummary={financialSummary ?? undefined}
      />

      <div className="rounded-lg border border-border/50 bg-card p-4">
        <CustomerInfoSection
          info={customer.info || {}}
          onSave={onUpdateInfo}
          isSaving={isUpdating}
        />
      </div>

      <div className="rounded-lg border border-border/50 bg-card p-4">
        <TeamSection
          team={customer.info?.team || []}
          onSave={handleTeamSave}
          isSaving={isUpdating}
        />
      </div>

      <div className="rounded-lg border border-border/50 bg-card p-4">
        <EventTimeline
          customerId={customer.id}
          events={events}
          isLoading={eventsLoading}
        />
      </div>
    </div>
  )
}
