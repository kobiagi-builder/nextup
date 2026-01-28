/**
 * Tier 1: Critical Path Tests - Full Pipeline
 *
 * Tests complete content creation pipeline for all artifact types.
 * These tests MUST pass for production deployment.
 */

import { test, expect } from '@playwright/test';
import {
  TEST_ARTIFACTS,
  createStatusMonitor,
  createArtifact,
  waitForPipelineCompletion,
  navigateToPortfolio,
  validateArtifactContent,
  validateResearch,
  closeAIAssistant,
  getEditorContent,
  takeScreenshot
} from './utils/test-helpers.js';

const TARGET_URL = 'http://localhost:5173';

test.describe('@tier1 Full Pipeline Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Navigate to Portfolio
    await navigateToPortfolio(page);
  });

  /**
   * T1.1: Full Pipeline - Blog Post (End-to-End)
   */
  test('@tier1 T1.1: Full Pipeline - Blog Post', async ({ page }) => {
    test.setTimeout(600000); // 10 minutes

    console.log('='.repeat(80));
    console.log('📝 T1.1: Full Pipeline - Blog Post');
    console.log('='.repeat(80));

    // Create status monitor
    const statusMonitor = createStatusMonitor(page);

    // Step 1: Create artifact with "Create Content" flow
    await createArtifact(page, TEST_ARTIFACTS.blog, true);

    // Step 2: Verify AI Assistant opened
    const aiPanel = page.locator('[data-testid="ai-assistant-panel"]');
    await expect(aiPanel).toBeVisible({ timeout: 5000 });
    console.log('✅ AI Assistant panel confirmed open');

    // Step 3: Wait for pipeline completion
    await waitForPipelineCompletion(page, statusMonitor);

    // Step 4: Close AI Assistant
    await closeAIAssistant(page);

    // Step 5: Verify research data
    const researchResults = await validateResearch(page);
    expect(researchResults.valid).toBe(true);

    // Step 6: Verify editor content
    const content = await getEditorContent(page);
    const contentResults = validateArtifactContent(content, 'blog');

    expect(contentResults.valid).toBe(true);
    expect(content.length).toBeGreaterThan(1500);

    // Verify structure
    expect(content.toLowerCase()).toContain('title');
    expect(content.toLowerCase()).toContain('hook');

    // Verify image placeholders
    const imagePlaceholders = content.match(/\[IMAGE|\[image|IMAGE:|<img/gi) || [];
    expect(imagePlaceholders.length).toBeGreaterThanOrEqual(2);

    // Step 7: Verify status badge
    const statusBadge = page.locator('[data-testid="status-badge-ready"]');
    await expect(statusBadge).toBeVisible({ timeout: 5000 });

    // Step 8: Mark as published
    const publishButton = page.locator('[data-testid="artifact-page-mark-published-button"]');
    await expect(publishButton).toBeVisible({ timeout: 5000 });
    await publishButton.click();
    await page.waitForTimeout(2000);

    // Verify published status
    const publishedBadge = page.locator('[data-testid="status-badge-published"]');
    await expect(publishedBadge).toBeVisible({ timeout: 5000 });

    // Take final screenshot
    await takeScreenshot(page, 'T1.1-blog-final');

    console.log('✅ T1.1 COMPLETED: Blog post pipeline successful');
  });

  /**
   * T1.2: Full Pipeline - Social Post
   */
  test('@tier1 T1.2: Full Pipeline - Social Post', async ({ page }) => {
    test.setTimeout(600000); // 10 minutes

    console.log('='.repeat(80));
    console.log('📱 T1.2: Full Pipeline - Social Post');
    console.log('='.repeat(80));

    // Create status monitor
    const statusMonitor = createStatusMonitor(page);

    // Step 1: Create social post artifact
    await createArtifact(page, TEST_ARTIFACTS.socialPost, true);

    // Step 2: Verify AI Assistant opened
    const aiPanel = page.locator('[data-testid="ai-assistant-panel"]');
    await expect(aiPanel).toBeVisible({ timeout: 5000 });

    // Step 3: Wait for pipeline completion
    await waitForPipelineCompletion(page, statusMonitor);

    // Step 4: Close AI Assistant
    await closeAIAssistant(page);

    // Step 5: Verify research data
    const researchResults = await validateResearch(page);
    expect(researchResults.valid).toBe(true);

    // Step 6: Verify editor content
    const content = await getEditorContent(page);
    const contentResults = validateArtifactContent(content, 'socialPost');

    expect(contentResults.valid).toBe(true);
    expect(content.length).toBeGreaterThan(300);
    expect(content.length).toBeLessThan(1200); // Should be shorter than blog

    // Verify structure
    expect(content.toLowerCase()).toContain('hook');
    expect(content).toContain('#'); // Hashtags

    // Verify image placeholder
    const imagePlaceholders = content.match(/\[IMAGE|\[image|IMAGE:|<img/gi) || [];
    expect(imagePlaceholders.length).toBeGreaterThanOrEqual(1);

    // Step 7: Mark as published
    const publishButton = page.locator('[data-testid="artifact-page-mark-published-button"]');
    await expect(publishButton).toBeVisible({ timeout: 5000 });
    await publishButton.click();
    await page.waitForTimeout(2000);

    // Verify published status
    const publishedBadge = page.locator('[data-testid="status-badge-published"]');
    await expect(publishedBadge).toBeVisible({ timeout: 5000 });

    // Take final screenshot
    await takeScreenshot(page, 'T1.2-social-final');

    console.log('✅ T1.2 COMPLETED: Social post pipeline successful');
  });

  /**
   * T1.3: Full Pipeline - Showcase
   */
  test('@tier1 T1.3: Full Pipeline - Showcase', async ({ page }) => {
    test.setTimeout(600000); // 10 minutes

    console.log('='.repeat(80));
    console.log('🎨 T1.3: Full Pipeline - Showcase');
    console.log('='.repeat(80));

    // Create status monitor
    const statusMonitor = createStatusMonitor(page);

    // Step 1: Create showcase artifact
    await createArtifact(page, TEST_ARTIFACTS.showcase, true);

    // Step 2: Verify AI Assistant opened
    const aiPanel = page.locator('[data-testid="ai-assistant-panel"]');
    await expect(aiPanel).toBeVisible({ timeout: 5000 });

    // Step 3: Wait for pipeline completion
    await waitForPipelineCompletion(page, statusMonitor);

    // Step 4: Close AI Assistant
    await closeAIAssistant(page);

    // Step 5: Verify research data
    const researchResults = await validateResearch(page);
    expect(researchResults.valid).toBe(true);

    // Step 6: Verify editor content
    const content = await getEditorContent(page);
    const contentResults = validateArtifactContent(content, 'showcase');

    expect(contentResults.valid).toBe(true);
    expect(content.length).toBeGreaterThan(1200);

    // Verify structure
    expect(content.toLowerCase()).toContain('problem');
    expect(content.toLowerCase()).toContain('solution');
    expect(content.toLowerCase()).toContain('feature');

    // Verify image placeholders
    const imagePlaceholders = content.match(/\[IMAGE|\[image|IMAGE:|<img/gi) || [];
    expect(imagePlaceholders.length).toBeGreaterThanOrEqual(2);

    // Step 7: Mark as published
    const publishButton = page.locator('[data-testid="artifact-page-mark-published-button"]');
    await expect(publishButton).toBeVisible({ timeout: 5000 });
    await publishButton.click();
    await page.waitForTimeout(2000);

    // Verify published status
    const publishedBadge = page.locator('[data-testid="status-badge-published"]');
    await expect(publishedBadge).toBeVisible({ timeout: 5000 });

    // Take final screenshot
    await takeScreenshot(page, 'T1.3-showcase-final');

    console.log('✅ T1.3 COMPLETED: Showcase pipeline successful');
  });
});
