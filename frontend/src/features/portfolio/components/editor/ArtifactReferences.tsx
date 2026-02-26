/**
 * Artifact References
 *
 * Collapsible section for linking portfolio artifacts to customer artifacts.
 * Shows search input, search results, and linked artifact badges.
 */

import { useState, useEffect, useRef } from 'react'
import { Link2, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useCustomerArtifactSearch } from '@/features/customers/hooks'
import type { LinkedCustomerArtifactRef } from '../../types/portfolio'

interface ArtifactReferencesProps {
  linkedArtifacts: LinkedCustomerArtifactRef[]
  onLink: (ref: LinkedCustomerArtifactRef) => void
  onUnlink: (id: string) => void
  disabled?: boolean
}

export function ArtifactReferences({
  linkedArtifacts,
  onLink,
  onUnlink,
  disabled,
}: ArtifactReferencesProps) {
  const [isOpen, setIsOpen] = useState(linkedArtifacts.length > 0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [searchQuery])

  const { data: searchResults = [] } = useCustomerArtifactSearch(debouncedQuery)

  const linkedIds = new Set(linkedArtifacts.map(a => a.id))
  const filteredResults = searchResults.filter(r => !linkedIds.has(r.id))

  const handleSelect = (result: typeof searchResults[0]) => {
    onLink({
      id: result.id,
      title: result.title,
      type: result.type,
      customerName: result.customer_name,
    })
    setSearchQuery('')
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Link2 className="h-3.5 w-3.5" />
          <span>References ({linkedArtifacts.length})</span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-b px-4 pb-3 space-y-2">
        {/* Linked artifacts */}
        {linkedArtifacts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {linkedArtifacts.map((ref) => (
              <Badge key={ref.id} variant="secondary" className="gap-1 text-xs">
                {ref.title}
                <span className="text-muted-foreground">({ref.customerName})</span>
                {!disabled && (
                  <button
                    onClick={() => onUnlink(ref.id)}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Search */}
        {!disabled && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search customer artifacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-xs"
            />

            {/* Results dropdown */}
            {debouncedQuery.length >= 2 && filteredResults.length > 0 && (
              <div
                data-portal-ignore-click-outside
                className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto"
              >
                {filteredResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                  >
                    <span className="font-medium">{result.title}</span>
                    <span className="text-muted-foreground ml-1.5">
                      {result.type} &middot; {result.customer_name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {debouncedQuery.length >= 2 && filteredResults.length === 0 && searchResults.length === 0 && (
              <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-md">
                <p className="px-3 py-2 text-xs text-muted-foreground">No matching artifacts found</p>
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
