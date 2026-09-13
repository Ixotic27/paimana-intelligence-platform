"""Publish a compact, source-backed read-only snapshot for the frontend."""
from pathlib import Path
import json, shutil, collections
ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'data/processed/snapshots.json').read_text(encoding='utf-8'))
audit=json.loads((ROOT/'data/processed/audit.json').read_text(encoding='utf-8'))
if audit['duplicate_keys']: raise ValueError('Duplicate project/month keys must be resolved')
for r in rows: r.pop('raw_cells',None)
out=ROOT/'public/data'; out.mkdir(parents=True,exist_ok=True)
(out/'portfolio.json').write_text(json.dumps({'snapshots':rows,'audit':audit},ensure_ascii=False),encoding='utf-8')
reports=ROOT/'public/reports'; reports.mkdir(parents=True,exist_ok=True)
for s in audit['sources']: shutil.copy2(ROOT/s['file'],reports/s['file'])
print('Published',len(rows),'real project-month snapshots')
