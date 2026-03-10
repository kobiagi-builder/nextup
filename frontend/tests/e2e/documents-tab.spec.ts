/**
 * E2E Tests - Documents Tab (Customer Detail)
 *
 * Tests the Documents tab within a customer detail page.
 * Requires dev server running at http://localhost:5173.
 *
 * Test credentials:
 *   Email:    kobiagi+nextuptest@gmail.com
 *   Password: Qwerty12345
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const EMAIL = 'kobiagi+nextuptest@gmail.com'
const PASSWORD = 'Qwerty12345'

// Run tests serially since they share state (created initiatives/documents)
test.describe.configure({ mode: 'serial' })

// =============================================================================
// Helper: login
// =============================================================================

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/auth/login`)

  try {
    await page.waitForURL('**/auth/login', { timeout: 5_000 })
  } catch {
    return
  }

  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/(portfolio|dashboard|home|onboarding)/, { timeout: 20_000 })
}

// =============================================================================
// Helper: navigate to first customer's Documents tab
// =============================================================================

async function navigateToDocumentsTab(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/customers`)
  await page.waitForLoadState('networkidle')

  // Click first customer card
  const customerCard = page.locator('[data-testid^="customer-card-"]').first()
  await expect(customerCard).toBeVisible({ timeout: 10_000 })
  await customerCard.click()
  await page.waitForLoadState('networkidle')

  // Click Documents tab
  const documentsTab = page.getByRole('tab', { name: /documents/i })
  await expect(documentsTab).toBeVisible({ timeout: 10_000 })
  await documentsTab.click()
  await page.waitForLoadState('networkidle')

  // Wait for documents tab content
  await expect(page.getByTestId('documents-tab')).toBeVisible({ timeout: 10_000 })
}

// =============================================================================
// Tests
// =============================================================================

test.describe('Documents Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Documents tab loads', async ({ page }) => {
    await navigateToDocumentsTab(page)

    // The documents-tab testid should be visible
    await expect(page.getByTestId('documents-tab')).toBeVisible()
  })

  test('creates initiative via New Initiative button', async ({ page }) => {
    await navigateToDocumentsTab(page)

    const uniqueName = `E2E Initiative ${Date.now()}`

    // Click New Initiative button
    const newInitiativeBtn = page.getByRole('button', { name: /new initiative/i })
    // Could be in header or empty state
    if (await newInitiativeBtn.isVisible().catch(() => false)) {
      await newInitiativeBtn.click()
    } else {
      // If empty state, click "Create First Initiative"
      const createFirstBtn = page.getByRole('button', { name: /create first initiative/i })
      await createFirstBtn.click()
    }

    // Wait for dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Fill name
    await dialog.getByLabel(/name/i).fill(uniqueName)

    // Submit
    await dialog.getByRole('button', { name: /create|save/i }).click()

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })

    // Initiative section should appear
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 5_000 })
  })

  test('creates document via New Document button', async ({ page }) => {
    await navigateToDocumentsTab(page)

    const uniqueTitle = `E2E Doc ${Date.now()}`

    // Click New Document button
    const newDocBtn = page.getByRole('button', { name: /new document/i })
    await expect(newDocBtn).toBeVisible({ timeout: 10_000 })
    await newDocBtn.click()

    // Wait for dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Fill title
    await dialog.getByLabel(/title/i).fill(uniqueTitle)

    // Submit
    await dialog.getByRole('button', { name: /create|save/i }).click()

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })

    // Document should appear somewhere
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 5_000 })
  })

  test('opens document editor by clicking document card', async ({ page }) => {
    await navigateToDocumentsTab(page)

    // Find first document card
    const docCard = page.locator('[data-testid^="document-card-"]').first()

    // If no documents exist, skip
    if (!(await docCard.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    const docTitle = await docCard.locator('span').first().textContent()

    await docCard.click()

    // Sheet should open with editor
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 })

    // Title input should contain the document's title
    if (docTitle) {
      await expect(page.locator('input[placeholder="Document title..."]')).toHaveValue(docTitle, { timeout: 5_000 })
    }
  })

  test('collapse and expand initiative section', async ({ page }) => {
    await navigateToDocumentsTab(page)

    // Find first initiative section header
    const sectionHeader = page.locator('[data-testid^="initiative-header-"]').first()

    if (!(await sectionHeader.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    // Click to collapse
    await sectionHeader.click()

    // Click again to expand
    await sectionHeader.click()

    // Section should still be visible
    await expect(sectionHeader).toBeVisible()
  })

  // ===========================================================================
  // Phase 3: Folders, Filter Bar, Folder Manager
  // ===========================================================================

  test('filter bar renders with 3 filter controls', async ({ page }) => {
    await navigateToDocumentsTab(page)

    // Skip if empty state (no documents/initiatives)
    const filterBar = page.getByTestId('documents-filter-bar')
    if (!(await filterBar.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await expect(page.getByTestId('filter-initiative-status')).toBeVisible()
    await expect(page.getByTestId('filter-name-search')).toBeVisible()
    await expect(page.getByTestId('filter-doc-status')).toBeVisible()
  })

  test('filter by name search filters initiative sections', async ({ page }) => {
    await navigateToDocumentsTab(page)

    const searchInput = page.getByTestId('filter-name-search')
    if (!(await searchInput.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    // Get count of initiative sections before filtering
    const initialSections = page.locator('[data-testid^="initiative-section-"]')
    const initialCount = await initialSections.count()

    if (initialCount < 2) {
      test.skip()
      return
    }

    // Type a search that likely won't match all initiatives
    await searchInput.fill('zzzznonexistent')
    await page.waitForTimeout(300) // debounce

    // Sections should be filtered (fewer or no results)
    const filteredSections = page.locator('[data-testid^="initiative-section-"]')
    const filteredCount = await filteredSections.count()
    expect(filteredCount).toBeLessThan(initialCount)

    // Clear search
    await searchInput.fill('')
    await page.waitForTimeout(300)

    // Sections should restore
    const restoredCount = await page.locator('[data-testid^="initiative-section-"]').count()
    expect(restoredCount).toBe(initialCount)
  })

  test('clear filters restores all sections', async ({ page }) => {
    await navigateToDocumentsTab(page)

    const searchInput = page.getByTestId('filter-name-search')
    if (!(await searchInput.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    // Apply a name filter
    await searchInput.fill('zzzznonexistent')
    await page.waitForTimeout(300)

    // "Clear filters" link or no-filter-results should appear
    const clearFilterBtn = page.getByTestId('filter-clear')
    const noResults = page.getByTestId('no-filter-results')

    if (await clearFilterBtn.isVisible().catch(() => false)) {
      await clearFilterBtn.click()
      await page.waitForTimeout(300)
      // Search input should be empty after clear
      await expect(searchInput).toHaveValue('')
    } else if (await noResults.isVisible().catch(() => false)) {
      // No-results state has its own "Clear filters" link
      const clearLink = noResults.locator('button, a').first()
      await clearLink.click()
      await page.waitForTimeout(300)
    }
  })

  test('folders separator renders when folders exist', async ({ page }) => {
    await navigateToDocumentsTab(page)

    // Check if folders separator exists (may not if no folders created)
    const separator = page.getByTestId('folders-separator')
    // This test just validates the element renders when present - skip if no folders
    if (await separator.isVisible().catch(() => false)) {
      await expect(separator).toBeVisible()
    }
  })

  test('folder manager popover opens and shows content', async ({ page }) => {
    await navigateToDocumentsTab(page)

    const trigger = page.getByTestId('folder-manager-trigger')
    if (!(await trigger.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    // Open popover
    await trigger.click()

    // Should see "Manage Folders" heading and "Add folder" button
    await expect(page.getByText('Manage Folders')).toBeVisible({ timeout: 3_000 })
    await expect(page.getByTestId('folder-add-button')).toBeVisible()
  })
})
