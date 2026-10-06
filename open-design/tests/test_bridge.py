import importlib.util
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / 'skills/open-design/scripts/od_bridge.py'
spec = importlib.util.spec_from_file_location('bridge', SCRIPT)
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='od bridge test ')
        self.root = Path(self.temp.name).resolve()
        self.workspace = self.root / 'source with spaces'
        self.workspace.mkdir()
        self.state = patch.object(bridge, 'STATE', self.root / 'state')
        self.state.start()
        self.addCleanup(self.state.stop)
        self.addCleanup(self.temp.cleanup)
        self.c = {'daemon': 'http://127.0.0.1:7456', 'web': 'http://127.0.0.1:7457'}

    def configuration(self, services=None):
        port = free_port()
        url = f'http://127.0.0.1:{port}/'
        service = {'name': 'preview', 'url': url, 'argv': [sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1']}
        cfg = {'version': 1, 'services': services if services is not None else [service], 'views': [{'name': 'UI', 'url': url}]}
        path = self.root / 'config.json'
        path.write_text(json.dumps(cfg))
        return path, cfg

    def fake_api(self, c, path, data=None):
        if data is None:
            return {'project': {'id': 'test'}, 'resolvedDir': str(self.workspace)}
        if path.endswith('/files'):
            file = self.workspace / data['name']
            self.assertFalse(file.exists())
            file.write_text(data['content'])
            return {'file': {'name': data['name']}}
        return {'conversationId': 'conversation'}

    def test_start_reuse_stop_owns_process_and_preserves_source(self):
        cfg, _ = self.configuration()
        source = self.workspace / 'untouched.txt'
        source.write_text('user content')
        with patch.object(bridge, 'api', side_effect=self.fake_api):
            try:
                value = bridge.up(self.c, 'test', cfg, 5)
            except RuntimeError as error:
                logs = '\n'.join(p.read_text() for p in bridge.STATE.rglob('*.log'))
                self.fail(f'{error}\n{logs}')
            self.addCleanup(lambda: bridge.down('test'))
            self.assertTrue(value['ready'])
            self.assertTrue(bridge.owned(value['services'][0]))
            again = bridge.up(self.c, 'test', cfg, 5)
            self.assertEqual(value['services'][0]['pid'], again['services'][0]['pid'])
            self.assertIn('iframe', (self.workspace / value['previewFile']).read_text())
            stopped = bridge.down('test')
            self.assertEqual(stopped['stoppedServices'], ['preview'])
            self.assertFalse(bridge.port_busy(value['services'][0]['url']))
            self.assertEqual(source.read_text(), 'user content')
            self.assertTrue((self.workspace / value['previewFile']).exists())

    def test_occupied_port_is_not_adopted_or_stopped(self):
        path, cfg = self.configuration()
        u = cfg['services'][0]['url']
        port = int(u.split(':')[-1].strip('/'))
        with socket.socket() as unrelated:
            unrelated.bind(('127.0.0.1', port)); unrelated.listen()
            with patch.object(bridge, 'api', side_effect=self.fake_api):
                with self.assertRaisesRegex(RuntimeError, 'Port occupied'):
                    bridge.up(self.c, 'test', path, 1)
            self.assertTrue(bridge.port_busy(u))

    def test_failure_rolls_back_earlier_owned_service(self):
        path, cfg = self.configuration()
        good = cfg['services'][0]
        cfg['services'].append({'name': 'broken', 'url': f'http://127.0.0.1:{free_port()}',
                                'argv': [sys.executable, '-c', 'raise SystemExit(7)']})
        path.write_text(json.dumps(cfg))
        with patch.object(bridge, 'api', side_effect=self.fake_api):
            with self.assertRaisesRegex(RuntimeError, 'did not become ready'):
                bridge.up(self.c, 'test', path, 2)
        self.assertFalse(bridge.port_busy(good['url']))
        state = bridge.read(bridge.STATE / 'projects/test/preview.json')
        self.assertFalse(state['ready'])
        self.assertTrue(all(not bridge.owned(s) for s in state['services']))

    def test_stale_pid_never_targets_unrelated_process(self):
        record = {'pid': os.getpid(), 'identity': bridge.identity(os.getpid()), 'nonce': 'not-in-command'}
        self.assertFalse(bridge.stop_record(record))
        record['nonce'] = 'python'
        record['identity'] = 'old process birth time'
        self.assertFalse(bridge.stop_record(record))

    def test_stop_escalates_for_grandchild_ignoring_term(self):
        path, cfg = self.configuration()
        port = int(cfg['services'][0]['url'].split(':')[-1].strip('/'))
        (self.workspace / 'server.py').write_text(
            'import http.server,signal\n'
            'signal.signal(signal.SIGTERM,signal.SIG_IGN)\n'
            f'http.server.HTTPServer(("127.0.0.1",{port}),http.server.SimpleHTTPRequestHandler).serve_forever()\n')
        (self.workspace / 'launcher.py').write_text(
            'import subprocess,sys\nsubprocess.Popen([sys.executable,"server.py"]).wait()\n')
        cfg['services'][0]['argv'] = [sys.executable, 'launcher.py']
        path.write_text(json.dumps(cfg))
        with patch.object(bridge, 'api', side_effect=self.fake_api):
            result = bridge.up(self.c, 'test', path, 5)
            self.addCleanup(lambda: bridge.down('test'))
            bridge.down('test')
            self.assertFalse(bridge.port_busy(result['services'][0]['url']))
            self.assertFalse(bridge.owned(result['services'][0]))

    def test_remote_urls_traversal_and_duplicate_services_refused(self):
        for url in ['https://example.com', 'http://example.com:123', 'http://user:secret@localhost:123', 'file:///tmp/a']:
            with self.assertRaises(ValueError): bridge.local_url(url)
        path, cfg = self.configuration()
        cfg['services'][0]['cwd'] = '..'; path.write_text(json.dumps(cfg))
        with self.assertRaisesRegex(ValueError, 'inside this workspace'): bridge.config(path, self.workspace)
        cfg['services'][0]['cwd'] = '.'; cfg['services'] *= 2; path.write_text(json.dumps(cfg))
        with self.assertRaisesRegex(ValueError, 'unique'): bridge.config(path, self.workspace)

    def test_preview_content_escapes_script_injection(self):
        page = bridge.wrapper([{'name': '</script><script>attack()</script>', 'url': 'http://127.0.0.1:8000'}])
        self.assertNotIn('<script>attack()', page)
        self.assertIn('textContent=view.name', page)

    def test_prepare_checkout_does_not_copy_dirty_files_or_secrets(self):
        repo = self.root / 'repo'; repo.mkdir()
        def git(*args): return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()
        git('init', '--initial-branch=main'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid')
        (repo / 'component.txt').write_text('committed'); git('add', '.'); git('commit', '-m', 'fixture')
        (repo / '.env.local').write_text('do not copy'); (repo / 'component.txt').write_text('uncommitted')
        with patch.object(bridge, 'api', side_effect=self.fake_api):
            with self.assertRaisesRegex(ValueError, 'explicit --ref'): bridge.prepare(self.c, repo, 'Test', None, None)
            result = bridge.prepare(self.c, repo, 'Test', 'HEAD', 'od/test')
        self.assertTrue(result['sourceHadUncommittedFiles'])
        self.assertEqual((self.workspace / 'component.txt').read_text(), 'committed')
        self.assertFalse((self.workspace / '.env.local').exists())
        self.assertEqual((repo / 'component.txt').read_text(), 'uncommitted')
        git('worktree', 'remove', str(self.workspace))


if __name__ == '__main__':
    unittest.main()
