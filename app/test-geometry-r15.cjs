/**
 * Post-fix geometry verification — Round 15 (robust version)
 */
const puppeteer = require('puppeteer');
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.text().includes('[pagination]')) process.stdout.write('[BRW] ' + msg.text() + '\n');
  });
  
  await page.goto('http://localhost:5174/#/doc/test').catch(() => {});
  
  // Wait for editor with el.editor reference
  let found = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    found = await page.evaluate(() => {
      const el = document.querySelector('.ProseMirror');
      return !!(el && el.editor);
    });
    if (found) { console.log('Editor ready at attempt', i+1); break; }
  }
  if (!found) { console.error('Editor never ready'); await browser.close(); return; }

  async function runTest(label, html) {
    console.log('\n=== ' + label + ' ===');
    await page.evaluate((h) => {
      document.querySelector('.ProseMirror').editor.commands.setContent(h);
    }, html);
    await sleep(2000); // Wait for pagination microtask to fire

    return page.evaluate(() => {
      const MM_TO_PX = 3.779527559;
      const A4_H_MM = 297;
      const PAGE_GAP = 24;
      const pageH = A4_H_MM * MM_TO_PX;

      const content = document.querySelector('.paged-editor-content');
      const editor = document.querySelector('.ProseMirror');
      if (!content || !editor) return { error: 'no elements' };

      const cRect = content.getBoundingClientRect();
      const eRect = editor.getBoundingClientRect();
      const editorOriginY = eRect.top - cRect.top;

      const spacers = Array.from(document.querySelectorAll('.page-break-spacer'));
      const results = spacers.map((sp, bi) => {
        const next = sp.nextElementSibling;
        const nextTopRel = next ? next.getBoundingClientRect().top - cRect.top : null;
        const expectedY = (bi + 1) * (pageH + PAGE_GAP) + editorOriginY;
        const drift = nextTopRel !== null ? nextTopRel - expectedY : null;
        return {
          bi,
          spacerH: Math.round(parseFloat(sp.style.height)),
          nextTopRel: nextTopRel !== null ? Math.round(nextTopRel) : null,
          expectedY: Math.round(expectedY),
          drift: drift !== null ? Math.round(drift) : null,
          ok: drift !== null && Math.abs(drift) <= 2,
        };
      });

      return {
        editorOriginY: Math.round(editorOriginY),
        spacerCount: spacers.length,
        results,
      };
    });
  }

  // Test 1: 60 paragraphs
  const r1 = await runTest('60 paragraphs', (() => {
    let h = ''; for (let i = 1; i <= 60; i++) h += `<p>Paragraph ${i}</p>`; return h;
  })());
  if (r1.error) { console.log('Error:', r1.error); }
  else {
    console.log(`editorOriginY=${r1.editorOriginY} spacers=${r1.spacerCount}`);
    r1.results.forEach(d => console.log(`  Break ${d.bi}: h=${d.spacerH}px nextY=${d.nextTopRel} expect=${d.expectedY} drift=${d.drift}px ${d.ok ? '✅' : '❌'}`));
  }

  // Test 2: 120 paragraphs (5+ pages)
  const r2 = await runTest('120 paragraphs', (() => {
    let h = ''; for (let i = 1; i <= 120; i++) h += `<p>Paragraph ${i}</p>`; return h;
  })());
  if (r2.error) { console.log('Error:', r2.error); }
  else {
    console.log(`spacers=${r2.spacerCount}`);
    r2.results.forEach(d => console.log(`  Break ${d.bi}: h=${d.spacerH}px nextY=${d.nextTopRel} expect=${d.expectedY} drift=${d.drift}px ${d.ok ? '✅' : '❌'}`));
  }

  // Test 3: 40-item list
  const r3 = await runTest('40-item bullet list', (() => {
    let h = '<ul>'; for (let i = 1; i <= 40; i++) h += `<li><p>Item ${i}</p></li>`; h += '</ul>'; return h;
  })());
  if (r3.error) { console.log('Error:', r3.error); }
  else {
    console.log(`spacers=${r3.spacerCount}`);
    r3.results.forEach(d => console.log(`  Break ${d.bi}: h=${d.spacerH}px nextY=${d.nextTopRel} expect=${d.expectedY} drift=${d.drift}px ${d.ok ? '✅' : '❌'}`));
  }

  await browser.close();
})();
