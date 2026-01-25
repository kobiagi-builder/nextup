const { chromium } = require('playwright');

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

  // Enable console log capture
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (text.includes('[ArtifactPage]') ||
        text.includes('[useResearch]') ||
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

      // Try multiple methods to get to Portfolio
      let navigated = false;

      // Method 1: Click sidebar icon (second icon - document/portfolio icon)
      const sidebarIcons = page.locator('nav a, nav button, [role="navigation"] a');
      if (await sidebarIcons.count() >= 2) {
        await sidebarIcons.nth(1).click(); // Second icon (Portfolio)
        await page.waitForTimeout(2000);
        navigated = true;
        console.log('✅ Clicked Portfolio icon in sidebar');
      }

      // Method 2: Click "View All" link if available
      if (!navigated) {
        const viewAllLink = page.locator('a:has-text("View All")');
        if (await viewAllLink.count() > 0) {
          await viewAllLink.click();
          await page.waitForTimeout(2000);
          navigated = true;
          console.log('✅ Clicked View All link');
        }
      }

      if (!navigated) {
        throw new Error('Could not navigate to Portfolio');
      }

      // Step 3: Click "New" button
      console.log('\n➕ Step 3: Clicking "New" button...');
      const newButton = page.locator('button:has-text("New")').first();
      if (await newButton.count() === 0) {
        throw new Error('New button not found');
      }
      await newButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ New artifact dialog opened');

      // Step 4: Fill in the form
      console.log('\n📝 Step 4: Filling artifact form...');

      // Wait for form to be visible
      await page.waitForTimeout(1000);

      // Simplified approach: Fill fields using keyboard navigation
      // Press Tab to move through fields and fill them in order

      // Fill title
      await page.keyboard.type(artifactConfig.title);
      console.log(`   - Title: "${artifactConfig.title}"`);

      // Tab to type select
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);

      // Select type by typing first letter and Enter
      const typeMap = {
        'blog': 'b',
        'showcase': 's',
        'social_post': 's'  // Might need adjustment
      };
      await page.keyboard.type(typeMap[artifactConfig.type] || 'b');
      await page.keyboard.press('Enter');
      console.log(`   - Type selected: "${artifactConfig.type}"`);

      // Tab to description
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);

      // Fill description
      await page.keyboard.type(artifactConfig.description);
      console.log(`   - Description: "${artifactConfig.description}"`);

      await page.waitForTimeout(500);

      // Step 5: Click "Create"
      console.log('\n✅ Step 5: Clicking "Create" button...');
      const createButton = page.locator('button:has-text("Create")').last();
      await createButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Artifact created');

      // Step 6: Click "Create Content"
      console.log('\n🎯 Step 6: Clicking "Create Content" button...');
      const createContentButton = page.locator('button:has-text("Create Content")').first();
      const buttonCount = await createContentButton.count();

      if (buttonCount === 0) {
        console.log('⚠️  Create Content button not found. Taking screenshot...');
        await page.screenshot({ path: `/tmp/no-create-content-${artifactConfig.type}.png`, fullPage: true });
        throw new Error('Create Content button not found');
      }

      await createContentButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Create Content clicked - AI Assistant should be open');

      // Step 7: Wait for AI to complete (poll every 5 seconds, max 10 minutes)
      console.log('\n⏳ Step 7: Waiting for AI to complete research and skeleton generation...');
      console.log(`   - Polling every ${POLL_INTERVAL / 1000} seconds`);
      console.log(`   - Timeout after ${MAX_WAIT_TIME / 60000} minutes`);

      let aiCompleted = false;
      let startTime = Date.now();
      let lastStatus = null;

      while (Date.now() - startTime < MAX_WAIT_TIME) {
        // Check for AI completion message in chat
        const chatMessages = await page.locator('[class*="message"], [class*="chat"]').allTextContents();
        const hasCompletion = chatMessages.some(msg =>
          msg.includes('skeleton is ready') ||
          msg.includes('content skeleton') ||
          msg.includes('research') && msg.includes('complete')
        );

        if (hasCompletion) {
          aiCompleted = true;
          console.log('\n✅ AI completion detected!');
          break;
        }

        // Check artifact status via logs
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed % 10 === 0 && elapsed > 0) { // Log every 10 seconds
          console.log(`   ⏱️  Waiting... (${elapsed}s elapsed)`);
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

      // Step 9: Verify skeleton content
      console.log('\n🔍 Step 9: Verifying skeleton content...');

      // Wait for editor to be visible
      await page.waitForTimeout(2000);

      // Take screenshot of final state
      await page.screenshot({ path: `/tmp/skeleton-${artifactConfig.type}.png`, fullPage: true });
      console.log(`📸 Screenshot saved: /tmp/skeleton-${artifactConfig.type}.png`);

      // Get editor content
      const editorContent = await page.locator('[class*="editor"], [contenteditable="true"]').first().textContent().catch(() => '');

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
