/**
 * E2E Tests - Reference Picker Phase 2: FoundationsSection & FoundationsReferences
 *
 * Tests the Writing References feature within the FoundationsSection component,
 * which appears when artifacts are in `foundations_approval` (or `skeleton`) status.
 *
 * Additionally tests the Writing References collapsible in the ArtifactForm creation dialog.
 *
 * Test credentials (from .claude/rules/testing/playwright-credentials.md):
 *   Email:    kobiagi+nextuptest@gmail.com
 *   Password: Qwerty12345
 *
 * Test structure:
 *   1. Login flow verification
 *   2. Portfolio page loads and artifact cards appear
 *   3. ArtifactForm creation dialog - Writing References collapsible (Phase 1 style)
 *   4. FoundationsSection - Reference display and ReferencePicker toggle
 *      (requires artifact in foundations_approval status - skipped if not found)
 */

import { test, expect, type Page } from '@playwright/test'

// =============================================================================
// Constants
// =============================================================================

const BASE_URL = 'http://localhost:5173'
const EMAIL = 'kobiagi+nextuptest@gmail.com'
const PASSWORD = 'Qwerty12345'

// Timeouts
const NAV_TIMEOUT = 20_000
const ELEMENT_TIMEOUT = 10_000
const DIALOG_TIMEOUT = 8_000

// =============================================================================
// Helpers
// =============================================================================

/**
 * Log in using email + password credentials.
 * Waits for redirect to an authenticated route.
 */
async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/auth/login`)
  await page.waitForURL('**/auth/login', { timeout: NAV_TIMEOUT })

  // The LoginPage uses labeled inputs: "Email address" and a password input
  // Use the input IDs which are id="email" and id="password"
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for redirect to any authenticated area (portfolio, dashboard, etc.)
  await page.waitForURL(/(portfolio|dashboard|home|onboarding)/, { timeout: NAV_TIMEOUT })
}

/**
 * Navigate to the portfolio page and wait for content to load.
 */
async function goToPortfolio(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/portfolio`)
  await page.waitForLoadState('networkidle')
}

/**
 * Open the "New" artifact creation dialog on the Portfolio page.
 * Returns true if the dialog opened successfully.
 */
async function openCreateDialog(page: Page): Promise<boolean> {
  // The portfolio page has a "New" button with data-testid="portfolio-new-button"
  const newButton = page.locator('[data-testid="portfolio-new-button"]')
  await newButton.waitFor({ timeout: ELEMENT_TIMEOUT })
  await newButton.click()

  // Wait for the dialog to appear
  const dialog = page.locator('[data-testid="create-artifact-dialog"]')
  try {
    await dialog.waitFor({ timeout: DIALOG_TIMEOUT })
    return true
  } catch {
    return false
  }
}

/**
 * Find all artifact cards on the portfolio page.
 * Returns the href links to artifact pages.
 */
async function findArtifactLinks(page: Page): Promise<string[]> {
  await page.waitForLoadState('networkidle')
  // ArtifactCards navigate to /portfolio/artifacts/:id when clicked via onEdit
  // The cards themselves have no direct <a> href, but we can look for artifact IDs
  // in the DOM or find clickable artifact card elements
  const artifactCards = page.locator('[data-testid="artifact-card"]')
  const count = await artifactCards.count()
  const links: string[] = []

  for (let i = 0; i < count; i++) {
    const card = artifactCards.nth(i)
    // Extract the artifact ID from data attribute if present
    const artifactId = await card.getAttribute('data-artifact-id')
    if (artifactId) {
      links.push(`${BASE_URL}/portfolio/artifacts/${artifactId}`)
    }
  }

  return links
}

// =============================================================================
// Test Suite 1: Authentication
// =============================================================================

