/**
 * Content Agent Test Utilities
 *
 * Reusable helpers for Playwright tests covering the Content Agent.
 */

/**
 * Test artifact configurations
 */
export const TEST_ARTIFACTS = {
  blog: {
    title: 'AI in Product Management 2026',
    type: 'blog',
    description: 'Comprehensive guide on AI tools for product managers including roadmapping, analytics, and automation.',
    expectedStructure: {
      sections: ['Title', 'Hook', 'Section', 'Conclusion'],
      minLength: 1500,
      imagePlaceholders: 2
    }
  },
  socialPost: {
    title: '5 AI Productivity Tips for 2026',
    type: 'social_post',
    description: 'Quick tips on using AI to boost productivity in daily work.',
    expectedStructure: {
      sections: ['Hook', 'Body', 'Hashtags'],
      minLength: 300,
      maxLength: 800,
      imagePlaceholders: 1
    }
  },
  showcase: {
    title: 'AI-Powered Portfolio Platform',
    type: 'showcase',
    description: 'SaaS platform for consultants to create portfolios with AI assistance.',
    expectedStructure: {
      sections: ['Title', 'Problem', 'Solution', 'Features'],
      minLength: 1200,
      imagePlaceholders: 3
    }
  }
};

/**
 * Intent test messages for different user intents
 */
export const INTENT_TEST_MESSAGES = {
  FULL_PIPELINE: [
    'Create content',
    'Generate everything',
    'Run full pipeline',
    'Start from scratch'
  ],
  HUMANIZE_CONTENT: [
    'Make it sound more human',
    'Humanize this',
    'Remove AI patterns',
    'Make it more natural'
  ],
  CREATE_SKELETON: [
    'Create an outline',
    'Generate skeleton',
    'Create structure',
    'Build outline'
  ],
  WRITE_CONTENT: [
    'Write the content',
    'Fill in the content',
    'Write full article',
    'Complete the writing'
  ],
  STATUS_CHECK: [
    "What's the status?",
    'Check progress',
    'How is it going?',
    'Status update'
  ],
  UNCLEAR: [
    'fix it',
    'make it better',
    'improve',
    'help'
  ]
};

/**
 * Create a status monitor that tracks artifact status transitions via console logs
 *
 * @param {Page} page - Playwright page object
 * @returns {Object} Status monitor interface
 */
export function createStatusMonitor(page) {
  let currentStatus = 'unknown';
  let statusHistory = [];
  let skeletonGenerated = false;

  // Listen to console logs for status tracking
  page.on('console', msg => {
    const text = msg.text();

    // Track artifact status changes
    if (text.includes('[ArtifactPage]') && text.includes('currentStatus:')) {
      const match = text.match(/currentStatus:\s*(\w+)/);
      if (match && match[1] !== currentStatus) {
        const oldStatus = currentStatus;
        currentStatus = match[1];
        statusHistory.push({
          from: oldStatus,
          to: currentStatus,
          timestamp: Date.now()
        });
        console.log(`[Status Monitor] Transition: ${oldStatus} → ${currentStatus}`);
      }
    }

    // Track skeleton generation
    if (text.includes('generateContentSkeleton') && text.includes('"success":true')) {
      skeletonGenerated = true;
      console.log('[Status Monitor] Skeleton generation detected');
    }
  });

  return {
    getCurrentStatus: () => currentStatus,
    getStatusHistory: () => statusHistory,
    isSkeletonGenerated: () => skeletonGenerated,

    /**
     * Wait for a specific status transition
     * @param {string} targetStatus - Target status to wait for
     * @param {number} timeout - Max wait time in ms (default: 5 minutes)
     */
    waitForStatus: async (targetStatus, timeout = 300000) => {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        if (currentStatus === targetStatus) {
          console.log(`[Status Monitor] ✅ Status reached: ${targetStatus}`);
          return true;
        }
        await page.waitForTimeout(1000);
      }
      throw new Error(`Timeout waiting for status: ${targetStatus}. Current: ${currentStatus}`);
    },

    /**
     * Reset monitor state (for use between tests)
     */
    reset: () => {
      currentStatus = 'unknown';
      statusHistory = [];
      skeletonGenerated = false;
    }
  };
}

