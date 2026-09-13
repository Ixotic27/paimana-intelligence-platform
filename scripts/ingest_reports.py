"""Extract Table 6 only, retaining identifiers, raw cells and PDF provenance."""
from pathlib import Path
import re, json, hashlib, collections
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'processed'
OUT.mkdir(parents=True, exist_ok=True)
MONTHS = {'April': '04', 'May': '05', 'June': '06', 'July': '07'}

def number(value):
    value = (value or '').replace(',', '').strip(' ()\n')
    return float(value) if re.fullmatch(r'-?\d+(\.\d+)?', value) else None

def pair(value, date=False):
    parts = (value or '').split('\n')
    result = [(parts[i] if i < len(parts) else '').strip(' ()') for i in range(2)]
    if date:
        return [f'{v[3:]}-{v[:2]}' if re.fullmatch(r'(0[1-9]|1[0-2])/\d{4}', v) else None for v in result]
    return list(map(number, result))

records, sources, rejected = [], [], []
for source in sorted(ROOT.glob('FlashReport*.pdf')):
    month = next((f'2026-{v}' for k,v in MONTHS.items() if k in source.name), None)
    if not month:
        continue
    cache = OUT / f'{month}.json'
    if cache.exists():
        saved = json.loads(cache.read_text(encoding='utf-8'))
        if saved['source']['sha256'] == hashlib.sha256(source.read_bytes()).hexdigest():
            records.extend(saved['records']); sources.append(saved['source']); rejected.extend(saved['rejected'])
            print('Cached', month, len(saved['records']), flush=True)
            continue
    batch, errors = [], []
    ministry, sector = 'Unknown', 'Unknown'
    with pdfplumber.open(source) as pdf:
        for index, page in enumerate(pdf.pages):
            if index < 45:
                page.close(); continue
            heading = page.crop((0, 0, page.width, 200)).extract_text() or ''
            if 'All Ongoing Projects' not in heading:
                page.close(); continue
            for table in page.extract_tables():
                for row in table:
                    if len(row) != 8 or row[0] == 'Sl.No':
                        continue
                    if not (row[0] or '').strip():
                        label = ' '.join((row[1] or '').split())
                        if label.startswith(('Ministry', 'Department')):
                            ministry = label
                        elif label:
                            sector = label
                        continue
                    if not (row[0] or '').strip().isdigit():
                        continue
                    lines = (row[1] or '').split('\n')
                    match = next(((i, re.fullmatch(r'\((\d{6,})\)', line.strip())) for i,line in enumerate(lines) if re.fullmatch(r'\((\d{6,})\)', line.strip())), None)
                    if not match:
                        errors.append({'file':source.name, 'page':index+1, 'row':row, 'reason':'Missing stable project code'}); continue
                    pos, code = match
                    before = lines[:pos]
                    agency_start = next((i for i in range(len(before)-1, -1, -1) if before[i].startswith('(')), len(before))
                    name = ' '.join(before[:agency_start]).strip()
                    agency = ' '.join(before[agency_start:]).strip(' ()')
                    approval, start = pair(row[3], True)
                    original_end, revised_end = pair(row[4], True)
                    original_cost, revised_cost = pair(row[5])
                    record = {'id':code.group(1), 'name':name, 'agency':agency, 'legacy_codes':' '.join(lines[pos+1:]), 'state':' '.join((row[2] or '').split()), 'ministry':ministry, 'sector':sector, 'month':month, 'approval':approval, 'start':start, 'original_end':original_end, 'revised_end':revised_end, 'original_cost':original_cost, 'revised_cost':revised_cost, 'expenditure':number(row[6]), 'progress':number(row[7]), 'source_file':source.name, 'source_page':index+1, 'serial':int(row[0]), 'raw_cells':row}
                    record['quality_flags'] = []
                    for key in ['original_cost','revised_cost','progress','start','original_end']:
                        if record[key] is None: record['quality_flags'].append('Missing '+key)
                    if record['progress'] is not None and not 0 <= record['progress'] <= 100: record['quality_flags'].append('Progress outside 0–100')
                    if record['expenditure'] is not None and revised_cost and record['expenditure'] > revised_cost: record['quality_flags'].append('Expenditure exceeds revised cost')
                    batch.append(record)
            page.close()
            if (index+1) % 25 == 0: print(month, 'page', index+1, 'records',len(batch), flush=True)
        source_meta = {'file':source.name, 'month':month, 'pages':len(pdf.pages), 'sha256':hashlib.sha256(source.read_bytes()).hexdigest(), 'extracted_records':len(batch), 'rejected_rows':len(errors)}
    cache.write_text(json.dumps({'records':batch,'source':source_meta,'rejected':errors},ensure_ascii=False),encoding='utf-8')
    records.extend(batch); sources.append(source_meta); rejected.extend(errors)
    print('Extracted', month, len(batch), flush=True)
keys=collections.Counter((r['id'],r['month']) for r in records)
audit={'sources':sorted(sources,key=lambda s:s['month']), 'total_snapshots':len(records), 'unique_projects':len(set(r['id'] for r in records)), 'duplicate_keys':[list(k) for k,v in keys.items() if v>1], 'rejected_rows':rejected, 'quality_flags':dict(collections.Counter(f for r in records for f in r['quality_flags']))}
(OUT/'snapshots.json').write_text(json.dumps(records,ensure_ascii=False),encoding='utf-8')
(OUT/'audit.json').write_text(json.dumps(audit,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({k:v for k,v in audit.items() if k!='rejected_rows'},indent=2),flush=True)
