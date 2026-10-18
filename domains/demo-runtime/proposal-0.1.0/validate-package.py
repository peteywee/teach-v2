#!/usr/bin/env python3
"""Proposal-only structural/typed-closure validator. Never applies or approves changes."""
import json,pathlib,hashlib,collections,sys,copy
P=pathlib.Path(__file__).resolve().parent
R=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/shared/teach-v2-capability-main80')
load=lambda p:json.loads(p.read_text())
base={}
for f in (R/'kernel').glob('*.json'):
 for e in load(f).get('entries',[]):base[(f.stem,e['id'])]=e
proposal=load(P/'registry-proposal.json')
def check(doc):
 errors=[]; entries=doc['entries']; current={}; included=set()
 for e in entries:
  key=(e['family'],e['id'])
  if key in included:errors.append('duplicate '+str(key))
  included.add(key);current[key]=e
  b=base.get(key)
  if e['change']=='ADD' and b:errors.append('ADD exists '+str(key))
  if e['change']=='PROMOTE' and (not b or b['status']!='candidate'):errors.append('PROMOTE not candidate '+str(key))
  if e['change']=='REVISE' and (not b or b['status']!='approved'):errors.append('REVISE not approved '+str(key))
  if e['change'] not in ['ADD','PROMOTE','REVISE']:errors.append('unknown change '+str(key))
  if not e.get('definition') or not e.get('owning_domain'):errors.append('missing definition/owner '+str(key))
  if b and e.get('baseline_entry_sha256')!=hashlib.sha256(json.dumps(b,sort_keys=True,separators=(',',':')).encode()).hexdigest():errors.append('baseline mismatch '+str(key))
 for e in entries:
  for dep in e.get('requires',[]):
   key=(dep.get('family'),dep.get('id'))
   if key not in included and (key not in base or base[key]['status']!='approved'):errors.append('unclosed '+e['id']+' -> '+str(key))
  if e['family']=='relationships':
   fields=e.get('fields',{})
   for val in [fields.get('from')]+(fields.get('to',[]) if isinstance(fields.get('to',[]),list) else [fields.get('to')]):
    if val and not any((fam,val) in included or (base.get((fam,val),{}).get('status')=='approved') for fam in ['entities','identifiers']):errors.append('relationship endpoint '+e['id']+' '+str(val))
 return errors
errors=check(proposal)
negative=[]
for label,mutator in [
 ('reject_missing_dependency',lambda d:d['entries'][0]['requires'].append({'family':'entities','id':'NotRegistered'})),
 ('reject_wrong_family_same_name',lambda d:d['entries'][0]['requires'].append({'family':'values','id':'IdempotencyKey'})),
 ('reject_duplicate_entry',lambda d:d['entries'].append(copy.deepcopy(d['entries'][0]))),
 ('reject_self_approved_source_status',lambda d:d['entries'][0].update(change='REVISE'))]:
 d=copy.deepcopy(proposal);mutator(d);negative.append({'case':label,'result':'PASS' if check(d) else 'FAIL'})
for n in negative:
 if n['result']!='PASS':errors.append(n['case'])
routes=load(P/'transport-and-queries.json')
known={(f,i):e for (f,i),e in base.items() if e['status']=='approved'};known.update({(e['family'],e['id']):e for e in proposal['entries']})
seen=set()
for route in routes['routes']:
 k=(route['method'],route['path'])
 if k in seen:errors.append('duplicate route '+str(k))
 seen.add(k)
 if route['mounted'] or route['implemented']:errors.append('proposal route activated '+str(k))
 if ('capabilities',route['capability']) not in known:errors.append('unknown route capability '+str(k))
 if route['operation'] in routes['internal_only_commands']:errors.append('internal command routed '+str(k))
 if route['method'] not in ['GET'] and route.get('origin_check')!=True:errors.append('unsafe missing origin '+str(k))
for f in P.glob('*.json'):
 try:load(f)
 except Exception as e:errors.append('JSON parse '+str(f)+str(e))
# Every schema reference is resolved within the package; no implicit external fetch.
for filename in ['transport-and-queries.json','transport-schemas.json']:
 def visit_schema(value):
  if isinstance(value,dict):
   for key,item in value.items():
    if key=='$ref':
     try:
      file,pointer=item.split('#'); target=load(P/(file or filename))
      for part in pointer.split('/')[1:]: target=target[part]
     except Exception: errors.append('unresolved schema ref '+filename+' '+str(item))
    else: visit_schema(item)
  elif isinstance(value,list):
   for item in value: visit_schema(item)
 visit_schema(load(P/filename))
if (P/'baseline-error-envelope.schema.json').read_bytes() != (R/'governance/decision-closure/api-error-envelope.schema.json').read_bytes(): errors.append('baseline wire error contract changed')
report={'package':proposal['package'],'status':'PASS' if not errors else 'FAIL','scope':'proposal structure, exact baseline entry hashes, typed approval-dependency closure and declared non-activation only; not full semantic correctness/runtime/admission evidence','entry_count':len(proposal['entries']),'changes':dict(collections.Counter(e['change'] for e in proposal['entries'])),'typed_dependency_edges':sum(len(e.get('requires',[])) for e in proposal['entries']),'route_count':len(routes['routes']),'query_count':len(routes['queries']),'negative_checks':negative,'errors':errors,'runtime':'NOT_RUN','owner_approval':'NOT_RECORDED','active_source_modified':False}
(P/'validation-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));sys.exit(bool(errors))