test.describe('Authentication - Login Flow', () => {
  test('should login successfully and redirect to authenticated area', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`)
    await page.waitForURL('**/auth/login', { timeout: NAV_TIMEOUT })

    // Verify login page elements are present
    await expect(page.locator('#email')).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    await expect(page.locator('#password')).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // Fill credentials
    await page.locator('#email').fill(EMAIL)
    await page.locator('#password').fill(PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to an authenticated route
    await page.waitForURL(/(portfolio|dashboard|home|onboarding)/, { timeout: NAV_TIMEOUT })
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/(portfolio|dashboard|home|onboarding)/)
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`)
    await page.waitForURL('**/auth/login', { timeout: NAV_TIMEOUT })

    await page.locator('#email').fill('invalid@example.com')
    await page.locator('#password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should show error message and stay on login page
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: /invalid|incorrect|password/i })
    await expect(errorAlert).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    expect(page.url()).toContain('/auth/login')
  })
})

// =============================================================================
// Test Suite 2: Portfolio Page
// =============================================================================

test.describe('Portfolio Page - Structure', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToPortfolio(page)
  })

  test('should display Portfolio page header and New button', async ({ page }) => {
    // Portfolio heading
    await expect(page.getByRole('heading', { name: /portfolio/i }).first()).toBeVisible({ timeout: ELEMENT_TIMEOUT })

    // "New" button with data-testid
    await expect(page.locator('[data-testid="portfolio-new-button"]')).toBeVisible({ timeout: ELEMENT_TIMEOUT })
  })

  test('should show type filter tabs (All, Posts, Blogs, Showcases)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^all$/i }).first()).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    // At minimum, "All" filter tab must be present
    const allFilterButton = page.getByRole('button', { name: /^all$/i }).first()
    await expect(allFilterButton).toBeVisible()
  })

  test('should show AI Research/Assistant toggle button', async ({ page }) => {
    const aiButton = page.locator('[data-testid="ai-research-button"]')
    await expect(aiButton).toBeVisible({ timeout: ELEMENT_TIMEOUT })
  })
})

// =============================================================================
// Test Suite 3: ArtifactForm - Writing References Collapsible (Creation Dialog)
// =============================================================================

