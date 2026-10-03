import argparse, csv, json
from pathlib import Path

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("--store", required=True)
    args=parser.parse_args()
    target=Path(args.store)
    state=json.loads(target.read_text()) if target.exists() else {}
    try:
        with open(args.source, newline="") as source:
            for row in csv.DictReader(source):
                if row["id"] in state:
                    raise ValueError("duplicate id")
                state[row["id"]]=int(row["value"])
                target.write_text(json.dumps(state, sort_keys=True))
    except (ValueError, OSError, KeyError) as error:
        print(str(error))
        return 2
    return 0

if __name__=="__main__":
    raise SystemExit(main())