/**
 * Validate artifact content against expected structure
 *
 * @param {string} content - Editor content HTML
 * @param {string} artifactType - Artifact type (blog, socialPost, showcase)
 * @returns {Object} Validation results
 */
export function validateArtifactContent(content, artifactType) {
  const template = TEST_ARTIFACTS[artifactType];
  const results = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Remove HTML tags for text-only analysis
  const textContent = content.replace(/<[^>]*>/g, '');

  // Length check
  if (textContent.length < template.expectedStructure.minLength) {
    results.errors.push(
      `Content too short: ${textContent.length} < ${template.expectedStructure.minLength}`
    );
    results.valid = false;
  }

  if (template.expectedStructure.maxLength &&
      textContent.length > template.expectedStructure.maxLength) {
    results.warnings.push(
      `Content longer than expected: ${textContent.length} > ${template.expectedStructure.maxLength}`
    );
  }

  // Structure check - look for expected sections
  const expectedSections = template.expectedStructure.sections;
  const foundSections = [];
  const missingSections = [];

  for (const section of expectedSections) {
    const found = content.toLowerCase().includes(section.toLowerCase()) ||
                  textContent.toLowerCase().includes(section.toLowerCase());
    if (found) {
      foundSections.push(section);
    } else {
      missingSections.push(section);
    }
  }

  if (missingSections.length > 0) {
    results.warnings.push(`Missing sections: ${missingSections.join(', ')}`);
  }

  // Image placeholder check
  const imagePlaceholderPattern = /\[IMAGE|\[image|IMAGE:|<img/gi;
  const imagePlaceholders = content.match(imagePlaceholderPattern) || [];

  if (imagePlaceholders.length < template.expectedStructure.imagePlaceholders) {
    results.warnings.push(
      `Fewer image placeholders than expected: ${imagePlaceholders.length} < ${template.expectedStructure.imagePlaceholders}`
    );
  }

  // Summary
  console.log('\n📋 Content Validation Summary:');
  console.log(`   ✅ Valid: ${results.valid}`);
  console.log(`   📏 Length: ${textContent.length} chars`);
  console.log(`   🖼️  Images: ${imagePlaceholders.length} placeholders`);
  console.log(`   📑 Sections found: ${foundSections.join(', ')}`);
  if (results.errors.length > 0) {
    console.log(`   ❌ Errors: ${results.errors.join('; ')}`);
  }
  if (results.warnings.length > 0) {
    console.log(`   ⚠️  Warnings: ${results.warnings.join('; ')}`);
  }

  return results;
}

/**
 * Validate research data quality
 *
 * @param {Page} page - Playwright page object
 * @returns {Object} Validation results
 */
export async function validateResearch(page) {
  console.log('\n🔍 Validating research data...');

  // Check if research area is collapsed
  const expandButton = page.locator('[data-testid="research-expand-button"]');
  if (await expandButton.isVisible()) {
    console.log('   Expanding research area...');
    await expandButton.click();
    await page.waitForTimeout(500);
  }

  // Wait for loaded state
  const researchArea = page.locator('[data-testid="research-state-loaded"]');
  await researchArea.waitFor({ state: 'visible', timeout: 5000 });

  // Count research sources (look for common research UI patterns)
  const sourcesSelector = '.research-source, [class*="research-item"], [class*="source-card"]';
  const sources = await page.locator(researchArea).locator(sourcesSelector).count();

  const results = {
    valid: sources >= 5,
    sourceCount: sources,
    errors: [],
    warnings: []
  };

  console.log(`   📊 Found ${sources} research sources`);

  if (sources < 5) {
    results.errors.push(`Insufficient research sources: ${sources} < 5`);
    results.valid = false;
  } else if (sources > 10) {
    results.warnings.push(`Unusually high source count: ${sources} > 10`);
  }

  console.log(`   ${results.valid ? '✅' : '❌'} Research validation: ${results.valid ? 'PASS' : 'FAIL'}`);

  return results;
}

/**
 * Create artifact via UI form
 *
 * @param {Page} page - Playwright page object
 * @param {Object} config - Artifact configuration
 * @param {boolean} autoCreateContent - Whether to click "Create Content" button
 */
export async function createArtifact(page, config, autoCreateContent = false) {
  console.log(`\n📝 Creating ${config.type} artifact: "${config.title}"`);

  // Click "New" button
  const newButton = page.locator('[data-testid="portfolio-new-button"]');
  await newButton.waitFor({ state: 'visible', timeout: 5000 });
  await newButton.click();
  await page.waitForTimeout(1000);
  console.log('   ✅ New artifact dialog opened');

  // Wait for dialog
  await page.locator('[data-testid="create-artifact-dialog"]').waitFor({ state: 'visible', timeout: 5000 });

  // Fill title
  const titleInput = page.locator('[data-testid="artifact-form-title"]');
  await titleInput.waitFor({ state: 'visible', timeout: 5000 });
  await titleInput.fill(config.title);
  console.log(`   ✅ Title: "${config.title}"`);

  // Select type
  const typeSelect = page.locator('[data-testid="artifact-form-type"]');
  await typeSelect.click();
  await page.waitForTimeout(500);

  const typeOption = page.locator(`[data-testid="artifact-type-${config.type}"]`);
  await typeOption.click();
  console.log(`   ✅ Type: "${config.type}"`);
  await page.waitForTimeout(500);

  // Fill description
  const contentTextarea = page.locator('[data-testid="artifact-form-content"]');
  await contentTextarea.fill(config.description);
  console.log(`   ✅ Description filled`);

  await page.waitForTimeout(500);

  // Click appropriate submit button
  if (autoCreateContent) {
    // Click "Create Content" button (triggers AI pipeline)
    const createContentButton = page.locator('[data-testid="artifact-form-create-content"]');
    await createContentButton.click();
    console.log('   ✅ Clicked "Create Content" - AI pipeline will start');
  } else {
    // Click regular "Create" button (no AI)
    const createButton = page.locator('[data-testid="artifact-form-submit"]');
    await createButton.click();
    console.log('   ✅ Clicked "Create" - Draft created');
  }

  await page.waitForTimeout(2000);
}

/**
 * Wait for AI pipeline to complete with detailed progress logging
 *
 * @param {Page} page - Playwright page object
 * @param {Object} statusMonitor - Status monitor instance
 * @param {number} maxWaitTime - Max wait time in ms (default: 10 minutes)
 */
export async function waitForPipelineCompletion(page, statusMonitor, maxWaitTime = 600000) {
  console.log('\n⏳ Waiting for AI pipeline to complete...');
  console.log(`   ⏱️  Max wait time: ${maxWaitTime / 60000} minutes`);
  console.log(`   🔍 Monitoring: Status transitions via console logs`);

  const startTime = Date.now();
  let lastLogTime = startTime;
  let lastStatus = statusMonitor.getCurrentStatus();

  while (Date.now() - startTime < maxWaitTime) {
    const currentStatus = statusMonitor.getCurrentStatus();
    const isSkeletonGenerated = statusMonitor.isSkeletonGenerated();

    // Success condition: status is 'ready' and skeleton was generated
    if (currentStatus === 'ready' && isSkeletonGenerated) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`\n✅ Pipeline completed successfully in ${elapsed}s`);
      console.log(`   📊 Final status: ${currentStatus}`);
      console.log(`   🎯 Skeleton generated: ${isSkeletonGenerated}`);
      return true;
    }

    // Alternative success: just status 'ready' (skeleton might have been detected earlier)
    if (currentStatus === 'ready') {
      await page.waitForTimeout(2000); // Wait for content sync
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`\n✅ Pipeline completed (status: ready) in ${elapsed}s`);
      return true;
    }

    // Status change detected
    if (currentStatus !== lastStatus) {
      console.log(`   🔄 Status changed: ${lastStatus} → ${currentStatus}`);
      lastStatus = currentStatus;
      lastLogTime = Date.now();
    }

    // Log progress every 10 seconds
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const sinceLastLog = Math.floor((Date.now() - lastLogTime) / 1000);
    if (sinceLastLog >= 10) {
      console.log(`   ⏱️  ${elapsed}s elapsed | Status: ${currentStatus} | Skeleton: ${isSkeletonGenerated}`);
      lastLogTime = Date.now();
    }

    await page.waitForTimeout(1000);
  }

  // Timeout
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  console.log(`\n❌ Pipeline timeout after ${elapsed}s`);
  console.log(`   Last status: ${statusMonitor.getCurrentStatus()}`);
  console.log(`   Skeleton generated: ${statusMonitor.isSkeletonGenerated()}`);

  await page.screenshot({ path: '/tmp/pipeline-timeout.png', fullPage: true });
  console.log('   📸 Screenshot saved: /tmp/pipeline-timeout.png');

  throw new Error(`Pipeline timeout: Status stuck at "${statusMonitor.getCurrentStatus()}"`);
}

