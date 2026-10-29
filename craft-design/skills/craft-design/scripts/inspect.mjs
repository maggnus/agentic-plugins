#!/usr/bin/env node
// Inspect the same browser state that shot.mjs captures; no second renderer.
// CLI: node inspect.mjs <file-or-url> [shot options] [--fit] [--strict]
// Produces a PNG and a .json report per viewport. Review findings need judgment.
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Serialized into Chromium. Keep this function independent of module scope.
export function measureLayout({ fit = false, width = innerWidth, height = innerHeight, maxFindings = 200 } = {}) {
  const findings = [], seen = new Set(), fontSamples = new Map();
  let truncated = false, textCount = 0, complexBackgrounds = 0;
  const style = el => getComputedStyle(el);
  const box = r => ({ x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10,
    width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10 });
  const selector = el => {
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    for (let p = el; p && p.nodeType === 1; p = p.parentElement) {
      const tag = p.localName;
      const siblings = p.parentElement ? [...p.parentElement.children].filter(e => e.localName === tag) : [p];
      parts.unshift(tag + (siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(p) + 1})` : ''));
      if (p === document.body) break;
    }
    return parts.join(' > ');
  };
  const visible = el => {
    if (!el.getClientRects().length) return false;
    for (let p = el; p; p = p.parentElement) {
      const s = style(p);
      if (s.visibility === 'hidden' || s.visibility === 'collapse' || Number(s.opacity) === 0 || s.contentVisibility === 'hidden') return false;
    }
    return true;
  };
  const add = (code, severity, el, message, evidence = {}, rect = el.getBoundingClientRect()) => {
    const sel = selector(el), key = code + '|' + sel;
    if (seen.has(key)) return;
    seen.add(key);
    if (findings.length >= maxFindings) { truncated = true; return; }
    findings.push({ code, severity, selector: sel,
      craftId: el.closest('[data-craft-id]')?.getAttribute('data-craft-id') ?? null,
      message, rect: box(rect), evidence });
  };
  const outside = r => r.left < -1 || r.right > width + 1 || r.top < -1 || r.bottom > height + 1;
  const inViewport = r => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  const clipChains = new Map();
  const clipChain = el => {
    if (clipChains.has(el)) return clipChains.get(el);
    const chain = [];
    let skipping = false, containingBlock = null;
    for (let p = el; p; p = p.parentElement) {
      if (skipping && p !== containingBlock) continue;
      skipping = false; chain.push(p);
      const position = style(p).position;
      if (position === 'absolute') { skipping = true; containingBlock = p.offsetParent; }
      if (position === 'fixed') {
        skipping = true; containingBlock = null;
        for (let a = p.parentElement; a; a = a.parentElement) {
          const s = style(a);
          if (s.transform !== 'none' || ['translate', 'rotate', 'scale'].some(key => s[key] && s[key] !== 'none') ||
              s.perspective !== 'none' || s.filter !== 'none' ||
              s.backdropFilter && s.backdropFilter !== 'none' || /layout|paint|strict|content/.test(s.contain) ||
              /transform|translate|rotate|scale|perspective|filter/.test(s.willChange) || s.contentVisibility === 'auto') {
            containingBlock = a; break;
          }
        }
      }
    }
    clipChains.set(el, chain); return chain;
  };
  const clipping = (el, r, fontSize, control = false) => {
    for (const p of clipChain(el)) {
      // A control's own border is part of its box, not lost interactive area.
      if (control && p === el) continue;
      const s = style(p);
      if (s.display === 'inline') continue; // Overflow does not clip an inline box.
      const px = /^(hidden|clip)$/.test(s.overflowX), py = /^(hidden|clip)$/.test(s.overflowY);
      if (!px && !py) continue;
      const pr = p.getBoundingClientRect();
      const sx = p.offsetWidth ? pr.width / p.offsetWidth : 1;
      const sy = p.offsetHeight ? pr.height / p.offsetHeight : 1;
      const left = pr.left + p.clientLeft * sx, top = pr.top + p.clientTop * sy;
      const right = left + p.clientWidth * sx, bottom = top + p.clientHeight * sy;
      // Range rectangles include font leading. Small vertical excess is not
      // evidence that ink is clipped; require a substantial loss or a hidden line.
      const tolerance = control ? 1 : Math.max(3, fontSize * .25);
      const horizontalTolerance = control ? 1 : 2;
      if (px && (r.left < left - horizontalTolerance || r.right > right + horizontalTolerance) || py &&
          (r.bottom <= top || r.top >= bottom || r.top < top - tolerance || r.bottom > bottom + tolerance)) {
        add(control ? 'control-clipped' : 'text-clipped', 'error', el, control ? 'The control box extends beyond a clipping ancestor, even if its label fits.' : 'Text extends beyond a clipping ancestor.',
          { ancestor: selector(p), clip: { left, top, right, bottom }, text: el.textContent.trim().slice(0, 120) }, r);
        return true;
      }
    }
    return false;
  };
  const occlusion = (el, r) => {
    if (!inViewport(r)) return;
    const points = [.2, .5, .8].map(t => [r.left + r.width * t, r.top + r.height * .5])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
    const blockers = points.map(([x, y]) => document.elementFromPoint(x, y))
      .filter(top => top && top !== el && !el.contains(top) && !top.contains(el));
    if (points.length && blockers.length >= Math.ceil(points.length * 2 / 3)) {
      add('possible-occlusion', 'review', el, 'Another element covers most sampled points; inspect the screenshot.',
        { blocker: selector(blockers[0]), blockedSamples: blockers.length, samples: points.length }, r);
    }
  };
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const colour = value => {
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data].map((x, i) => i === 3 ? x / 255 : x);
  };
  const over = (fg, bg) => [...fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3])), 1];
  const luminance = rgb => rgb.slice(0, 3).map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; })
    .reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
  const contrast = el => {
    const chain = [];
    for (let p = el; p; p = p.parentElement) {
      const s = style(p);
      if (s.backgroundImage !== 'none' || Number(s.opacity) !== 1 || s.mixBlendMode !== 'normal' || s.filter !== 'none') {
        complexBackgrounds++; return;
      }
      chain.unshift(s);
    }
    let bg = [255, 255, 255, 1];
    for (const s of chain) bg = over(colour(s.backgroundColor), bg);
    const s = style(el), fg = over(colour(s.color), bg);
    const a = luminance(fg), b = luminance(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const large = parseFloat(s.fontSize) >= 24 || parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700;
    if (ratio + .02 < (large ? 3 : 4.5) && !el.closest(':disabled,[aria-disabled="true"]'))
      add('text-contrast', 'review', el, 'Computed solid-colour text contrast is below the reference threshold.',
        { ratio: Math.round(ratio * 100) / 100, threshold: large ? 3 : 4.5, foreground: s.color, background: bg.slice(0, 3) });
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || !node.textContent.trim() || el.closest('script,style,noscript,svg') || !visible(el)) continue;
    textCount++;
    const range = document.createRange(); range.selectNodeContents(node);
    const s = style(el);
    for (const r of range.getClientRects()) {
      if (!r.width || !r.height) continue;
      const clipped = clipping(el, r, parseFloat(s.fontSize));
      if (fit && outside(r)) add('outside-frame', 'error', el, 'Text is outside the required single-screen frame.', {}, r);
      if (!clipped) occlusion(el, r);
    }
    contrast(el);
    const key = [s.fontFamily, s.fontWeight, s.fontStyle, /[^\u0000-\u007f]/.test(node.textContent)].join('|');
    if (!fontSamples.has(key) && fontSamples.size < 48) fontSamples.set(key,
      { selector: selector(el), requested: s.fontFamily, weight: s.fontWeight, sample: node.textContent.trim().slice(0, 80) });
  }
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const s = style(el), r = el.getBoundingClientRect();
    const scrollX = /^(auto|scroll)$/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1;
    const scrollY = /^(auto|scroll)$/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
    if (fit && (scrollX || scrollY)) add('scroll-region', 'error', el, 'Scrollable content conflicts with --fit.',
      { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
    if (el instanceof HTMLImageElement && el.currentSrc && el.complete && !el.naturalWidth)
      add('broken-image', 'error', el, 'An image failed to decode.', { src: el.getAttribute('src') });
    if (el.matches('button,input:not([type="hidden"]),select,textarea,a[href],[role="button"]')) {
      const labelledBy = (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join('').trim();
      const label = el.getAttribute('aria-label')?.trim() || labelledBy || [...(el.labels ?? [])].map(x => x.textContent).join('').trim()
        || (!el.matches('input,select,textarea') ? el.textContent?.trim() : '') || el.getAttribute('title') || el.querySelector('img[alt]')?.getAttribute('alt')
        || (el.matches('input[type="submit"],input[type="reset"],input[type="button"]') ? el.value || el.type : '')
        || (el.matches('input[type="image"]') ? el.getAttribute('alt') : '');
      if (!label) add('control-name', 'error', el, 'Control has no detectable accessible name.');
      clipping(el, r, 0, true);
      if (innerWidth < 600 && (r.width < 44 || r.height < 44)) add('small-target', 'review', el,
        'Target is smaller than the skill’s 44 px touch guideline; check spacing and the intended platform.');
      if (fit && outside(r)) add('outside-frame', 'error', el, 'Control is outside the required single-screen frame.');
      occlusion(el, r);
    }
  }
  const root = document.documentElement;
  if (root.scrollWidth > width + 1) add('horizontal-overflow', 'error', root, 'Document is wider than the requested viewport.',
    { scrollWidth: root.scrollWidth, viewportWidth: width });
  if (fit && root.scrollHeight > height + 1) add('vertical-overflow', 'error', root, 'Document is taller than the required frame.',
    { scrollHeight: root.scrollHeight, viewportHeight: height });
  return { viewport: { width, height }, layoutViewport: { width: innerWidth, height: innerHeight }, document: { width: root.scrollWidth, height: root.scrollHeight },
    fit, findings, truncated, coverage: { textNodes: textCount, complexBackgroundsSkipped: complexBackgrounds },
    fontSamples: [...fontSamples.values()], fontFaces: [...document.fonts].map(f => ({ family: f.family, status: f.status, weight: f.weight })),
    limitations: ['Heuristic text/box checks, not a complete accessibility or visual-quality audit.',
      'Occlusion samples visible hit targets; transparent and pointer-events:none overlays may need manual review.',
      'Text metrics are not glyph outlines; small vertical excess is tolerated.',
      'Shadow DOM, iframe contents, canvas/SVG text, pseudo-elements, complex backgrounds and images of text need manual review.'] };
}

export async function inspectPage(send, options) {
  const result = await send('Runtime.evaluate', { expression: `(${measureLayout.toString()})(${JSON.stringify(options)})`, returnByValue: true });
  if (result.exceptionDetails || !result.result?.value) throw new Error('layout inspection failed: ' + (result.exceptionDetails?.text ?? 'no report'));
  const report = result.result.value;
  report.fonts = [];
  try {
    await send('DOM.enable'); await send('CSS.enable');
    const { root } = await send('DOM.getDocument', { depth: 0 });
    for (const sample of report.fontSamples) {
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: sample.selector });
      if (!nodeId) continue;
      const { fonts } = await send('CSS.getPlatformFontsForNode', { nodeId });
      report.fonts.push({ ...sample, actual: fonts });
    }
  } catch (err) { report.limitations.push('Actual fonts unavailable: ' + err.message); }
  delete report.fontSamples;
  for (const face of report.fontFaces.filter(f => f.status === 'error')) report.findings.push({ code: 'font-load-error', severity: 'review',
    selector: null, craftId: null, rect: null, message: 'A declared font failed to load; compare requested and actual fonts.', evidence: face });
  report.summary = { errors: report.findings.filter(f => f.severity === 'error').length,
    review: report.findings.filter(f => f.severity === 'review').length };
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'shot.mjs'), ...process.argv.slice(2), '--inspect'], { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
}
