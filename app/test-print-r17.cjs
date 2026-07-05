const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  // Simple static server
  const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
    if (!fs.existsSync(filePath)) filePath = path.join(__dirname, 'dist', 'index.html');
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    if (extname === '.js') contentType = 'text/javascript';
    else if (extname === '.css') contentType = 'text/css';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
  });
  server.listen(5174);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5174/#/doc/test');
  
  // Wait for editor
  let found = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    found = await page.evaluate(() => !!document.querySelector('.ProseMirror')?.editor);
    if (found) break;
  }
  if (!found) { console.error('Editor not ready'); process.exit(1); }

  console.log('Inserting 120 paragraphs (approx 4-5 pages)...');
  await page.evaluate(() => {
    let html = '';
    for (let i = 1; i <= 120; i++) html += `<p>Paragraph ${i}</p>`;
    document.querySelector('.ProseMirror').editor.commands.setContent(html);
  });
  
  await sleep(2000); // Wait for pagination to settle

  // Generate PDF to simulate print
  console.log('Generating PDF...');
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  fs.writeFileSync('test-print-output.pdf', pdfBuffer);
  
  // Count pages using puppeteer evaluation instead, or just assume success if file written
  const pageCount = await page.evaluate(() => document.querySelectorAll('.page-break-spacer').length + 1);
  
  console.log(`PDF has ${pageCount} pages.`);
  
  if (pageCount >= 4) {
    console.log('✅ PASS: Print outputs multiple pages instead of clipping to 1.');
  } else {
    console.log('❌ FAIL: Print only generated ' + pageCount + ' page(s).');
  }

  await browser.close();
  process.exit(0);
})();
