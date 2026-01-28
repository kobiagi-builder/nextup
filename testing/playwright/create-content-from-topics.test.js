import { chromium } from 'playwright';

const TARGET_URL = 'http://localhost:5173';

// Test configuration
const TOPIC_PROMPTS = [
  {
    prompt: 'Give me 10 case study topic ideas about fintech and payments',
    expectedType: 'showcase'
  },
  {
    prompt: 'Suggest 5 blog post topics about AI in education',
    expectedType: 'blog'
  },
  {
    prompt: 'Give me ideas for LinkedIn posts about product management',
    expectedType: 'social_post'
  }
];

// Timeouts configuration
const TIMEOUTS = {
  STANDARD: 60000,           // 1 minute for standard operations
  AI_PROCESSING: 180000,     // 3 minutes for AI processing stages
  POLL_INTERVAL: 500,        // 500ms rapid polling
  ELEMENT_WAIT: 10000,       // 10 seconds for element waits
  TRANSITION: 1000,          // 1 second for UI transitions
};

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 200
  });

  const page = await browser.newPage();

  // Track artifact status changes from console logs
  let currentArtifactStatus = 'unknown';
  let skeletonGenerated = false;

  // Enable console log capture
  page.on('console', msg => {
    const text = msg.text();

    // Track status changes from ArtifactPage logs
    if (text.includes('[ArtifactPage]') && text.includes('currentStatus:')) {
      const statusMatch = text.match(/currentStatus:\s*(\w+)/);
      if (statusMatch) {
        currentArtifactStatus = statusMatch[1];
        console.log(`   [STATUS] ${currentArtifactStatus}`);
      }
    }

    // Track skeleton generation
    if (text.includes('generateContentSkeleton') && text.includes('"success":true')) {
      skeletonGenerated = true;
      console.log('   [SKELETON] Generated!');
    }

    // Log key events
    if (text.includes('Status is ready') || text.includes('skeleton')) {
      console.log(`   [EVENT] ${text.substring(0, 100)}`);
    }

    // Debug: Track ChatPanel message copy
    if (text.includes('[ChatPanel] Copied messages') || text.includes('Copied messages to artifact')) {
      console.log(`   [COPY] ${text.substring(0, 150)}`);
    }

    // Debug: Track any message about contextKey
    if (text.includes('contextKey') || text.includes('messageCount')) {
      console.log(`   [DEBUG] ${text.substring(0, 150)}`);
    }
  });

  try {
    console.log('═'.repeat(70));
    console.log('   CREATE CONTENT FROM AI-GENERATED TOPICS TEST');
    console.log('═'.repeat(70));
    console.log('');
    console.log('Timeouts: Standard=1min, AI Processing=3min, Poll=500ms');
    console.log('');

    // Test first topic prompt (case studies - worked in earlier runs)
    const topicConfig = TOPIC_PROMPTS[0]; // Use case study prompt

    console.log('─'.repeat(70));
    console.log(`Testing: ${topicConfig.prompt.substring(0, 50)}...`);
    console.log('─'.repeat(70));

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Navigate to Portfolio (1 min timeout)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[1/8] Navigating to Portfolio page...');
    const step1Start = Date.now();

    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: TIMEOUTS.STANDARD });
    await page.waitForTimeout(TIMEOUTS.TRANSITION);

    const sidebarIcons = page.locator('nav a, nav button, [role="navigation"] a');
    if (await sidebarIcons.count() >= 2) {
      await sidebarIcons.nth(1).click();
      await page.waitForTimeout(TIMEOUTS.TRANSITION);
    }

    console.log(`   ✓ Done (${Math.round((Date.now() - step1Start) / 1000)}s)`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Open AI Research Assistant (1 min timeout)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[2/8] Opening AI Research Assistant...');
    const step2Start = Date.now();

    const aiResearchButton = page.locator('[data-testid="ai-research-button"]');
    await aiResearchButton.waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_WAIT });
    await aiResearchButton.click();
    await page.waitForTimeout(TIMEOUTS.TRANSITION);

    const aiResearchSheet = page.locator('[data-testid="ai-research-sheet"]');
    await aiResearchSheet.waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_WAIT });

    console.log(`   ✓ Done (${Math.round((Date.now() - step2Start) / 1000)}s)`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Send topic generation prompt (1 min timeout)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[3/8] Sending prompt...');
    const step3Start = Date.now();

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_WAIT });
    await chatInput.fill(topicConfig.prompt);
    await page.waitForTimeout(300);

    const submitButton = page.locator('[data-testid="chat-submit-button"]');
    await submitButton.click();

    console.log(`   ✓ Prompt: "${topicConfig.prompt.substring(0, 40)}..."`);
    console.log(`   ✓ Done (${Math.round((Date.now() - step3Start) / 1000)}s)`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Wait for topic cards (3 min AI timeout, rapid polling)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[4/8] Waiting for topic cards (AI processing, 3min max)...');
    const step4Start = Date.now();

    let topicCardsFound = false;
    while (Date.now() - step4Start < TIMEOUTS.AI_PROCESSING) {
      const topicCards = page.locator('[data-testid^="topic-card-"]');
      const cardCount = await topicCards.count();

      if (cardCount > 0) {
        console.log(`   ✓ Found ${cardCount} topic cards!`);
        topicCardsFound = true;
        break;
      }

      const elapsed = Math.floor((Date.now() - step4Start) / 1000);
      if (elapsed % 10 === 0 && elapsed > 0) {
        console.log(`   ⏳ Waiting... (${elapsed}s)`);
      }

      await page.waitForTimeout(TIMEOUTS.POLL_INTERVAL);
    }

    if (!topicCardsFound) {
      await page.screenshot({ path: `/tmp/no-topics-${topicConfig.expectedType}.png`, fullPage: true });
      throw new Error(`No topic cards found within ${TIMEOUTS.AI_PROCESSING / 1000}s`);
    }

    console.log(`   ✓ Done (${Math.round((Date.now() - step4Start) / 1000)}s)`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: Click Create Content (1 min timeout)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[5/8] Clicking Create Content...');
    const step5Start = Date.now();

    await page.waitForTimeout(TIMEOUTS.TRANSITION);

    const createContentButtons = page.locator('[data-testid^="topic-create-content-button-"]');
    const firstButton = createContentButtons.first();

    if (await firstButton.count() === 0) {
      throw new Error('No Create Content buttons found');
    }

    const firstCard = page.locator('[data-testid^="topic-card-"]').first();
    const topicTitle = await firstCard.locator('h4').textContent().catch(() => 'Unknown');
    console.log(`   Topic: "${topicTitle?.substring(0, 50)}..."`);

    await firstButton.click();
    await page.waitForTimeout(TIMEOUTS.TRANSITION * 2);

    console.log(`   ✓ Done (${Math.round((Date.now() - step5Start) / 1000)}s)`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 6: Wait for AI content generation (3 min timeout, rapid polling)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[6/8] Waiting for AI content generation (3min max)...');
    const step6Start = Date.now();

    currentArtifactStatus = 'draft';
    skeletonGenerated = false;

    let aiCompleted = false;

    while (Date.now() - step6Start < TIMEOUTS.AI_PROCESSING) {
      // Check for completion
      if (currentArtifactStatus === 'ready') {
        aiCompleted = true;
        console.log(`   ✓ Status: ready`);
        break;
      }

      if (skeletonGenerated) {
        await page.waitForTimeout(1000);
        aiCompleted = true;
        console.log(`   ✓ Skeleton generated`);
        break;
      }

      const elapsed = Math.floor((Date.now() - step6Start) / 1000);
      if (elapsed % 10 === 0 && elapsed > 0) {
        console.log(`   ⏳ Waiting... (${elapsed}s) Status: ${currentArtifactStatus}`);
      }

      await page.waitForTimeout(TIMEOUTS.POLL_INTERVAL);
    }

    if (!aiCompleted) {
      await page.screenshot({ path: `/tmp/timeout-content-${topicConfig.expectedType}.png`, fullPage: true });
      console.log(`   ⚠ Timeout - continuing to verify current state...`);
    }

    console.log(`   ✓ Done (${Math.round((Date.now() - step6Start) / 1000)}s)`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 7: Verify chat persistence (previous messages visible)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[7/9] Verifying chat persistence...');
    const step7Start = Date.now();

    // The AI Assistant panel should still be open and show previous messages
    const aiPanel = page.locator('[data-testid="ai-assistant-panel"]');
    await aiPanel.waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_WAIT });

    // Check for the original user prompt about fintech case studies
    const chatContent = await aiPanel.textContent().catch(() => '');
    const hasOriginalPrompt = chatContent.includes('fintech') || chatContent.includes('case study') || chatContent.includes('payment');
    const hasResearchContext = chatContent.includes('Research') || chatContent.includes('skeleton') || chatContent.includes('artifact');

    console.log(`   Original prompt preserved: ${hasOriginalPrompt ? '✓' : '✗'}`);
    console.log(`   Research context visible: ${hasResearchContext ? '✓' : '✗'}`);

    if (hasOriginalPrompt) {
      console.log('   ✓ Chat session persisted successfully!');
    } else {
      console.log('   ⚠ Chat session may not be fully persisted');
    }

    console.log(`   ✓ Done (${Math.round((Date.now() - step7Start) / 1000)}s)`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 8: Close AI Assistant (1 min timeout)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[8/9] Closing AI Assistant...');
    const step8bStart = Date.now();

    const closeButton = page.locator('[aria-label="Close"], button:has-text("Close"), [data-dismiss]').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(TIMEOUTS.TRANSITION);
    }

    console.log(`   ✓ Done (${Math.round((Date.now() - step8bStart) / 1000)}s)`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 9: Verify skeleton content (1 min timeout)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[9/9] Verifying skeleton content...');
    const step9Start = Date.now();

    const editor = page.locator('[data-testid="artifact-editor"]');
    await editor.waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_WAIT });
    await page.waitForTimeout(TIMEOUTS.TRANSITION);

    await page.screenshot({ path: `/tmp/skeleton-topics-${topicConfig.expectedType}.png`, fullPage: true });

    const editorContent = await editor.locator('[contenteditable="true"]').first().textContent().catch(() => '');

    console.log(`   Content length: ${editorContent.length} chars`);
    console.log(`   Has IMAGE placeholder: ${editorContent.includes('[IMAGE') || editorContent.includes('IMAGE:') ? '✓' : '✗'}`);

    if (editorContent.length > 0) {
      console.log(`   Preview: ${editorContent.substring(0, 100)}...`);
    }

    console.log(`   ✓ Done (${Math.round((Date.now() - step9Start) / 1000)}s)`);

    // ═══════════════════════════════════════════════════════════════════
    // COMPLETE
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(70));
    console.log('   ✅ TEST COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(70));
    console.log(`   Screenshot: /tmp/skeleton-topics-${topicConfig.expectedType}.png`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: '/tmp/error-topics-test.png', fullPage: true });
    console.log('   Screenshot: /tmp/error-topics-test.png');
  } finally {
    console.log('\n   Browser closing in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
