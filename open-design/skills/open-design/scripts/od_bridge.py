#!/usr/bin/env python3
"""Local OpenDesign projects, isolated Git worktrees and owned preview processes."""
import argparse
import contextlib
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

STATE = Path(os.environ.get('AGENTIC_OD_HOME', str(Path.home() / '.config/agentic-open-design')))
SCRIPT = Path(__file__).resolve()
SUPPORTED = '0.24.1'
CHILDREN = {}  # Reap workers when this invocation is also their parent.


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
    with tmp.open('x') as f:
        os.chmod(tmp, 0o600)
        json.dump(value, f, indent=2)
        f.write('\n')
    tmp.replace(path)


def read(path):
    return json.loads(path.read_text())


def local_url(value):
    u = urllib.parse.urlsplit(value)
    if u.scheme != 'http' or u.hostname not in ('127.0.0.1', 'localhost', '::1') or u.username or u.password:
        raise ValueError('Use an HTTP loopback URL without credentials')
    if not u.port:
        raise ValueError('An explicit port is required')
    return value.rstrip('/')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Redirect refused; configure the final local URL')


def request(url, data=None, timeout=8):
    local_url(url)
    req = urllib.request.Request(url, data=None if data is None else json.dumps(data).encode(),
                                 headers={'Content-Type': 'application/json'})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    try:
        with opener.open(req, timeout=timeout) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        # Do not print a server response that may echo a prompt or credentials.
        raise RuntimeError(f'OpenDesign HTTP {error.code} at {urllib.parse.urlsplit(url).path}') from None


def api(connection, path, data=None):
    return json.loads(request(connection['daemon'] + path, data))


def connection():
    c = read(STATE / 'connection.json')
    health = api(c, '/api/health')
    if not health.get('ok') or health.get('version') != SUPPORTED:
        raise ValueError(f'Tested OpenDesign {SUPPORTED} required; run connect after a restart/update')
    return c


def connect(daemon, web):
    c = {'daemon': local_url(daemon), 'web': local_url(web)}
    if any(any((u.path, u.query, u.fragment)) for u in map(urllib.parse.urlsplit, c.values())):
        raise ValueError('Connection URLs must be origins, without paths')
    for origin in c.values():
        health = json.loads(request(origin + '/api/health'))
        if not health.get('ok') or health.get('version') != SUPPORTED:
            raise ValueError(f'Expected OpenDesign {SUPPORTED} on both origins')
    # The desktop static-file port is not its web/API proxy. Verify both together.
    if b'<html' not in request(c['web'] + '/').lower():
        raise ValueError('web must serve the OpenDesign UI and API, not just the daemon')
    left = api(c, '/api/projects')
    right = json.loads(request(c['web'] + '/api/projects'))
    if sorted(p['id'] for p in left['projects']) != sorted(p['id'] for p in right['projects']):
        raise ValueError('Web and daemon project inventories differ')
    save(STATE / 'connection.json', c)
    return c


def discover():
    """Use OS process inventory, never scrape credentials or guess a data directory."""
    output = subprocess.check_output(['lsof', '-nP', '-iTCP', '-sTCP:LISTEN', '-Fpcn'], text=True)
    name, ports = '', set()
    for line in output.splitlines():
        if line.startswith('c'):
            name = line[1:]
        if line.startswith('n') and name.startswith('Open Design'):
            match = re.search(r':(\d+)$', line)
            if match:
                ports.add(int(match[1]))
    apis, webs = [], []
    for port in sorted(ports):
        origin = f'http://127.0.0.1:{port}'
        try:
            health = json.loads(request(origin + '/api/health', timeout=2))
            if health.get('ok') and health.get('version') == SUPPORTED:
                apis.append(origin)
                try:
                    if b'<html' in request(origin + '/', timeout=2).lower():
                        webs.append(origin)
                except (OSError, ValueError, RuntimeError):
                    pass
        except (OSError, ValueError, RuntimeError):
            pass
    daemons = [url for url in apis if url not in webs]
    if len(webs) != 1 or len(daemons) != 1:
        raise ValueError('Cannot identify one running desktop instance; use connect --daemon URL --web URL')
    return connect(daemons[0], webs[0])


def project(c, project_id):
    if not re.fullmatch(r'[A-Za-z0-9_-]+', project_id):
        raise ValueError('Invalid project id')
    info = api(c, '/api/projects/' + project_id)
    root = Path(info['resolvedDir']).resolve()
    return info, root


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()


