import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import semanticRelease from 'semantic-release';
import { analyzeCommits } from '@semantic-release/commit-analyzer';

const root = resolve(import.meta.dirname, '../..');
const config = JSON.parse(readFileSync(join(root, '.releaserc.json')));
const logger = { log() {}, error() {}, success() {} };

test('version selection covers features, breaking changes and documentation', async () => {
  for (const [message, expected] of [
    ['fix(russian-speech): clarify a rule', 'patch'],
    ['docs: improve installation instructions', 'patch'],
    ['Update installation instructions', 'patch'],
    ['feat(team): add a rule', 'minor'],
    ['feat(team)!: replace the workflow', 'major'],
  ]) {
    assert.equal(await analyzeCommits(config.plugins[0][1], {
      cwd: root, commits: [{ hash: 'test', message }], logger,
    }), expected, message);
  }
});

test('semantic-release commits all manifests and pushes a tag; rerun is a no-op', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'plugin-release-test-'));
  try {
    const cwd = join(temp, 'repo');
    const origin = join(temp, 'origin.git');
    mkdirSync(cwd);
    // These are test fixtures, not installed plugins.
    for (const path of ['brief', 'team', 'russian-speech', 'paseo-cto', '.claude-plugin',
      '.github/scripts/prepare_release.py', '.releaserc.json', 'README.md', 'CHANGELOG.md']) {
      cpSync(join(root, path), join(cwd, path), { recursive: true });
    }
    symlinkSync(join(root, 'node_modules'), join(cwd, 'node_modules'), 'dir');
    writeFileSync(join(cwd, '.gitignore'), 'node_modules/\n__pycache__/\n');
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !/^(GITHUB_|GH_|GIT_|CI$)/.test(key)));
    Object.assign(env, { GIT_AUTHOR_NAME: 'Release test', GIT_COMMITTER_NAME: 'Release test',
      GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_EMAIL: 'test@example.invalid' });
    const git = (...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git('init', '--bare', '--initial-branch=main', origin);
    git('init', '--initial-branch=main');
    git('remote', 'add', 'origin', origin);
    git('add', '.');
    git('commit', '-m', 'initial');
    const version = JSON.parse(readFileSync(join(cwd, 'brief/.claude-plugin/plugin.json'))).version;
    git('tag', `v${version}`);
    git('push', 'origin', 'main', '--tags');
    git('commit', '--allow-empty', '-m', 'fix(russian-speech): improve the explanation');
    git('push', 'origin', 'main');
    const options = { ...config, ci: false, repositoryUrl: `file://${origin}`,
      plugins: config.plugins.filter(([name]) => name !== '@semantic-release/github') };
    const result = await semanticRelease(options, { cwd, env });
    const [major, minor, patch] = version.split('.').map(Number);
    const expected = `${major}.${minor}.${patch + 1}`;
    assert.equal(result.nextRelease.version, expected);
    const head = git('rev-parse', 'HEAD');
    assert.equal(git('--git-dir=' + origin, 'rev-parse', 'main'), head);
    assert.equal(git('--git-dir=' + origin, 'rev-parse', `v${expected}`), head);
    assert.match(git('log', '-1', '--format=%s'), /^chore\(release\): .* \[skip ci\]$/);
    assert.equal(git('status', '--porcelain'), '');
    const codex = new Set();
    for (const name of ['brief', 'team', 'russian-speech', 'paseo-cto']) {
      assert.equal(JSON.parse(git('show', `HEAD:${name}/.claude-plugin/plugin.json`)).version, expected);
      codex.add(JSON.parse(git('show', `HEAD:${name}/.codex-plugin/plugin.json`)).version);
    }
    assert.equal(codex.size, 1);
    assert.match(git('show', 'HEAD:CHANGELOG.md'), new RegExp(expected.replaceAll('.', '\\.')));
    assert.equal(await semanticRelease(options, { cwd, env }), false);
    assert.equal(git('rev-parse', 'HEAD'), head);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
