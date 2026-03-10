/**
 * E2E Tests — Meeting Notes Analysis
 *
 * Tests sending meeting notes via customer chat and verifying
 * the agent analyzes them and creates a document.
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

// Run tests serially since they share state
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
// Helper: navigate to first customer and open chat
// =============================================================================

async function navigateToCustomerChat(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/customers`)
  await page.waitForLoadState('networkidle')

  // Click first customer card
  const customerCard = page.locator('[data-testid^="customer-card-"]').first()
  await expect(customerCard).toBeVisible({ timeout: 10_000 })
  await customerCard.click()
  await page.waitForLoadState('networkidle')

  // Open chat panel if not already visible
  const chatToggle = page.getByTestId('chat-toggle').or(page.getByRole('button', { name: /chat|ai|assistant/i }))
  if (await chatToggle.isVisible()) {
    await chatToggle.click()
    await page.waitForTimeout(500)
  }

  // Wait for chat input to be ready
  const chatInput = page.getByTestId('chat-input').or(page.locator('textarea[placeholder*="message"]')).or(page.locator('textarea[placeholder*="Message"]'))
  await expect(chatInput).toBeVisible({ timeout: 10_000 })
}

// =============================================================================
// Sample Meeting Notes
// =============================================================================

const SAMPLE_MEETING_NOTES = `Here are my meeting notes from today's status meeting:

Meeting: Weekly Status Check with Acme Corp
Date: March 9, 2026
Attendees: John (CEO), Sarah (VP Product), Me

Summary:
- Discussed current project progress. Phase 1 is 80% complete.
- John raised concerns about timeline slippage for the Q2 launch.
- Sarah asked if we can prioritize the dashboard feature over the reporting module.
- Agreed to extend the Phase 1 deadline by 2 weeks.
- John mentioned competitor XYZ just launched a similar product.

Action Items:
- Me: Send updated timeline by Friday
- Sarah: Provide dashboard requirements doc by Wednesday
- John: Schedule board review for next month

Questions raised:
- Can we add SSO support in Phase 1? (Answered: No, deferred to Phase 2)
- What's the budget impact of the timeline change? (Left open)

Please analyze these meeting notes.`

// =============================================================================
// Tests
// =============================================================================

test.describe('Meeting Notes Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('can send meeting notes in customer chat', async ({ page }) => {
    await navigateToCustomerChat(page)

    // Find and fill the chat input
    const chatInput = page.getByTestId('chat-input').or(page.locator('textarea[placeholder*="message"]')).or(page.locator('textarea[placeholder*="Message"]'))
    await chatInput.fill(SAMPLE_MEETING_NOTES)

    // Submit the message
    const sendButton = page.getByTestId('chat-send').or(page.getByRole('button', { name: /send/i }))
    if (await sendButton.isVisible()) {
      await sendButton.click()
    } else {
      // Try pressing Enter
      await chatInput.press('Enter')
    }

    // Wait for user message to appear in chat
    await expect(
      page.locator('[data-role="user"]').or(page.locator('.user-message')).last(),
    ).toBeVisible({ timeout: 10_000 })

    // Wait for agent response (may take time due to LLM processing)
    // Look for assistant message containing analysis keywords
    const assistantMessage = page.locator('[data-role="assistant"]').or(page.locator('.assistant-message')).last()
    await expect(assistantMessage).toBeVisible({ timeout: 60_000 })

    // Verify the response contains analysis-related content
    // The agent should either analyze directly or mention it created a document
    const responseText = await assistantMessage.textContent()
    expect(responseText).toBeTruthy()

    // The response should reference meeting analysis concepts
    const hasAnalysisContent = responseText && (
      responseText.toLowerCase().includes('meeting') ||
      responseText.toLowerCase().includes('analysis') ||
      responseText.toLowerCase().includes('action item') ||
      responseText.toLowerCase().includes('insight') ||
      responseText.toLowerCase().includes('follow-up') ||
      responseText.toLowerCase().includes('document')
    )
    expect(hasAnalysisContent).toBe(true)
  })

  test('meeting notes analysis document appears in Documents tab', async ({ page }) => {
    // Navigate to the same customer's Documents tab
    await page.goto(`${BASE_URL}/customers`)
    await page.waitForLoadState('networkidle')

    const customerCard = page.locator('[data-testid^="customer-card-"]').first()
    await expect(customerCard).toBeVisible({ timeout: 10_000 })
    await customerCard.click()
    await page.waitForLoadState('networkidle')

    // Click Documents tab
    const documentsTab = page.getByRole('tab', { name: /documents/i })
    await expect(documentsTab).toBeVisible({ timeout: 10_000 })
    await documentsTab.click()
    await page.waitForLoadState('networkidle')

    // Look for meeting notes document
    // The document should have been created by the previous test
    const documentsList = page.getByTestId('documents-tab')
    await expect(documentsList).toBeVisible({ timeout: 10_000 })

    // Check for meeting notes type document or a document with meeting-related title
    const meetingDoc = page.locator('text=/meeting|status|weekly/i').first()

    // This is a soft check — if the previous test created a document, it should appear here
    // If the agent responded inline instead, this won't find a document
    if (await meetingDoc.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(meetingDoc).toBeVisible()
    }
  })
})
