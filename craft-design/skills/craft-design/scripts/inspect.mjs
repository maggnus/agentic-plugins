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
  const isFixedOrSticky = node => {
    for (let p = node; p && p !== document.documentElement; p = p.parentElement) {
      const pos = style(p).position;
      if (pos === 'fixed' || pos === 'sticky') return true;
    }
    return false;
  };
  let safeTop = 0, safeBottom = innerHeight;
  if (!fit) {
    for (const el of document.querySelectorAll('body *')) {
      const pos = style(el).position;
      if ((pos !== 'fixed' && pos !== 'sticky') || !visible(el)) continue;
      const pr = el.getBoundingClientRect();
      if (pr.width < innerWidth * 0.35 || pr.height <= 0 || pr.height >= innerHeight * 0.45) continue;
      if (pr.top <= 40) safeTop = Math.max(safeTop, pr.bottom + 2);
      if (pr.bottom >= innerHeight - 40) safeBottom = Math.min(safeBottom, pr.top - 2);
    }
  }
  const occlusion = (el, r, isControl = false) => {
    const sampleOcclusion = rect => {
      const pts = [.2, .5, .8].map(t => [rect.left + rect.width * t, rect.top + rect.height * .5])
        .filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
      const blks = pts.map(([x, y]) => document.elementFromPoint(x, y))
        .filter(top => top && top !== el && !el.contains(top) && !top.contains(el));
      return { pts, blks };
    };
    if (inViewport(r)) {
      const { pts, blks } = sampleOcclusion(r);
      if (!pts.length || blks.length < Math.ceil(pts.length * 2 / 3)) return;
      if (!fit && !isFixedOrSticky(el) && blks.some(isFixedOrSticky)) {
        const savedY = window.scrollY;
        try {
          const absTop = r.top + savedY;
          const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
          const safeCenter = safeTop + Math.max(0, safeBottom - safeTop) / 2;
          const targetY = Math.max(0, Math.min(maxScroll, absTop + r.height / 2 - safeCenter));
          window.scrollTo({ top: targetY, behavior: 'instant' });
          const nr = el.getBoundingClientRect();
          const after = sampleOcclusion(nr);
          if (after.pts.length && after.blks.length >= Math.ceil(after.pts.length * 2 / 3)) {
            add('possible-occlusion', 'review', el, 'Another element covers most sampled points even after scrolling; inspect the screenshot.',
              { blocker: selector(after.blks[0]), blockedSamples: after.blks.length, samples: after.pts.length }, nr);
          }
        } finally {
          window.scrollTo({ top: savedY, behavior: 'instant' });
        }
        return;
      }
      add('possible-occlusion', 'review', el, 'Another element covers most sampled points; inspect the screenshot.',
        { blocker: selector(blks[0]), blockedSamples: blks.length, samples: pts.length }, r);
      return;
    }
    if (isControl && !fit && !isFixedOrSticky(el) && (safeTop > 0 || safeBottom < innerHeight)) {
      const savedY = window.scrollY;
      const absTop = r.top + savedY, absBottom = r.bottom + savedY;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      if (absBottom - safeBottom > maxScroll - 1 || absTop - safeTop < -1) {
        try {
          const safeCenter = safeTop + Math.max(0, safeBottom - safeTop) / 2;
          const targetY = Math.max(0, Math.min(maxScroll, absTop + r.height / 2 - safeCenter));
          window.scrollTo({ top: targetY, behavior: 'instant' });
          const nr = el.getBoundingClientRect();
          const after = sampleOcclusion(nr);
          if (after.pts.length && after.blks.length >= Math.ceil(after.pts.length * 2 / 3) && after.blks.some(isFixedOrSticky)) {
            add('possible-occlusion', 'review', el, 'Control remains covered by a fixed/sticky element at the scroll boundary.',
              { blocker: selector(after.blks[0]), blockedSamples: after.blks.length, samples: after.pts.length }, nr);
          }
        } finally {
          window.scrollTo({ top: savedY, behavior: 'instant' });
        }
      }
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
  let internalScrollCount = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const s = style(el), r = el.getBoundingClientRect();
    const scrollX = /^(auto|scroll)$/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1;
    const scrollY = /^(auto|scroll)$/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
    if (fit && (scrollX || scrollY)) add('scroll-region', 'error', el, 'Scrollable content conflicts with --fit.',
      { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
    if (!fit && internalScrollCount < 3 && (s.overflowX === 'auto' || s.overflowX === 'scroll') && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2) {
      const hasTableOrGrid = Boolean(el.querySelector('table, [role="grid"], [role="table"]'));
      add('internal-horizontal-scroll', 'review', el,
        width <= 768 || hasTableOrGrid
          ? 'Visible container has internal horizontal scroll; reflow tables/grids or narrow blocks cleanly instead of clipping horizontally.'
          : 'Visible container has internal horizontal scroll; verify that content is not cramped or awkwardly clipped.',
        { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, viewportWidth: width, hasTableOrGrid }, r);
      internalScrollCount++;
    }
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
      let targetRect = r;
      if (el.matches('input')) {
        const labelEl = el.closest('label') || (el.id ? document.querySelector('label[for="' + CSS.escape(el.id) + '"]') : null);
        if (labelEl) {
          const lr = labelEl.getBoundingClientRect();
          if (lr.width > 0 && lr.height > 0 && getComputedStyle(labelEl).visibility !== 'hidden') {
            targetRect = { width: Math.max(r.width, lr.width), height: Math.max(r.height, lr.height) };
          }
        }
      }
      if (innerWidth <= 768 && (targetRect.width < 44 || targetRect.height < 44)) add('small-target', 'review', el,
        'Target is smaller than the skill’s 44 px touch guideline; check spacing and the intended platform.');
      if (fit && outside(r)) add('outside-frame', 'error', el, 'Control is outside the required single-screen frame.');
      occlusion(el, r, true);
    }
  }
  for (const el of document.querySelectorAll('[hidden]')) {
    const cs = style(el);
    if (cs.display === 'none' || !visible(el)) continue;
    const hr = el.getBoundingClientRect();
    if (hr.width > 0 && hr.height > 0) {
      add('hidden-attribute-visible', 'error', el, 'Element has the HTML hidden attribute, but CSS overrides display so it remains visible.', { display: cs.display, tag: el.localName }, hr);
    }
  }
  for (const el of document.querySelectorAll('body *')) {
    const ps = style(el);
    if (ps.position !== 'fixed' || !visible(el)) continue;
    const pr = el.getBoundingClientRect();
    if (pr.width < innerWidth * 0.35 || pr.height <= 0 || pr.height > 160 || pr.bottom < innerHeight - 8) continue;
    const hasInteractive = [...el.querySelectorAll('button, a[href], [role="button"], [role="tab"]')].some(c => visible(c) && c.getBoundingClientRect().width > 0);
    if (!hasInteractive) continue;
    const pt = parseFloat(ps.paddingTop) || 0, pb = parseFloat(ps.paddingBottom) || 0;
    const bt = parseFloat(ps.borderTopWidth) || 0, bb = parseFloat(ps.borderBottomWidth) || 0;
    const innerH = pr.height - pt - pb - bt - bb;
    if (innerH < 44) {
      add('fixed-bar-safe-area-clip', 'review', el, `Fixed bottom bar leaves only ${Math.round(innerH * 10) / 10}px inner height (< 44px) after padding/borders, risking clipped touch targets.`,
        { height: Math.round(pr.height * 10) / 10, paddingTop: pt, paddingBottom: pb, innerHeight: Math.round(innerH * 10) / 10 }, pr);
    }
  }
  const root = document.documentElement;
  if (width <= 480) {
    const hdr = document.querySelector('body > header, [role="banner"]');
    if (hdr && !hdr.querySelector('h1')) {
      const hr = hdr.getBoundingClientRect();
      if (hr.width > 0 && hr.height > 92 && hr.top < 40 && getComputedStyle(hdr).visibility !== 'hidden') {
        add('bloated-mobile-header', 'review', hdr, 'Mobile header exceeds 92px height; compact or collapse navigation.');
      }
    }
  }
  const h1El = [...document.querySelectorAll('h1')].find(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
  if (h1El && document.querySelectorAll('section, article').length >= 3 && root.scrollHeight > height * 1.2) {
    const firstScreenHeadings = [...document.querySelectorAll('h1, h2')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top < height && getComputedStyle(el).visibility !== 'hidden';
    });
    const bodyPara = [...document.querySelectorAll('p')].find(el => el.getBoundingClientRect().height > 0 && el.innerText.trim().length > 0 && getComputedStyle(el).visibility !== 'hidden');
    if (firstScreenHeadings.length && bodyPara) {
      const maxHeadingPx = Math.max(...firstScreenHeadings.map(el => parseFloat(getComputedStyle(el).fontSize) || 0));
      const bodyPx = parseFloat(getComputedStyle(bodyPara).fontSize) || 16;
      if (bodyPx > 0 && maxHeadingPx / bodyPx < 1.75) {
        add('flat-hierarchy', 'review', h1El, `Display-to-body ratio (${(maxHeadingPx / bodyPx).toFixed(2)}x) is below 1.75x.`);
      }
    }
  }
  let crampedCount = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (crampedCount >= 5) break;
    const s = getComputedStyle(el);
    if (s.textTransform !== 'uppercase' || s.visibility === 'hidden' || s.display === 'none') continue;
    const fs = parseFloat(s.fontSize) || 16;
    if (fs > 14) continue;
    const ls = s.letterSpacing === 'normal' ? 0 : (parseFloat(s.letterSpacing) || 0);
    if (ls >= 0.3) continue;
    const direct = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (direct.replace(/[^\p{L}]/gu, '').length > 6 && el.getClientRects().length > 0) {
      add('cramped-uppercase', 'review', el, 'Small uppercase text (<=14px) has letter-spacing below 0.3px.');
      crampedCount++;
    }
  }
  const topSections = [...document.querySelectorAll('main > section, body > section')].filter(sec => sec.getClientRects().length > 0 && getComputedStyle(sec).visibility !== 'hidden');
  if (topSections.length >= 4) {
    const isUniformCardGrid = sec => {
      if (sec.querySelector('table')) return false;
      const containers = [sec, ...sec.querySelectorAll('div, ul')];
      for (const box of containers) {
        const st = getComputedStyle(box);
        if (!/grid|flex/.test(st.display)) continue;
        const kids = [...box.children].filter(k => k.getBoundingClientRect().width > 40 && k.getBoundingClientRect().height > 40);
        if (kids.length < 3) continue;
        const rects = kids.map(k => k.getBoundingClientRect());
        const sameRow = rects.filter(r => Math.abs(r.top - rects[0].top) <= 8).length >= 2;
        const uniform = rects.every(r => Math.abs(r.width - rects[0].width) <= 24 && Math.abs(r.height - rects[0].height) <= 40);
        if (sameRow && uniform) return true;
      }
      return false;
    };
    let streak = 0;
    for (let i = 0; i < topSections.length; i++) {
      if (isUniformCardGrid(topSections[i])) {
        streak++;
        if (streak === 3) add('card-grid-monotony', 'review', topSections[i - 2], 'Three or more consecutive sections use uniform multi-column card grids.');
      } else {
        streak = 0;
      }
    }
  }
  if (document.querySelectorAll('section, article, aside, [data-craft-id]').length >= 4) {
    const oklabL = ([r, g, b]) => {
      const lin = v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const R = lin(r), G = lin(g), B = lin(b);
      const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
      const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
      const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
      return 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    };
    const bodyBg = colour(style(document.body).backgroundColor);
    const htmlBg = colour(style(document.documentElement).backgroundColor);
    const docBg = bodyBg[3] >= 0.92 ? bodyBg : htmlBg[3] >= 0.92 ? htmlBg : [255, 255, 255, 1];
    const docL = oklabL(docBg);
    let bleedCount = 0, weakCount = 0, sunkenCount = 0;
    const bleedKeys = new Set(), weakKeys = new Set(), sunkenKeys = new Set();
    for (const el of document.querySelectorAll('body *')) {
      if (bleedCount >= 3 && weakCount >= 3 && sunkenCount >= 3) break;
      if (el.closest('script,style,noscript,svg') || !visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 120 || r.height < 36) continue;
      const es = style(el);
      if (es.backgroundImage !== 'none') continue;
      const elBg = colour(es.backgroundColor);
      if (elBg[3] < 0.92) continue;
      const elL = oklabL(elBg);
      const structKey = el.localName + '|' + [...el.classList].sort().join('.');
      if (bleedCount < 3 && r.height >= 38 && !bleedKeys.has(structKey)) {
        const rgbDiffDoc = Math.abs(elBg[0] - docBg[0]) + Math.abs(elBg[1] - docBg[1]) + Math.abs(elBg[2] - docBg[2]);
        if (Math.abs(elL - docL) < 0.008 && rgbDiffDoc < 6) {
          let surfaceParent = null;
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const pBg = colour(style(p).backgroundColor);
            if (pBg[3] >= 0.92) {
              const parentDeltaDoc = Math.abs(oklabL(pBg) - docL);
              if (parentDeltaDoc >= 0.025 && parentDeltaDoc < 0.30) { surfaceParent = p; break; }
              if (parentDeltaDoc >= 0.30) break;
            }
          }
          if (surfaceParent) {
            bleedKeys.add(structKey);
            add('canvas-bleed-through', 'review', el, 'Nested region inside --surface reuses the outer canvas color; keep it transparent with 1px solid var(--border) dividers or use a subtle --surface-2 (L_bg <= L_surface2 <= L_surface).', { parent: selector(surfaceParent) }, r);
            bleedCount++;
          }
        }
      }
      if (sunkenCount < 3 && docL >= 0.85 && !sunkenKeys.has(structKey) && r.width >= 150 && r.height >= 44 &&
          !(el.matches('button, input, select, textarea, a, label, summary, code, pre, kbd, th, td, tr, thead, [role="button"], [role="tab"], [role="switch"], [role="tablist"], [role="radiogroup"]') ||
            el.closest('button, a, label, summary, pre, code, thead, [role="tablist"]') ||
            (r.height <= 64 && el.querySelector('input, select, textarea') && !el.querySelector('table, svg[width], article, section')))) {
        const chromaSpread = Math.max(elBg[0], elBg[1], elBg[2]) - Math.min(elBg[0], elBg[1], elBg[2]);
        if (chromaSpread < 35 && elL < docL - 0.012 && elL > 0.50) {
          let elevatedParent = null;
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const pBg = colour(style(p).backgroundColor);
            if (pBg[3] >= 0.92) {
              const pL = oklabL(pBg);
              if (Math.abs(pL - docL) >= 0.30 || pL <= docL + 0.01 || pL < 0.94) break;
              elevatedParent = p;
              break;
            }
          }
          if (elevatedParent) {
            sunkenKeys.add(structKey);
            add('sunken-inner-surface', 'review', el, 'Nested neutral container inside an elevated card is darker than the page canvas (L_el < L_bg); keep it transparent or use L_bg <= L_surface2 <= L_surface.', { parent: selector(elevatedParent) }, r);
            sunkenCount++;
          }
        }
      }
      if (weakCount < 3 && !weakKeys.has(structKey) && r.width >= 180 && r.height >= 80 &&
          parseFloat(es.paddingTop) >= 10 && parseFloat(es.paddingLeft) >= 10) {
        let parentBg = docBg;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const pBg = colour(style(p).backgroundColor);
          if (pBg[3] >= 0.92) { parentBg = pBg; break; }
          if (p === document.body) break;
        }
        const parentL = oklabL(parentBg);
        const rgbDist = Math.abs(elBg[0] - parentBg[0]) + Math.abs(elBg[1] - parentBg[1]) + Math.abs(elBg[2] - parentBg[2]);
        if (rgbDist >= 3 && Math.abs(elL - parentL) < 0.026 && es.boxShadow === 'none') {
          const hasCrispBorder = ['Top', 'Right', 'Bottom', 'Left'].some(side => {
            const bw = parseFloat(es['border' + side + 'Width']) || 0;
            if (bw < 1 || es['border' + side + 'Style'] === 'none') return false;
            const bc = colour(es['border' + side + 'Color']);
            const composited = over(bc, parentBg);
            return Math.abs(oklabL(composited) - parentL) >= 0.055;
          });
          if (!hasCrispBorder) {
            weakKeys.add(structKey);
            add('weak-surface-separation', 'review', el, 'Container surface differs from its parent by less than 0.026 OKLab L without a crisp border or shadow.',
              { deltaL: Math.round(Math.abs(elL - parentL) * 1000) / 1000 }, r);
            weakCount++;
          }
        }
      }
    }
    const solidButtons = [];
    const bgLOf = node => {
      for (let p = node; p; p = p.parentElement) {
        const bg = colour(style(p).backgroundColor);
        if (bg[3] >= 0.92) return oklabL(bg);
      }
      return docL;
    };
    const cardOf = node => {
      for (let p = node; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
        if (p.matches('article, form, dialog, aside, header, footer, li, tr')) return p;
        const ps = style(p);
        const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some(s => (parseFloat(ps['border' + s + 'Width']) || 0) >= 1 && ps['border' + s + 'Style'] !== 'none');
        if (hasBorder || ps.boxShadow !== 'none' || colour(ps.backgroundColor)[3] >= 0.92) return p;
        const parent = p.parentElement;
        if (parent && parent !== document.body && parent !== document.documentElement) {
          const pds = style(parent);
          const isGrid = (pds.display === 'grid' || pds.display === 'inline-grid') && pds.gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length >= 2;
          const isFlex = pds.display === 'flex' || pds.display === 'inline-flex';
          if ((isGrid || isFlex) && (p.querySelector('h1, h2, h3, h4, h5, h6') || p.getBoundingClientRect().height >= 120)) {
            if ([...parent.children].some(c => c !== p && c.getBoundingClientRect().height >= 120)) return p;
          }
        }
      }
      return null;
    };
    for (const btn of document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')) {
      if (btn.getAttribute('role') === 'tab' || !visible(btn)) continue;
      const br = btn.getBoundingClientRect();
      if (br.height < 34 || br.width < 110) continue;
      const btnBg = colour(style(btn).backgroundColor);
      if (btnBg[3] < 0.85) continue;
      const containerL = bgLOf(btn.parentElement);
      if (Math.abs(oklabL(btnBg) - containerL) >= 0.22) solidButtons.push({ btn, br, parent: btn.parentElement, card: cardOf(btn.parentElement) });
    }
    let competingCount = 0;
    const reportedGroups = new Set();
    for (let i = 0; i < solidButtons.length && competingCount < 3; i++) {
      for (let j = i + 1; j < solidButtons.length && competingCount < 3; j++) {
        const a = solidButtons[i], b = solidButtons[j];
        const sameParent = a.parent && a.parent === b.parent;
        const sameCard = a.card && a.card === b.card;
        const dx = Math.max(0, a.br.left - b.br.right, b.br.left - a.br.right);
        const dy = Math.max(0, a.br.top - b.br.bottom, b.br.top - a.br.bottom);
        const dist = Math.hypot(dx, dy);
        if (sameParent || (sameCard && dist <= 28)) {
          const target = (sameParent ? a.parent : a.card) || b.btn;
          if (!reportedGroups.has(target)) {
            reportedGroups.add(target);
            add('competing-solid-actions', 'review', target, 'Multiple solid high-contrast action buttons appear in the same group; keep at most one solid CTA and outline secondary/destructive buttons.');
            competingCount++;
          }
        }
      }
    }
  }
  let primSvgCount = 0, svgOverlapCount = 0, svgCollisionCount = 0;
    const segHitsBox = (seg, x1, y1, x2, y2) => {
      const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
      let t0 = 0, t1 = 1;
      const clip = (p, q) => {
        if (p === 0) return q >= 0;
        const r = q / p;
        if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
        else { if (r < t0) return false; if (r < t1) t1 = r; }
        return true;
      };
      return clip(-dx, seg.x1 - x1) && clip(dx, x2 - seg.x1) && clip(-dy, seg.y1 - y1) && clip(dy, y2 - seg.y1);
    };
    for (const svg of document.querySelectorAll('svg')) {
      if (svg.getAttribute('aria-hidden') === 'true' || !visible(svg)) continue;
      const sr = svg.getBoundingClientRect();
      if (sr.width < 100 || sr.height < 40) continue;
      if (primSvgCount < 3) {
        let flaggedPrim = false;
        if (sr.width >= 220 && sr.height >= 130) {
          const primitives = svg.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse, text, use').length;
          if (primitives < 12) {
            add('primitive-svg', 'review', svg, `Large diagram/chart SVG has only ${primitives} primitives; enrich with gridlines, stroke hierarchy, hatching/bands, and callouts.`, { primitives }, sr);
            primSvgCount++; flaggedPrim = true;
          } else {
            const rects = svg.querySelectorAll('rect').length;
            const nonRectShapes = svg.querySelectorAll('path, circle, ellipse, polygon, polyline').length;
            const lines = svg.querySelectorAll('line').length;
            const geoCount = rects + nonRectShapes + lines;
            if (geoCount > 0 && rects / geoCount > 0.8 && nonRectShapes === 0 && lines < 3) {
              add('primitive-svg', 'review', svg, 'Large diagram/chart SVG is box-only (mostly <rect> without paths, curves, circles, or >= 3 lines); enrich with structural geometry.', { rects, geoCount, lines }, sr);
              primSvgCount++; flaggedPrim = true;
            }
          }
        }
        if (!flaggedPrim) {
          const vb = svg.viewBox?.baseVal;
          const scale = vb && vb.width > 0 && vb.height > 0 ? Math.min(sr.width / vb.width, sr.height / vb.height) : 1;
          for (const t of svg.querySelectorAll('text')) {
            if (t.closest('svg') !== svg || !t.textContent?.trim() || !visible(t)) continue;
            const tr = t.getBoundingClientRect();
            if (tr.width <= 0 || tr.height <= 0) continue;
            const fsAttr = parseFloat(style(t).fontSize) || 0;
            const screenFs = fsAttr > 0 ? fsAttr * scale : tr.height;
            const effectivePx = Math.min(screenFs, tr.height);
            if (effectivePx < 9.5) {
              add('primitive-svg', 'review', svg, `SVG contains unreadable tiny <text> label (~${Math.round(effectivePx * 10) / 10}px < 9.5px).`, { text: t.textContent.trim().slice(0, 40), screenFontPx: Math.round(screenFs * 10) / 10 }, sr);
              primSvgCount++;
              break;
            }
          }
        }
      }
      if (sr.width >= 180 && sr.height >= 80 && (svgOverlapCount < 3 || svgCollisionCount < 3)) {
        const textNodes = [];
        for (const t of svg.querySelectorAll('text')) {
          if (t.closest('svg') !== svg || !t.textContent?.trim() || !visible(t)) continue;
          const tr = t.getBoundingClientRect();
          if (tr.width > 0 && tr.height > 0) {
            const ts = style(t);
            const poFirst = (ts.paintOrder || '').trim().toLowerCase().split(/\s+/)[0];
            const haloW = parseFloat(ts.strokeWidth) || 0;
            const haloOp = parseFloat(ts.strokeOpacity);
            const haloAlpha = ts.stroke && ts.stroke !== 'none' && ts.stroke !== 'transparent'
              ? colour(ts.stroke)[3] * (Number.isNaN(haloOp) ? 1 : haloOp) : 0;
            const hasStrokeHalo = poFirst === 'stroke' && haloW >= 2 && haloAlpha >= 0.85;
            textNodes.push({ el: t, r: tr, text: t.textContent.trim().slice(0, 40), hasStrokeHalo });
          }
        }
        if (svgOverlapCount < 3 && textNodes.length >= 2) {
          let overlapped = false;
          for (let i = 0; i < textNodes.length && !overlapped; i++) {
            for (let j = i + 1; j < textNodes.length; j++) {
              const a = textNodes[i].r, b = textNodes[j].r;
              const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (ox > 3 && oy > 3) {
                add('svg-label-overlap', 'review', svg, 'Two SVG <text> labels overlap each other.', { first: textNodes[i].text, second: textNodes[j].text, overlapX: Math.round(ox * 10) / 10, overlapY: Math.round(oy * 10) / 10 }, sr);
                svgOverlapCount++;
                overlapped = true;
                break;
              }
            }
          }
        }
        if (svgCollisionCount < 3 && textNodes.length >= 1) {
          const rectInfos = [];
          for (const rect of svg.querySelectorAll('rect')) {
            if (rect.closest('svg') !== svg || !visible(rect)) continue;
            const rr = rect.getBoundingClientRect();
            if (rr.width <= 0 || rr.height <= 0) continue;
            const rs = style(rect);
            const fillOp = parseFloat(rs.fillOpacity);
            let ancestorOp = 1;
            for (let p = rect; p && p !== svg.parentElement; p = p.parentElement) {
              const po = parseFloat(style(p).opacity);
              if (!Number.isNaN(po)) ancestorOp *= po;
            }
            const fillAlpha = colour(rs.fill)[3] * (Number.isNaN(fillOp) ? 1 : fillOp) * ancestorOp;
            const opaqueFill = Boolean(rs.fill && rs.fill !== 'none' && rs.fill !== 'transparent' && rs.fill !== 'rgba(0, 0, 0, 0)' && fillAlpha >= 0.85);
            const strokeW = parseFloat(rs.strokeWidth) || 0;
            const strokeOp = parseFloat(rs.strokeOpacity);
            const strokeAlpha = rs.stroke && rs.stroke !== 'none' && rs.stroke !== 'transparent'
              ? colour(rs.stroke)[3] * (Number.isNaN(strokeOp) ? 1 : strokeOp) * ancestorOp : 0;
            const hasStroke = Boolean(strokeW > 0 && strokeAlpha > 0.25);
            rectInfos.push({ el: rect, r: rr, opaqueFill, hasStroke });
          }
          const lineSegs = [];
          for (const line of svg.querySelectorAll('line')) {
            if (line.closest('svg') !== svg || !visible(line)) continue;
            const ls = style(line);
            const strokeW = parseFloat(ls.strokeWidth) || 0;
            const strokeOp = parseFloat(ls.strokeOpacity);
            let lineAncestorOp = 1;
            for (let p = line; p && p !== svg.parentElement; p = p.parentElement) {
              const po = parseFloat(style(p).opacity);
              if (!Number.isNaN(po)) lineAncestorOp *= po;
            }
            if (!ls.stroke || ls.stroke === 'none' || ls.stroke === 'transparent' || strokeW <= 0) continue;
            const strokeAlpha = colour(ls.stroke)[3] * (Number.isNaN(strokeOp) ? 1 : strokeOp) * lineAncestorOp;
            if (strokeAlpha < 0.4) continue;
            if (ls.strokeDasharray && ls.strokeDasharray !== 'none') continue;
            const ctm = typeof line.getScreenCTM === 'function' ? line.getScreenCTM() : null;
            if (!ctm) continue;
            const lx1 = line.x1?.baseVal?.value ?? 0, ly1 = line.y1?.baseVal?.value ?? 0;
            const lx2 = line.x2?.baseVal?.value ?? 0, ly2 = line.y2?.baseVal?.value ?? 0;
            const x1 = ctm.a * lx1 + ctm.c * ly1 + ctm.e, y1 = ctm.b * lx1 + ctm.d * ly1 + ctm.f;
            const x2 = ctm.a * lx2 + ctm.c * ly2 + ctm.e, y2 = ctm.b * lx2 + ctm.d * ly2 + ctm.f;
            if (Math.hypot(x2 - x1, y2 - y1) > 20) lineSegs.push({ el: line, x1, y1, x2, y2 });
          }
          for (const tn of textNodes) {
            if (tn.hasStrokeHalo) continue;
            const labelPills = rectInfos.filter(ri => ri.opaqueFill &&
              ri.r.left <= tn.r.left + 1 && ri.r.right >= tn.r.right - 1 &&
              ri.r.top <= tn.r.top + 1 && ri.r.bottom >= tn.r.bottom - 1 &&
              ri.r.width <= Math.max(tn.r.width * 2.2, tn.r.width + 40) &&
              ri.r.height <= Math.max(tn.r.height * 2.5, tn.r.height + 24) &&
              Boolean(ri.el.compareDocumentPosition(tn.el) & Node.DOCUMENT_POSITION_FOLLOWING));
            const shieldedByPill = obstacleEl => labelPills.some(pill =>
              Boolean(obstacleEl.compareDocumentPosition(pill.el) & Node.DOCUMENT_POSITION_FOLLOWING));
            let hit = null;
            for (const ri of rectInfos) {
              if (!ri.hasStroke || ri.r.width < 16 || ri.r.height < 16) continue;
              if (ri.r.width >= sr.width * 0.96 && ri.r.height >= sr.height * 0.96) continue;
              if (shieldedByPill(ri.el)) continue;
              if (tn.r.right <= ri.r.left + 1 || tn.r.left >= ri.r.right - 1 || tn.r.bottom <= ri.r.top + 1 || tn.r.top >= ri.r.bottom - 1) continue;
              if (tn.r.left >= ri.r.left + 1 && tn.r.right <= ri.r.right - 1 && tn.r.top >= ri.r.top + 1 && tn.r.bottom <= ri.r.bottom - 1) continue;
              const hitsHorizWall = (tn.r.left < ri.r.left - 0.5 && tn.r.right > ri.r.left + 2) || (tn.r.left < ri.r.right - 2 && tn.r.right > ri.r.right + 0.5);
              const hitsVertWall = (tn.r.top < ri.r.top - 0.5 && tn.r.bottom > ri.r.top + 2) || (tn.r.top < ri.r.bottom - 2 && tn.r.bottom > ri.r.bottom + 0.5);
              if (hitsHorizWall || hitsVertWall) {
                hit = { kind: 'rect-border', text: tn.text };
                break;
              }
            }
            if (!hit && lineSegs.length) {
              const cx1 = tn.r.left + Math.min(4, tn.r.width * 0.2), cx2 = tn.r.right - Math.min(4, tn.r.width * 0.2);
              const cy1 = tn.r.top + Math.min(3, tn.r.height * 0.2), cy2 = tn.r.bottom - Math.min(3, tn.r.height * 0.2);
              if (cx2 > cx1 && cy2 > cy1 && lineSegs.some(seg => !shieldedByPill(seg.el) && segHitsBox(seg, cx1, cy1, cx2, cy2))) {
                hit = { kind: 'solid-line', text: tn.text };
              }
            }
            if (hit) {
              add('svg-label-collision', 'review', svg, 'SVG <text> label crosses a structural <rect> border or solid <line> without a background pill.', hit, sr);
              svgCollisionCount++;
              break;
            }
          }
        }
      }
    }
  if (root.scrollWidth > width + 1) add('horizontal-overflow', 'error', root, 'Document is wider than the requested viewport.',
    { scrollWidth: root.scrollWidth, viewportWidth: width });
  if (fit && root.scrollHeight > height + 1) add('vertical-overflow', 'error', root, 'Document is taller than the required frame.',
    { scrollHeight: root.scrollHeight, viewportHeight: height });
  let hasDarkCss = false;
  const scanDarkRules = list => {
    for (const rule of list || []) {
      if (hasDarkCss) return;
      if (rule instanceof CSSStyleRule && /\[data-theme\s*=\s*["']?dark["']?\]/i.test(rule.selectorText) && rule.style.length > 0) {
        hasDarkCss = true; return;
      }
      if (rule.cssRules) scanDarkRules(rule.cssRules);
    }
  };
  for (const sheet of document.styleSheets) {
    try { scanDarkRules(sheet.cssRules); } catch {}
    if (hasDarkCss) break;
  }
  const hasThemeToggle = Boolean(document.querySelector('[data-theme-toggle], [data-set-theme], button[aria-label*="dark" i], button[aria-label*="theme" i], button[aria-label*="тема" i], button[aria-label*="темн" i], button[aria-label*="тёмн" i]'));
  const tabSeen = new Set(), tabs = [];
  for (const el of document.querySelectorAll('[role="tab"], [role="tablist"] button, .tabs button, [data-tabs] button, button[aria-controls], button[data-tab], button[data-view], a[role="tab"]')) {
    if (tabSeen.has(el)) continue;
    tabSeen.add(el);
    const selected = el.getAttribute('aria-selected') === 'true' || el.classList.contains('active') || el.classList.contains('is-active') || el.getAttribute('data-state') === 'active' || el.getAttribute('aria-pressed') === 'true';
    tabs.push({ index: tabs.length, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 80), selector: selector(el), selected, visible: visible(el) });
  }
  return { viewport: { width, height }, layoutViewport: { width: innerWidth, height: innerHeight }, document: { width: root.scrollWidth, height: root.scrollHeight },
    fit, findings, truncated, discoveredStates: { hasDarkTheme: hasDarkCss || hasThemeToggle, tabs }, coverage: { textNodes: textCount, complexBackgroundsSkipped: complexBackgrounds },
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
  report.discoveredStates.tabKeyboard = { applicable: false, tested: false, passed: true };
  try {
    const tabSetup = await send('Runtime.evaluate', {
      expression: `(() => {
        const isVis = el => {
          if (!el.getClientRects().length) return false;
          for (let p = el; p; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (s.visibility === 'hidden' || s.visibility === 'collapse' || Number(s.opacity) === 0 || s.contentVisibility === 'hidden') return false;
          }
          return true;
        };
        const sel = el => {
          if (el.id) return '#' + CSS.escape(el.id);
          const parts = [];
          for (let p = el; p && p.nodeType === 1; p = p.parentElement) {
            const tag = p.localName;
            const sibs = p.parentElement ? [...p.parentElement.children].filter(e => e.localName === tag) : [p];
            parts.unshift(tag + (sibs.length > 1 ? ':nth-of-type(' + (sibs.indexOf(p) + 1) + ')' : ''));
            if (p === document.body) break;
          }
          return parts.join(' > ');
        };
        for (const list of document.querySelectorAll('[role="tablist"]')) {
          if (!isVis(list)) continue;
          const tabs = [...list.querySelectorAll('[role="tab"]')].filter(t => t.closest('[role="tablist"]') === list && isVis(t));
          if (tabs.length < 2) continue;
          const active = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
          active.focus({ preventScroll: true });
          const r = list.getBoundingClientRect();
          window.__craftTabProbe = { list, tabs, startIndex: tabs.indexOf(active), startSelected: tabs.findIndex(t => t.getAttribute('aria-selected') === 'true') };
          return { applicable: true, selector: sel(list), craftId: list.closest('[data-craft-id]')?.getAttribute('data-craft-id') ?? null, rect: { x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10, width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10 }, tabCount: tabs.length };
        }
        return { applicable: false };
      })()`,
      returnByValue: true,
    });
    const info = tabSetup.result?.value;
    if (info?.applicable) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 });
      const afterRight = await send('Runtime.evaluate', {
        expression: `(() => {
          const p = window.__craftTabProbe;
          if (!p) return null;
          const focusIdx = p.tabs.indexOf(document.activeElement);
          const selIdx = p.tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
          return { focusMoved: focusIdx >= 0 && focusIdx !== p.startIndex, selectedMoved: selIdx >= 0 && selIdx !== p.startSelected, focusIdx, selIdx };
        })()`,
        returnByValue: true,
      });
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37 });
      const afterLeft = await send('Runtime.evaluate', {
        expression: `(() => {
          const p = window.__craftTabProbe;
          delete window.__craftTabProbe;
          if (!p) return null;
          const focusIdx = p.tabs.indexOf(document.activeElement);
          const selIdx = p.tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
          return { focusIdx, selIdx };
        })()`,
        returnByValue: true,
      });
      const rVal = afterRight.result?.value;
      const lVal = afterLeft.result?.value;
      const arrowRightMoved = Boolean(rVal && (rVal.focusMoved || rVal.selectedMoved));
      const arrowLeftMoved = Boolean(lVal && rVal && (lVal.focusIdx !== rVal.focusIdx || lVal.selIdx !== rVal.selIdx));
      const passed = arrowRightMoved;
      report.discoveredStates.tabKeyboard = {
        applicable: true,
        tested: true,
        passed,
        tablistSelector: info.selector,
        tabCount: info.tabCount,
        arrowRightMoved,
        arrowLeftMoved,
      };
      if (!passed) {
        report.findings.push({
          code: 'tab-keyboard-navigation',
          severity: 'review',
          selector: info.selector,
          craftId: info.craftId,
          rect: info.rect,
          message: 'Tabs inside [role="tablist"] do not respond to ArrowRight/ArrowLeft keyboard navigation.',
          evidence: { tabCount: info.tabCount, arrowRightMoved, arrowLeftMoved },
        });
      }
    }
  } catch (err) {
    report.limitations.push('Tab keyboard navigation check unavailable: ' + err.message);
  }
  report.summary = { errors: report.findings.filter(f => f.severity === 'error').length,
    review: report.findings.filter(f => f.severity === 'review').length };
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'shot.mjs'), ...process.argv.slice(2), '--inspect'], { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
}
