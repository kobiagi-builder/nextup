/**
 * E2E Tests - Action Items Kanban Board
 *
 * Tests the Kanban board at /action-items.
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

// Run tests serially since they share state (created action items)
test.describe.configure({ mode: 'serial' })

// =============================================================================
// Helper: login
// =============================================================================

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/auth/login`)

  // If already logged in, we'll be redirected
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
// Tests
// =============================================================================

test.describe('Action Items Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('board page loads with toolbar', async ({ page }) => {
    await page.goto(`${BASE_URL}/action-items`)
    await page.waitForLoadState('networkidle')

    // Toolbar should always be visible
    const addButton = page.getByRole('button', { name: /add item/i })
    await expect(addButton).toBeVisible({ timeout: 10_000 })

    // Title
    await expect(page.getByText('Action Items')).toBeVisible()
  })

  test('creates action item and board shows columns', async ({ page }) => {
    const uniqueDesc = `E2E test ${Date.now()}`

    await page.goto(`${BASE_URL}/action-items`)
    await page.waitForLoadState('networkidle')

    // Click Add Item (works from both empty state CTA and toolbar)
    const addButton = page.getByRole('button', { name: /add item|create action item/i }).first()
    await expect(addButton).toBeVisible({ timeout: 10_000 })
    await addButton.click()

    // Wait for dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Fill description
    await dialog.getByPlaceholder(/what needs to happen/i).fill(uniqueDesc)

    // Submit
    await dialog.getByRole('button', { name: /^create$/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })

    // Board should now show columns with the item
    await expect(page.getByText('To Do')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('In Progress')).toBeVisible()
    await expect(page.getByText('Done')).toBeVisible()
    await expect(page.getByText('Cancelled')).toBeVisible()

    // Item should be visible
    await expect(page.getByText(uniqueDesc)).toBeVisible()
  })

  test('clicks a card to open edit dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/action-items`)
    await page.waitForLoadState('networkidle')

    // Wait for any card to be visible
    const card = page.locator('.rounded-lg.border.bg-card').first()
    await expect(card).toBeVisible({ timeout: 10_000 })
    await card.click()

    // Edit dialog should open
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByText(/edit action item/i)).toBeVisible()

    // Close
    await dialog.getByRole('button', { name: /cancel/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 3_000 })
  })

  test('sidebar has Action Items link and navigates', async ({ page }) => {
    await page.goto(`${BASE_URL}/portfolio`)
    await page.waitForLoadState('networkidle')

    // Sidebar is collapsed by default — find the link by href
    const navLink = page.locator('a[href="/action-items"]')
    await expect(navLink).toBeAttached({ timeout: 10_000 })

    // Hover sidebar to expand, then click
    const sidebar = page.locator('aside').first()
    await sidebar.hover()
    await page.waitForTimeout(400) // Wait for expand animation
    await navLink.click()
    await page.waitForURL('**/action-items', { timeout: 10_000 })
  })
})
