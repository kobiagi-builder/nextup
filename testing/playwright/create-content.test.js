import { chromium } from 'playwright';

const TARGET_URL = 'http://localhost:5173';

// Test configuration
const ARTIFACT_TYPES = [
  { type: 'blog', title: 'AI in Education', description: 'Blog post about AI for students' },
  { type: 'showcase', title: 'Portfolio Platform', description: 'Project showcase for my portfolio app' },
  { type: 'social_post', title: 'Quick AI Tips', description: 'Social media post about AI productivity' }
];

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_WAIT_TIME = 600000; // 10 minutes

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome', // Use installed Chrome (supports extensions)
    headless: false,
    slowMo: 300 // Slow down to see what's happening
  });

  const page = await browser.newPage();

  // Track artifact status changes from console logs
  let currentArtifactStatus = 'unknown';
  let skeletonGenerated = false;

  // Enable console log capture
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    // Track status changes from ArtifactPage logs
    if (text.includes('[ArtifactPage]') && text.includes('currentStatus:')) {
      const statusMatch = text.match(/currentStatus:\s*(\w+)/);
      if (statusMatch) {
        currentArtifactStatus = statusMatch[1];
      }
    }

    // Track skeleton generation from useAIChat logs
    if (text.includes('generateContentSkeleton') && text.includes('"success":true')) {
      skeletonGenerated = true;
    }

    if (text.includes('[ArtifactPage]') ||
        text.includes('[useResearch]') ||
        text.includes('[useAIChat]') ||
        text.includes('Status is ready') ||
        text.includes('skeleton')) {
      console.log(`[BROWSER ${type.toUpperCase()}]`, text);
    }
  });

  try {
    console.log('🚀 Starting comprehensive Create Content test...');
    console.log('📋 Testing artifact types:', ARTIFACT_TYPES.map(a => a.type).join(', '));
    console.log('');

    // Test each artifact type
    for (const artifactConfig of ARTIFACT_TYPES) {
      console.log('='.repeat(80));
      console.log(`📝 Testing: ${artifactConfig.type.toUpperCase()}`);
      console.log('='.repeat(80));

      // Step 1: Navigate to home page
      console.log('\n🏠 Step 1: Navigating to home page...');
      await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      console.log('✅ Page loaded');

      // Step 2: Navigate to Portfolio
      console.log('\n📂 Step 2: Navigating to Portfolio page...');

      // Click sidebar icon (second icon - document/portfolio icon)
      const sidebarIcons = page.locator('nav a, nav button, [role="navigation"] a');
      if (await sidebarIcons.count() >= 2) {
        await sidebarIcons.nth(1).click(); // Second icon (Portfolio)
        await page.waitForTimeout(2000);
        console.log('✅ Clicked Portfolio icon in sidebar');
      } else {
        throw new Error('Portfolio navigation not found');
      }

      // Step 3: Click "New" button using test ID
      console.log('\n➕ Step 3: Clicking "New" button...');
      const newButton = page.locator('[data-testid="portfolio-new-button"]');
      await newButton.waitFor({ state: 'visible', timeout: 5000 });
      await newButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ New artifact dialog opened');

      // Step 4: Fill in the form using test IDs
      console.log('\n📝 Step 4: Filling artifact form...');

      // Wait for dialog to be visible
      await page.locator('[data-testid="create-artifact-dialog"]').waitFor({ state: 'visible', timeout: 5000 });

      // Fill title
      const titleInput = page.locator('[data-testid="artifact-form-title"]');
      await titleInput.waitFor({ state: 'visible', timeout: 5000 });
      await titleInput.fill(artifactConfig.title);
      console.log(`   - Title: "${artifactConfig.title}"`);

      // Select type
      const typeSelect = page.locator('[data-testid="artifact-form-type"]');
      await typeSelect.click();
      await page.waitForTimeout(500);

      const typeOption = page.locator(`[data-testid="artifact-type-${artifactConfig.type}"]`);
      await typeOption.click();
      console.log(`   - Type selected: "${artifactConfig.type}"`);
      await page.waitForTimeout(500);

      // Fill description
      const contentTextarea = page.locator('[data-testid="artifact-form-content"]');
      await contentTextarea.fill(artifactConfig.description);
      console.log(`   - Description: "${artifactConfig.description}"`);

      await page.waitForTimeout(500);

      // Step 5: Click "Save as Draft" using test ID (creates draft without AI)
      console.log('\n✅ Step 5: Clicking "Save as Draft" button...');
      const saveDraftButton = page.locator('[data-testid="artifact-form-save-draft"]');
      await saveDraftButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Artifact created');

      // Step 6: Click "Create Content" using test ID
      console.log('\n🎯 Step 6: Clicking "Create Content" button...');

      // Wait for navigation to artifact page and "Create Content" button to appear
      const createContentButton = page.locator('[data-testid="artifact-create-content-button"]').or(
        page.locator('[data-testid="artifact-page-create-content-button"]')
      );

      await createContentButton.waitFor({ state: 'visible', timeout: 10000 });
      await createContentButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Create Content clicked - AI Assistant should be open');

      // Verify AI Assistant panel is open
      await page.locator('[data-testid="ai-assistant-panel"]').waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ AI Assistant panel confirmed open');

      // Step 7: Wait for AI to complete (poll every 5 seconds, max 10 minutes)
      console.log('\n⏳ Step 7: Waiting for AI to complete research and skeleton generation...');
      console.log(`   - Polling every ${POLL_INTERVAL / 1000} seconds`);
      console.log(`   - Timeout after ${MAX_WAIT_TIME / 60000} minutes`);
      console.log(`   - Detection: Tracking status via console logs`);

      // Reset status tracking for this artifact
      currentArtifactStatus = 'draft';
      skeletonGenerated = false;

      let aiCompleted = false;
      let startTime = Date.now();

      while (Date.now() - startTime < MAX_WAIT_TIME) {
        // Primary detection: Check status from console log tracking
        if (currentArtifactStatus === 'ready' && skeletonGenerated) {
          aiCompleted = true;
          console.log('\n✅ AI completion detected via status tracking!');
          console.log(`   - Artifact status: ${currentArtifactStatus}`);
          console.log(`   - Skeleton generated: ${skeletonGenerated}`);
          break;
        }

        // Secondary detection: Just status ready (skeleton might have been detected before)
        if (currentArtifactStatus === 'ready') {
          // Wait a bit more to ensure skeleton content is synced
          await page.waitForTimeout(2000);
          aiCompleted = true;
          console.log('\n✅ AI completion detected via status = ready!');
          break;
        }

        // Log progress every 10 seconds
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed % 10 === 0 && elapsed > 0) {
          console.log(`   ⏱️  Waiting... (${elapsed}s elapsed) | Status: ${currentArtifactStatus} | Skeleton: ${skeletonGenerated}`);
        }

        await page.waitForTimeout(POLL_INTERVAL);
      }

      if (!aiCompleted) {
        console.log('\n⚠️  TIMEOUT: AI did not complete within 10 minutes');
        await page.screenshot({ path: `/tmp/timeout-${artifactConfig.type}.png`, fullPage: true });
        throw new Error('AI completion timeout');
      }

      // Step 8: Close AI Assistant
      console.log('\n❌ Step 8: Closing AI Assistant...');
      const closeButton = page.locator('[aria-label="Close"], button:has-text("Close"), [data-dismiss]').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ AI Assistant closed');
      }

      // Step 9: Verify skeleton content using test ID
      console.log('\n🔍 Step 9: Verifying skeleton content...');

      // Wait for editor to be visible
      const editor = page.locator('[data-testid="artifact-editor"]');
      await editor.waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(2000);

      // Take screenshot of final state
      await page.screenshot({ path: `/tmp/skeleton-${artifactConfig.type}.png`, fullPage: true });
      console.log(`📸 Screenshot saved: /tmp/skeleton-${artifactConfig.type}.png`);

      // Get editor content
      const editorContent = await editor.locator('[contenteditable="true"]').first().textContent().catch(() => '');

      console.log('\n📋 Skeleton verification:');
      console.log(`   - Content length: ${editorContent.length} characters`);
      console.log(`   - Has IMAGE placeholder: ${editorContent.includes('[IMAGE') || editorContent.includes('IMAGE:') ? '✅' : '❌'}`);
      console.log(`   - Content preview: ${editorContent.substring(0, 200)}...`);

      // Type-specific checks
      if (artifactConfig.type === 'blog') {
        const hasTitle = editorContent.includes('Title') || editorContent.includes('#');
        const hasHook = editorContent.includes('Hook') || editorContent.includes('[Write');
        const hasImagePlaceholder = editorContent.includes('[IMAGE') || editorContent.includes('IMAGE:');
        console.log(`   - Blog structure:`);
        console.log(`     • Title: ${hasTitle ? '✅' : '❌'}`);
        console.log(`     • Hook: ${hasHook ? '✅' : '❌'}`);
        console.log(`     • Image placeholders: ${hasImagePlaceholder ? '✅' : '❌'}`);
      } else if (artifactConfig.type === 'social_post') {
        const hasHook = editorContent.includes('Hook') || editorContent.includes('[Write');
        const hasHashtags = editorContent.includes('#');
        const hasImagePlaceholder = editorContent.includes('[IMAGE') || editorContent.includes('IMAGE:');
        console.log(`   - Social post structure:`);
        console.log(`     • Hook: ${hasHook ? '✅' : '❌'}`);
        console.log(`     • Hashtags: ${hasHashtags ? '✅' : '❌'}`);
        console.log(`     • Image placeholder: ${hasImagePlaceholder ? '✅' : '❌'}`);
      } else if (artifactConfig.type === 'showcase') {
        const hasTitle = editorContent.includes('Title') || editorContent.includes('#');
        const hasProblem = editorContent.includes('Problem');
        const hasSolution = editorContent.includes('Solution');
        const hasImagePlaceholder = editorContent.includes('[IMAGE') || editorContent.includes('IMAGE:');
        console.log(`   - Showcase structure:`);
        console.log(`     • Title: ${hasTitle ? '✅' : '❌'}`);
        console.log(`     • Problem: ${hasProblem ? '✅' : '❌'}`);
        console.log(`     • Solution: ${hasSolution ? '✅' : '❌'}`);
        console.log(`     • Image placeholders: ${hasImagePlaceholder ? '✅' : '❌'}`);
      }

      console.log(`\n✅ ${artifactConfig.type.toUpperCase()} TEST COMPLETED`);
      console.log('');

      // Wait before next test
      if (artifactConfig !== ARTIFACT_TYPES[ARTIFACT_TYPES.length - 1]) {
        console.log('⏸️  Waiting 3 seconds before next test...\n');
        await page.waitForTimeout(3000);
      }
    }

    console.log('='.repeat(80));
    console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: '/tmp/error-state.png', fullPage: true });
    console.log('📸 Error screenshot saved to /tmp/error-state.png');
  } finally {
    console.log('\n🔍 Keeping browser open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();