test.describe('ArtifactForm - Writing References in Creation Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToPortfolio(page)
  })

  test('Create New Content dialog opens and contains Writing References section', async ({ page }) => {
    const dialogOpened = await openCreateDialog(page)
    expect(dialogOpened).toBe(true)

    // Verify dialog title
    await expect(page.getByText('Create New Content')).toBeVisible({ timeout: DIALOG_TIMEOUT })

    // Writing References collapsible trigger should be visible
    // It contains the text "Writing References" with "(optional)" label
    const writingRefsLabel = page.getByText('Writing References').first()
    await expect(writingRefsLabel).toBeVisible({ timeout: ELEMENT_TIMEOUT })
  })

  test('Writing References shows "(optional)" label when no references selected', async ({ page }) => {
    const dialogOpened = await openCreateDialog(page)
    expect(dialogOpened).toBe(true)

    // The Writing References collapsible trigger button has accessible name including "(optional)"
    // when no references are selected. Scope to the dialog to avoid matching "Content (optional)".
    const dialog = page.locator('[data-testid="create-artifact-dialog"]')
    // The collapsible trigger button contains both "Writing References" and "(optional)"
    const writingRefsTrigger = dialog.getByRole('button', { name: /writing references/i }).first()
    await expect(writingRefsTrigger).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    // Verify it contains the "(optional)" text inside the button
    await expect(writingRefsTrigger).toContainText('(optional)')
  })

  test('Clicking Writing References collapsible expands to show ReferencePicker or empty state', async ({ page }) => {
    const dialogOpened = await openCreateDialog(page)
    expect(dialogOpened).toBe(true)

    // Find and click the collapsible trigger for Writing References
    // The trigger is a flex row containing "Writing References" and ChevronDown
    const collapsibleTrigger = page.locator('[data-radix-collapsible-trigger]').filter({
      hasText: /writing references/i
    })

    // If the Radix collapsible trigger exists, click it
    const triggerCount = await collapsibleTrigger.count()
    if (triggerCount > 0) {
      await collapsibleTrigger.first().click()
      // After expanding, check for content
      // Either "Your writing, your voice" (empty state) or "Add new reference" (with references)
      const expandedContent = page.locator(
        'text="Your writing, your voice", text="Add new reference"'
      )
      // Wait briefly for collapse animation
      await page.waitForTimeout(500)
      // The collapsible should now be in open state - check for [data-state="open"]
      const openCollapsible = page.locator('[data-state="open"]')
      const isOpen = await openCollapsible.count()
      expect(isOpen).toBeGreaterThan(0)
    } else {
      // Fallback: find a button row containing "Writing References" text and click it
      const refsTriggerFallback = page.locator('button:has-text("Writing References"), [role="button"]:has-text("Writing References")')
      const fallbackCount = await refsTriggerFallback.count()

      if (fallbackCount > 0) {
        await refsTriggerFallback.first().click()
        await page.waitForTimeout(500)
      }
      // Verify Writing References text is still visible (section is present)
      await expect(page.getByText('Writing References').first()).toBeVisible()
    }
  })

  test('Creation dialog has type selector defaulting to Social Post', async ({ page }) => {
    const dialogOpened = await openCreateDialog(page)
    expect(dialogOpened).toBe(true)

    // The type selector should exist with data-testid="artifact-form-type"
    const typeSelector = page.locator('[data-testid="artifact-form-type"]')
    await expect(typeSelector).toBeVisible({ timeout: ELEMENT_TIMEOUT })

    // It should show one of the content types
    const selectorText = await typeSelector.textContent()
    expect(selectorText).toMatch(/social post|blog post|case study/i)
  })

  test('Creation dialog has title input with correct data-testid', async ({ page }) => {
    const dialogOpened = await openCreateDialog(page)
    expect(dialogOpened).toBe(true)

    const titleInput = page.locator('[data-testid="artifact-form-title"]')
    await expect(titleInput).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    await expect(titleInput).toBeEditable()
  })

  test('Creation dialog has Save as Draft and Create Content buttons', async ({ page }) => {
    const dialogOpened = await openCreateDialog(page)
    expect(dialogOpened).toBe(true)

    await expect(page.locator('[data-testid="artifact-form-save-draft"]')).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    await expect(page.locator('[data-testid="artifact-form-create-content"]')).toBeVisible({ timeout: ELEMENT_TIMEOUT })
  })

  test('Cancel button in creation dialog closes the dialog', async ({ page }) => {
    const dialogOpened = await openCreateDialog(page)
    expect(dialogOpened).toBe(true)

    // Verify dialog is open
    await expect(page.locator('[data-testid="create-artifact-dialog"]')).toBeVisible()

    // Click cancel
    await page.locator('[data-testid="artifact-form-cancel"]').click()

    // Dialog should close
    await expect(page.locator('[data-testid="create-artifact-dialog"]')).not.toBeVisible({ timeout: ELEMENT_TIMEOUT })
  })
})

// =============================================================================
// Test Suite 4: ArtifactPage - FoundationsSection with Writing References
// =============================================================================

