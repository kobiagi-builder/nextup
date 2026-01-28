/**
 * Artifact Status Flow - Test Scenario Templates
 *
 * Use these templates to create actual Playwright test scripts.
 * Copy the relevant template and fill in the details.
 */

import { chromium } from 'playwright';

const TARGET_URL = 'http://localhost:5173';
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_WAIT_TIME = 600000; // 10 minutes

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Wait for artifact to reach specific status
 */
async function waitForStatus(page, targetStatus, options = {}) {
  const { timeout = 120000 } = options;
  let currentStatus = null;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Get status from console logs or DOM
    const statusBadge = await page.locator('[data-testid="status-badge"]').textContent();

    // Map user-facing labels to internal status
    const statusMap = {
      'Draft': 'draft',
      'Creating Content': ['research', 'skeleton', 'writing', 'creating_visuals'],
      'Content Ready': 'ready',
      'Published': 'published'
    };

    if (statusBadge === 'Content Ready' && targetStatus === 'ready') {
      return true;
    }

    await page.waitForTimeout(2000);
  }

  throw new Error(`Timeout waiting for status: ${targetStatus}`);
}

/**
 * Get artifact from database via API
 */
async function getArtifact(artifactId) {
  // Use Supabase MCP or API endpoint
  // Implementation depends on test setup
}

/**
 * Create artifact via MCP for isolated testing
 */
async function createTestArtifact(data) {
  // Use mcp__supabase__execute_sql to insert artifact
  // Example:
  // INSERT INTO artifacts (user_id, account_id, type, status, title, content)
  // VALUES (...)
}

// =============================================================================
// TEMPLATE 1: ENTRY POINT TEST (Manual Creation → Draft)
// =============================================================================

async function testManualCreationSaveDraft() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  try {
    console.log('🧪 Test: Manual Creation → Save as Draft\n');

    // Step 1: Navigate to Portfolio
    await page.goto(TARGET_URL);
    await page.waitForTimeout(2000);
    const portfolioNav = page.locator('nav a, nav button').nth(1);
    await portfolioNav.click();
    await page.waitForTimeout(2000);

    // Step 2: Click New button
    const newButton = page.locator('[data-testid="portfolio-new-button"]');
    await newButton.click();
    await page.waitForTimeout(1000);

    // Step 3: Fill form
    await page.locator('[data-testid="artifact-form-title"]').fill('Test Draft Artifact');
    await page.locator('[data-testid="artifact-form-type"]').click();
    await page.locator('[data-testid="artifact-type-blog"]').click();
    await page.locator('[data-testid="artifact-form-content"]').fill('Initial draft content');

    // Step 4: Click Save as Draft
    // NOTE: Adjust selector based on actual implementation
    const saveDraftButton = page.locator('button:has-text("Save as Draft")');
    await saveDraftButton.click();
    await page.waitForTimeout(2000);

    // Verify: Status should be draft
    const statusBadge = page.locator('[data-testid="status-badge"]');
    const statusText = await statusBadge.textContent();
    console.assert(statusText === 'Draft', `❌ Expected status 'Draft', got '${statusText}'`);

    // Verify: Create Content button visible
    const createContentButton = page.locator('[data-testid="artifact-create-content-button"]');
    console.assert(await createContentButton.isVisible(), '❌ Create Content button should be visible');

    // Verify: Mark as Published button hidden
    const markPublishedButton = page.locator('[data-testid="artifact-mark-published-button"]');
    console.assert(!await markPublishedButton.isVisible(), '❌ Mark as Published button should be hidden');

    // Verify: Editor unlocked
    const editor = page.locator('[data-testid="artifact-editor"] [contenteditable="true"]');
    console.assert(await editor.isVisible(), '❌ Editor should be unlocked');

    // Verify: WritingProgress hidden
    const writingProgress = page.locator('[data-testid="writing-progress"]');
    console.assert(!await writingProgress.isVisible(), '❌ WritingProgress should be hidden');

    console.log('✅ Test passed: Manual Creation → Save as Draft\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/test-manual-draft-error.png', fullPage: true });
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// =============================================================================
// TEMPLATE 2: ENTRY POINT TEST (Manual Creation → Create Content)
// =============================================================================

