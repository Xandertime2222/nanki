const { chromium } = require('playwright');
const path = require('path');

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  const views = [
    { url: '/', name: 'workspace' },
    { url: '/', nav: 'nav-import', name: 'import' },
    { url: '/', nav: 'nav-library', name: 'library' },
    { url: '/', nav: 'nav-analysis', name: 'analysis' },
    { url: '/', nav: 'nav-review', name: 'review' },
    { url: '/', nav: 'nav-settings', name: 'settings' },
  ];
  
  const outputDir = '/home/alex/openclaw-coding/nanki-repo/screenshots';
  
  for (const view of views) {
    await page.goto('http://localhost:1420' + view.url);
    await page.waitForTimeout(1000);
    
    if (view.nav) {
      await page.click('[data-testid="' + view.nav + '"]');
      await page.waitForTimeout(500);
    }
    
    await page.screenshot({ path: path.join(outputDir, view.name + '.png'), fullPage: false });
    console.log('Screenshot: ' + view.name + '.png');
  }
  
  await browser.close();
  console.log('All screenshots saved to: ' + outputDir);
}

takeScreenshots().catch(console.error);