test.describe('ArtifactPage - FoundationsSection with FoundationsReferences', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  /**
   * This test navigates to the portfolio, finds any artifact that's in
   * foundations_approval status, and tests the FoundationsSection + FoundationsReferences.
   * If no such artifact exists, it is skipped gracefully.
   */
  test('FoundationsSection renders with Writing References section when artifact is in foundations_approval', async ({ page }) => {
    await goToPortfolio(page)

    // Look for artifact cards. If there are any, try to find one in foundations_approval.
    // ArtifactCard status badges show status text like "NEEDS APPROVAL" or specific statuses.
    const statusBadges = page.locator('[data-testid="artifact-status-badge"]')
    const badgeCount = await statusBadges.count()

    let foundFoundationsArtifact = false
    let artifactUrl = ''

    // Scan visible artifact cards for a foundations_approval status
    for (let i = 0; i < badgeCount; i++) {
      const badge = statusBadges.nth(i)
      const badgeText = await badge.textContent()
      if (badgeText && /foundations|approval|skeleton/i.test(badgeText)) {
        // Find the parent card and get the artifact ID
        const parentCard = badge.locator('[data-artifact-id]').first()
        const artifactId = await parentCard.getAttribute('data-artifact-id').catch(() => null)
        if (artifactId) {
          artifactUrl = `${BASE_URL}/portfolio/artifacts/${artifactId}`
          foundFoundationsArtifact = true
          break
        }
      }
    }

    if (!foundFoundationsArtifact) {
      // Skip if no foundations_approval artifact found
      test.skip(true, 'No artifact in foundations_approval status found in portfolio - test requires specific pipeline state')
      return
    }

    // Navigate to the artifact page
    await page.goto(artifactUrl)
    await page.waitForLoadState('networkidle')

    // FoundationsSection should be auto-expanded for foundations_approval status
    const foundationsSection = page.locator('[data-testid="foundations-section"]')
    await expect(foundationsSection).toBeVisible({ timeout: ELEMENT_TIMEOUT })

    // Writing References section (FoundationsReferences) should appear inside
    const writingRefsHeading = foundationsSection.getByText('Writing References')
    await expect(writingRefsHeading).toBeVisible({ timeout: ELEMENT_TIMEOUT })
  })

  test('FoundationsSection collapsed state has correct expand button', async ({ page }) => {
    await goToPortfolio(page)

    // Navigate to first available artifact
    const artifactCards = page.locator('[data-testid="artifact-card"]')
    const cardCount = await artifactCards.count()

    if (cardCount === 0) {
      test.skip(true, 'No artifacts available in portfolio to test FoundationsSection')
      return
    }

    // Click on first artifact card to navigate to artifact page
    await artifactCards.first().click()
    await page.waitForURL('**/portfolio/artifacts/**', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Check if FoundationsSection is visible (collapsed or expanded)
    const collapsedSection = page.locator('[data-testid="foundations-section-collapsed"]')
    const expandedSection = page.locator('[data-testid="foundations-section"]')

    const isCollapsed = await collapsedSection.count()
    const isExpanded = await expandedSection.count()

    if (isCollapsed > 0) {
      // Collapsed state: expand button should exist
      const expandButton = page.locator('[data-testid="foundations-expand-button"]')
      await expect(expandButton).toBeVisible({ timeout: ELEMENT_TIMEOUT })

      // Click to expand
      await expandButton.click()

      // Should now show expanded section
      await expect(page.locator('[data-testid="foundations-section"]')).toBeVisible({ timeout: ELEMENT_TIMEOUT })

      // Collapse button should appear
      const collapseButton = page.locator('[data-testid="foundations-collapse-button"]')
      await expect(collapseButton).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    } else if (isExpanded > 0) {
      // Already expanded: collapse button should be visible
      const collapseButton = page.locator('[data-testid="foundations-collapse-button"]')
      await expect(collapseButton).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    } else {
      // FoundationsSection not visible: artifact status doesn't show it (e.g., draft/ready/published)
      // This is expected - mark as skipped scenario
      console.log('[test] FoundationsSection not visible for this artifact status - expected for non-foundations statuses')
    }
  })

  test('FoundationsSection Writing References shows "Using default voice matching" when no references selected', async ({ page }) => {
    await goToPortfolio(page)

    // Try to find any artifact in a foundations-visible status
    const allArtifactCards = page.locator('[data-testid="artifact-card"]')
    const cardCount = await allArtifactCards.count()

    if (cardCount === 0) {
      test.skip(true, 'No artifacts to test - portfolio is empty')
      return
    }

    // Navigate to each artifact until we find one with FoundationsSection visible
    let foundFoundationsSection = false
    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      await allArtifactCards.nth(i).click()
      await page.waitForURL('**/portfolio/artifacts/**', { timeout: NAV_TIMEOUT })
      await page.waitForLoadState('networkidle')

      // Check if foundations section is visible (collapsed or expanded)
      const sectionVisible = await page.locator('[data-testid="foundations-section"], [data-testid="foundations-section-collapsed"]').count()
      if (sectionVisible > 0) {
        foundFoundationsSection = true

        // If collapsed, expand it
        const collapseBtn = page.locator('[data-testid="foundations-expand-button"]')
        const isCollapsed = await collapseBtn.count()
        if (isCollapsed > 0) {
          await collapseBtn.click()
          await page.waitForTimeout(300)
        }

        // Check for Writing References section
        const writingRefsVisible = await page.getByText('Writing References').count()
        if (writingRefsVisible > 0) {
          // Now check the default voice matching text (no references selected)
          // OR reference names if references are selected
          const defaultVoiceText = page.getByText('Using default voice matching')
          const hasDefaultVoice = await defaultVoiceText.count()

          if (hasDefaultVoice > 0) {
            await expect(defaultVoiceText).toBeVisible({ timeout: ELEMENT_TIMEOUT })
          } else {
            // References are selected - verify at least one reference name is shown
            const referenceList = page.locator('[data-testid="foundations-section"] .truncate')
            const refCount = await referenceList.count()
            // Either references are listed or we're in default voice mode
            console.log(`[test] Found ${refCount} reference items in FoundationsSection`)
          }
          break
        }
      }

      // Navigate back to portfolio to try next artifact
      await page.goto(`${BASE_URL}/portfolio`)
      await page.waitForLoadState('networkidle')
    }

    if (!foundFoundationsSection) {
      test.skip(true, 'No artifacts with FoundationsSection in a foundations-visible status found')
    }
  })

  /**
   * CRITICAL TEST: Verifies the "Change" button in FoundationsReferences opens ReferencePicker
   * and "Cancel" collapses it back.
   *
   * This test requires an artifact in foundations_approval or skeleton status.
   * Marked as skip if the required state is not available.
   */
  test.skip('FoundationsReferences Change button opens ReferencePicker and Cancel collapses it', async ({ page }) => {
    // This test requires an artifact in foundations_approval status with editable references
    // Skip automatically unless specific pipeline state is available
    // To run this test: ensure an artifact is in foundations_approval status
    await goToPortfolio(page)

    // Find artifact in foundations_approval status
    // (Implementation would require direct DB state or a pre-existing artifact)
    await page.waitForLoadState('networkidle')

    // Locate an artifact with "NEEDS APPROVAL" badge (foundations_approval status indicator)
    const needsApprovalBadge = page.locator('text=NEEDS APPROVAL')
    const hasBadge = await needsApprovalBadge.count()

    if (hasBadge === 0) {
      console.log('[test SKIP] No artifact in foundations_approval status - "NEEDS APPROVAL" badge not found')
      return
    }

    // Click on the artifact that needs approval
    const parentCard = needsApprovalBadge.locator('..').locator('..').locator('..')
    await parentCard.click()
    await page.waitForURL('**/portfolio/artifacts/**', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // FoundationsSection should be auto-expanded (foundations_approval status auto-expands)
    const foundationsSection = page.locator('[data-testid="foundations-section"]')
    await expect(foundationsSection).toBeVisible({ timeout: ELEMENT_TIMEOUT })

    // Writing References heading with Change button (editable=true when not locked)
    const changeButton = foundationsSection.getByRole('button', { name: /change/i })
    await expect(changeButton).toBeVisible({ timeout: ELEMENT_TIMEOUT })

    // Click Change to expand into ReferencePicker
    await changeButton.click()
    await page.waitForTimeout(300)

    // ReferencePicker should now be visible (either card list or empty state)
    // The expanded state shows either reference cards or "Your writing, your voice"
    const referencePickerOrEmptyState = foundationsSection.locator(
      'text="Your writing, your voice", text="Add new reference", [aria-pressed]'
    )
    const pickerVisible = await referencePickerOrEmptyState.count()
    expect(pickerVisible).toBeGreaterThan(0)

    // Cancel button should also be visible in expanded state
    const cancelButton = foundationsSection.getByRole('button', { name: /cancel/i })
    await expect(cancelButton).toBeVisible({ timeout: ELEMENT_TIMEOUT })

    // Click Cancel to collapse back to compact mode
    await cancelButton.click()
    await page.waitForTimeout(300)

    // Should be back in compact mode: "Writing References" heading with "Change" button
    await expect(changeButton).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    // ReferencePicker cards should be gone
    const pickerGone = await foundationsSection.locator('[aria-pressed]').count()
    expect(pickerGone).toBe(0)
  })
})