def prepare(c, repo, name, ref, branch):
    repo = Path(git(repo, 'rev-parse', '--show-toplevel')).resolve()
    dirty = bool(git(repo, 'status', '--porcelain'))
    if dirty and ref is None:
        raise ValueError('Source has uncommitted files. Choose an explicit --ref for a committed snapshot; nothing is copied')
    revision = git(repo, 'rev-parse', '--verify', (ref or 'HEAD') + '^{commit}')
    project_id = 'agentic-' + uuid.uuid4().hex[:12]
    branch = branch or 'od/' + project_id
    git(repo, 'check-ref-format', '--branch', branch)
    if subprocess.run(['git', '-C', str(repo), 'show-ref', '--verify', '--quiet', 'refs/heads/' + branch]).returncode == 0:
        raise ValueError('Branch already exists; choose a new branch')
    created = api(c, '/api/projects', {'id': project_id, 'name': name, 'skipDiscoveryBrief': True,
        'customInstructions': 'Read this repository entry point and current task. Its contracts and design system outrank generic visual defaults. Edit real canonical components. Keep previews as consumers, never visual copies. Do not publish, push, or delegate without task authorization.'})
    _, root = project(c, project_id)
    if root.exists() and any(root.iterdir()):
        raise ValueError(f'New OD project directory is not empty; refusing to replace it: {root}')
    if root.exists():
        root.rmdir()
    # No import-token bypass: create a normal OD-owned project, then populate it with Git.
    try:
        git(repo, 'worktree', 'add', '-b', branch, str(root), revision)
    except subprocess.CalledProcessError:
        raise RuntimeError(f'Worktree creation failed; empty OD project {project_id} remains for inspection') from None
    record = {'projectId': project_id, 'conversationId': created.get('conversationId'),
              'workspace': str(root), 'source': str(repo), 'revision': revision, 'branch': branch,
              'sourceHadUncommittedFiles': dirty}
    save(STATE / 'projects' / project_id / 'workspace.json', record)
    return record


def config(path, root):
    root = root.resolve()
    value = read(path)
    if value.get('version') != 1 or not value.get('views'):
        raise ValueError('Config requires version:1 and nonempty views')
    services = value.get('services', [])
    names = set()
    for service in services:
        name = service['name']
        if not re.fullmatch(r'[A-Za-z0-9_-]+', name) or name in names:
            raise ValueError('Services need unique simple names')
        names.add(name)
        local_url(service['url'])
        cwd = (root / service.get('cwd', '.')).resolve()
        if not cwd.is_relative_to(root) or not cwd.is_dir():
            raise ValueError('Service cwd must be an existing directory inside this workspace')
        argv = service.get('argv')
        if argv is not None and (not isinstance(argv, list) or not argv or not all(isinstance(a, str) and a for a in argv)):
            raise ValueError('argv must be a nonempty string array; omit it for an externally managed service')
        env = service.get('env', {})
        if not isinstance(env, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in env.items()):
            raise ValueError('env must contain string pairs')
    for view in value['views']:
        if not isinstance(view.get('name'), str) or not view['name']:
            raise ValueError('Each view needs a name')
        local_url(view['url'])
    return value


def alive_url(url):
    try:
        request(url, timeout=1)
        return True
    except (OSError, RuntimeError, ValueError):
        return False


def port_busy(url):
    u = urllib.parse.urlsplit(url)
    try:
        with socket.create_connection((u.hostname, u.port), timeout=.3):
            return True
    except OSError:
        return False


def identity(pid):
    try:
        value = subprocess.check_output(['ps', '-ww', '-p', str(pid), '-o', 'lstart=', '-o', 'command='],
                                        text=True, stderr=subprocess.DEVNULL).strip()
        fields = value.split(maxsplit=5)
        # macOS Python execs its framework binary after launch; its argv tail and birth time stay stable.
        if len(fields) == 6 and ' _service ' in fields[5]:
            return ' '.join(fields[:5]) + ' _service ' + fields[5].split(' _service ', 1)[1]
        return value
    except subprocess.CalledProcessError:
        return ''


def owned(record):
    if not record.get('pid') or not record.get('identity'):
        return False
    return identity(record['pid']) == record['identity'] and record['nonce'] in record['identity']


def stop_record(record):
    if not owned(record):
        child = CHILDREN.get(record.get('pid'))
        if child and child.poll() is not None:
            CHILDREN.pop(record['pid']).wait()
        return False
    pid = record['pid']
    if os.getpgid(pid) != pid:
        raise RuntimeError('Owned preview worker is not a process-group leader')
    os.killpg(pid, signal.SIGTERM)
    deadline = time.monotonic() + 8
    while owned(record) and time.monotonic() < deadline:
        time.sleep(.1)
    if owned(record):
        os.killpg(pid, signal.SIGKILL)
    child = CHILDREN.pop(pid, None)
    if child:
        child.wait(timeout=5)
    return True


