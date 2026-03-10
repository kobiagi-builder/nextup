/**
 * Initiative & Document Integration Tests
 *
 * Tests the complete initiative → document → safe-delete flow.
 * Uses mocked Supabase to verify cross-service interactions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

// =============================================================================
// Mocks (vi.hoisted ensures availability before vi.mock hoisting)
// =============================================================================

const { mockInitiativeService, mockDocumentService, mockFolderService } = vi.hoisted(() => ({
  mockInitiativeService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mockDocumentService: {
    listByInitiative: vi.fn(),
    listByCustomer: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mockFolderService: {
    getFolders: vi.fn(),
    getDefaultFolder: vi.fn(),
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn(),
  },
}))

vi.mock('../../services/InitiativeService.js', () => ({
  InitiativeService: class {
    list(...args: any[]) { return mockInitiativeService.list(...args) }
    getById(...args: any[]) { return mockInitiativeService.getById(...args) }
    create(...args: any[]) { return mockInitiativeService.create(...args) }
    update(...args: any[]) { return mockInitiativeService.update(...args) }
    delete(...args: any[]) { return mockInitiativeService.delete(...args) }
  },
}))

vi.mock('../../services/CustomerDocumentService.js', () => ({
  CustomerDocumentService: class {
    listByInitiative(...args: any[]) { return mockDocumentService.listByInitiative(...args) }
    listByCustomer(...args: any[]) { return mockDocumentService.listByCustomer(...args) }
    create(...args: any[]) { return mockDocumentService.create(...args) }
    update(...args: any[]) { return mockDocumentService.update(...args) }
    delete(...args: any[]) { return mockDocumentService.delete(...args) }
  },
}))

vi.mock('../../services/DocumentFolderService.js', () => ({
  DocumentFolderService: class {
    getFolders(...args: any[]) { return mockFolderService.getFolders(...args) }
    getDefaultFolder(...args: any[]) { return mockFolderService.getDefaultFolder(...args) }
    createFolder(...args: any[]) { return mockFolderService.createFolder(...args) }
    updateFolder(...args: any[]) { return mockFolderService.updateFolder(...args) }
    deleteFolder(...args: any[]) { return mockFolderService.deleteFolder(...args) }
  },
}))

vi.mock('../../lib/requestContext.js', () => ({
  getSupabase: () => ({}),
}))

vi.mock('../../lib/logger.js', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
}))

import {
  listInitiatives,
  createInitiative,
  deleteInitiative,
} from '../../controllers/initiative.controller.js'

import {
  listInitiativeDocuments,
  listCustomerDocuments,
  createDocument,
  updateDocument,
} from '../../controllers/customer-document.controller.js'

import {
  listFolders,
  createFolder,
  deleteFolder,
} from '../../controllers/document-folder.controller.js'

// =============================================================================
// Test Data
// =============================================================================

const TEST_USER_ID = 'a0000000-0000-0000-0000-000000000001'
const TEST_CUSTOMER_ID = 'c0000000-0000-0000-0000-000000000001'
const TEST_INITIATIVE_ID = 'i0000000-0000-0000-0000-000000000001'
const TEST_DOCUMENT_ID = 'd0000000-0000-0000-0000-000000000001'
const TEST_FOLDER_ID = 'f0000000-0000-0000-0000-000000000001'
const GENERAL_FOLDER_ID = 'g0000000-0000-0000-0000-000000000001'

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: TEST_USER_ID },
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as unknown as Request
}

function createMockRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Initiative → Document → Safe Delete Flow', () => {
  it('creates an initiative, adds documents, and safely deletes moving docs to General', async () => {
    // Step 1: Create initiative
    const mockInitiative = {
      id: TEST_INITIATIVE_ID,
      customer_id: TEST_CUSTOMER_ID,
      name: 'Q1 Strategy',
      status: 'planning',
    }
    mockInitiativeService.create.mockResolvedValue(mockInitiative)

    const createReq = createMockReq({
      params: { id: TEST_CUSTOMER_ID } as any,
      body: { name: 'Q1 Strategy' },
    })
    const createRes = createMockRes()
    await createInitiative(createReq, createRes)

    expect(createRes.status).toHaveBeenCalledWith(201)
    expect(createRes.json).toHaveBeenCalledWith(mockInitiative)

    // Step 2: Create a document within the initiative
    const mockDocument = {
      id: TEST_DOCUMENT_ID,
      initiative_id: TEST_INITIATIVE_ID,
      customer_id: TEST_CUSTOMER_ID,
      title: 'Strategy Roadmap',
      type: 'strategy',
      status: 'draft',
    }
    mockDocumentService.create.mockResolvedValue(mockDocument)

    const docReq = createMockReq({
      params: { id: TEST_CUSTOMER_ID, initiativeId: TEST_INITIATIVE_ID } as any,
      body: { title: 'Strategy Roadmap', type: 'strategy' },
    })
    const docRes = createMockRes()
    await createDocument(docReq, docRes)

    expect(docRes.status).toHaveBeenCalledWith(201)
    expect(docRes.json).toHaveBeenCalledWith(mockDocument)

    // Step 3: List documents by initiative
    mockDocumentService.listByInitiative.mockResolvedValue([mockDocument])

    const listDocReq = createMockReq({
      params: { id: TEST_CUSTOMER_ID, initiativeId: TEST_INITIATIVE_ID } as any,
    })
    const listDocRes = createMockRes()
    await listInitiativeDocuments(listDocReq, listDocRes)

    expect(listDocRes.status).toHaveBeenCalledWith(200)
    expect(listDocRes.json).toHaveBeenCalledWith({ documents: [mockDocument], count: 1 })

    // Step 4: Delete initiative — should move documents to General
    mockInitiativeService.delete.mockResolvedValue({ moved_documents: 1 })

    const deleteReq = createMockReq({
      params: { id: TEST_CUSTOMER_ID, initiativeId: TEST_INITIATIVE_ID } as any,
    })
    const deleteRes = createMockRes()
    await deleteInitiative(deleteReq, deleteRes)

    expect(deleteRes.status).toHaveBeenCalledWith(200)
    expect(deleteRes.json).toHaveBeenCalledWith({
      message: 'Initiative deleted successfully',
      moved_documents: 1,
    })

    // Step 5: Verify documents are still accessible via flat customer view
    const movedDocument = { ...mockDocument, initiative_id: null, folder_id: GENERAL_FOLDER_ID }
    mockDocumentService.listByCustomer.mockResolvedValue([movedDocument])

    const flatReq = createMockReq({
      params: { id: TEST_CUSTOMER_ID } as any,
    })
    const flatRes = createMockRes()
    await listCustomerDocuments(flatReq, flatRes)

    expect(flatRes.status).toHaveBeenCalledWith(200)
    const flatResult = (flatRes.json as any).mock.calls[0][0]
    expect(flatResult.count).toBe(1)
    expect(flatResult.documents[0].folder_id).toBe(GENERAL_FOLDER_ID)
    expect(flatResult.documents[0].initiative_id).toBeNull()
  })
})

describe('Document reassignment', () => {
  it('updates a document initiative_id and folder_id', async () => {
    const NEW_INITIATIVE_ID = 'a1111111-1111-1111-1111-111111111111'
    const updatedDocument = {
      id: TEST_DOCUMENT_ID,
      initiative_id: NEW_INITIATIVE_ID,
      folder_id: TEST_FOLDER_ID,
      title: 'Updated Doc',
    }
    mockDocumentService.update.mockResolvedValue(updatedDocument)

    const req = createMockReq({
      params: { id: TEST_CUSTOMER_ID, initiativeId: TEST_INITIATIVE_ID, documentId: TEST_DOCUMENT_ID } as any,
      body: { initiative_id: NEW_INITIATIVE_ID, folder_id: TEST_FOLDER_ID },
    })
    const res = createMockRes()
    await updateDocument(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockDocumentService.update).toHaveBeenCalledWith(TEST_DOCUMENT_ID, {
      initiative_id: NEW_INITIATIVE_ID,
      folder_id: TEST_FOLDER_ID,
    })
  })
})

describe('Folder CRUD flow', () => {
  it('lists folders, creates a folder, and deletes a non-system folder', async () => {
    // List folders
    const generalFolder = { id: GENERAL_FOLDER_ID, name: 'General', is_system: true }
    mockFolderService.getFolders.mockResolvedValue([generalFolder])

    const listReq = createMockReq({ query: { customerId: TEST_CUSTOMER_ID } as any })
    const listRes = createMockRes()
    await listFolders(listReq, listRes)

    expect(listRes.status).toHaveBeenCalledWith(200)
    expect(listRes.json).toHaveBeenCalledWith({ folders: [generalFolder], count: 1 })

    // Create folder
    const newFolder = { id: TEST_FOLDER_ID, name: 'My Folder', is_system: false }
    mockFolderService.createFolder.mockResolvedValue(newFolder)

    const createReq = createMockReq({
      body: { name: 'My Folder', customer_id: TEST_CUSTOMER_ID },
    })
    const createRes = createMockRes()
    await createFolder(createReq, createRes)

    expect(createRes.status).toHaveBeenCalledWith(201)
    expect(createRes.json).toHaveBeenCalledWith(newFolder)

    // Delete non-system folder
    mockFolderService.deleteFolder.mockResolvedValue(undefined)

    const deleteReq = createMockReq({ params: { id: TEST_FOLDER_ID } as any })
    const deleteRes = createMockRes()
    await deleteFolder(deleteReq, deleteRes)

    expect(deleteRes.status).toHaveBeenCalledWith(200)
  })

  it('refuses to delete system folder with 403', async () => {
    mockFolderService.deleteFolder.mockRejectedValue(new Error('Cannot delete system folder'))

    const req = createMockReq({ params: { id: GENERAL_FOLDER_ID } as any })
    const res = createMockRes()
    await deleteFolder(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Cannot delete system folder',
    })
  })
})