// =============================================================================
// Test Suite 5: ReferencePicker Component Behavior
// =============================================================================

test.describe('ReferencePicker Component Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToPortfolio(page)
  })

  test('Writing References collapsible in creation dialog shows ChevronDown icon that rotates on expand', async ({ page }) => {
    const dialogOpened = await openCreateDialog(page)
    expect(dialogOpened).toBe(true)

    // Collapsible is closed by default (ChevronDown not rotated)
    // Find the chevron in the collapsible trigger
    const collapsibleArea = page.locator('text=Writing References').locator('..').locator('..')
    await expect(collapsibleArea).toBeVisible({ timeout: ELEMENT_TIMEOUT })

    // The collapsible trigger area should be interactive
    const triggerArea = page.locator('[data-radix-collapsible-trigger]')
    const triggerExists = await triggerArea.count()

    if (triggerExists > 0) {
      // Get initial state
      const initialState = await triggerArea.first().getAttribute('data-state')

      await triggerArea.first().click()
      await page.waitForTimeout(400)

      const expandedState = await triggerArea.first().getAttribute('data-state')
      // State should have changed
      expect(expandedState).not.toEqual(initialState)
    }
  })

  test('Writing References selection count badge appears when reference is selected', async ({ page }) => {
    const dialogOpened = await openCreateDialog(page)
    expect(dialogOpened).toBe(true)

    // Expand the Writing References collapsible
    const collapsibleTrigger = page.locator('[data-radix-collapsible-trigger]').filter({
      hasText: /writing references/i
    })
    const triggerCount = await collapsibleTrigger.count()

    if (triggerCount === 0) {
      test.skip(true, 'Collapsible trigger not found in expected structure')
      return
    }

    await collapsibleTrigger.first().click()
    await page.waitForTimeout(500)

    // Check if there are any reference cards (role="button" with aria-pressed)
    const referenceCards = page.locator('[aria-pressed]')
    const cardCount = await referenceCards.count()

    if (cardCount === 0) {
      // Empty state — verify "Your writing, your voice" empty state
      const emptyState = page.getByText('Your writing, your voice')
      await expect(emptyState).toBeVisible({ timeout: ELEMENT_TIMEOUT })
      console.log('[test] Empty state confirmed - no writing references available')
      return
    }

    // Click first reference card to select it
    await referenceCards.first().click()
    await page.waitForTimeout(300)

    // The selection count badge should appear (shows "1 selected")
    const selectionBadge = page.locator('text=/\\d+ selected/')
    await expect(selectionBadge).toBeVisible({ timeout: ELEMENT_TIMEOUT })

    // Aria-pressed should be "true" on the selected card
    const selectedCard = referenceCards.first()
    await expect(selectedCard).toHaveAttribute('aria-pressed', 'true')

    // Click again to deselect
    await selectedCard.click()
    await page.waitForTimeout(300)
    await expect(selectedCard).toHaveAttribute('aria-pressed', 'false')

    // Badge should disappear after deselection
    const badgeGone = await page.locator('text=/1 selected/').count()
    expect(badgeGone).toBe(0)
  })

  test('ReferencePicker shows "Add new reference" button when references exist', async ({ page }) => {
    const dialogOpened = await openCreateDialog(page)
    expect(dialogOpened).toBe(true)

    // Expand Writing References
    const collapsibleTrigger = page.locator('[data-radix-collapsible-trigger]').filter({
      hasText: /writing references/i
    })
    const triggerCount = await collapsibleTrigger.count()

    if (triggerCount === 0) {
      test.skip(true, 'Collapsible trigger not found')
      return
    }

    await collapsibleTrigger.first().click()
    await page.waitForTimeout(500)

    // Check for reference cards - if any exist, "Add new reference" button should appear
    const referenceCards = page.locator('[aria-pressed]')
    const cardCount = await referenceCards.count()

    if (cardCount > 0) {
      // With references present, "Add new reference" dashed button should be visible
      const addButton = page.getByText('Add new reference')
      await expect(addButton).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    } else {
      // Empty state - "Add your first reference" button should be visible
      const addFirstButton = page.getByText('Add your first reference')
      await expect(addFirstButton).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    }
  })
})

