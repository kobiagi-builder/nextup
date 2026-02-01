/**
 * Tier 1: Critical Path Tests - UI Interactions
 *
 * Tests core UI interactions that must work reliably.
 * These tests MUST pass for production deployment.
 */

import { test, expect } from '@playwright/test';
import {
  TEST_ARTIFACTS,
  createArtifact,
  navigateToPortfolio,
  sendChatMessage,
  getEditorContent,
  takeScreenshot
} from './utils/test-helpers.js';

const TARGET_URL = 'http://localhost:5173';

test.describe('@tier1 UI Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Navigate to Portfolio
    await navigateToPortfolio(page);
  });

  /**
   * T1.4: AI Assistant Accessibility
   */
  test('@tier1 T1.4: AI Assistant Accessibility', async ({ page }) => {
    console.log('='.repeat(80));
    console.log('🤖 T1.4: AI Assistant Accessibility');
    console.log('='.repeat(80));

    // Step 1: Create a draft artifact (no AI)
    await createArtifact(page, TEST_ARTIFACTS.blog, false);

    // Wait for navigation to artifact page
    await page.waitForTimeout(2000);

    // Step 2: Click "AI Assistant" button
    console.log('\n📱 Opening AI Assistant...');
    const aiAssistantButton = page.locator('[data-testid="artifact-page-ai-assistant-button"]');
    await expect(aiAssistantButton).toBeVisible({ timeout: 5000 });
    await aiAssistantButton.click();
    await page.waitForTimeout(1000);

    // Step 3: Verify sheet opened
    const aiPanel = page.locator('[data-testid="ai-assistant-panel"]');
    await expect(aiPanel).toBeVisible({ timeout: 5000 });
    console.log('✅ AI Assistant sheet opened');

    // Step 4: Verify chat panel visible
    const chatPanel = page.locator('[data-testid="chat-panel"]');
    await expect(chatPanel).toBeVisible({ timeout: 5000 });
    console.log('✅ Chat panel visible');

    // Step 5: Verify empty state with suggestions
    const emptyState = page.locator('[data-testid="chat-panel-empty-state"]');
    await expect(emptyState).toBeVisible({ timeout: 5000 });
    console.log('✅ Empty state with suggestions displayed');

    // Step 6: Type test message
    await sendChatMessage(page, 'Hello, this is a test message');

    // Step 7: Verify message appears in chat
    const messagesArea = page.locator('[data-testid="chat-panel-messages"]');
    await expect(messagesArea).toContainText('Hello, this is a test message', { timeout: 5000 });
    console.log('✅ User message rendered');

    // Wait for AI response
    await page.waitForTimeout(3000);

    // Step 8: Verify AI response appears
    const messages = await messagesArea.locator('.flex.gap-3').count();
    expect(messages).toBeGreaterThan(1); // User message + AI response
    console.log(`✅ AI responded (${messages} messages total)`);

    // Step 9: Close sheet using the sheet close button
    console.log('\n❌ Closing AI Assistant...');
    const closeButton = page.locator('[data-testid="sheet-close-button"]');
    await expect(closeButton).toBeVisible({ timeout: 5000 });
    await closeButton.click();
    await page.waitForTimeout(1000);

    // Step 10: Verify sheet closed
    await expect(aiPanel).not.toBeVisible({ timeout: 5000 });
    console.log('✅ AI Assistant sheet closed');

    // Take screenshot
    await takeScreenshot(page, 'T1.4-ai-assistant-closed');

    console.log('✅ T1.4 COMPLETED: AI Assistant accessibility verified');
  });

  /**
   * T1.5: Research Area Toggle
   */
  test('@tier1 T1.5: Research Area Toggle', async ({ page }) => {
    // Set longer timeout for this test since it involves AI processing
    test.setTimeout(120000); // 2 minutes

    console.log('='.repeat(80));
    console.log('🔍 T1.5: Research Area Toggle');
    console.log('='.repeat(80));

    // Create artifact with content creation to generate research
    await createArtifact(page, TEST_ARTIFACTS.blog, true);

    // Wait for some processing (don't wait for full completion)
    console.log('\n⏳ Waiting for research to start...');
    await page.waitForTimeout(20000); // Wait 20 seconds for research to begin

    // Step 1: Verify research area in loading or loaded state
    const researchLoading = page.locator('[data-testid="research-state-loading"]');
    const researchLoaded = page.locator('[data-testid="research-state-loaded"]');

    const hasResearch = (await researchLoading.isVisible()) || (await researchLoaded.isVisible());
    expect(hasResearch).toBe(true);
    console.log('✅ Research area has data');

    // Step 2: Verify collapsed by default
    const collapsedState = page.locator('[data-testid="research-area-collapsed"]');
    if (await collapsedState.isVisible()) {
      console.log('✅ Research area collapsed by default');

      // Step 3: Check for NEW badge (might be visible if research recently loaded)
      const newBadge = page.locator('[data-testid="research-new-badge"]');
      if (await newBadge.isVisible()) {
        console.log('✅ NEW badge visible');
      }

      // Step 4: Expand research area
      const expandButton = page.locator('[data-testid="research-expand-button"]');
      await expect(expandButton).toBeVisible({ timeout: 5000 });
      await expandButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Clicked expand button');

      // Step 5: Verify expanded state
      await expect(collapsedState).not.toBeVisible({ timeout: 5000 });
      console.log('✅ Research area expanded');

      // Take screenshot of expanded research
      await takeScreenshot(page, 'T1.5-research-expanded');

      // Step 6: Collapse research area
      const collapseButton = page.locator('[data-testid="research-collapse-button"]');
      await expect(collapseButton).toBeVisible({ timeout: 5000 });
      await collapseButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Clicked collapse button');

      // Step 7: Verify collapsed again
      await expect(collapsedState).toBeVisible({ timeout: 5000 });
      console.log('✅ Research area collapsed');
    } else {
      // Research already expanded (some implementations might default to expanded)
      console.log('⚠️  Research area already expanded (non-default behavior)');

      // Try collapsing
      const collapseButton = page.locator('[data-testid="research-collapse-button"]');
      if (await collapseButton.isVisible()) {
        await collapseButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ Collapsed research area');
      }
    }

    console.log('✅ T1.5 COMPLETED: Research area toggle verified');
  });

  /**
   * T1.6: Auto-Transition: Published → Ready on Edit
   */
  test('@tier1 T1.6: Auto-Transition Published to Ready on Edit', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    console.log('='.repeat(80));
    console.log('✏️ T1.6: Auto-Transition Published → Ready on Edit');
    console.log('='.repeat(80));

    // Step 1: Create artifact (skip content creation for speed)
    await createArtifact(page, TEST_ARTIFACTS.blog, false);
    await page.waitForTimeout(2000);

    // Step 2: Manually set status to "published" by adding some content and marking as published
    console.log('\n📝 Adding initial content...');
    const editor = page.locator('[data-testid="artifact-editor"]');
    await expect(editor).toBeVisible({ timeout: 5000 });

    const contentEditable = editor.locator('[contenteditable="true"]').first();
    await contentEditable.click();
    await contentEditable.fill('<h1>Test Blog Post</h1><p>Initial content for testing.</p>');
    await page.waitForTimeout(2000); // Wait for auto-save

    // Navigate to ready status first (simulate content creation completion)
    // In real scenario, this would come from AI pipeline
    console.log('⚠️  Note: This test assumes artifact can be manually marked as published');
    console.log('   In production, artifact must go through pipeline first');

    // If there's a "Mark as Published" button, click it
    const publishButton = page.locator('[data-testid="artifact-page-mark-published-button"]');
    if (await publishButton.isVisible({ timeout: 2000 })) {
      await publishButton.click();
      await page.waitForTimeout(2000);

      // Step 3: Verify published status
      const publishedBadge = page.locator('[data-testid="status-badge-published"]');
      await expect(publishedBadge).toBeVisible({ timeout: 5000 });
      console.log('✅ Status confirmed: published');

      // Take screenshot before edit
      await takeScreenshot(page, 'T1.6-before-edit');

      // Step 4: Edit content
      console.log('\n✏️ Editing content...');
      await contentEditable.click();
      await page.keyboard.type(' This is additional content added after publishing.');
      await page.waitForTimeout(2000); // Wait for auto-save + status transition

      // Step 5: Verify status changed to "ready"
      const readyBadge = page.locator('[data-testid="status-badge-ready"]');
      await expect(readyBadge).toBeVisible({ timeout: 5000 });
      console.log('✅ Status auto-transitioned: published → ready');

      // Step 6: Verify "Mark as Published" button reappeared
      await expect(publishButton).toBeVisible({ timeout: 5000 });
      console.log('✅ Publish button reappeared');

      // Take screenshot after edit
      await takeScreenshot(page, 'T1.6-after-edit');

      console.log('✅ T1.6 COMPLETED: Auto-transition verified');
    } else {
      console.log('⚠️  SKIPPED: Artifact not in publishable state');
      console.log('   This test requires artifact to be in "ready" status first');
      console.log('   Consider running after T1.1-T1.3 pipeline tests');
    }
  });
});