async function testManualCreationCreateContent() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  // Track status changes
  let statusHistory = [];
  page.on('console', msg => {
    const match = msg.text().match(/currentStatus:\s*(\w+)/);
    if (match) statusHistory.push(match[1]);
  });

  try {
    console.log('🧪 Test: Manual Creation → Create Content (Full AI Flow)\n');

    // Step 1: Navigate to Portfolio
    await page.goto(TARGET_URL);
    await page.waitForTimeout(2000);
    const portfolioNav = page.locator('nav a, nav button').nth(1);
    await portfolioNav.click();
    await page.waitForTimeout(2000);

    // Step 2: Click New button
    await page.locator('[data-testid="portfolio-new-button"]').click();
    await page.waitForTimeout(1000);

    // Step 3: Fill form
    await page.locator('[data-testid="artifact-form-title"]').fill('AI Generated Blog Post');
    await page.locator('[data-testid="artifact-form-type"]').click();
    await page.locator('[data-testid="artifact-type-blog"]').click();
    await page.locator('[data-testid="artifact-form-content"]').fill('Write about AI in product management');

    // Step 4: Click Create Content
    const createContentButton = page.locator('[data-testid="artifact-form-submit"]');
    await createContentButton.click();
    await page.waitForTimeout(2000);

    // Verify: URL should include startCreation=true
    const url = page.url();
    console.assert(url.includes('startCreation=true'), '❌ URL should contain startCreation=true');

    // Verify: AI Assistant should open
    const aiAssistant = page.locator('[data-testid="ai-assistant-panel"]');
    console.assert(await aiAssistant.isVisible(), '❌ AI Assistant should be open');

    // Step 5: Wait for AI completion (status = ready)
    console.log('⏳ Waiting for AI to complete (max 10 minutes)...\n');
    await waitForStatus(page, 'ready', { timeout: MAX_WAIT_TIME });

    // Verify: Status should be ready
    const statusBadge = page.locator('[data-testid="status-badge"]');
    const statusText = await statusBadge.textContent();
    console.assert(statusText === 'Content Ready', `❌ Expected 'Content Ready', got '${statusText}'`);

    // Verify: Status progression
    const expectedSequence = ['draft', 'research', 'skeleton', 'writing', 'creating_visuals', 'ready'];
    console.log('📊 Status history:', statusHistory);
    console.assert(
      expectedSequence.every(s => statusHistory.includes(s)),
      `❌ Status progression incomplete. Expected: ${expectedSequence.join(' → ')}`
    );

    // Verify: Mark as Published button visible
    const markPublishedButton = page.locator('[data-testid="artifact-mark-published-button"]');
    console.assert(await markPublishedButton.isVisible(), '❌ Mark as Published button should be visible');

    // Verify: WritingProgress hidden
    const writingProgress = page.locator('[data-testid="writing-progress"]');
    console.assert(!await writingProgress.isVisible(), '❌ WritingProgress should be hidden');

    // Verify: Editor unlocked
    const editor = page.locator('[data-testid="artifact-editor"] [contenteditable="true"]');
    console.assert(await editor.isVisible(), '❌ Editor should be unlocked');

    console.log('✅ Test passed: Manual Creation → Create Content (Full AI Flow)\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/test-create-content-error.png', fullPage: true });
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// =============================================================================
// TEMPLATE 3: STATUS BEHAVIOR TEST (Research Status)
// =============================================================================

async function testResearchStatusBehavior() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  try {
    console.log('🧪 Test: Research Status Behavior\n');

    // Setup: Create artifact and trigger AI workflow
    // (Use same steps as testManualCreationCreateContent up to research status)

    // Wait for status = research
    console.log('⏳ Waiting for research status...\n');
    await page.waitForTimeout(5000); // Wait for transition from draft

    // Verify: Status badge
    const statusBadge = page.locator('[data-testid="status-badge"]');
    const statusText = await statusBadge.textContent();
    console.assert(statusText === 'Creating Content', `❌ Expected 'Creating Content', got '${statusText}'`);

    // Verify: WritingProgress visible
    const writingProgress = page.locator('[data-testid="writing-progress"]');
    console.assert(await writingProgress.isVisible(), '❌ WritingProgress should be visible');

    // Verify: Progress bar at 25%
    const progressBar = writingProgress.locator('[data-progress="25"]');
    console.assert(await progressBar.count() > 0, '❌ Progress bar should show 25%');

    // Verify: Step 1 active (Researching)
    const step1 = writingProgress.locator('text=Researching');
    console.assert(await step1.isVisible(), '❌ Step 1 (Researching) should be visible');

    // Verify: Editor locked
    const editorOverlay = page.locator('[data-testid="editor-lock-overlay"]');
    console.assert(await editorOverlay.isVisible(), '❌ Editor should be locked');

    // Verify: No CTAs visible
    const createContentButton = page.locator('[data-testid="artifact-create-content-button"]');
    const markPublishedButton = page.locator('[data-testid="artifact-mark-published-button"]');
    console.assert(!await createContentButton.isVisible(), '❌ Create Content button should be hidden');
    console.assert(!await markPublishedButton.isVisible(), '❌ Mark as Published button should be hidden');

    // Verify: ResearchArea shows skeleton/loading
    const researchArea = page.locator('[data-testid="research-area"]');
    const researchSkeleton = page.locator('[data-testid="research-skeleton"]');
    console.assert(await researchArea.isVisible(), '❌ ResearchArea should be visible');
    console.assert(await researchSkeleton.isVisible(), '❌ Research skeleton should be visible');

    console.log('✅ Test passed: Research Status Behavior\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/test-research-behavior-error.png', fullPage: true });
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// =============================================================================
// TEMPLATE 4: TRANSITION TEST (Published → Ready Loop)
// =============================================================================

