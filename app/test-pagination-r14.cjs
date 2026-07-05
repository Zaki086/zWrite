/**
 * Diagnostic script — single-pass pagination verification (Round 14)
 * Run: node test-pagination-r14.cjs
 */
const puppeteer = require('puppeteer');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(20000);
  page.setDefaultTimeout(20000);

  const logs = [];
  const errors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[pagination]') || text.includes('computePageLayout')) logs.push(text);
  });
  page.on('pageerror', err => errors.push(err.message));

  // Navigate and wait for editor to load
  try {
    await page.goto('http://localhost:5173/#/doc/diag-r14');
  } catch (e) {
    console.log('goto error (may be fine for SPA):', e.message);
  }

  // Poll until .ProseMirror is in the DOM
  let found = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    found = await page.evaluate(() => !!document.querySelector('.ProseMirror'));
    if (found) break;
  }
  if (!found) {
    console.error('❌ .ProseMirror never appeared — is dev server running?');
    await browser.close();
    return;
  }
  console.log('✅ Editor found in DOM');
  await sleep(500);

  // Check if editor instance is accessible
  const editorCheck = await page.evaluate(() => {
    const el = document.querySelector('.ProseMirror');
    return { found: !!el, hasEditor: !!(el && el.editor) };
  });
  console.log('Editor check:', editorCheck);

  if (!editorCheck.hasEditor) {
    console.log('ℹ️  editor not on DOM el, trying to find it via React fiber or window...');
  }

  // ── Test 1: 25 paragraphs + 5-item bullet list ───────────────────────────
  console.log('\n=== Setting content: 25 paragraphs + 5-item bullet list ===');
  await page.evaluate(() => {
    const el = document.querySelector('.ProseMirror');
    if (!el || !el.editor) { console.warn('no editor on .ProseMirror'); return; }
    let html = '';
    for (let i = 1; i <= 25; i++) html += `<p>Paragraph ${i}</p>`;
    html += '<ul>';
    for (let i = 1; i <= 5; i++) html += `<li><p>List item ${i}</p></li>`;
    html += '</ul>';
    el.editor.commands.setContent(html);
  });
  await sleep(2000);

  const result1 = await page.evaluate(() => {
    const spacers = document.querySelectorAll('.page-break-spacer');
    const paragraphs = document.querySelectorAll('p');
    const items = document.querySelectorAll('li');
    const gaps = [];
    const allItems = Array.from(items);
    for (let i = 0; i < allItems.length - 1; i++) {
      const r1 = allItems[i].getBoundingClientRect();
      const r2 = allItems[i+1].getBoundingClientRect();
      const gap = r2.top - r1.bottom;
      if (gap > 50) gaps.push({ afterItem: i+1, gap: Math.round(gap) });
    }
    return {
      spacerCount: spacers.length,
      spacerHeights: Array.from(spacers).map(s => s.style.height),
      paragraphCount: paragraphs.length,
      listItemCount: items.length,
      gapsBetweenItems: gaps,
    };
  });

  console.log('Spacers:', result1.spacerCount, result1.spacerHeights);
  console.log('Paragraphs:', result1.paragraphCount, '| List items:', result1.listItemCount);
  console.log('Gaps between consecutive list items:', result1.gapsBetweenItems);

  // ── Test 2: 40-item list ─────────────────────────────────────────────────
  console.log('\n=== Setting content: 40-item bullet list ===');
  await page.evaluate(() => {
    const el = document.querySelector('.ProseMirror');
    if (!el || !el.editor) return;
    let html = '<ul>';
    for (let i = 1; i <= 40; i++) html += `<li><p>Item ${i}</p></li>`;
    html += '</ul>';
    el.editor.commands.setContent(html);
  });
  await sleep(2000);

  const result2 = await page.evaluate(() => {
    const spacers = document.querySelectorAll('.page-break-spacer');
    const items = document.querySelectorAll('li');
    const gaps = [];
    const allItems = Array.from(items);
    for (let i = 0; i < allItems.length - 1; i++) {
      const r1 = allItems[i].getBoundingClientRect();
      const r2 = allItems[i+1].getBoundingClientRect();
      const gap = r2.top - r1.bottom;
      if (gap > 50) gaps.push({ afterItem: i+1, gap: Math.round(gap) });
    }
    return {
      spacerCount: spacers.length,
      spacerHeights: Array.from(spacers).map(s => s.style.height),
      listItemCount: items.length,
      gapsBetweenItems: gaps,
    };
  });

  console.log('Spacers:', result2.spacerCount, result2.spacerHeights);
  console.log('List items:', result2.listItemCount);
  console.log('Gaps:', result2.gapsBetweenItems);
  if (result2.gapsBetweenItems.length > 0) {
    console.log('✅ List correctly splits at item(s):', result2.gapsBetweenItems.map(g => g.afterItem).join(', '));
  } else if (result2.listItemCount === 0) {
    console.log('⚠️ Editor content not being set — no list items found');
  } else {
    console.log('❌ No splits detected in 40-item list — pagination may be broken');
  }

  // ── Logs ─────────────────────────────────────────────────────────────────
  console.log('\n=== [pagination] logs ===');
  if (logs.length) logs.slice(-20).forEach(l => console.log(l));
  else console.log('(none captured)');

  if (errors.length) {
    console.log('\n❌ JS Errors:');
    errors.forEach(e => console.log(e));
  }

  await browser.close();
})();
