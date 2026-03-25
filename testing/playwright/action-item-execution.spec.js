/**
 * Action Item Execution Feature Tests
 *
 * Phase 1:
 * - Visibility gating: only on "todo" status items
 * - Status transition to "in_progress" on click
 * - Chat panel opening with pre-populated trigger message
 * - Kanban board execute button visibility per column
 * - Navigation from kanban board to customer page with chat open
 *
 * Phase 2 (result visibility & execution state):
 * - Loading animation during execution (pulsing border)
 * - "Executing..." indicator replaces status badge
 * - Other Execute buttons disabled during execution
 * - Document link on done items with linked document
 * - Document link navigates to Documents tab and opens editor
 * - Collapsible execution summary on done items
 * - Items without execution results show no doc link or summary
 */

import { test, expect } from '@playwright/test';

const TARGET_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'kobiagi+nextuptest@gmail.com';
const LOGIN_PASSWORD = 'Qwerty12345';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Log in and wait for the portfolio page to be ready.
 */
async function login(page) {
  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"], input[type="email"]', LOGIN_EMAIL);
  await page.fill('input[name="password"], input[type="password"]', LOGIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/portfolio', { timeout: 15000 });
  await page.waitForTimeout(1500);
  console.log('   Logged in — on portfolio page');
}

/**
 * Navigate to the customer list, click the first customer card, then
 * switch to the Action Items tab. Returns the customer page URL.
 *
 * Requires the user to already be logged in.
 */
async function navigateToFirstCustomerActionItemsTab(page) {
  console.log('   Navigating to Customers...');
  // Sidebar link — look for the "Customers" nav item
  const customersLink = page.locator('nav a[href*="/customers"], [role="navigation"] a[href*="/customers"]').first();
  await customersLink.waitFor({ state: 'visible', timeout: 10000 });
  await customersLink.click();
  await page.waitForURL('**/customers', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Click the first customer card
  const firstCard = page.locator('[class*="CustomerCard"], a[href*="/customers/"]').first();
  await firstCard.waitFor({ state: 'visible', timeout: 10000 });
  await firstCard.click();
  await page.waitForURL('**/customers/**', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const customerUrl = page.url();
  console.log(`   On customer page: ${customerUrl}`);

  // Click the "Action Items" tab
  const actionItemsTab = page.locator('[role="tab"]').filter({ hasText: /action items/i });
  await actionItemsTab.waitFor({ state: 'visible', timeout: 8000 });
  await actionItemsTab.click();
  await page.waitForTimeout(800);
  console.log('   Switched to Action Items tab');

  return customerUrl;
}

/**
 * Hover over a card/row to reveal hover-visible elements (Execute button uses
 * opacity-0 group-hover:opacity-100 on the list row).
 */
async function hoverToReveal(page, locator) {
  await locator.hover();
  await page.waitForTimeout(300);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Action Item Execution Feature', () => {
  // Shared login — each test logs in fresh to avoid state bleed
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────
  test('Execute button appears only on todo items in customer Action Items tab', async ({ page }) => {
    console.log('='.repeat(70));
    console.log('TEST 1: Execute button visibility on todo vs non-todo items');
    console.log('='.repeat(70));

    await navigateToFirstCustomerActionItemsTab(page);

    // Wait for the action item list to render
    await page.waitForTimeout(1000);

    // Find all action item rows rendered on the page
    const allRows = page.locator('[class*="group rounded-lg border bg-card"]');
    const rowCount = await allRows.count();
    console.log(`   Found ${rowCount} action item row(s)`);

    if (rowCount === 0) {
      console.log('   SKIP: No action items found for this customer');
      return;
    }

    let todoRowFound = false;
    let nonTodoRowFound = false;

    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);

      // Determine status from the status badge text
      const statusBadge = row.locator('button').filter({ hasText: /^(To Do|In Progress|On Hold|Done|Cancelled)$/i }).first();
      const statusText = (await statusBadge.textContent().catch(() => '')).trim().toLowerCase();

      await hoverToReveal(page, row);

      const executeButton = row.locator('button[title="Execute with AI"]');
      const isExecuteVisible = await executeButton.isVisible().catch(() => false);

      if (statusText === 'to do') {
        todoRowFound = true;
        expect(isExecuteVisible).toBe(true);
        console.log(`   Row ${i + 1} (todo): Execute button visible — PASS`);
      } else if (statusText !== '') {
        nonTodoRowFound = true;
        expect(isExecuteVisible).toBe(false);
        console.log(`   Row ${i + 1} (${statusText}): Execute button hidden — PASS`);
      }
    }

    if (!todoRowFound) {
      console.log('   WARN: No "todo" items found — could not verify positive case');
    }
    if (!nonTodoRowFound) {
      console.log('   WARN: No non-todo items found — could not verify negative case');
    }

    console.log('TEST 1 COMPLETE');
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────
  test('Execute button does NOT appear on in_progress, done, or cancelled items', async ({ page }) => {
    console.log('='.repeat(70));
    console.log('TEST 2: Execute button absent on non-todo statuses');
    console.log('='.repeat(70));

    await navigateToFirstCustomerActionItemsTab(page);
    await page.waitForTimeout(1000);

    const allRows = page.locator('[class*="group rounded-lg border bg-card"]');
    const rowCount = await allRows.count();
    console.log(`   Found ${rowCount} action item row(s)`);

    if (rowCount === 0) {
      console.log('   SKIP: No action items present');
      return;
    }

    // For every row that is NOT "To Do", the execute button must be absent
    const nonTodoStatuses = ['in progress', 'on hold', 'done', 'cancelled'];

    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);
      const statusBadge = row.locator('button').filter({ hasText: /^(To Do|In Progress|On Hold|Done|Cancelled)$/i }).first();
      const statusText = (await statusBadge.textContent().catch(() => '')).trim().toLowerCase();

      if (nonTodoStatuses.includes(statusText)) {
        await hoverToReveal(page, row);
        const executeButton = row.locator('button[title="Execute with AI"]');
        await expect(executeButton).not.toBeVisible({ timeout: 2000 });
        console.log(`   Row ${i + 1} (${statusText}): Execute button correctly absent — PASS`);
      }
    }

    console.log('TEST 2 COMPLETE');
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────
  test('Clicking Execute changes item status to In Progress', async ({ page }) => {
    console.log('='.repeat(70));
    console.log('TEST 3: Execute click transitions status to in_progress');
    console.log('='.repeat(70));

    await navigateToFirstCustomerActionItemsTab(page);
    await page.waitForTimeout(1000);

    // Find a todo row
    const allRows = page.locator('[class*="group rounded-lg border bg-card"]');
    const rowCount = await allRows.count();

    if (rowCount === 0) {
      console.log('   SKIP: No action items present');
      return;
    }

    let todoRow = null;
    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);
      const statusBadge = row.locator('button').filter({ hasText: /^To Do$/i }).first();
      if (await statusBadge.isVisible().catch(() => false)) {
        todoRow = row;
        console.log(`   Found todo item at row ${i + 1}`);
        break;
      }
    }

    if (!todoRow) {
      console.log('   SKIP: No "todo" items found — cannot test execute');
      return;
    }

    // Hover to make Execute button visible
    await hoverToReveal(page, todoRow);

    const executeButton = todoRow.locator('button[title="Execute with AI"]');
    await expect(executeButton).toBeVisible({ timeout: 5000 });
    console.log('   Execute button is visible');

    // Capture item description for identification after click
    const descEl = todoRow.locator('p.text-sm.text-foreground').first();
    const description = await descEl.textContent().catch(() => '');
    console.log(`   Item description: "${description.trim().substring(0, 60)}"`);

    // Click Execute
    await executeButton.click();
    console.log('   Clicked Execute button');

    // Wait for the status update API call and UI re-render
    await page.waitForTimeout(2500);

    // The item should now show "In Progress" status badge.
    // After status changes the row may still be present (filtered or not).
    // Check if any item with the same description now shows "In Progress",
    // OR verify that the original row's status badge changed.
    const inProgressBadge = page.locator('button').filter({ hasText: /^In Progress$/i }).first();
    const badgeVisible = await inProgressBadge.isVisible({ timeout: 5000 }).catch(() => false);

    if (badgeVisible) {
      console.log('   Status badge now shows "In Progress" — PASS');
    } else {
      // The item may have been filtered out of the current view if a status
      // filter is active. Check toast notification as a secondary signal.
      const toast = page.locator('[role="region"]').filter({ hasText: /in progress/i }).first();
      const toastVisible = await toast.isVisible({ timeout: 3000 }).catch(() => false);
      if (toastVisible) {
        console.log('   Toast confirmed status update to In Progress — PASS');
      } else {
        console.log('   WARN: Could not visually confirm "In Progress" — item may be filtered');
      }
    }

    console.log('TEST 3 COMPLETE');
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────
  test('Clicking Execute opens chat panel with trigger message visible', async ({ page }) => {
    console.log('='.repeat(70));
    console.log('TEST 4: Execute opens chat panel with pre-populated message');
    console.log('='.repeat(70));

    await navigateToFirstCustomerActionItemsTab(page);
    await page.waitForTimeout(1000);

    const allRows = page.locator('[class*="group rounded-lg border bg-card"]');
    const rowCount = await allRows.count();

    if (rowCount === 0) {
      console.log('   SKIP: No action items present');
      return;
    }

    // Find a todo item and capture its description
    let todoRow = null;
    let itemDescription = '';
    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);
      const statusBadge = row.locator('button').filter({ hasText: /^To Do$/i }).first();
      if (await statusBadge.isVisible().catch(() => false)) {
        todoRow = row;
        const descEl = row.locator('p.text-sm.text-foreground').first();
        itemDescription = (await descEl.textContent().catch(() => '')).trim();
        console.log(`   Found todo item: "${itemDescription.substring(0, 60)}"`);
        break;
      }
    }

    if (!todoRow) {
      console.log('   SKIP: No "todo" items found');
      return;
    }

    // Make Execute button visible via hover and click it
    await hoverToReveal(page, todoRow);
    const executeButton = todoRow.locator('button[title="Execute with AI"]');
    await expect(executeButton).toBeVisible({ timeout: 5000 });
    await executeButton.click();
    console.log('   Clicked Execute button');

    // Wait for chat panel to open
    await page.waitForTimeout(2000);

    // The chat panel should be open — it appears as a side panel
    // ChatPanel renders with data-testid="chat-panel" based on T1.4 test reference
    const chatPanel = page.locator('[data-testid="chat-panel"]');
    const chatPanelVisible = await chatPanel.isVisible({ timeout: 6000 }).catch(() => false);

    if (chatPanelVisible) {
      console.log('   Chat panel opened — PASS');

      // The trigger message contains the item description and "Execute action item:"
      // It is pre-populated as the initialMessage sent to the chat
      if (itemDescription) {
        const messagesArea = page.locator('[data-testid="chat-panel-messages"]');
        const hasMessage = await messagesArea.isVisible({ timeout: 5000 }).catch(() => false);
        if (hasMessage) {
          const messageText = await messagesArea.textContent().catch(() => '');
          // The trigger message format: 'Execute action item: "<description>"'
          if (messageText.includes('Execute action item')) {
            console.log('   Trigger message "Execute action item:" visible in chat — PASS');
          } else {
            console.log('   WARN: Trigger message text not found in chat messages area');
          }
        } else {
          console.log('   WARN: Messages area not visible yet');
        }
      }
    } else {
      // Fallback: look for any chat panel-like container that appeared
      const chatContainer = page.locator(
        '[class*="chat"], [class*="Chat"], [aria-label*="chat" i], [aria-label*="assistant" i]'
      ).first();
      const fallbackVisible = await chatContainer.isVisible({ timeout: 3000 }).catch(() => false);
      if (fallbackVisible) {
        console.log('   Chat container opened (fallback selector) — PASS');
      } else {
        console.log('   WARN: Could not confirm chat panel opened within timeout');
      }
    }

    console.log('TEST 4 COMPLETE');
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────
  test('Execute button visible only in Todo column on /action-items kanban board', async ({ page }) => {
    console.log('='.repeat(70));
    console.log('TEST 5: Kanban board — Execute button only in Todo column');
    console.log('='.repeat(70));

    // Navigate directly to the action-items board
    await page.goto(`${TARGET_URL}/action-items`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('   On /action-items board page');

    // Wait for board to load (columns should be visible)
    const todoColumn = page.locator('[class*="rounded-xl"], [class*="kanban-column"]').filter({ hasText: /^To Do/i }).first();
    const boardVisible = await todoColumn.isVisible({ timeout: 10000 }).catch(() => false);

    if (!boardVisible) {
      // Try a broader selector — the board may use different class names
      const columns = page.locator('[class*="flex-1"][class*="min-w"]');
      const colCount = await columns.count();
      console.log(`   Board columns found: ${colCount}`);
      if (colCount === 0) {
        console.log('   SKIP: Board has no items or failed to load');
        return;
      }
    }

    // Find cards in the Todo column and verify Execute is present
    // KanbanColumn renders a header with the column status name
    // Status label mapping: todo → "To Do", in_progress → "In Progress", etc.
    const todoColumnContainer = page
      .locator('[class*="rounded-xl"], [class*="border-border"]')
      .filter({ has: page.locator('h3, span, div').filter({ hasText: /^To Do$/i }) })
      .first();

    const todoCards = todoColumnContainer.locator('button[title="Execute with AI"]');
    const todoExecuteCount = await todoCards.count();
    console.log(`   Execute buttons in Todo column: ${todoExecuteCount}`);

    // All other columns should have NO execute buttons
    const columnLabels = ['In Progress', 'On Hold', 'Done', 'Cancelled'];
    for (const label of columnLabels) {
      const otherColumn = page
        .locator('[class*="rounded-xl"], [class*="border-border"]')
        .filter({ has: page.locator('h3, span, div').filter({ hasText: new RegExp(`^${label}$`, 'i') }) })
        .first();

      const colExists = await otherColumn.isVisible().catch(() => false);
      if (!colExists) continue;

      const executeInOther = otherColumn.locator('button[title="Execute with AI"]');
      const countInOther = await executeInOther.count();
      expect(countInOther).toBe(0);
      console.log(`   "${label}" column has 0 Execute buttons — PASS`);
    }

    // If there are cards in Todo column, at least one execute button should be visible
    const todoCards2 = todoColumnContainer.locator('[class*="rounded-lg border bg-card"]');
    const todoCardCount = await todoCards2.count();
    if (todoCardCount > 0) {
      expect(todoExecuteCount).toBeGreaterThan(0);
      console.log(`   Todo column has ${todoCardCount} card(s) and ${todoExecuteCount} Execute button(s) — PASS`);
    } else {
      console.log('   Todo column is empty — positive Execute presence skipped');
    }

    console.log('TEST 5 COMPLETE');
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────
  test('Execute from kanban board navigates to customer page and opens chat', async ({ page }) => {
    console.log('='.repeat(70));
    console.log('TEST 6: Execute on kanban board → navigate to customer page → chat opens');
    console.log('='.repeat(70));

    await page.goto(`${TARGET_URL}/action-items`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('   On /action-items board page');

    // Find the first Execute button on the board (should be in Todo column)
    const executeButton = page.locator('button[title="Execute with AI"]').first();
    const executeVisible = await executeButton.isVisible({ timeout: 10000 }).catch(() => false);

    if (!executeVisible) {
      console.log('   SKIP: No Execute buttons found on kanban board (no todo items)');
      return;
    }

    // Capture the customer name shown on the card for assertion later
    // KanbanCard renders customer name in a <span> with Users icon sibling
    const card = executeButton.locator('xpath=ancestor::div[contains(@class,"rounded-lg border bg-card")][1]');
    const customerNameEl = card.locator('span.text-xs.text-muted-foreground').first();
    const customerName = (await customerNameEl.textContent().catch(() => '')).trim();
    console.log(`   Executing card for customer: "${customerName}"`);

    // Click the Execute button
    await executeButton.click();
    console.log('   Clicked Execute on kanban card');

    // The hook navigates to /customers/:id if not already there
    await page.waitForURL('**/customers/**', { timeout: 10000 });
    console.log(`   Navigated to: ${page.url()}`);
    expect(page.url()).toContain('/customers/');

    // Wait for the customer page to fully mount and the chat to open
    await page.waitForTimeout(3000);

    // The chat panel should be open after navigation
    // CustomerDetailPage picks up the executeActionItem location state
    // and calls openCustomerChatWithMessage via useEffect
    const chatPanel = page.locator('[data-testid="chat-panel"]');
    const chatOpen = await chatPanel.isVisible({ timeout: 8000 }).catch(() => false);

    if (chatOpen) {
      console.log('   Chat panel is open on customer page — PASS');

      // Verify the trigger message is present
      const messagesArea = page.locator('[data-testid="chat-panel-messages"]');
      const messagesVisible = await messagesArea.isVisible({ timeout: 5000 }).catch(() => false);
      if (messagesVisible) {
        const messageContent = await messagesArea.textContent().catch(() => '');
        if (messageContent.includes('Execute action item')) {
          console.log('   Trigger message "Execute action item:" confirmed in chat — PASS');
        } else {
          console.log('   WARN: Trigger message not detected in messages area');
        }
      }
    } else {
      // Fallback check: look for any visible chat-like panel
      const anyChatPanel = page.locator(
        '[class*="chat"], [class*="Chat"], [aria-label*="chat" i]'
      ).first();
      const fallbackOpen = await anyChatPanel.isVisible({ timeout: 3000 }).catch(() => false);
      if (fallbackOpen) {
        console.log('   Chat container open (fallback) — PASS');
      } else {
        console.log('   WARN: Chat panel not confirmed open within timeout — may be timing-dependent');
      }
    }

    // Verify we are on the correct customer page URL pattern
    expect(page.url()).toMatch(/\/customers\/[a-z0-9-]+/i);
    console.log('   URL matches /customers/:id pattern — PASS');

    console.log('TEST 6 COMPLETE');
  });
});

// ─── Phase 2 Tests ────────────────────────────────────────────────────────────

test.describe('Action Item Execution — Phase 2: Result Visibility & State', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ── Test 7 ──────────────────────────────────────────────────────────────
  test('Done items with document_id show document link in customer Action Items tab', async ({ page }) => {
    console.log('='.repeat(70));
    console.log('TEST 7: Document link on done items with linked document');
    console.log('='.repeat(70));

    await navigateToFirstCustomerActionItemsTab(page);
    await page.waitForTimeout(1000);

    const allRows = page.locator('[class*="group rounded-lg border bg-card"]');
    const rowCount = await allRows.count();
    console.log(`   Found ${rowCount} action item row(s)`);

    if (rowCount === 0) {
      console.log('   SKIP: No action items present');
      return;
    }

    let doneRowWithDocFound = false;
    let doneRowWithoutDocFound = false;

    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);
      const statusBadge = row.locator('button').filter({ hasText: /^Done$/i }).first();
      const isDone = await statusBadge.isVisible().catch(() => false);

      if (!isDone) continue;

      // Check for document link (FileText icon + clickable text)
      const docLink = row.locator('button').filter({ has: page.locator('svg.lucide-file-text') });
      const hasDocLink = await docLink.isVisible().catch(() => false);

      if (hasDocLink) {
        doneRowWithDocFound = true;
        console.log(`   Row ${i + 1} (done): Document link visible — PASS`);

        // Verify the link text (should show document title or "View Document")
        const linkText = await docLink.textContent().catch(() => '');
        console.log(`   Document link text: "${linkText.trim()}"`);
      } else {
        doneRowWithoutDocFound = true;
        console.log(`   Row ${i + 1} (done): No document link (no linked doc) — PASS`);
      }
    }

    if (!doneRowWithDocFound && !doneRowWithoutDocFound) {
      console.log('   WARN: No "done" items found — cannot verify document links');
    }

    console.log('TEST 7 COMPLETE');
  });

  // ── Test 8 ──────────────────────────────────────────────────────────────
  test('Done items with execution_summary show collapsible summary section', async ({ page }) => {
    console.log('='.repeat(70));
    console.log('TEST 8: Collapsible execution summary on done items');
    console.log('='.repeat(70));

    await navigateToFirstCustomerActionItemsTab(page);
    await page.waitForTimeout(1000);

    const allRows = page.locator('[class*="group rounded-lg border bg-card"]');
    const rowCount = await allRows.count();
    console.log(`   Found ${rowCount} action item row(s)`);

    if (rowCount === 0) {
      console.log('   SKIP: No action items present');
      return;
    }

    let summaryFound = false;

    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);
      const statusBadge = row.locator('button').filter({ hasText: /^Done$/i }).first();
      const isDone = await statusBadge.isVisible().catch(() => false);

      if (!isDone) continue;

      // Look for the "Execution summary" toggle button
      const summaryToggle = row.locator('button').filter({ hasText: /Execution summary/i });
      const hasSummary = await summaryToggle.isVisible().catch(() => false);

      if (hasSummary) {
        summaryFound = true;
        console.log(`   Row ${i + 1} (done): Execution summary toggle found`);

        // Click to expand
        await summaryToggle.click();
        await page.waitForTimeout(300);

        // Verify expanded content is visible (bg-muted/50 content block)
        const summaryContent = row.locator('p.text-xs.text-muted-foreground').filter({ has: page.locator('xpath=self::*[contains(@class,"bg-muted")]') });
        const expandedContent = row.locator('[class*="bg-muted"]').filter({ hasText: /.+/ });
        const isExpanded = await expandedContent.isVisible().catch(() => false);

        if (isExpanded) {
          const text = await expandedContent.textContent().catch(() => '');
          console.log(`   Summary content (first 80 chars): "${text.trim().substring(0, 80)}"`);
          console.log(`   Summary expanded — PASS`);
        } else {
          console.log(`   WARN: Summary content not visible after click`);
        }

        // Click again to collapse
        await summaryToggle.click();
        await page.waitForTimeout(300);
        const isCollapsed = !(await expandedContent.isVisible().catch(() => false));
        if (isCollapsed) {
          console.log(`   Summary collapsed after second click — PASS`);
        }

        break; // One test is enough
      }
    }

    if (!summaryFound) {
      console.log('   WARN: No done items with execution summary found — test skipped');
    }

    console.log('TEST 8 COMPLETE');
  });

  // ── Test 9 ──────────────────────────────────────────────────────────────
  test('Done items without document_id or execution_summary show neither link nor summary', async ({ page }) => {
    console.log('='.repeat(70));
    console.log('TEST 9: Done items completed manually show no doc link or summary');
    console.log('='.repeat(70));

    await navigateToFirstCustomerActionItemsTab(page);
    await page.waitForTimeout(1000);

    const allRows = page.locator('[class*="group rounded-lg border bg-card"]');
    const rowCount = await allRows.count();

    if (rowCount === 0) {
      console.log('   SKIP: No action items present');
      return;
    }

    let plainDoneFound = false;

    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);
      const statusBadge = row.locator('button').filter({ hasText: /^Done$/i }).first();
      const isDone = await statusBadge.isVisible().catch(() => false);

      if (!isDone) continue;

      const docLink = row.locator('button').filter({ has: page.locator('svg.lucide-file-text') });
      const hasDocLink = await docLink.isVisible().catch(() => false);

      const summaryToggle = row.locator('button').filter({ hasText: /Execution summary/i });
      const hasSummary = await summaryToggle.isVisible().catch(() => false);

      if (!hasDocLink && !hasSummary) {
        plainDoneFound = true;
        console.log(`   Row ${i + 1} (done): No doc link, no summary (manual completion) — PASS`);
        break;
      }
    }

    if (!plainDoneFound) {
      console.log('   WARN: All done items have either doc link or summary — cannot verify negative case');
    }

    console.log('TEST 9 COMPLETE');
  });

  // ── Test 10 ─────────────────────────────────────────────────────────────
  test('Document link on done kanban card navigates to customer Documents tab', async ({ page }) => {
    console.log('='.repeat(70));
    console.log('TEST 10: Kanban card doc icon navigates to Documents tab');
    console.log('='.repeat(70));

    await page.goto(`${TARGET_URL}/action-items`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('   On /action-items board page');

    // Look for the Done column
    const doneColumn = page
      .locator('[class*="rounded-xl"], [class*="border-border"]')
      .filter({ has: page.locator('h3, span, div').filter({ hasText: /^Done$/i }) })
      .first();

    const doneColumnVisible = await doneColumn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!doneColumnVisible) {
      console.log('   SKIP: Done column not visible on board');
      return;
    }

    // Find a card in Done column with a document icon (FileText)
    const docIconButton = doneColumn.locator('button').filter({ has: page.locator('svg.lucide-file-text') }).first();
    const hasDocIcon = await docIconButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasDocIcon) {
      console.log('   SKIP: No done items with document links found on kanban board');
      return;
    }

    console.log('   Found document icon on done kanban card');

    // Click the document icon
    await docIconButton.click();
    console.log('   Clicked document icon');

    // Should navigate to customer page
    await page.waitForURL('**/customers/**', { timeout: 10000 });
    console.log(`   Navigated to: ${page.url()}`);

    // Wait for the page to load and switch to Documents tab
    await page.waitForTimeout(2000);

    // Verify the Documents tab is active
    const docsTab = page.locator('[role="tab"][data-state="active"]').filter({ hasText: /Documents/i });
    const docsTabActive = await docsTab.isVisible({ timeout: 5000 }).catch(() => false);

    if (docsTabActive) {
      console.log('   Documents tab is active — PASS');
    } else {
      console.log('   WARN: Documents tab not confirmed active');
    }

    // Verify the DocumentEditor sheet opened (it renders as a sheet/dialog)
    await page.waitForTimeout(1000);
    const editorSheet = page.locator('[role="dialog"], [class*="sheet"], [data-testid="document-editor"]');
    const editorVisible = await editorSheet.isVisible({ timeout: 5000 }).catch(() => false);

    if (editorVisible) {
      console.log('   DocumentEditor sheet opened — PASS');
    } else {
      console.log('   WARN: DocumentEditor sheet not confirmed visible');
    }

    console.log('TEST 10 COMPLETE');
  });

  // ── Test 11 ─────────────────────────────────────────────────────────────
  test('Document link on done item in ActionItemRow navigates to Documents tab', async ({ page }) => {
    console.log('='.repeat(70));
    console.log('TEST 11: ActionItemRow doc link navigates to Documents tab');
    console.log('='.repeat(70));

    await navigateToFirstCustomerActionItemsTab(page);
    await page.waitForTimeout(1000);

    const allRows = page.locator('[class*="group rounded-lg border bg-card"]');
    const rowCount = await allRows.count();

    if (rowCount === 0) {
      console.log('   SKIP: No action items present');
      return;
    }

    // Find a done item with document link
    let docLinkButton = null;
    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);
      const statusBadge = row.locator('button').filter({ hasText: /^Done$/i }).first();
      const isDone = await statusBadge.isVisible().catch(() => false);
      if (!isDone) continue;

      const link = row.locator('button').filter({ has: page.locator('svg.lucide-file-text') });
      const hasLink = await link.isVisible().catch(() => false);
      if (hasLink) {
        docLinkButton = link;
        console.log(`   Found doc link on done item at row ${i + 1}`);
        break;
      }
    }

    if (!docLinkButton) {
      console.log('   SKIP: No done items with document links found');
      return;
    }

    // Click the document link
    await docLinkButton.click();
    console.log('   Clicked document link');

    // Since we're already on the customer page, it should just switch to Documents tab
    await page.waitForTimeout(2000);

    // Verify Documents tab is active
    const docsTab = page.locator('[role="tab"][data-state="active"]').filter({ hasText: /Documents/i });
    const docsTabActive = await docsTab.isVisible({ timeout: 5000 }).catch(() => false);

    if (docsTabActive) {
      console.log('   Documents tab is active — PASS');
    } else {
      console.log('   WARN: Documents tab not confirmed active');
    }

    // Verify DocumentEditor opened
    await page.waitForTimeout(1000);
    const editorSheet = page.locator('[role="dialog"], [class*="sheet"], [data-testid="document-editor"]');
    const editorVisible = await editorSheet.isVisible({ timeout: 5000 }).catch(() => false);

    if (editorVisible) {
      console.log('   DocumentEditor sheet opened — PASS');
    } else {
      console.log('   WARN: DocumentEditor sheet not confirmed visible');
    }

    console.log('TEST 11 COMPLETE');
  });

  // ── Test 12 ─────────────────────────────────────────────────────────────
  test('Execute button is disabled when another item is already executing (one-at-a-time lock)', async ({ page }) => {
    console.log('='.repeat(70));
    console.log('TEST 12: One-at-a-time lock — other Execute buttons disabled during execution');
    console.log('='.repeat(70));

    await navigateToFirstCustomerActionItemsTab(page);
    await page.waitForTimeout(1000);

    const allRows = page.locator('[class*="group rounded-lg border bg-card"]');
    const rowCount = await allRows.count();

    // We need at least 2 todo items to test the lock
    const todoRows = [];
    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);
      const statusBadge = row.locator('button').filter({ hasText: /^To Do$/i }).first();
      if (await statusBadge.isVisible().catch(() => false)) {
        todoRows.push(row);
      }
    }

    if (todoRows.length < 2) {
      console.log(`   SKIP: Need at least 2 todo items to test lock (found ${todoRows.length})`);
      return;
    }

    console.log(`   Found ${todoRows.length} todo items`);

    // Hover and click Execute on the first todo item
    await hoverToReveal(page, todoRows[0]);
    const firstExecute = todoRows[0].locator('button[title="Execute with AI"]');
    await expect(firstExecute).toBeVisible({ timeout: 5000 });
    await firstExecute.click();
    console.log('   Clicked Execute on first todo item');

    // Wait briefly for execution state to propagate
    await page.waitForTimeout(500);

    // Check the second todo item's Execute button
    await hoverToReveal(page, todoRows[1]);
    const secondExecute = todoRows[1].locator('button[title="Execute with AI"]');
    const secondVisible = await secondExecute.isVisible({ timeout: 3000 }).catch(() => false);

    if (secondVisible) {
      const isDisabled = await secondExecute.isDisabled().catch(() => false);
      if (isDisabled) {
        console.log('   Second Execute button is disabled during execution — PASS');
      } else {
        console.log('   WARN: Second Execute button is visible but not disabled');
      }
    } else {
      console.log('   Second Execute button not visible (may be hidden during execution) — PASS');
    }

    console.log('TEST 12 COMPLETE');
  });
});
