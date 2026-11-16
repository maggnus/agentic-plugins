#!/usr/bin/env node
// Combined evidence for one source revision. Child success alone is insufficient.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, rmSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { basename, extname, dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { requireReady } from './craft-guide.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const quote = value => "'" + String(value).replaceAll("'", "'\"'\"'") + "'";
const repairs = {
  literal: 'Move the value into the existing theme and bind it with var(); font shorthand needs token-bound weight/size/leading/family, or use longhands. Preserve appearance.',
  'unused-token': 'Remove unused values from your own spec. Preserve a supplied system scale; document a genuine source-contract exception.',
  'undefined-token': 'Declare the intended value in the theme or correct the variable name.',
  'mutation-no-effect': 'Check overrides, scope and responsive visibility. Verify all required widths together; never add a fake visible use merely to satisfy the test.',
  'possible-duplicate': 'Inspect the named properties. Bind accidental copied values to the intended token; do not merge distinct semantic values merely because they coincide.',
  'text-clipped': 'Inspect the named clipping ancestor and reflow the content; do not hide text.',
  'capture-truncated': 'Capture and review the remaining page sections explicitly; the full-page image reached its height limit.',
  'control-clipped': 'Fit the entire control inside its clipping ancestors; a readable label does not mean the full target is visible.',
  'outside-frame': 'Rework the available space and grouping while preserving required content and readable type.',
  'vertical-overflow': 'Rework density and repeated copy; preserve all required facts and do not hide overflow.',
  'horizontal-overflow': 'Inspect the offending width and responsive layout; preserve content.',
  'bloated-mobile-header': 'Compact mobile navigation or move secondary links into a toggle so the top bar stays <= 92px on 390px.',
  'flat-hierarchy': 'Increase display-to-body heading contrast on the first screen to at least 1.75x.',
  'cramped-uppercase': 'Add at least 0.04em (>= 0.3px) letter-spacing to small uppercase labels.',
  'card-grid-monotony': 'Break up consecutive uniform card grids with tables, asymmetric splits, lists, or interactive blocks.',
  'hover-contrast-loss': 'Preserve >= 3:1 (ideally >= 4.5:1) text contrast in :hover styles.',
  'canvas-bleed-through': 'Keep nested regions inside --surface cards transparent with 1px solid var(--border) dividers, or use a subtle --surface-2 (L_bg <= L_surface2 <= L_surface).',
  'weak-surface-separation': 'Separate --bg, --surface, and --surface-2 in oklch() with monotonic lightness (or add a crisp structural border and two-layer shadow).',
  'sunken-inner-surface': 'Keep nested regions inside elevated --surface cards transparent with 1px solid var(--border) dividers, or use a subtle --surface-2 that is never darker than --bg (L_bg <= L_surface2 <= L_surface).',
  'competing-solid-actions': 'Keep at most ONE solid high-contrast button per action group (including --danger); render secondary and destructive actions beside a primary CTA as quiet outlined/transparent buttons.',
  'primitive-svg': 'Enrich large diagrams and charts with reference grids, varied stroke weights, material hatching or tolerance bands, and dimension/value callouts (>= 12 SVG primitives) and keep screen <text> >= 10px.',
  'internal-horizontal-scroll': 'Reflow wide content, tables, or grids into stacked cards/rows on mobile (<= 768px) instead of relying on internal horizontal scroll.',
  'svg-label-overlap': 'Reposition or stagger overlapping SVG <text> labels so their bounding boxes have clear separation.',
  'svg-label-collision': 'Move SVG <text> labels into clear space or add an opaque background pill behind the label so it never crosses structural <rect> borders or solid <line> paths.',
  'broken-theme-toggle': 'Wire the visible theme toggle button to update document.documentElement.dataset.theme (data-theme="dark") on real click.',
};

