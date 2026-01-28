const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:5173';

(async () => {
  console.log('🚀 Testing Blog artifact with improved image generation...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Log relevant console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('image') || text.includes('Image') || text.includes('DALL') || msg.type() === 'error') {
      console.log(`[BROWSER] ${msg.type()}: ${text}`);
    }
  });

  try {
    // Navigate to app
    console.log('1️⃣ Navigating to app...');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Click "Start Creating" button
    console.log('2️⃣ Clicking "Start Creating" button...');
    const startButton = page.locator('button:has-text("Start Creating"), a:has-text("Start Creating")');
    if (await startButton.count() > 0) {
      await startButton.first().click();
      await page.waitForTimeout(2000);
    }

    // Select Blog type
    console.log('3️⃣ Selecting Blog type...');
    const blogButton = page.locator('button:has-text("Blog"), [data-type="blog"]');
    if (await blogButton.count() > 0) {
      await blogButton.first().click();
      await page.waitForTimeout(1000);
    }

    // Fill in title and description with content that has clear themes
    console.log('4️⃣ Filling in blog details with theme-rich content...');
    const titleInput = page.locator('input[name="title"], input[placeholder*="title"], input[placeholder*="Title"]');
    const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description"], textarea[placeholder*="topic"]');

    const blogTitle = 'How AI is Transforming Modern Business Success';
    const blogDescription = `Write a comprehensive blog post about how artificial intelligence is revolutionizing business operations and driving growth. Cover topics like automation, data-driven decision making, and innovative AI tools that help companies achieve their goals. Include practical examples of how AI improves productivity and customer experience.`;

    if (await titleInput.count() > 0) {
      console.log(`   Title: "${blogTitle}"`);
      await titleInput.first().fill(blogTitle);
    }

    if (await descInput.count() > 0) {
      console.log(`   Description: "${blogDescription.substring(0, 80)}..."`);
      await descInput.first().fill(blogDescription);
    }

    await page.screenshot({ path: '/tmp/ss-blog-01-form.png' });

    // Submit the form
    console.log('5️⃣ Submitting form...');
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Start"), button:has-text("Generate")');
    if (await submitButton.count() > 0) {
      await submitButton.first().click();
    }

    // Wait for processing to start
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/ss-blog-02-processing.png' });

    // Monitor status changes
    console.log('\n6️⃣ Monitoring artifact processing...');
    console.log('   Expected flow: research → skeleton → writing → creating_visuals → ready\n');

    let lastStatus = '';
    let imageGenerationStarted = false;
    let finalUrl = '';

    for (let i = 0; i < 90; i++) {  // Up to 7.5 minutes
      await page.waitForTimeout(5000);

      // Get current status from page
      const statusText = await page.evaluate(() => {
        const badge = document.querySelector('[class*="badge"], [class*="status"]');
        return badge ? badge.textContent : null;
      });

      const currentUrl = page.url();

      if (statusText && statusText !== lastStatus) {
        console.log(`   [${i * 5}s] Status: ${statusText}`);
        lastStatus = statusText;

        if (statusText.toLowerCase().includes('visual') || statusText.toLowerCase().includes('image')) {
          imageGenerationStarted = true;
          console.log('   📷 Image generation phase started!');
        }

        if (statusText.toLowerCase().includes('ready')) {
          console.log('   ✅ Artifact reached READY status!');
          finalUrl = currentUrl;
          await page.screenshot({ path: '/tmp/ss-blog-03-ready.png', fullPage: true });
          break;
        }
      }

      // Check for images in the content
      const imageCount = await page.locator('img[src*="supabase"], img[src*="storage"]').count();
      if (imageCount > 0 && !finalUrl) {
        console.log(`   🖼️ Found ${imageCount} generated images in content!`);
      }

      // Progress screenshot every 30 seconds
      if (i % 6 === 0 && i > 0) {
        await page.screenshot({ path: `/tmp/ss-blog-progress-${i}.png` });
      }
    }

    // Final analysis
    console.log('\n7️⃣ Final Analysis...');

    // Count and inspect images
    const images = await page.locator('img').all();
    console.log(`   Total images found: ${images.length}`);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      const box = await img.boundingBox();

      if (src && (src.includes('supabase') || src.includes('storage'))) {
        console.log(`   Image ${i + 1}:`);
        console.log(`     - Alt: "${alt?.substring(0, 60) || 'none'}..."`);
        console.log(`     - Dimensions: ${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'unknown'}`);
        console.log(`     - URL: ${src.substring(0, 80)}...`);
      }
    }

    // Final full-page screenshot
    await page.screenshot({ path: '/tmp/ss-blog-final.png', fullPage: true });
    console.log('\n📸 Screenshots saved to /tmp/ss-blog-*.png');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/ss-blog-error.png', fullPage: true });
  } finally {
    console.log('\n✅ Test complete. Browser closing in 3 seconds...');
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();