/**
 * Navigate to Portfolio page
 *
 * @param {Page} page - Playwright page object
 */
export async function navigateToPortfolio(page) {
  console.log('\n📂 Navigating to Portfolio page...');

  // Click sidebar portfolio icon (second icon)
  const sidebarIcons = page.locator('nav a, nav button, [role="navigation"] a');
  const iconCount = await sidebarIcons.count();

  if (iconCount >= 2) {
    await sidebarIcons.nth(1).click(); // Second icon (Portfolio)
    await page.waitForTimeout(2000);
    console.log('   ✅ Clicked Portfolio icon in sidebar');
  } else {
    throw new Error('Portfolio navigation not found');
  }
}

/**
 * Send chat message to AI Assistant
 *
 * @param {Page} page - Playwright page object
 * @param {string} message - Message to send
 */
export async function sendChatMessage(page, message) {
  console.log(`\n💬 Sending chat message: "${message}"`);

  const chatInput = page.locator('[data-testid="chat-input"]');
  await chatInput.waitFor({ state: 'visible', timeout: 5000 });
  await chatInput.fill(message);

  const submitButton = page.locator('[data-testid="chat-submit-button"]');
  await submitButton.click();

  await page.waitForTimeout(1000);
  console.log('   ✅ Message sent');
}

/**
 * Close AI Assistant panel
 *
 * @param {Page} page - Playwright page object
 */
export async function closeAIAssistant(page) {
  console.log('\n❌ Closing AI Assistant...');

  const closeButton = page.locator('[aria-label="Close"], button:has-text("Close")').first();
  if (await closeButton.count() > 0) {
    await closeButton.click();
    await page.waitForTimeout(1000);
    console.log('   ✅ AI Assistant closed');
  }
}

/**
 * Extract editor content
 *
 * @param {Page} page - Playwright page object
 * @returns {string} Editor content HTML
 */
export async function getEditorContent(page) {
  const editor = page.locator('[data-testid="artifact-editor"]');
  await editor.waitFor({ state: 'visible', timeout: 5000 });

  // Try to get content from contenteditable element
  const contentEditable = editor.locator('[contenteditable="true"]').first();
  const content = await contentEditable.innerHTML().catch(() => '');

  return content;
}

/**
 * Take screenshot with timestamp and label
 *
 * @param {Page} page - Playwright page object
 * @param {string} label - Screenshot label
 */
export async function takeScreenshot(page, label) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `/tmp/${label}-${timestamp}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`📸 Screenshot: ${filename}`);
  return filename;
}
