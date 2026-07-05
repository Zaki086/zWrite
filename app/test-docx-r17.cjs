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
  
  page.on('console', msg => {
    console.log('[BRW]', msg.text());
  });

  // Base64 WebP image (typical from some clipboards or modern browsers)
  // Let's also use a PNG
  const webpImage = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  const pngImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
  
  await page.goto('http://localhost:5174/#/doc/test');
  
  // Wait for editor
  let found = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    found = await page.evaluate(() => !!document.querySelector('.ProseMirror')?.editor);
    if (found) break;
  }
  if (!found) { console.error('Editor not ready'); process.exit(1); }

  console.log('Inserting images...');
  await page.evaluate((webp, png) => {
    const html = `
      <p>Here is a WebP image:</p>
      <img src="${webp}" alt="webp-img" width="100" height="100" />
      <p>Here is a PNG image:</p>
      <img src="${png}" alt="png-img" width="100" height="100" />
    `;
    document.querySelector('.ProseMirror').editor.commands.setContent(html);
  }, webpImage, pngImage);
  
  await sleep(1000);

  console.log('Triggering export...');
  await page.evaluate(async () => {
    const editor = document.querySelector('.ProseMirror').editor;
    const pageSettings = { margins: { top: 25, bottom: 25, left: 25, right: 25 }, orientation: 'portrait', pageBorder: false };
    try {
      if (window.exportToDOCX) {
        console.log('Found exportToDOCX, calling it...');
        await window.exportToDOCX(editor, pageSettings, 'test');
        console.log('exportToDOCX completed');
      } else {
        console.log('window.exportToDOCX not found');
      }
    } catch (e) {
      console.log('Error calling exportToDOCX:', e.message, e.stack);
    }
  });

  await sleep(2000);
  await browser.close();
  process.exit(0);
})();