def service_worker(path, nonce):
    """Keep a recognizable group leader; stop never targets processes by port."""
    descriptor = read(path)
    if descriptor['nonce'] != nonce:
        raise ValueError('Worker identity mismatch')
    signal.signal(signal.SIGTERM, lambda *_: None)  # Group TERM also reaches the child.
    child = subprocess.Popen(descriptor['argv'], cwd=descriptor['cwd'],
                             env={**os.environ, **descriptor.get('env', {})})
    result = child.wait()
    # A launcher can exit while grandchildren still serve HTTP or ignore TERM.
    # Keep the recognizable group leader alive until no live descendant remains,
    # so down can safely escalate against this same owned group, never a stale PGID.
    def live_member(row):
        if len(row) < 3 or int(row[0]) == os.getpid() or row[2].startswith('Z'):
            return False
        try:
            return int(row[1]) == os.getpgrp() and os.getpgid(int(row[0])) == os.getpgrp()
        except ProcessLookupError:
            return False  # Includes the already-finished ps observation process.

    while True:
        rows = subprocess.check_output(['ps', '-A', '-o', 'pid=', '-o', 'pgid=', '-o', 'stat='], text=True)
        members = [r.split() for r in rows.splitlines()]
        if not any(live_member(r) for r in members):
            return result
        time.sleep(.1)


@contextlib.contextmanager
def lock(directory):
    directory.mkdir(parents=True, exist_ok=True)
    marker = directory / 'operation.lock'
    try:
        marker.mkdir()
    except FileExistsError:
        raise RuntimeError(f'Another operation or an interrupted operation owns {marker}; inspect before removing') from None
    try:
        yield
    finally:
        marker.rmdir()


def wrapper(views):
    data = json.dumps(views).replace('<', '\\u003c').replace('&', '\\u0026')
    template = (SCRIPT.parent.parent / 'assets/preview.html').read_text()
    return template.replace('/*VIEWS*/[]', data)


