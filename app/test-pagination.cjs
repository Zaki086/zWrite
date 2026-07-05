const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.text().includes('traverse:') || msg.text().includes('ENTERING CONTAINER') || msg.text().includes('nodeDOM') || msg.text().includes('computePagination complete')) {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  await page.goto('http://localhost:5173/#/doc/puppeteer-test');
  await page.waitForSelector('.ProseMirror');
  
  // Set content to a list of 40 items
  await page.evaluate(() => {
    const el = document.querySelector('.ProseMirror');
    if (!el || !el.editor) return;
    
    let html = '<h2>Education</h2><ul>';
    for (let i = 1; i <= 40; i++) {
      html += `<li><p>Item ${i}</p></li>`;
    }
    html += '</ul>';
    el.editor.commands.setContent(html);
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const layout = await page.evaluate(() => {
    const items = document.querySelectorAll('li');
    const pages = document.querySelectorAll('.page-break-spacer');
    const header = document.querySelector('h2');
    return {
      ulHtml: document.querySelector('ul').innerHTML,
      spacersCount: pages.length
    };
  });
  
  console.log('LAYOUT RESULTS:', JSON.stringify(layout, null, 2));

  await browser.close();
})();
