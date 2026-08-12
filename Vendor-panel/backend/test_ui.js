const { chromium } = require('playwright');
(async () => {
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@h2cloud.com');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    console.log('Navigated to dashboard. Going to customers...');
    await page.goto('http://localhost:5173/customers');
    await page.waitForSelector('text=Add Vendor/Customer');
    console.log('Clicking Add Vendor...');
    await page.click('text=Add Vendor/Customer');
    await page.waitForSelector('input[name="customerName"]');
    
    // Fill form
    await page.fill('input[name="customerName"]', 'Playwright Vendor');
    await page.fill('input[name="email"]', 'playwright@vendor.com');
    await page.fill('input[name="domain"]', 'play.htwo.cloud');
    
    // Intercept API
    page.on('response', response => {
      if (response.url().includes('/api/vendors') && response.request().method() === 'POST') {
        console.log('API RESPONSE STATUS:', response.status());
        response.json().then(data => console.log('API RESPONSE BODY:', data)).catch(e => {});
      }
    });

    console.log('Clicking Save...');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    const toast = await page.locator('.toast, .Toastify').textContent();
    console.log('TOAST MESSAGE:', toast);
    
    await browser.close();
  } catch (err) {
    console.error('Playwright Error:', err);
    process.exit(1);
  }
})();
