"""Meaningful API and data-contract checks using an isolated in-memory database."""
import json, math
from pathlib import Path
from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from backend import main

ROOT=Path(__file__).resolve().parents[1]

@pytest.fixture
def client(monkeypatch):
    test_engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
    monkeypatch.setattr(main,'engine',test_engine)
    with TestClient(main.app) as c: yield c
    test_engine.dispose()

def test_report_counts_identifiers_and_provenance():
    data=main.load_data()
    expected={'2026-04':1981,'2026-05':1987,'2026-06':1847,'2026-07':1775}
    keys=[(r['id'],r['month']) for r in data['snapshots']]
    assert len(keys)==len(set(keys))==7590
    for m,n in expected.items(): assert sum(r['month']==m for r in data['snapshots'])==n
    assert all(r['name'] and r['ministry']!='Unknown' and r['source_page']>1 for r in data['snapshots'])
    row=next(r for r in data['snapshots'] if r['id']=='612786' and r['month']=='2026-04')
    assert (row['original_cost'],row['expenditure'],row['progress'],row['source_page'])==(265.91,129.07,65,55)
    assert row['start']=='2024-01' and row['revised_end']=='2026-07'

def test_pagination_filter_and_history(client):
    assert client.get('/api/health').json()['snapshots']==7590
    result=client.get('/api/projects',params={'month':'2026-04','limit':5}).json()
    assert result['total']==1981 and len(result['items'])==5
    assert client.get('/api/projects',params={'limit':2001}).status_code==422
    assert client.get('/api/projects/000000').status_code==404
    detail=client.get('/api/projects/705368').json()
    assert len(detail['history'])==4
    assert [r['month'] for r in detail['history']]==['2026-04','2026-05','2026-06','2026-07']

def test_review_lifecycle_validation_dedup_and_audit(client):
    body={'project_id':'705368','project_name':'Untrusted override','owner':'Demo monitoring team','due':(date.today()+timedelta(days=7)).isoformat()}
    r=client.post('/api/reviews',json=body)
    assert r.status_code==201
    row=r.json(); assert row['project_name']=='Araria-Supaul 92 km'
    assert client.post('/api/reviews',json=body).status_code==409
    assert client.post('/api/reviews',json={**body,'owner':' '}).status_code==422
    assert client.post('/api/reviews',json={**body,'project_id':'000000'}).status_code==404
    assert client.post('/api/reviews',json={**body,'due':'2000-01-01'}).status_code==422
    assert client.patch('/api/reviews/'+row['id'],json={'status':'Resolved'}).json()['status']=='Resolved'
    assert len(client.get('/api/reviews').json())==1
    audit=client.get('/api/reviews/'+row['id']+'/audit').json()
    assert [e['action'] for e in audit]==['created','resolved']

def test_real_shap_additivity_and_model_evidence():
    data=json.loads((ROOT/'public/data/model-evidence.json').read_text())
    assert data['targets']['cost']['train_positive']==3
    assert data['targets']['schedule']['test_n']==1404
    for targets in data['predictions'].values():
        for p in targets.values():
            margin=p['base']+sum(c['contribution'] for c in p['contributions'])
            assert abs(1/(1+math.exp(-margin))-p['probability'])<1e-5
    for record in data['targets'].values():
        assert record['shap_max_additivity_error']<1e-4

def test_missing_targets_are_not_assumed_success():
    from scripts.train_models import target,features
    before=main.load_data()['snapshots'][0].copy()
    before['revised_end']=None
    assert target(before,{**before,'revised_end':'2030-01'},'schedule') is None
    before['original_cost']=None
    assert math.isnan(features(before)[0])

def test_prediction_uses_the_artifact_month(client):
    result=client.get('/api/projects/705368/prediction')
    assert result.status_code==200
    assert result.json()['as_of']=='2026-07'
    assert set(result.json()['targets'])=={'schedule','cost'}

def test_changed_source_cannot_silently_disagree_with_saved_snapshot(client,monkeypatch):
    from copy import deepcopy
    from sqlalchemy.orm import Session
    original=main.load_data()
    corrected=deepcopy(original)
    corrected['snapshots'][0]['progress']=12.34
    monkeypatch.setattr(main,'load_data',lambda:corrected)
    with pytest.raises(RuntimeError,match='Source record changed'):
        with TestClient(main.app): pass
    first=original['snapshots'][0]
    with Session(main.engine) as session:
        persisted=json.loads(session.get(main.SnapshotRow,f"{first['id']}:{first['month']}").payload)
    assert persisted==first
    assert main.app.state.data==original