async function testPublishedReadyLoop() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  try {
    console.log('🧪 Test: Published → Ready Loop (Edit and Re-publish)\n');

    // Setup: Create artifact with status = published
    // (Use MCP to insert artifact, or complete full AI flow + mark as published)

    // Verify: Initial status = published
    let statusBadge = page.locator('[data-testid="status-badge"]');
    let statusText = await statusBadge.textContent();
    console.assert(statusText === 'Published', `❌ Expected 'Published', got '${statusText}'`);

    // Step 1: Edit content → should auto-transition to ready
    console.log('📝 Editing content...\n');
    const editor = page.locator('[data-testid="artifact-editor"] [contenteditable]');
    await editor.click();
    await page.keyboard.type(' This is an edit.');
    await page.waitForTimeout(3000); // Wait for auto-transition

    // Verify: Status changed to ready
    statusText = await statusBadge.textContent();
    console.assert(statusText === 'Content Ready', `❌ Expected 'Content Ready', got '${statusText}'`);

    // Verify: Mark as Published button visible
    const markPublishedButton = page.locator('[data-testid="artifact-mark-published-button"]');
    console.assert(await markPublishedButton.isVisible(), '❌ Mark as Published button should be visible');

    // Step 2: Mark as published again
    console.log('✅ Marking as published...\n');
    await markPublishedButton.click();
    await page.waitForTimeout(2000);

    // Verify: Status = published
    statusText = await statusBadge.textContent();
    console.assert(statusText === 'Published', `❌ Expected 'Published', got '${statusText}'`);

    // Verify: Mark as Published button hidden
    console.assert(!await markPublishedButton.isVisible(), '❌ Mark as Published button should be hidden');

    // Step 3: Edit again → should loop back to ready
    console.log('📝 Editing again...\n');
    await editor.click();
    await page.keyboard.type(' Second edit.');
    await page.waitForTimeout(3000);

    // Verify: Status = ready again
    statusText = await statusBadge.textContent();
    console.assert(statusText === 'Content Ready', `❌ Expected 'Content Ready', got '${statusText}'`);

    console.log('✅ Test passed: Published → Ready Loop\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/test-published-ready-loop-error.png', fullPage: true });
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// =============================================================================
// TEMPLATE 5: EDGE CASE TEST (Browser Refresh During Processing)
// =============================================================================

async function testBrowserRefreshDuringProcessing() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  try {
    console.log('🧪 Test: Browser Refresh During Processing\n');

    // Setup: Create artifact and trigger AI workflow
    // ... (same as testManualCreationCreateContent)

    // Wait for status = writing
    console.log('⏳ Waiting for writing status...\n');
    // Wait logic here...

    // Verify: Status = writing
    let statusBadge = page.locator('[data-testid="status-badge"]');
    let statusText = await statusBadge.textContent();
    console.assert(statusText === 'Creating Content', '❌ Should be in processing state');

    // Get content before refresh
    const contentBefore = await page.locator('[data-testid="artifact-editor"] [contenteditable]').textContent();
    console.log('📄 Content length before refresh:', contentBefore.length);

    // Step: Refresh page
    console.log('🔄 Refreshing page...\n');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify: Status still in processing
    statusText = await statusBadge.textContent();
    console.assert(statusText === 'Creating Content', '❌ Status should still be Creating Content');

    // Verify: WritingProgress restored
    const writingProgress = page.locator('[data-testid="writing-progress"]');
    console.assert(await writingProgress.isVisible(), '❌ WritingProgress should be restored');

    // Verify: Editor locked
    const editorOverlay = page.locator('[data-testid="editor-lock-overlay"]');
    console.assert(await editorOverlay.isVisible(), '❌ Editor should still be locked');

    // Verify: Polling resumes (status should progress)
    console.log('⏳ Waiting for status to progress to ready...\n');
    await waitForStatus(page, 'ready', { timeout: MAX_WAIT_TIME });

    // Verify: Content preserved/expanded
    const contentAfter = await page.locator('[data-testid="artifact-editor"] [contenteditable]').textContent();
    console.log('📄 Content length after completion:', contentAfter.length);
    console.assert(contentAfter.length >= contentBefore.length, '❌ Content should be preserved or expanded');

    console.log('✅ Test passed: Browser Refresh During Processing\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/test-refresh-error.png', fullPage: true });
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// =============================================================================
// RUN TESTS
// =============================================================================

(async () => {
  console.log('🚀 Starting Artifact Status Flow Tests\n');
  console.log('=' .repeat(80) + '\n');

  // Run tests sequentially
  // Uncomment the tests you want to run

  // await testManualCreationSaveDraft();
  // await testManualCreationCreateContent();
  // await testResearchStatusBehavior();
  // await testPublishedReadyLoop();
  // await testBrowserRefreshDuringProcessing();

  console.log('=' .repeat(80));
  console.log('✅ All tests completed\n');
})();
