"""Fixed-split exploratory forecast of next-report revisions, with real SHAP.

This is a retrospective report-sequence experiment, NOT a validated model of
actual completion or final costs. Never use future rows as input features.
"""
from pathlib import Path
import json, math, hashlib
import numpy as np
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.dummy import DummyClassifier
from sklearn.metrics import average_precision_score, roc_auc_score, brier_score_loss, precision_score, recall_score
from xgboost import XGBClassifier
import shap

ROOT=Path(__file__).resolve().parents[1]
FEATURES=['log_original_cost','cost_escalation_pct','spend_pct','physical_progress','age_months','months_to_original_target','schedule_extension_months','linear_progress_gap']
GROUPS={'cost':[0,1,2], 'progress':[3,7], 'schedule':[4,5,6]}

def month_number(value):
    if not value: return None
    year,month=map(int,value.split('-')); return year*12+month-1

def features(r):
    now=month_number(r['month']); start=month_number(r['start']); end=month_number(r['original_end']); rev=month_number(r['revised_end'])
    original=r['original_cost']; cost=r['revised_cost']; spent=r['expenditure']; progress=r['progress']
    valid_progress=progress is not None and 0<=progress<=100
    expected=max(0,min(100,100*(now-start)/(end-start))) if start is not None and end is not None and end>start else None
    values=[math.log1p(original) if original is not None and original>=0 else None,100*(cost/original-1) if original and cost is not None else None,100*spent/cost if cost and spent is not None else None,progress if valid_progress else None,now-start if start is not None else None,end-now if end is not None else None,rev-end if rev is not None and end is not None else None,expected-progress if expected is not None and valid_progress else None]
    return [float(v) if v is not None else np.nan for v in values]

def target(before,after,kind):
    if kind=='cost':
        a,b=before['revised_cost'],after['revised_cost']
    else:
        # Missing revised dates remain unknown, not silently filled from original.
        a,b=month_number(before['revised_end']),month_number(after['revised_end'])
    if a is None or b is None: return None
    return int(b>a+(.01 if kind=='cost' else 0))

def pairs(rows,first,second,kind):
    later={r['id']:r for r in rows if r['month']==second}
    matched=[(r,later[r['id']]) for r in rows if r['month']==first and r['id'] in later]
    eligible=[(a,b) for a,b in matched if target(a,b,kind) is not None]
    return np.array([features(a) for a,b in eligible]),np.array([target(a,b,kind) for a,b in eligible]),[a['id'] for a,b in eligible]

def metrics(y,p):
    both=len(set(y))==2
    return {'ap':float(average_precision_score(y,p)) if y.sum()>0 else None,'auc':float(roc_auc_score(y,p)) if both else None,'brier':float(brier_score_loss(y,p)),'precision':float(precision_score(y,p>=.5,zero_division=0)),'recall':float(recall_score(y,p>=.5,zero_division=0)),'prevalence':float(y.mean())}

def boosted():
    return XGBClassifier(n_estimators=90,max_depth=3,learning_rate=.05,subsample=.9,colsample_bytree=.9,reg_lambda=4,random_state=26103,n_jobs=2,eval_metric='logloss')

def main():
    path=ROOT/'data/processed/snapshots.json'
    rows=json.loads(path.read_text(encoding='utf-8'))
    latest=[r for r in rows if r['month']=='2026-07']
    result={'status':'exploratory; uncalibrated; report-sequence proxies only','train':'April → May 2026','test':'June → July 2026','targets':{},'predictions':{},'data_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'prediction_month':'2026-07','feature_names':FEATURES,'split_project_ids':{},'shap_output':'raw log-odds'}
    artifact=ROOT/'backend/models'; artifact.mkdir(parents=True,exist_ok=True)
    for kind in ['schedule','cost']:
        X,y,train_ids=pairs(rows,'2026-04','2026-05',kind)
        Xt,yt,test_ids=pairs(rows,'2026-06','2026-07',kind)
        if len(set(y))<2: raise ValueError(f'{kind} has insufficient training classes')
        models={'Prevalence baseline':make_pipeline(SimpleImputer(),DummyClassifier(strategy='prior')),'Logistic regression':make_pipeline(SimpleImputer(add_indicator=True),StandardScaler(),LogisticRegression(max_iter=2000,C=.1,random_state=26103)),'XGBoost (preselected)':boosted()}
        record={'train_n':len(y),'test_n':len(yt),'train_positive':int(y.sum()),'test_positive':int(yt.sum()),'metrics':{},'ablation':{}}
        for name,model in models.items():
            model.fit(X,y); p=model.predict_proba(Xt)[:,1]
            record['metrics'][name]=metrics(yt,p)
        for group,indices in GROUPS.items():
            keep=[i for i in range(len(FEATURES)) if i not in indices]
            model=boosted(); model.fit(X[:,keep],y)
            record['ablation'][group]=metrics(yt,model.predict_proba(Xt[:,keep])[:,1])
        model=models['XGBoost (preselected)']
        model.save_model(artifact/f'{kind}.ubj')
        # SHAP explains XGBoost's raw margin. All feature contributions are retained.
        XL=np.array([features(r) for r in latest]); ex=shap.TreeExplainer(model); sv=ex(XL)
        margins=model.predict(XL,output_margin=True)
        residual=float(np.max(np.abs(sv.base_values+sv.values.sum(axis=1)-margins)))
        if residual>1e-4: raise ValueError(f'SHAP additivity failed: {residual}')
        probs=model.predict_proba(XL)[:,1]
        record['shap_max_additivity_error']=residual
        for i,r in enumerate(latest):
            result['predictions'].setdefault(r['id'],{})[kind]={'probability':float(probs[i]),'base':float(sv.base_values[i]),'contributions':[{'feature':name,'value':float(XL[i,j]) if np.isfinite(XL[i,j]) else None,'contribution':float(sv.values[i,j])} for j,name in enumerate(FEATURES)]}
        result['targets'][kind]=record
        result['split_project_ids'][kind]={'train':train_ids,'test':test_ids}
        print(kind,json.dumps(record),flush=True)
    (ROOT/'public/data/model-evidence.json').write_text(json.dumps(result,allow_nan=False),encoding='utf-8')
    (artifact/'manifest.json').write_text(json.dumps({k:v for k,v in result.items() if k!='predictions'},indent=2),encoding='utf-8')
    print('Saved actual fitted models, held-out metrics and additive SHAP explanations.',flush=True)

if __name__=='__main__': main()
