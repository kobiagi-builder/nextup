/**
 * Customer Detail Page
 *
 * Header with editable name + status dropdown.
 * 5 tabs: Overview, Agreements, Receivables, Projects, Action Items.
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, PanelLeftOpen, PanelLeftClose, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useChatLayoutStore } from '@/stores/chatLayoutStore'
import { useCustomer, useUpdateCustomer, useUpdateCustomerStatus, useCustomerChat } from '../hooks'
import { useCustomerStore } from '../stores'
import { CustomerStatusSelect } from '../components/shared/CustomerStatusSelect'
import { ProjectsTab } from '../components/projects'
import { OverviewTab } from '../components/overview/OverviewTab'
import { AgreementsTab } from '../components/agreements/AgreementsTab'
import { ReceivablesTab } from '../components/receivables/ReceivablesTab'
import { ActionItemsTab } from '../components/action-items/ActionItemsTab'
import type { CustomerStatus, CustomerInfo, CustomerTab } from '../types'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: customer, isLoading } = useCustomer(id ?? null)
  const updateCustomer = useUpdateCustomer()
  const updateStatus = useUpdateCustomerStatus()

  const { setActiveCustomer, setActiveTab, activeTab } = useCustomerStore()
  const { openCustomerChat } = useCustomerChat(id ?? '', customer?.name ?? 'Customer')
  const { isOpen: isChatOpen, closeChat } = useChatLayoutStore()

  // Editable name state
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Set active customer in store
  useEffect(() => {
    if (id) setActiveCustomer(id)
    return () => setActiveCustomer(null)
  }, [id, setActiveCustomer])

  // Default to overview tab
  useEffect(() => {
    if (!activeTab) setActiveTab('overview')
  }, [activeTab, setActiveTab])

  const handleStatusChange = async (status: CustomerStatus) => {
    if (!id) return
    try {
      await updateStatus.mutateAsync({ id, status })
      toast({ title: `Status updated to ${status}` })
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    }
  }

  const handleNameEdit = () => {
    if (!customer) return
    setEditedName(customer.name)
    setIsEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  const handleNameSave = async () => {
    if (!id || !editedName.trim() || editedName.trim() === customer?.name) {
      setIsEditingName(false)
      return
    }
    setIsEditingName(false) // Close edit mode first to prevent onBlur double-fire
    try {
      await updateCustomer.mutateAsync({ id, name: editedName.trim() })
      toast({ title: 'Name updated' })
    } catch {
      toast({ title: 'Failed to update name', variant: 'destructive' })
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameSave()
    if (e.key === 'Escape') setIsEditingName(false)
  }

  const handleUpdateInfo = async (info: CustomerInfo) => {
    if (!id) return
    try {
      await updateCustomer.mutateAsync({ id, info })
      toast({ title: 'Customer info updated' })
    } catch {
      toast({ title: 'Failed to update customer info', variant: 'destructive' })
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as CustomerTab)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-8 w-[140px] rounded-md" />
          </div>
        </div>
        <div className="px-6 border-b border-border/50">
          <div className="flex gap-4 h-10 items-end pb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-5 w-20" />
            ))}
          </div>
        </div>
        <div className="flex-1 px-6 py-4 space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Customer not found</p>
        <Button variant="outline" onClick={() => navigate('/customers')}>
          Back to Customers
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => isChatOpen ? closeChat() : openCustomerChat()}
            title={isChatOpen ? 'Close panel' : 'Open AI Assistant'}
          >
            {isChatOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {isEditingName ? (
            <div className="flex items-center gap-1">
              <Input
                ref={nameInputRef}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={handleNameSave}
                className="h-8 text-lg font-bold w-64"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleNameSave}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingName(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <h1
              className="text-xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={handleNameEdit}
              title="Click to edit name"
            >
              {customer.name}
            </h1>
          )}

          <CustomerStatusSelect
            value={customer.status}
            onValueChange={handleStatusChange}
            className="h-8 w-[140px]"
          />

        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab || 'overview'}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="px-6 border-b border-border/50 overflow-x-auto scrollbar-none">
          <TabsList className="bg-transparent h-10 p-0 gap-4">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="agreements"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2"
            >
              Agreements ({customer.agreements_count})
            </TabsTrigger>
            <TabsTrigger
              value="receivables"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2"
            >
              Receivables ({customer.receivables_count})
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2"
            >
              Projects ({customer.projects_count})
            </TabsTrigger>
            <TabsTrigger
              value="action_items"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2"
            >
              Action Items ({customer.action_items_count})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="overview" className="px-6 py-4 mt-0">
            <OverviewTab
              customer={customer}
              onUpdateInfo={handleUpdateInfo}
              isUpdating={updateCustomer.isPending}
            />
          </TabsContent>

          <TabsContent value="agreements" className="px-6 py-4 mt-0">
            <AgreementsTab customerId={customer.id} />
          </TabsContent>

          <TabsContent value="receivables" className="px-6 py-4 mt-0">
            <ReceivablesTab customerId={customer.id} />
          </TabsContent>

          <TabsContent value="projects" className="px-6 py-4 mt-0">
            <ProjectsTab customerId={customer.id} />
          </TabsContent>

          <TabsContent value="action_items" className="px-6 py-4 mt-0">
            <ActionItemsTab customerId={customer.id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
