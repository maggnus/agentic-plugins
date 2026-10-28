// Explicit render expectations. No inference about the brief or visual taste.
export function validateContract(value) {
  const object = (v, where, keys) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${where} must be an object`);
    for (const key of Object.keys(v)) if (!keys.includes(key)) throw new Error(`${where}: unknown field ${key}`);
  };
  object(value, 'contract', ['version', 'ready', 'timeoutMs', 'checks', 'noRuntimeErrors']);
  if (value.version !== 1) throw new Error('contract.version must be 1');
  if (value.noRuntimeErrors !== undefined && typeof value.noRuntimeErrors !== 'boolean') throw new Error('noRuntimeErrors must be boolean');
  if (value.timeoutMs !== undefined && (!Number.isInteger(value.timeoutMs) || value.timeoutMs < 0 || value.timeoutMs > 15000)) throw new Error('timeoutMs must be 0..15000');
  for (const name of ['ready', 'checks']) {
    if (value[name] !== undefined && (!Array.isArray(value[name]) || value[name].length > 100)) throw new Error(`${name} must be an array of at most 100 checks`);
    for (const [i, check] of (value[name] ?? []).entries()) {
      const where = `${name}[${i}]`;
      object(check, where, ['selector', 'frame', 'count', 'min', 'max', 'textIncludes', 'visible', 'box']);
      if (typeof check.selector !== 'string' || !check.selector.trim()) throw new Error(`${where}.selector must be a nonempty string`);
      if (check.frame !== undefined && (typeof check.frame !== 'string' || !check.frame.trim())) throw new Error(`${where}.frame must be a selector string`);
      for (const key of ['count', 'min', 'max']) if (check[key] !== undefined && (!Number.isInteger(check[key]) || check[key] < 0)) throw new Error(`${where}.${key} must be a nonnegative integer`);
      if (check.count !== undefined && (check.min !== undefined || check.max !== undefined)) throw new Error(`${where}: use count or min/max, not both`);
      if (check.max !== undefined && check.max < (check.min ?? 1)) throw new Error(`${where}: max is below min (default 1)`);
      if (check.visible !== undefined && typeof check.visible !== 'boolean') throw new Error(`${where}.visible must be boolean`);
      if (check.textIncludes !== undefined && (typeof check.textIncludes !== 'string' || !check.textIncludes.trim())) throw new Error(`${where}.textIncludes must be a nonempty string`);
      if (check.box !== undefined) {
        object(check.box, `${where}.box`, ['width', 'height', 'tolerance']);
        if (check.box.width === undefined && check.box.height === undefined) throw new Error(`${where}.box needs width or height`);
        for (const [key, n] of Object.entries(check.box)) if (!Number.isFinite(n) || n < 0) throw new Error(`${where}.box.${key} must be nonnegative and finite`);
      }
    }
  }
  if (!(value.ready?.length || value.checks?.length || value.noRuntimeErrors)) throw new Error('contract has no expectations');
  return value;
}

// Serialized into the browser; self-contained and read-only. frame is a unique
// same-origin iframe selector, not permission to access a cross-origin document.
export function measureExpectations(checks) {
  const normalize = s => String(s).replace(/\s+/g, ' ').trim();
  // display:contents has no box to which group opacity or content containment
  // can apply. Its descendants may still render with these computed properties.
  const suppresses = s => s.display === 'none' || s.display !== 'contents' && (Number(s.opacity) === 0 || s.contentVisibility === 'hidden');
  const displayed = el => {
    const w = el.ownerDocument.defaultView;
    const own = w.getComputedStyle(el);
    if (own.display !== 'contents' && ['hidden', 'collapse'].includes(own.visibility)) return false;
    for (let p = el; p; p = p.parentElement) {
      const s = w.getComputedStyle(p);
      // Visibility is inherited but can be overridden by a descendant. Opacity,
      // display and content-visibility suppress the entire subtree instead.
      if (suppresses(s)) return false;
    }
    if (own.display === 'contents') {
      return [...el.childNodes].some(n => {
        if (n.nodeType === 1) return displayed(n);
        if (n.nodeType !== 3 || !n.textContent.trim() || own.visibility !== 'visible') return false;
        const r = el.ownerDocument.createRange(); r.selectNodeContents(n);
        return [...r.getClientRects()].some(b => b.width > 0 && b.height > 0);
      });
    }
    if (!el.getClientRects().length) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const displayedText = el => {
    const w = el.ownerDocument.defaultView;
    const visit = node => {
      if (node.nodeType === 3) return w.getComputedStyle(node.parentElement).visibility === 'visible' && displayed(node.parentElement) ? node.textContent : '';
      if (node.nodeType !== 1 || /^(SCRIPT|STYLE|TEMPLATE|TEXTAREA|INPUT|SELECT)$/.test(node.tagName)) return '';
      const s = w.getComputedStyle(node);
      if (suppresses(s)) return '';
      if (node.tagName === 'BR') return s.visibility === 'visible' ? '\n' : '';
      const text = [...node.childNodes].map(visit).join('');
      return /^(block|flex|grid|list-item|table|flow-root)/.test(s.display) ? '\n' + text + '\n' : text;
    };
    return normalize(visit(el));
  };
  return checks.map(check => {
    try {
      let doc = document, frame;
      if (check.frame) {
        const frames = [...document.querySelectorAll(check.frame)];
        if (frames.length !== 1 || frames[0].tagName !== 'IFRAME') throw new Error('frame must match exactly one iframe');
        frame = frames[0];
        doc = frame.contentDocument;
        if (!doc) throw new Error('frame document is unavailable (not loaded or cross-origin)');
      }
      const all = [...doc.querySelectorAll(check.selector)];
      const elements = check.visible === false ? all : all.filter(el => (!frame || displayed(frame)) && displayed(el));
      const min = check.count ?? check.min ?? 1, max = check.count ?? check.max ?? Infinity;
      const evidence = { matched: all.length, displayed: elements.length, min, max: Number.isFinite(max) ? max : null };
      const failures = [];
      if (elements.length < min || elements.length > max) failures.push('element count');
      if (check.textIncludes !== undefined) {
        // innerText includes opacity:0 descendants, so inspect text nodes and
        // their effective display state without mutating the page.
        const texts = elements.map(el => check.visible === false ? normalize(el.textContent ?? '') : displayedText(el));
        evidence.texts = texts.slice(0, 20).map(s => s.slice(0, 240));
        if (!texts.length || texts.some(s => !s.includes(normalize(check.textIncludes)))) failures.push('text');
      }
      if (check.box) {
        const boxes = elements.map(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height }; });
        evidence.boxes = boxes.slice(0, 20);
        const tolerance = check.box.tolerance ?? 1;
        if (!boxes.length || boxes.some(r => ['width', 'height'].some(k => check.box[k] !== undefined && Math.abs(r[k] - check.box[k]) > tolerance))) failures.push('box size');
      }
      return { check, pass: failures.length === 0, failures, evidence };
    } catch (error) { return { check, pass: false, failures: ['evaluation'], evidence: { error: error.message } }; }
  });
}

export async function evaluateExpectations(send, checks) {
  const r = await send('Runtime.evaluate', { expression: `(${measureExpectations.toString()})(${JSON.stringify(checks)})`, returnByValue: true });
  if (r.exceptionDetails || !Array.isArray(r.result?.value)) throw new Error('contract evaluation failed');
  return r.result.value;
}

export async function waitForExpectations(send, contract) {
  const checks = contract.ready ?? [];
  if (!checks.length) return { waitedMs: 0, timedOut: false, results: [] };
  const start = Date.now(), timeout = contract.timeoutMs ?? 5000;
  // Zero means one immediate probe, with no polling; the transport still needs
  // time to return. For positive deadlines, a late response cannot count as ready.
  if (timeout === 0) {
    const results = await evaluateExpectations(send, checks);
    return { waitedMs: Date.now() - start, timedOut: !results.every(r => r.pass), results };
  }
  let results = [];
  for (;;) {
    const remaining = timeout - (Date.now() - start);
    if (remaining <= 0) return { waitedMs: Date.now() - start, timedOut: true, results };
    let timer;
    const response = await Promise.race([
      evaluateExpectations(send, checks),
      new Promise(ok => { timer = setTimeout(() => ok(null), remaining); }),
    ]).finally(() => clearTimeout(timer));
    if (response) results = response;
    const waitedMs = Date.now() - start;
    if (!response || waitedMs >= timeout) return { waitedMs, timedOut: true, results };
    if (results.every(r => r.pass)) return { waitedMs, timedOut: false, results };
    await new Promise(ok => setTimeout(ok, Math.min(100, timeout - waitedMs)));
  }
}