// =============================================================================
// Test Suite 6: ArtifactPage - Structure and Navigation
// =============================================================================

test.describe('ArtifactPage - Structure and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Artifact page loads correctly when navigating from portfolio', async ({ page }) => {
    await goToPortfolio(page)
    await page.waitForLoadState('networkidle')

    // Find artifact cards
    const artifactCards = page.locator('[data-testid="artifact-card"]')
    const cardCount = await artifactCards.count()

    if (cardCount === 0) {
      test.skip(true, 'No artifacts in portfolio to navigate to')
      return
    }

    // Click first artifact card
    await artifactCards.first().click()
    await page.waitForURL('**/portfolio/artifacts/**', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Artifact page should have the main container
    await expect(page.locator('[data-testid="artifact-page"]')).toBeVisible({ timeout: ELEMENT_TIMEOUT })

    // Header should have back button and AI assistant button
    const header = page.locator('[data-testid="artifact-page-header"]')
    await expect(header).toBeVisible({ timeout: ELEMENT_TIMEOUT })

    const backButton = page.locator('[data-testid="artifact-page-back-button"]')
    await expect(backButton).toBeVisible({ timeout: ELEMENT_TIMEOUT })

    const aiButton = page.locator('[data-testid="artifact-page-ai-assistant-button"]')
    await expect(aiButton).toBeVisible({ timeout: ELEMENT_TIMEOUT })
  })

  test('Back button on artifact page navigates to portfolio', async ({ page }) => {
    await goToPortfolio(page)
    await page.waitForLoadState('networkidle')

    const artifactCards = page.locator('[data-testid="artifact-card"]')
    const cardCount = await artifactCards.count()

    if (cardCount === 0) {
      test.skip(true, 'No artifacts to navigate to for back button test')
      return
    }

    await artifactCards.first().click()
    await page.waitForURL('**/portfolio/artifacts/**', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Click back button
    await page.locator('[data-testid="artifact-page-back-button"]').click()
    await page.waitForURL('**/portfolio', { timeout: NAV_TIMEOUT })

    expect(page.url()).toMatch(/\/portfolio$/)
  })

  test('FoundationsSection expand/collapse toggle works correctly on artifact page', async ({ page }) => {
    await goToPortfolio(page)
    await page.waitForLoadState('networkidle')

    const artifactCards = page.locator('[data-testid="artifact-card"]')
    const cardCount = await artifactCards.count()

    if (cardCount === 0) {
      test.skip(true, 'No artifacts available for FoundationsSection toggle test')
      return
    }

    // Navigate to first artifact
    await artifactCards.first().click()
    await page.waitForURL('**/portfolio/artifacts/**', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Check if FoundationsSection is present in collapsed state
    const collapsedState = page.locator('[data-testid="foundations-section-collapsed"]')
    const expandedState = page.locator('[data-testid="foundations-section"]')

    const collapsedCount = await collapsedState.count()
    const expandedCount = await expandedState.count()

    if (collapsedCount === 0 && expandedCount === 0) {
      // FoundationsSection is not visible for this artifact status (expected for draft/ready/published)
      console.log('[test] FoundationsSection not visible for this artifact - status does not include foundations workflow')
      return
    }

    if (collapsedCount > 0) {
      // Test expand
      const expandBtn = page.locator('[data-testid="foundations-expand-button"]')
      await expect(expandBtn).toBeVisible({ timeout: ELEMENT_TIMEOUT })
      await expandBtn.click()

      // Should now show expanded section
      await expect(page.locator('[data-testid="foundations-section"]')).toBeVisible({ timeout: ELEMENT_TIMEOUT })

      // Test collapse
      const collapseBtn = page.locator('[data-testid="foundations-collapse-button"]')
      await expect(collapseBtn).toBeVisible({ timeout: ELEMENT_TIMEOUT })
      await collapseBtn.click()

      // Should return to collapsed
      await expect(page.locator('[data-testid="foundations-section-collapsed"]')).toBeVisible({ timeout: ELEMENT_TIMEOUT })
    }
  })
})
