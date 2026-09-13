"""Local-first demonstration API. No user authentication is claimed.

Bind to loopback for the demo. Add OIDC/RBAC before shared operational use.
"""
from contextlib import asynccontextmanager
from pathlib import Path
from datetime import date, datetime, timezone
from typing import Literal
import json, os, uuid

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import create_engine, Column, String, Text, select
from sqlalchemy.orm import DeclarativeBase, Session

ROOT=Path(__file__).resolve().parents[1]
DB_URL=os.environ.get('DATABASE_URL',f'sqlite:///{ROOT / "data" / "paimana.db"}')
engine=create_engine(DB_URL,connect_args={'check_same_thread':False} if DB_URL.startswith('sqlite') else {})

class Base(DeclarativeBase): pass
class Review(Base):
    __tablename__='interventions'
    id=Column(String,primary_key=True)
    project_id=Column(String,index=True,nullable=False)
    project_name=Column(Text,nullable=False)
    owner=Column(String,nullable=False)
    due=Column(String,nullable=False)
    status=Column(String,nullable=False)
    created_at=Column(String,nullable=False)

class Event(Base):
    __tablename__='audit_events'
    id=Column(String,primary_key=True)
    review_id=Column(String,index=True)
    action=Column(String)
    timestamp=Column(String)
    detail=Column(Text)

class SnapshotRow(Base):
    __tablename__='project_snapshots'
    key=Column(String,primary_key=True)
    project_id=Column(String,index=True,nullable=False)
    month=Column(String,index=True,nullable=False)
    payload=Column(Text,nullable=False)

def load_data():
    path=ROOT/'public/data/portfolio.json'
    if not path.exists(): raise RuntimeError('Run scripts/build_dataset.py before starting the API')
    return json.loads(path.read_text(encoding='utf-8'))

@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    data=load_data()
    with Session(engine) as session:
        existing={r.key:json.loads(r.payload) for r in session.scalars(select(SnapshotRow))}
        for r in data['snapshots']:
            key=f"{r['id']}:{r['month']}"
            if key in existing and existing[key]!=r:
                raise RuntimeError(f'Source record changed for {key}. Existing snapshot preserved; use a versioned correction import before restarting.')
            if key not in existing: session.add(SnapshotRow(key=key,project_id=r['id'],month=r['month'],payload=json.dumps(r)))
        session.commit()
    app.state.data=data
    app.state.projects={r['id']:r for r in sorted(data['snapshots'],key=lambda r:r['month'])}
    yield

app=FastAPI(title='PAIMANA Intelligence',version='0.1.0',lifespan=lifespan,description='Real report snapshots and persistent review workflows. Local research prototype; not an official government service.')

class ReviewInput(BaseModel):
    project_id:str=Field(pattern=r'^\d{6,}$')
    project_name:str=Field(default='',max_length=4000)
    owner:str=Field(min_length=1,max_length=120)
    due:date
    status:Literal['Open']='Open'

    @field_validator('owner')
    @classmethod
    def nonempty(cls,v):
        if not v.strip(): raise ValueError('Owner cannot be blank')
        return v.strip()

    @field_validator('due')
    @classmethod
    def future_due(cls,v):
        if v<date.today(): raise ValueError('Due date cannot be in the past')
        return v

class StatusInput(BaseModel): status:Literal['Resolved']

def serialize(r): return {c.name:getattr(r,c.name) for c in r.__table__.columns}

def log(session,rid,action,detail):
    session.add(Event(id=str(uuid.uuid4()),review_id=rid,action=action,timestamp=datetime.now(timezone.utc).isoformat(),detail=json.dumps(detail)))

@app.get('/api/health')
def health(): return {'status':'ok','mode':'local research prototype','persistence':'PostgreSQL' if DB_URL.startswith('postgresql') else 'SQLite','snapshots':len(app.state.data['snapshots'])}

@app.get('/api/sources')
def sources(): return app.state.data['audit']

@app.get('/api/projects')
def projects(month:str|None=None,q:str='',limit:int=Query(100,ge=1,le=2000),offset:int=Query(0,ge=0)):
    selected=month or app.state.data['audit']['sources'][-1]['month']
    with Session(engine) as session:
        rows=[json.loads(r.payload) for r in session.scalars(select(SnapshotRow).where(SnapshotRow.month==selected))]
    rows=[r for r in rows if q.lower() in (r['id']+' '+r['name']+' '+r['state']).lower()]
    return {'month':selected,'total':len(rows),'items':rows[offset:offset+limit]}

@app.get('/api/projects/{project_id}')
def project(project_id:str):
    if project_id not in app.state.projects: raise HTTPException(404,'Unknown project code')
    with Session(engine) as session:
        history=[json.loads(r.payload) for r in session.scalars(select(SnapshotRow).where(SnapshotRow.project_id==project_id).order_by(SnapshotRow.month))]
    return {'project':app.state.projects[project_id],'history':history}

@app.get('/api/projects/{project_id}/prediction')
def prediction(project_id:str):
    path=ROOT/'public/data/model-evidence.json'
    if not path.exists(): raise HTTPException(503,'Experimental model artifacts have not been generated')
    data=json.loads(path.read_text(encoding='utf-8'))
    if not data.get('prediction_month'): raise HTTPException(503,'Model artifact is missing its prediction month; regenerate the evidence artifact')
    if project_id not in data['predictions']: raise HTTPException(404,'No prediction for this project in the latest snapshot')
    return {'project_id':project_id,'as_of':data['prediction_month'],'status':data['status'],'targets':data['predictions'][project_id]}

@app.get('/api/reviews')
def reviews():
    with Session(engine) as session: return [serialize(r) for r in session.scalars(select(Review).order_by(Review.created_at.desc()))]

@app.post('/api/reviews',status_code=201)
def create_review(body:ReviewInput):
    project=app.state.projects.get(body.project_id)
    if not project: raise HTTPException(404,'Unknown project code')
    with Session(engine) as session:
        duplicate=session.scalar(select(Review).where(Review.project_id==body.project_id,Review.owner==body.owner,Review.status=='Open'))
        if duplicate: raise HTTPException(409,'An open review for this project and owner already exists')
        row=Review(id=str(uuid.uuid4()),project_id=body.project_id,project_name=project['name'],owner=body.owner,due=body.due.isoformat(),status='Open',created_at=datetime.now(timezone.utc).isoformat())
        session.add(row); log(session,row.id,'created',{'owner':body.owner,'due':body.due.isoformat()}); session.commit();session.refresh(row)
        return serialize(row)

@app.patch('/api/reviews/{review_id}')
def resolve(review_id:str,body:StatusInput):
    with Session(engine) as session:
        row=session.get(Review,review_id)
        if not row: raise HTTPException(404,'Unknown review')
        if row.status!=body.status:
            row.status=body.status;log(session,row.id,'resolved',{});session.commit();session.refresh(row)
        return serialize(row)

@app.get('/api/reviews/{review_id}/audit')
def audit(review_id:str):
    with Session(engine) as session:
        if not session.get(Review,review_id): raise HTTPException(404,'Unknown review')
        return [serialize(r) for r in session.scalars(select(Event).where(Event.review_id==review_id).order_by(Event.timestamp))]