export function verify(argv, run = spawnSync) {
  const args = [...argv], file = args.shift();
  const i = args.indexOf('--state');
  if (!file || file.startsWith('-') || i < 0 || !args[i + 1]) throw new Error('verify.mjs FILE --state STATE [inspection options]; local HTML only.');
  const statePath = resolve(args.splice(i, 2)[1]), state = requireReady(statePath);
  const [, rawFile, suffix = ''] = file.match(/^([^?#]*)(.*)$/);
  const source = resolve(rawFile), targetSpec = source + suffix;
  if (!statSync(source).isFile()) throw new Error('Expected a local HTML file.');
  if (args.some(a => a === '--out' || a.startsWith('--out='))) throw new Error('verify owns --out; use inspect.mjs for a custom output path.');

  const stageIndex = args.indexOf('--stage');
  let stage = 'full';
  if (stageIndex >= 0) {
    stage = args[stageIndex + 1];
    if (!['calibrate', 'full'].includes(stage)) throw new Error('Invalid --stage; expected calibrate or full.');
    args.splice(stageIndex, 2);
  }

  const modeIndex = args.indexOf('--mode');
  let modeArgs = [];
  if (modeIndex >= 0) {
    const modeVal = args[modeIndex + 1];
    if (!['auto', 'desktop', 'mobile'].includes(modeVal)) throw new Error('Invalid --mode; expected auto, desktop or mobile.');
    modeArgs = ['--mode', modeVal];
  }

  const widthIndex = args.indexOf('--width'), widths = widthIndex >= 0 ? args[widthIndex + 1] : '1440,390';
  if (!/^\d+(,\d+)*$/.test(widths ?? '')) throw new Error('Invalid --width.');
  const widthList = widths.split(',').map(Number);
  if (widthList.some(w => w < 1 || w > 10000) || new Set(widthList).size !== widthList.length) throw new Error('Widths must be distinct integers from 1 to 10000.');
  if (widthIndex < 0) args.push('--width', widths);
  if (stage === 'full' && !args.includes('--fit') && !args.includes('--at') && !args.includes('--full')) args.push('--full');
  for (let n = args.indexOf('--strict'); n >= 0; n = args.indexOf('--strict')) args.splice(n, 1);

  const VALUE_FLAGS = new Set(['--height', '--wait', '--at', '--mode', '--theme', '--contract', '--scenario', '--click', '--width', '--resolutions']);
  const BOOL_FLAGS = new Set(['--full', '--strips', '--fit', '--inspect']);
  for (let idx = 0; idx < args.length; idx++) {
    const a = args[idx];
    if (VALUE_FLAGS.has(a)) {
      if (args[idx + 1] === undefined || args[idx + 1].startsWith('--')) throw new Error(`Missing value for ${a}.`);
      idx++;
    } else if (!BOOL_FLAGS.has(a)) {
      throw new Error(a.startsWith('-') ? `Unknown option: ${a}` : `Unexpected argument: ${a}`);
    }
  }

  let resolutionsPath = null;
  const inspectArgs = [];
  for (let idx = 0; idx < args.length; idx++) {
    if (args[idx] === '--resolutions') {
      resolutionsPath = resolve(args[idx + 1]);
      idx++;
    } else {
      inspectArgs.push(args[idx]);
    }
  }

  const startedAtMs = Date.now();
  const rawKey = basename(source, extname(source)).replace(/[^\w.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'artifact';
  const safeKey = rawKey + (suffix ? '-' + hash(suffix).slice(0, 6) : '') + (stage === 'calibrate' ? '-calibrate' : '');
  const verifyRoot = join(dirname(statePath), '.craft-verification');
  mkdirSync(verifyRoot, { recursive: true });
  const directory = mkdtempSync(join(verifyRoot, safeKey + '--'));
  const before = hash(readFileSync(source)), scriptRoot = dirname(fileURLToPath(import.meta.url));

  let resolutionsData = null, resolutionsError = null;
  if (resolutionsPath) {
    try {
      resolutionsData = JSON.parse(readFileSync(resolutionsPath, 'utf8'));
      if (!resolutionsData || resolutionsData.version !== 1 || typeof resolutionsData.sourceSha256 !== 'string' || !Array.isArray(resolutionsData.items)) {
        resolutionsError = 'Invalid resolutions schema: expected version 1, sourceSha256 and items array.';
      } else if (resolutionsData.sourceSha256 !== before) {
        resolutionsError = `Stale resolutions sourceSha256 (${resolutionsData.sourceSha256.slice(0, 12)} !== ${before.slice(0, 12)}).`;
      }
    } catch (error) {
      resolutionsError = 'Could not read resolutions file: ' + error.message;
    }
  }

  const themeIndex = inspectArgs.indexOf('--theme');
  const explicitTheme = themeIndex >= 0 ? inspectArgs[themeIndex + 1] : null;
  if (explicitTheme !== null && !['dark', 'light'].includes(explicitTheme)) throw new Error('Invalid --theme; expected dark or light.');
  const themeArgs = explicitTheme ? ['--theme', explicitTheme] : [];

  const steps = [['tokens', ['check', targetSpec, '--width', widths, ...modeArgs, ...themeArgs, '--strict', '--json']], ['inspect', [targetSpec, ...inspectArgs, '--out', join(directory, 'frame.png'), '--strict']]];
  const results = [], diagnostics = [], frames = [], stateFrames = [], deferredInCalibrate = [];
  if (resolutionsError) results.push({ name: 'resolutions', exitCode: 1, error: resolutionsError, evidenceError: resolutionsError });
  let tokenReport = null, firstReport = null;
  const reportsByWidth = new Map();
  let activeTokenWarnings = 0;

  const validateInspectFrame = (reportPath, png, width) => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    if (report.schemaVersion !== 1 || report.sourceSha256 !== before || report.viewport?.width !== width || report.screenshot !== png || hash(readFileSync(png)) !== report.screenshotSha256 || !Array.isArray(report.findings) || report.truncated || report.capture?.width !== width || !(report.capture?.height > 0) || !Number.isFinite(report.capture?.height) || !(report.capture?.documentHeight > 0) || !Number.isFinite(report.capture?.documentHeight) || typeof report.capture?.limited !== 'boolean' || typeof report.capture?.fullDocument !== 'boolean') {
      throw new Error('Missing, truncated or mismatched render evidence for ' + width + 'px.');
    }
    const strips = Array.isArray(report.strips) ? report.strips : [];
    for (const strip of strips) {
      if (!strip?.screenshot || !existsSync(strip.screenshot) || hash(readFileSync(strip.screenshot)) !== strip.screenshotSha256) {
        throw new Error('Missing or mismatched strip evidence for ' + width + 'px.');
      }
    }
    return report;
  };

  for (const [name, options] of steps) {
    const result = run(process.execPath, [join(scriptRoot, name + '.mjs'), ...options], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 180000 });
    const logPath = join(directory, name + '.log');
    writeFileSync(logPath, (result.stdout ?? '') + (result.stderr ?? '') + (result.error ? '\n' + result.error.message : ''));
    const check = { name, exitCode: result.status ?? null, error: result.error?.message ?? null, signal: result.signal ?? null, log: logPath };
    results.push(check);
    try {
      if (name === 'tokens') {
        tokenReport = JSON.parse(result.stdout);
        if (tokenReport.schemaVersion !== 1 || tokenReport.source !== source || tokenReport.sourceSha256 !== before || !Array.isArray(tokenReport.findings) || JSON.stringify(tokenReport.widths) !== JSON.stringify(widthList) || typeof tokenReport.browserAvailable !== 'boolean') throw new Error('Missing or mismatched token evidence.');
        writeFileSync(join(directory, 'tokens.json'), JSON.stringify(tokenReport, null, 2) + '\n');
        for (const f of tokenReport.findings) {
          if (stage === 'calibrate' && (f.code === 'unused-token' || f.code === 'mutation-no-effect')) {
            deferredInCalibrate.push({ ...f, check: name });
          } else {
            activeTokenWarnings++;
            diagnostics.push({ ...f, check: name, severity: 'warning', repair: repairs[f.code] ?? 'Read the linked report and correct the confirmed cause.' });
          }
        }
        if (!tokenReport.browserAvailable) throw new Error('Token browser checks are incomplete.');
      } else {
        for (const width of widthList) {
          const png = join(directory, widthList.length > 1 ? 'frame-' + width + '.png' : 'frame.png');
          const reportPath = png.replace(/\.png$/, '.json'), report = validateInspectFrame(reportPath, png, width);
          if (!firstReport) firstReport = report;
          reportsByWidth.set(width, report);
          const strips = Array.isArray(report.strips) ? report.strips : [];
          frames.push({ width, height: report.viewport.height, capture: report.capture, screenshot: png, strips, uncoveredIntervals: report.uncoveredIntervals ?? [], report: reportPath, sourceSha256: report.sourceSha256, screenshotSha256: report.screenshotSha256, errors: report.findings.filter(f => f.severity === 'error').length, review: report.findings.filter(f => f.severity === 'review').length, reviewFindings: report.findings.filter(f => f.severity === 'review') });
          for (const f of report.findings) diagnostics.push({ ...f, check: name, width, repair: repairs[f.code] ?? 'Inspect this finding in the final PNG and correct confirmed defects.' });
        }
      }
    } catch (error) { check.evidenceError = error.message; }
  }

  const discovered = firstReport?.discoveredStates ?? { hasDarkTheme: false, tabs: [] };
  const stateCoverage = {
    darkTheme: { declared: Boolean(discovered.hasDarkTheme), checked: false, frames: [] },
    tabs: { total: Array.isArray(discovered.tabs) ? discovered.tabs.length : 0, totalChecks: 0, checked: 0, perWidth: [], frames: [] },
  };
  const hasAt = inspectArgs.includes('--at'), hasThemeFlag = inspectArgs.includes('--theme'), hasClickFlag = inspectArgs.includes('--click');
  if (stage === 'full' && !hasAt && firstReport) {
    if (discovered.hasDarkTheme && !hasThemeFlag) {
      const tokDarkRes = run(process.execPath, [join(scriptRoot, 'tokens.mjs'), 'check', targetSpec, '--width', widths, ...modeArgs, '--theme', 'dark', '--strict', '--json'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 180000 });
      const tokDarkLog = join(directory, 'tokens-dark.log');
      writeFileSync(tokDarkLog, (tokDarkRes.stdout ?? '') + (tokDarkRes.stderr ?? '') + (tokDarkRes.error ? '\n' + tokDarkRes.error.message : ''));
      const tokDarkCheck = { name: 'tokens-dark', exitCode: tokDarkRes.status ?? null, error: tokDarkRes.error?.message ?? null, signal: tokDarkRes.signal ?? null, log: tokDarkLog };
      results.push(tokDarkCheck);
      try {
        const darkTok = JSON.parse(tokDarkRes.stdout);
        if (darkTok.schemaVersion !== 1 || darkTok.sourceSha256 !== before || !darkTok.browserAvailable) throw new Error('Missing or mismatched dark token evidence.');
        writeFileSync(join(directory, 'tokens-dark.json'), JSON.stringify(darkTok, null, 2) + '\n');
        tokDarkCheck.hasFindings = darkTok.findings.length > 0;
        for (const f of darkTok.findings) {
          activeTokenWarnings++;
          diagnostics.push({ ...f, check: 'tokens-dark', theme: 'dark', severity: 'warning', repair: repairs[f.code] ?? 'Read the linked report and correct the confirmed cause.' });
        }
      } catch (error) { tokDarkCheck.evidenceError = error.message; }

      const darkOutBase = join(directory, widthList.length > 1 ? 'frame-dark.png' : `frame-dark-${widthList[0]}.png`);
      const darkRes = run(process.execPath, [join(scriptRoot, 'inspect.mjs'), targetSpec, ...inspectArgs, '--theme', 'dark', '--out', darkOutBase, '--strict'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 180000 });
      const darkLog = join(directory, 'inspect-dark.log');
      writeFileSync(darkLog, (darkRes.stdout ?? '') + (darkRes.stderr ?? '') + (darkRes.error ? '\n' + darkRes.error.message : ''));
      const darkCheck = { name: 'inspect-dark', exitCode: darkRes.status ?? null, error: darkRes.error?.message ?? null, signal: darkRes.signal ?? null, log: darkLog };
      results.push(darkCheck);
      try {
        let darkErrors = 0;
        for (const width of widthList) {
          const png = join(directory, `frame-dark-${width}.png`);
          const reportPath = png.replace(/\.png$/, '.json'), report = validateInspectFrame(reportPath, png, width);
          const errCount = report.findings.filter(f => f.severity === 'error').length;
          const revFindings = report.findings.filter(f => f.severity === 'review');
          darkErrors += errCount;
          const frameInfo = { state: 'dark-theme', width, height: report.viewport.height, capture: report.capture, screenshot: png, strips: report.strips ?? [], uncoveredIntervals: report.uncoveredIntervals ?? [], report: reportPath, sourceSha256: report.sourceSha256, screenshotSha256: report.screenshotSha256, errors: errCount, review: revFindings.length, reviewFindings: revFindings };
          stateFrames.push(frameInfo);
          stateCoverage.darkTheme.frames.push({ width, screenshot: png, report: reportPath, errors: errCount, review: revFindings.length });
          for (const f of report.findings) diagnostics.push({ ...f, check: 'inspect-dark', state: 'dark-theme', width, repair: repairs[f.code] ?? 'Inspect this finding in the dark-theme PNG and correct confirmed defects.' });
        }
        darkCheck.hasErrors = darkErrors > 0;
        stateCoverage.darkTheme.checked = stateCoverage.darkTheme.frames.length === widthList.length;
      } catch (error) { darkCheck.evidenceError = error.message; }
    }

    if (!hasClickFlag) {
      for (const tabWidth of widthList) {
        const widthTabs = reportsByWidth.get(tabWidth)?.discoveredStates?.tabs;
        if (!Array.isArray(widthTabs) || !widthTabs.length) continue;
        const inactiveTabs = [], seenTabSel = new Set();
        for (const t of widthTabs) {
          if (!t.selected && t.visible !== false && t.selector && !seenTabSel.has(t.selector)) {
            seenTabSel.add(t.selector);
            inactiveTabs.push(t);
            if (inactiveTabs.length >= 6) break;
          }
        }
        if (!inactiveTabs.length) {
          stateCoverage.tabs.perWidth.push({ width: tabWidth, total: widthTabs.length, inactive: 0, checked: 0 });
          continue;
        }
        stateCoverage.tabs.totalChecks += inactiveTabs.length;
        const widthStat = { width: tabWidth, total: widthTabs.length, inactive: inactiveTabs.length, checked: 0 };
        stateCoverage.tabs.perWidth.push(widthStat);
        const tabInspectArgs = [];
        for (let idx = 0; idx < inspectArgs.length; idx++) {
          if (inspectArgs[idx] === '--width') { tabInspectArgs.push('--width', String(tabWidth)); idx++; }
          else tabInspectArgs.push(inspectArgs[idx]);
        }
        for (let tIdx = 0; tIdx < inactiveTabs.length; tIdx++) {
          const tab = inactiveTabs[tIdx], n = tIdx + 1;
          const tabPng = join(directory, `state-tab-${n}-${tabWidth}.png`);
          const tabRes = run(process.execPath, [join(scriptRoot, 'inspect.mjs'), targetSpec, ...tabInspectArgs, '--click', tab.selector, '--out', tabPng, '--strict'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 180000 });
          const tabLog = join(directory, `inspect-tab-${n}-${tabWidth}.log`);
          writeFileSync(tabLog, (tabRes.stdout ?? '') + (tabRes.stderr ?? '') + (tabRes.error ? '\n' + tabRes.error.message : ''));
          const tabCheck = { name: `inspect-tab-${n}-${tabWidth}`, exitCode: tabRes.status ?? null, error: tabRes.error?.message ?? null, signal: tabRes.signal ?? null, log: tabLog };
          results.push(tabCheck);
          try {
            const reportPath = tabPng.replace(/\.png$/, '.json'), report = validateInspectFrame(reportPath, tabPng, tabWidth);
            const errCount = report.findings.filter(f => f.severity === 'error').length;
            const revFindings = report.findings.filter(f => f.severity === 'review');
            tabCheck.hasErrors = errCount > 0;
            stateFrames.push({ state: `tab-${n}`, tabIndex: tab.index, selector: tab.selector, width: tabWidth, height: report.viewport.height, capture: report.capture, screenshot: tabPng, strips: report.strips ?? [], uncoveredIntervals: report.uncoveredIntervals ?? [], report: reportPath, sourceSha256: report.sourceSha256, screenshotSha256: report.screenshotSha256, errors: errCount, review: revFindings.length, reviewFindings: revFindings });
            stateCoverage.tabs.frames.push({ index: n, tabIndex: tab.index, selector: tab.selector, text: tab.text, width: tabWidth, screenshot: tabPng, report: reportPath, errors: errCount, review: revFindings.length });
            stateCoverage.tabs.checked++;
            widthStat.checked++;
            for (const f of report.findings) diagnostics.push({ ...f, check: `inspect-tab-${n}-${tabWidth}`, state: `tab-${n}`, width: tabWidth, repair: repairs[f.code] ?? 'Inspect this finding in the tab state PNG and correct confirmed defects.' });
          } catch (error) { tabCheck.evidenceError = error.message; }
        }
      }
    }
  }

  const allFrames = [...frames, ...stateFrames];
  const validResolutions = !resolutionsError && resolutionsData ? resolutionsData.items : [];
  const acceptedReviews = [], unresolvedReviews = [];
  const matchesResolution = (f, width, stateLabel, item) => {
    if (!item || item.code !== f.code) return false;
    const targetState = item.state ?? 'default';
    if (targetState !== stateLabel) return false;
    if (item.width !== undefined && item.width !== width) return false;
    if (item.selector !== undefined && item.selector !== f.selector) return false;
    if (!['false-positive', 'source-exception', 'verified-after-scroll'].includes(item.resolution)) return false;
    if (typeof item.rationale !== 'string' || item.rationale.trim().length < 15) return false;
    if (typeof item.evidence !== 'string' || item.evidence.trim().length < 10) return false;
    if (item.resolution === 'false-positive' && (f.code === 'hover-contrast-loss' || f.code === 'competing-solid-actions' || (f.code === 'small-target' && width <= 768))) return false;
    return true;
  };
  for (const fr of allFrames) {
    for (const f of fr.reviewFindings ?? []) {
      const matched = validResolutions.find(item => matchesResolution(f, fr.width, fr.state ?? 'default', item));
      if (matched) acceptedReviews.push({ code: f.code, width: fr.width, state: fr.state ?? 'default', selector: f.selector, resolution: matched.resolution, rationale: matched.rationale, evidence: matched.evidence });
      else unresolvedReviews.push({ code: f.code, width: fr.width, state: fr.state ?? 'default', selector: f.selector, message: f.message });
    }
    delete fr.reviewFindings;
  }

  const unchanged = hash(readFileSync(source)) === before;
  const validationExit = r => r.exitCode === 1 && (
    r.name === 'tokens' ? tokenReport?.findings?.length > 0 :
    r.name === 'tokens-dark' ? r.hasFindings :
    r.name === 'inspect' ? frames.some(f => f.errors > 0) :
    r.hasErrors
  );
  const counts = {
    tokenWarnings: tokenReport ? activeTokenWarnings : null,
    renderErrors: allFrames.reduce((n, f) => n + f.errors, 0),
    renderReviews: allFrames.reduce((n, f) => n + f.review, 0),
    unresolvedReviews: unresolvedReviews.length,
    checkFailures: results.filter(r => r.error || r.evidenceError || (r.exitCode !== 0 && !validationExit(r))).length,
  };
  const technicalPassed = unchanged && counts.checkFailures === 0 && counts.tokenWarnings === 0 && counts.renderErrors === 0 && frames.length === widthList.length;
  const reviewResolved = counts.unresolvedReviews === 0;
  const passed = technicalPassed && reviewResolved;

  if (counts.checkFailures === 0) {
    for (const entry of readdirSync(verifyRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === basename(directory) || !entry.name.startsWith(safeKey + '--') || entry.name.slice(safeKey.length + 2).includes('--')) continue;
      const oldDir = join(verifyRoot, entry.name);
      try {
        if (statSync(oldDir).mtimeMs <= startedAtMs) rmSync(oldDir, { recursive: true, force: true });
      } catch {}
    }
  }

  const stageArgs = stage === 'calibrate' ? ['--stage', 'calibrate'] : [];
  const repeat = ['node', join(scriptRoot, 'verify.mjs'), targetSpec, '--state', statePath, ...stageArgs, ...args].map(quote).join(' ');
  const status = counts.checkFailures ? 'incomplete' : !technicalPassed ? 'failed' : counts.unresolvedReviews > 0 ? 'needs-review' : 'passed';
  const hasStrips = allFrames.some(f => f.strips?.length > 0);
  const hasMobileTabs = stateFrames.some(f => f.state?.startsWith('tab-') && f.width <= 768);
  const uncoveredIntervals = allFrames.flatMap(f => (f.uncoveredIntervals ?? []).map(u => ({ width: f.width, state: f.state ?? 'default', ...u })));
  const nextMessage = status === 'needs-review'
    ? 'Unresolved review findings block acceptance (passed: false, exit 1). Inspect each in the final PNGs' + (hasStrips ? ' and ALL 1:1 viewport strips (frame-*-s*.png)' : '') + (hasMobileTabs ? ' as well as mobile tab captures (state-tab-*-390.png)' : '') + ' and fix the layout or supply valid --resolutions FILE before delivery.'
    : passed
      ? (stage === 'calibrate'
        ? 'Calibration passed. View the 1:1 first-screen PNGs, build remaining sections, and run full verify.mjs without --stage calibrate.'
        : 'View EVERY final PNG' + (hasStrips ? ' (including ALL 1:1 viewport strips frame-*-s*.png)' : '') + (hasMobileTabs ? ' and mobile tab captures (state-tab-*.png)' : '') + ' and reconcile required facts for each width/state with the brief; deliver these exact files.')
      : 'Work remains. Read diagnostics and logs, fix confirmed causes without removing required content or weakening checks, then repeat this full command. An environment failure must be reported as incomplete, not passed.';

  const report = {
    schemaVersion: 2, stage, source, sourceSha256: before, guideEdition: state.edition, route: state.plan.visualPath, checks: results, sourceUnchanged: unchanged, counts, technicalPassed, reviewResolved, passed, clean: passed && counts.renderReviews === 0, status, acceptedExceptions: tokenReport?.exceptions ?? [],
    acceptedReviews, unresolvedReviews, ...(resolutionsError && { resolutionsError }),
    stateCoverage, ...(uncoveredIntervals.length && { uncoveredIntervals }),
    ...(stage === 'calibrate' && { deferredInCalibrate }),
    coverage: { content: args.includes('--contract') ? 'explicit expectations only' : 'not checked: compare required facts across every frame', screenshots: frames.some(f => f.capture.internalScrollRegions > 0) ? 'document canvas only; internal scroll regions require separate captures' : frames.length === widthList.length && frames.every(f => f.capture.fullDocument) ? 'full documents' : 'requested frames or regions; not all page content' },
    frames, ...(stateFrames.length && { stateFrames }), diagnostics, repeatCommand: repeat, next: nextMessage,
    visualReview: 'Not verified by this command. A technical pass is not evidence of visual quality, correct facts or complete accessibility.',
  };
  const reportPath = join(directory, 'summary.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  const compact = []; let budget = 0;
  for (const f of diagnostics) { const item = { check: f.check, severity: f.severity, code: f.code, width: f.width, ...(f.state && { state: f.state }), ...(f.theme && { theme: f.theme }), line: f.line, selector: f.selector, message: f.message, repair: f.repair }; const bytes = Buffer.byteLength(JSON.stringify(item)); if (budget + bytes > 6000) break; compact.push(item); budget += bytes; }
  console.log(JSON.stringify({ ...report, report: reportPath, diagnostics: compact, remainingDiagnostics: diagnostics.length - compact.length }, null, 2));
  return passed ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = verify(process.argv.slice(2)); } catch (error) { console.error('verify: ' + error.message); process.exitCode = 2; }
}
