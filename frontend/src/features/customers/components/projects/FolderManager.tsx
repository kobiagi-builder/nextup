/**
 * Folder Manager Popover
 *
 * Gear icon popover for managing document folders: add, rename, delete.
 * General (system) folder is protected from modification.
 */

import { useState } from 'react'
import { Settings, Lock, Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCreateFolder, useUpdateFolder, useDeleteFolder } from '../../hooks'
import type { DocumentFolder } from '../../types'

interface FolderManagerProps {
  customerId: string
  folders: DocumentFolder[]
}

function isDuplicateName(name: string, folders: DocumentFolder[], excludeId?: string): boolean {
  return folders.some(
    (f) => f.id !== excludeId && f.name.toLowerCase() === name.toLowerCase()
  )
}

export function FolderManager({ customerId, folders }: FolderManagerProps) {
  const createFolder = useCreateFolder(customerId)
  const updateFolder = useUpdateFolder(customerId)
  const deleteFolder = useDeleteFolder(customerId)

  const [addingFolder, setAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [addError, setAddError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAdd = async () => {
    const name = newFolderName.trim()
    if (!name) return

    if (isDuplicateName(name, folders)) {
      setAddError('A folder with this name already exists')
      return
    }

    try {
      await createFolder.mutateAsync({ name, customerId })
      setNewFolderName('')
      setAddError('')
      setAddingFolder(false)
      toast({ title: 'Folder created' })
    } catch {
      toast({ title: 'Failed to create folder', variant: 'destructive' })
    }
  }

  const handleRename = async (id: string) => {
    const name = editName.trim()
    if (!name) return

    if (isDuplicateName(name, folders, id)) {
      setEditError('A folder with this name already exists')
      return
    }

    try {
      await updateFolder.mutateAsync({ id, name })
      setEditingId(null)
      setEditError('')
      toast({ title: 'Folder renamed' })
    } catch {
      toast({ title: 'Failed to rename folder', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteFolder.mutateAsync(id)
      setDeletingId(null)
      toast({ title: 'Folder deleted' })
    } catch {
      toast({ title: 'Failed to delete folder', variant: 'destructive' })
    }
  }

  const startEditing = (folder: DocumentFolder) => {
    setEditingId(folder.id)
    setEditName(folder.name)
    setEditError('')
  }

  // Sort: system folders last, then by sort_order
  const sortedFolders = [...folders].sort((a, b) => {
    if (a.is_system !== b.is_system) return a.is_system ? 1 : -1
    return a.sort_order - b.sort_order
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          data-testid="folder-manager-trigger"
        >
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-portal-ignore-click-outside
        className="w-[260px] p-3"
        align="start"
      >
        <h4 className="text-sm font-medium mb-2">Manage Folders</h4>
        <div className="border-t border-border/30 pt-2 space-y-1">
          {sortedFolders.map((folder) => (
            <div key={folder.id} data-testid={`folder-manager-row-${folder.id}`}>
              {/* Delete confirmation inline */}
              {deletingId === folder.id ? (
                <div className="flex items-center gap-1.5 py-1 px-1">
                  <span className="text-xs text-muted-foreground flex-1">Move docs to General?</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleDelete(folder.id)}
                    data-testid="folder-delete-confirm"
                  >
                    <Check className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setDeletingId(null)}
                    data-testid="folder-delete-cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : editingId === folder.id ? (
                /* Inline rename */
                <div>
                  <div className="flex items-center gap-1.5 py-0.5 px-1">
                    <Input
                      value={editName}
                      onChange={(e) => { setEditName(e.target.value); setEditError('') }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(folder.id)
                        if (e.key === 'Escape') { setEditingId(null); setEditError('') }
                      }}
                      className="h-7 text-xs flex-1"
                      autoFocus
                      data-testid="folder-rename-input"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRename(folder.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => { setEditingId(null); setEditError('') }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {editError && (
                    <p className="text-xs text-destructive px-1 mt-0.5" data-testid="folder-edit-error">{editError}</p>
                  )}
                </div>
              ) : (
                /* Normal folder row */
                <div className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/30 group">
                  <span className="text-sm text-foreground flex-1 truncate">
                    {folder.name}
                  </span>
                  {folder.is_system ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/70" data-testid="folder-lock-icon" />
                  ) : (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => startEditing(folder)}
                        data-testid={`folder-rename-${folder.id}`}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setDeletingId(folder.id)}
                        data-testid={`folder-delete-${folder.id}`}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add folder */}
        <div className="border-t border-border/30 mt-2 pt-2">
          {addingFolder ? (
            <div>
              <div className="flex items-center gap-1.5">
                <Input
                  value={newFolderName}
                  onChange={(e) => { setNewFolderName(e.target.value); setAddError('') }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd()
                    if (e.key === 'Escape') {
                      setAddingFolder(false)
                      setNewFolderName('')
                      setAddError('')
                    }
                  }}
                  placeholder="Folder name..."
                  className="h-7 text-xs flex-1"
                  autoFocus
                  data-testid="folder-add-input"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleAdd}
                  data-testid="folder-add-confirm"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => { setAddingFolder(false); setNewFolderName(''); setAddError('') }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {addError && (
                <p className="text-xs text-destructive px-1 mt-0.5" data-testid="folder-add-error">{addError}</p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAddingFolder(true)}
              className="flex items-center gap-2 text-xs text-primary hover:underline w-full py-1"
              data-testid="folder-add-button"
            >
              <Plus className="h-3.5 w-3.5" />
              Add folder
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