def up(c, project_id, config_path, timeout):
    _, root = project(c, project_id)
    cfg = config(config_path, root)
    signature = hashlib.sha256(json.dumps(cfg, sort_keys=True).encode()).hexdigest()
    directory = STATE / 'projects' / project_id
    state_path = directory / 'preview.json'
    with lock(directory):
        previous = read(state_path) if state_path.exists() else None
        if previous and any(owned(s) for s in previous['services']):
            if previous['workspace'] != str(root) or previous['signature'] != signature or not all(alive_url(s['url']) for s in previous['services']):
                raise RuntimeError('Preview config changed or a service failed; run down before up')
            return previous
        for service in cfg.get('services', []):
            if service.get('argv') and port_busy(service['url']):
                raise RuntimeError(f"Port occupied for {service['name']}; no existing process will be adopted or stopped")
        started = []
        result = {'projectId': project_id, 'workspace': str(root), 'signature': signature, 'services': started}
        try:
            for service in cfg.get('services', []):
                record = {'name': service['name'], 'url': service['url']}
                if service.get('argv'):
                    nonce = uuid.uuid4().hex
                    descriptor = directory / ('service-' + service['name'] + '.json')
                    save(descriptor, {**service, 'cwd': str((root / service.get('cwd', '.')).resolve()), 'nonce': nonce})
                    log_path = directory / (service['name'] + '.log')
                    with log_path.open('ab') as log:
                        os.chmod(log_path, 0o600)
                        proc = subprocess.Popen([sys.executable, str(SCRIPT), '_service', str(descriptor), nonce],
                            stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
                    CHILDREN[proc.pid] = proc
                    # ps can briefly see the fork before exec. Wait for our exact worker argv.
                    birth = ''
                    for _ in range(100):
                        birth = identity(proc.pid)
                        if nonce in birth or proc.poll() is not None:
                            break
                        time.sleep(.01)
                    record.update(pid=proc.pid, nonce=nonce, identity=birth, log=str(log_path))
                    if not record['identity'] or not owned(record):
                        if proc.poll() is None:
                            proc.terminate()
                        proc.wait(timeout=5)
                        CHILDREN.pop(proc.pid, None)
                        raise RuntimeError('Could not identify preview worker')
                started.append(record)
                save(state_path, result)
                deadline = time.monotonic() + timeout
                while not alive_url(service['url']):
                    if time.monotonic() >= deadline or (record.get('pid') and not owned(record)):
                        raise RuntimeError(f"Preview {service['name']} did not become ready; inspect its local log")
                    time.sleep(.2)
            for view in cfg['views']:
                deadline = time.monotonic() + timeout
                while not alive_url(view['url']):
                    if time.monotonic() >= deadline or any(s.get('pid') and not owned(s) for s in started):
                        raise RuntimeError(f"View {view['name']} is unavailable")
                    time.sleep(.2)
            content = wrapper(cfg['views'])
            filename = 'agentic-preview-' + signature[:12] + '.html'
            file_path = root / filename
            if file_path.exists():
                if file_path.read_text() != content:
                    raise RuntimeError('Generated preview name already contains different content; refusing to overwrite')
            else:
                api(c, '/api/projects/' + project_id + '/files',
                    {'name': filename, 'content': content, 'encoding': 'utf8', 'artifact': True, 'overwrite': False})
            result['previewFile'] = filename
            result['projectURL'] = c['web'] + '/projects/' + project_id
            result['views'] = cfg['views']
            result['ready'] = True
            save(state_path, result)
            return result
        except BaseException:
            for record in reversed(started):
                stop_record(record)
            result['ready'] = False
            save(state_path, result)
            raise


def down(project_id):
    directory = STATE / 'projects' / project_id
    with lock(directory):
        path = directory / 'preview.json'
        value = read(path)
        value['stoppedServices'] = [r['name'] for r in reversed(value['services']) if stop_record(r)]
        value['ready'] = False
        save(path, value)
        return value


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '_service':
        return service_worker(Path(sys.argv[2]), sys.argv[3])
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='command', required=True)
    q = sub.add_parser('connect'); q.add_argument('--daemon', required=True); q.add_argument('--web', required=True)
    sub.add_parser('discover'); sub.add_parser('doctor')
    q = sub.add_parser('prepare'); q.add_argument('--repo', required=True); q.add_argument('--name', required=True); q.add_argument('--ref'); q.add_argument('--branch')
    q = sub.add_parser('up'); q.add_argument('--project', required=True); q.add_argument('--config', type=Path, required=True); q.add_argument('--timeout', type=float, default=60)
    q = sub.add_parser('down'); q.add_argument('--project', required=True)
    q = sub.add_parser('status'); q.add_argument('--project', required=True)
    q = sub.add_parser('run'); q.add_argument('--project', required=True); q.add_argument('--conversation'); q.add_argument('--agent', required=True); q.add_argument('--model', required=True); q.add_argument('--prompt-file', type=Path, required=True)
    q = sub.add_parser('wait'); q.add_argument('--run', required=True); q.add_argument('--timeout', type=float, default=600)
    args = p.parse_args()
    if hasattr(args, 'project') and not re.fullmatch(r'[A-Za-z0-9_-]+', args.project):
        p.error('Invalid project id')
    if hasattr(args, 'timeout') and not 0 < args.timeout <= 3600:
        p.error('timeout must be in (0, 3600] seconds')
    if args.command == 'connect':
        result = connect(args.daemon, args.web)
    elif args.command == 'discover':
        result = discover()
    elif args.command == 'down':
        result = down(args.project)
    elif args.command == 'status':
        result = read(STATE / 'projects' / args.project / 'preview.json')
        result['services'] = [{**s, 'ownedProcessAlive': owned(s), 'reachable': alive_url(s['url'])} for s in result['services']]
        result['ready'] = bool(result.get('ready')) and all(
            s['reachable'] and (not s.get('pid') or s['ownedProcessAlive']) for s in result['services'])
    else:
        c = connection()
        if args.command == 'doctor':
            result = {**c, 'version': SUPPORTED, 'state': str(STATE)}
        elif args.command == 'prepare':
            result = prepare(c, args.repo, args.name, args.ref, args.branch)
        elif args.command == 'up':
            result = up(c, args.project, args.config, args.timeout)
        elif args.command == 'run':
            project(c, args.project)
            body = {'projectId': args.project, 'agentId': args.agent, 'model': args.model, 'message': args.prompt_file.read_text()}
            if args.conversation:
                body['conversationId'] = args.conversation
            result = api(c, '/api/runs', body)
        elif args.command == 'wait':
            if not re.fullmatch(r'[A-Za-z0-9_-]+', args.run):
                p.error('Invalid run id')
            deadline = time.monotonic() + args.timeout
            while True:
                result = api(c, '/api/runs/' + args.run)
                if result['status'] in ('succeeded', 'failed', 'cancelled', 'canceled', 'interrupted'):
                    result = {k: result.get(k) for k in ('id', 'status', 'projectId', 'conversationId', 'exitCode', 'errorCode')}
                    if result['status'] != 'succeeded':
                        print(json.dumps(result, indent=2)); return 1
                    break
                if time.monotonic() >= deadline:
                    api(c, '/api/runs/' + args.run + '/cancel', {})
                    raise RuntimeError('Run deadline exceeded; cancellation requested. Inspect OD before retrying')
                time.sleep(2)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == '__main__':
    try:
        if os.name != 'posix':
            raise RuntimeError('Preview process management currently requires macOS or Linux')
        sys.exit(main())
    except (OSError, ValueError, RuntimeError, KeyError, subprocess.CalledProcessError) as error:
        print(f'open-design: {error}', file=sys.stderr)
        sys.exit(1)
