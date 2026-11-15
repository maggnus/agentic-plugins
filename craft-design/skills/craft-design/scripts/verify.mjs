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
  'primitive-svg': 'Enrich large diagrams and charts with reference grids, varied stroke weights, material hatching or tolerance bands, and dimension/value callouts (>= 12 SVG primitives).',
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

  const VALUE_FLAGS = new Set(['--height', '--wait', '--at', '--mode', '--contract', '--scenario', '--click', '--width']);
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

  const startedAtMs = Date.now();
  const rawKey = basename(source, extname(source)).replace(/[^\w.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'artifact';
  const safeKey = rawKey + (suffix ? '-' + hash(suffix).slice(0, 6) : '') + (stage === 'calibrate' ? '-calibrate' : '');
  const verifyRoot = join(dirname(statePath), '.craft-verification');
  mkdirSync(verifyRoot, { recursive: true });
  const directory = mkdtempSync(join(verifyRoot, safeKey + '--'));
  const before = hash(readFileSync(source)), scriptRoot = dirname(fileURLToPath(import.meta.url));
  const steps = [['tokens', ['check', targetSpec, '--width', widths, ...modeArgs, '--strict', '--json']], ['inspect', [targetSpec, ...args, '--out', join(directory, 'frame.png'), '--strict']]];
  const results = [], diagnostics = [], frames = [], deferredInCalibrate = [];
  let tokenReport = null;
  let activeTokenWarnings = 0;

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
          const reportPath = png.replace(/\.png$/, '.json'), report = JSON.parse(readFileSync(reportPath, 'utf8'));
          if (report.schemaVersion !== 1 || report.sourceSha256 !== before || report.viewport?.width !== width || report.screenshot !== png || hash(readFileSync(png)) !== report.screenshotSha256 || !Array.isArray(report.findings) || report.truncated || report.capture?.width !== width || !(report.capture?.height > 0) || !Number.isFinite(report.capture?.height) || !(report.capture?.documentHeight > 0) || !Number.isFinite(report.capture?.documentHeight) || typeof report.capture?.limited !== 'boolean' || typeof report.capture?.fullDocument !== 'boolean') throw new Error('Missing, truncated or mismatched render evidence for ' + width + 'px.');
          const strips = Array.isArray(report.strips) ? report.strips : [];
          for (const strip of strips) {
            if (!strip?.screenshot || !existsSync(strip.screenshot) || hash(readFileSync(strip.screenshot)) !== strip.screenshotSha256) {
              throw new Error('Missing or mismatched strip evidence for ' + width + 'px.');
            }
          }
          frames.push({ width, height: report.viewport.height, capture: report.capture, screenshot: png, strips, report: reportPath, sourceSha256: report.sourceSha256, screenshotSha256: report.screenshotSha256, errors: report.findings.filter(f => f.severity === 'error').length, review: report.findings.filter(f => f.severity === 'review').length });
          for (const f of report.findings) diagnostics.push({ ...f, check: name, width, repair: repairs[f.code] ?? 'Inspect this finding in the final PNG and correct confirmed defects.' });
        }
      }
    } catch (error) { check.evidenceError = error.message; }
  }

  const unchanged = hash(readFileSync(source)) === before;
  const validationExit = r => r.exitCode === 1 && (r.name === 'tokens' ? tokenReport?.findings?.length > 0 : frames.some(f => f.errors > 0));
  const counts = { tokenWarnings: tokenReport ? activeTokenWarnings : null, renderErrors: frames.reduce((n, f) => n + f.errors, 0), renderReviews: frames.reduce((n, f) => n + f.review, 0), checkFailures: results.filter(r => r.error || r.evidenceError || (r.exitCode !== 0 && !validationExit(r))).length };
  const passed = unchanged && counts.checkFailures === 0 && counts.tokenWarnings === 0 && counts.renderErrors === 0 && frames.length === widthList.length;

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
  const status = counts.checkFailures ? 'incomplete' : !passed ? 'failed' : counts.renderReviews ? 'needs-review' : 'passed';
  const hasStrips = frames.some(f => f.strips?.length > 0);
  const nextMessage = status === 'needs-review'
    ? 'Review findings remain. Inspect each in the final PNGs' + (hasStrips ? ' and 1:1 viewport strips (frame-*-s*.png)' : '') + ' and resolve or document it before delivery; passed covers blocking technical checks only.'
    : passed
      ? (stage === 'calibrate'
        ? 'Calibration passed. View the 1:1 first-screen PNGs, build remaining sections, and run full verify.mjs without --stage calibrate.'
        : 'View every final PNG' + (hasStrips ? ' and 1:1 viewport strips (frame-*-s*.png)' : '') + ' and reconcile required facts for each width/state with the brief; deliver these exact files.')
      : 'Work remains. Read diagnostics and logs, fix confirmed causes without removing required content or weakening checks, then repeat this full command. An environment failure must be reported as incomplete, not passed.';

  const report = {
    schemaVersion: 2, stage, source, sourceSha256: before, guideEdition: state.edition, route: state.plan.visualPath, checks: results, sourceUnchanged: unchanged, counts, passed, clean: passed && counts.renderReviews === 0, status, acceptedExceptions: tokenReport?.exceptions ?? [],
    ...(stage === 'calibrate' && { deferredInCalibrate }),
    coverage: { content: args.includes('--contract') ? 'explicit expectations only' : 'not checked: compare required facts across every frame', screenshots: frames.some(f => f.capture.internalScrollRegions > 0) ? 'document canvas only; internal scroll regions require separate captures' : frames.length === widthList.length && frames.every(f => f.capture.fullDocument) ? 'full documents' : 'requested frames or regions; not all page content' },
    frames, diagnostics, repeatCommand: repeat, next: nextMessage,
    visualReview: 'Not verified by this command. A technical pass is not evidence of visual quality, correct facts or complete accessibility.',
  };
  const reportPath = join(directory, 'summary.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  const compact = []; let budget = 0;
  for (const f of diagnostics) { const item = { check: f.check, severity: f.severity, code: f.code, width: f.width, line: f.line, selector: f.selector, message: f.message, repair: f.repair }; const bytes = Buffer.byteLength(JSON.stringify(item)); if (budget + bytes > 6000) break; compact.push(item); budget += bytes; }
  console.log(JSON.stringify({ ...report, report: reportPath, diagnostics: compact, remainingDiagnostics: diagnostics.length - compact.length }, null, 2));
  return passed ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = verify(process.argv.slice(2)); } catch (error) { console.error('verify: ' + error.message); process.exitCode = 2; }
}
