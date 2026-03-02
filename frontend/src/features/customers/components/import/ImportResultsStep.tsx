/**
 * Import Results Step
 *
 * Displays import summary: counts, skipped rows, and errors.
 */

import { useState } from 'react'
import { Building2, Users, AlertTriangle, XCircle, ChevronDown, ChevronRight, CheckCircle2, Sparkles, Target, Settings, Zap, Globe, Brain, HelpCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ImportResult } from '../../types'

interface ImportResultsStepProps {
  result: ImportResult
  onDone: () => void
}

export function ImportResultsStep({ result, onDone }: ImportResultsStepProps) {
  const [showSkipped, setShowSkipped] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  return (
    <div className="space-y-4">
      {/* Summary counters */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          icon={<Building2 className="h-4 w-4 text-emerald-400" />}
          label="Companies Created"
          value={result.companies.created}
        />
        <SummaryCard
          icon={<Building2 className="h-4 w-4 text-blue-400" />}
          label="Companies Matched"
          value={result.companies.matched}
        />
        <SummaryCard
          icon={<Users className="h-4 w-4 text-emerald-400" />}
          label="Members Created"
          value={result.teamMembers.created}
        />
        <SummaryCard
          icon={<Users className="h-4 w-4 text-blue-400" />}
          label="Members Updated"
          value={result.teamMembers.updated}
        />
      </div>

      {/* Total processed */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        <span>{result.total} connections processed</span>
      </div>

      {/* Classification Stats */}
      {result.classification && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Search className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-foreground">Company Classification</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              icon={<Zap className="h-4 w-4 text-emerald-400" />}
              label="Instant Match"
              value={result.classification.layer0}
            />
            <SummaryCard
              icon={<Globe className="h-4 w-4 text-blue-400" />}
              label="LinkedIn Verified"
              value={result.classification.layer1}
            />
            <SummaryCard
              icon={<Brain className="h-4 w-4 text-violet-400" />}
              label="AI Classified"
              value={result.classification.layer2}
            />
            <SummaryCard
              icon={<HelpCircle className="h-4 w-4 text-amber-400" />}
              label="Needs Review"
              value={result.classification.layer3}
            />
          </div>
        </div>
      )}

      {/* Enrichment Stats */}
      {result.enrichment && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-medium text-foreground">Company Enrichment</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard
              icon={<Sparkles className="h-4 w-4 text-emerald-400" />}
              label="Enriched"
              value={result.enrichment.enriched}
            />
            <SummaryCard
              icon={<CheckCircle2 className="h-4 w-4 text-blue-400" />}
              label="Up to Date"
              value={result.enrichment.skippedFresh}
            />
            <SummaryCard
              icon={<XCircle className="h-4 w-4 text-rose-400" />}
              label="Failed"
              value={result.enrichment.failed}
            />
          </div>
        </div>
      )}

      {/* ICP Score Distribution */}
      {result.icpScores && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-foreground">ICP Scores</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              icon={<span className="h-4 w-4 flex items-center justify-center text-blue-400 font-bold text-xs">VH</span>}
              label="Very High"
              value={result.icpScores.very_high}
            />
            <SummaryCard
              icon={<span className="h-4 w-4 flex items-center justify-center text-emerald-400 font-bold text-xs">H</span>}
              label="High"
              value={result.icpScores.high}
            />
            <SummaryCard
              icon={<span className="h-4 w-4 flex items-center justify-center text-amber-400 font-bold text-xs">M</span>}
              label="Medium"
              value={result.icpScores.medium}
            />
            <SummaryCard
              icon={<span className="h-4 w-4 flex items-center justify-center text-rose-400 font-bold text-xs">L</span>}
              label="Low"
              value={result.icpScores.low}
            />
          </div>
          {result.icpScores.not_scored > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Settings className="h-3 w-3" />
              <span>{result.icpScores.not_scored} not scored — configure ICP in Settings</span>
            </div>
          )}
          {result.icpScores.skipped_unchanged > 0 && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Settings className="h-3 w-3" />
              <span>{result.icpScores.skipped_unchanged} unchanged — kept existing score</span>
            </div>
          )}
        </div>
      )}

      {/* Skipped rows */}
      {result.skipped.length > 0 && (
        <CollapsibleSection
          icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
          label={`${result.skipped.length} skipped`}
          open={showSkipped}
          onToggle={() => setShowSkipped(!showSkipped)}
        >
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {result.skipped.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground shrink-0">Row {s.row}:</span>
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{s.company}</span> — {s.reason}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Errors */}
      {result.errors.length > 0 && (
        <CollapsibleSection
          icon={<XCircle className="h-4 w-4 text-red-400" />}
          label={`${result.errors.length} errors`}
          open={showErrors}
          onToggle={() => setShowErrors(!showErrors)}
        >
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {result.errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground shrink-0">Row {e.row}:</span>
                <span className="text-red-400">{e.message}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
      {icon}
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function CollapsibleSection({
  icon,
  label,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
      >
        {icon}
        <span className="font-medium">{label}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-3 pb-3 border-t border-border pt-2">{children}</div>}
    </div>
  )
}
