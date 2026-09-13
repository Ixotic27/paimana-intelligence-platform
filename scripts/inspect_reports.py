"""Extract report text without altering source PDFs."""
from pathlib import Path
import json
import pypdf

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'extracted'
OUT.mkdir(parents=True, exist_ok=True)
inventory = []
for source in sorted(ROOT.glob('*.pdf')):
    reader = pypdf.PdfReader(source)
    pages = [page.extract_text(extraction_mode='layout') or '' for page in reader.pages]
    (OUT / (source.stem + '.txt')).write_text('\n'.join(f'\n=== PDF PAGE {i+1} ===\n{text}' for i, text in enumerate(pages)), encoding='utf-8')
    inventory.append({'file': source.name, 'pages': len(pages), 'characters': sum(map(len, pages))})
    print(source.name, 'pages:', len(pages))
    for i, text in enumerate(pages[:7]):
        print(f'PAGE {i+1}: {text[:5500]}')
(OUT / 'inventory.json').write_text(json.dumps(inventory, indent=2), encoding='utf-8')
