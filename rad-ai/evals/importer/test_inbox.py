import json, subprocess, sys, tempfile, unittest
from pathlib import Path

class ImportTest(unittest.TestCase):
    def test_success(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            source=root/"in.csv"
            store=root/"state.json"
            source.write_text("id,value\na,1\nb,2\n")
            result=subprocess.run([sys.executable,"-m","inbox",str(source),"--store",str(store)],capture_output=True)
            self.assertEqual(result.returncode,0)
            self.assertEqual(json.loads(store.read_text()),{"a":1,"b":2})
