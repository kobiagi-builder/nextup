const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:5173';
const AI_TIMEOUT = 300000; // 5 minutes for AI responses

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(AI_TIMEOUT);

  try {
    console.log('📍 Navigating to', TARGET_URL);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/step1-home.png' });
    console.log('✅ Page loaded');

    // Step 1: Click on "find topic"
    console.log('📍 Looking for "find topic"...');
    await page.locator('text=find topic').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/step2-topics.png' });
    console.log('✅ Clicked "find topic"');

    // Step 2: Click on "AI Research"
    console.log('📍 Clicking "AI Research"...');
    await page.locator('text=AI Research').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/step3-ai-research.png' });
    console.log('✅ Clicked "AI Research"');

    // Step 3: Click on "Research topic ideas"
    console.log('📍 Clicking "Research topic ideas"...');
    await page.locator('text=Research topic ideas').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/tmp/step4-research-ideas.png' });
    console.log('✅ Clicked "Research topic ideas"');

    // Step 4: Wait for chat to appear and be enabled
    console.log('📍 Waiting for chat input to be enabled...');
    const chatInput = page.locator('textarea').first();
    await chatInput.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for textarea to be enabled (not disabled)
    await page.waitForFunction(() => {
      const textarea = document.querySelector('textarea');
      return textarea && !textarea.disabled;
    }, { timeout: AI_TIMEOUT });
    console.log('✅ Chat input is enabled');

    // Type initial message
    await chatInput.fill('Hello, I need help with topic ideas');
    await page.screenshot({ path: '/tmp/step5-typed-message.png' });
    console.log('✅ Typed initial message');

    // Click send or press Enter
    const sendButton = page.locator('button[type="submit"]').first();
    if (await sendButton.isVisible({ timeout: 2000 })) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }
    console.log('✅ Sent initial message');

    // Wait for AI response
    console.log('📍 Waiting for AI response (up to 5 min)...');
    await page.screenshot({ path: '/tmp/step6-waiting.png' });

    // Wait for the input to become disabled (AI is processing)
    try {
      await page.waitForFunction(() => {
        const textarea = document.querySelector('textarea');
        return textarea && textarea.disabled;
      }, { timeout: 10000 });
      console.log('📍 AI is processing...');
    } catch (e) {
      console.log('📍 AI might have responded quickly');
    }

    // Wait for the input to become enabled again (AI finished)
    await page.waitForFunction(() => {
      const textarea = document.querySelector('textarea');
      return textarea && !textarea.disabled;
    }, { timeout: AI_TIMEOUT });
    console.log('✅ AI response received');
    await page.screenshot({ path: '/tmp/step7-response.png' });

    // Step 5: Send follow-up message
    console.log('📍 Sending: "create 4 topics for blogs"');
    await chatInput.fill('create 4 topics for blogs');
    await page.screenshot({ path: '/tmp/step8-follow-up.png' });

    // Click send
    if (await sendButton.isVisible({ timeout: 2000 })) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }
    console.log('✅ Sent follow-up message');

    // Wait for final response
    console.log('📍 Waiting for final AI response (up to 5 min)...');

    // Wait for processing to start
    try {
      await page.waitForFunction(() => {
        const textarea = document.querySelector('textarea');
        return textarea && textarea.disabled;
      }, { timeout: 10000 });
      console.log('📍 AI is processing...');
    } catch (e) {
      console.log('📍 AI might have responded quickly');
    }

    // Wait for AI to finish
    await page.waitForFunction(() => {
      const textarea = document.querySelector('textarea');
      return textarea && !textarea.disabled;
    }, { timeout: AI_TIMEOUT });

    console.log('✅ Final response received!');
    await page.screenshot({ path: '/tmp/step9-final.png', fullPage: true });

    console.log('\n🎉 Test completed successfully!');
    console.log('📸 Screenshots saved to /tmp/step*.png');
    console.log('Browser will stay open for 60 seconds...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
