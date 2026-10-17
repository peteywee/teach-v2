#!/usr/bin/env python3
"""Static proposal validator only. Never edits a kernel or records owner approval."""
import argparse, copy, hashlib, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
PID = 'TEACH-SEM-CAPABILITY-NAMES-2026-10-17'
VERSION = '0.1.1'
BASELINE = 'a77909814a031b21fb995818f98aad80a422d3cb'
MATRIX = 'governance/decision-closure/c14-capability-matrix.json'
FIELDS = ('requires', 'from', 'to', 'entity', 'emitted_by', 'scope')

def read(name):
    return json.loads((HERE / name).read_text())

def require(condition, detail):
    if not condition:
        raise ValueError(detail)

def validate(payload, manifest, policy, policy_bytes, source_policy_bytes, ownership):
    require(payload['package_id'] == PID and payload['version'] == VERSION, 'package identity drift')
    require(payload['state'] == manifest['state'] == 'PROPOSED', 'proposal state drift')
    require(payload['baseline'] == manifest['baseline_commit'] == BASELINE, 'baseline drift')
    require(manifest['actual_promotions'] == [], 'actual promotion prohibited')
    require(manifest['owner_approval'] is None, 'approval must not be fabricated')
    require(manifest['runtime_grants_created'] is False, 'runtime grant prohibited')
    require(manifest['activation_authorized'] is False, 'activation prohibited')
    require(manifest['runtime_dependency_closure_proven'] is False, 'runtime closure claim prohibited')
    require(policy_bytes == source_policy_bytes, 'C14 source policy bytes drift')
    require(policy == json.loads(source_policy_bytes), 'C14 parsed policy drift')
    operations = policy['operations']
    require(len(operations) == 34, 'source operation count')
    require(sum(o['kind'] == 'command' for o in operations) == 23, 'source command count')
    require(sum(o['kind'] == 'query' for o in operations) == 11, 'source query count')
    expected = {o['capability']: (i, o) for i, o in enumerate(operations)}
    require(len(expected) == 34, 'duplicate source name')
    es = payload['entries']
    require(len(es) == 36 and len({e['id'] for e in es}) == 36, 'entry count or duplicate')
    by_id = {e['id']: e for e in es}
    require(set(by_id) == set(expected) | {'Capability', 'CapabilityId'}, 'unexpected or missing name')
    schema = read('entry-overlay.schema.proposed.json')
    require(schema['properties']['entries']['const'] == es, 'exact proposed schema entries drift')
    fields = ('definition', 'identifier', 'relationships', 'owning_domain', 'lifecycle',
              'authority_implications', 'requires', 'registration_authority', 'authority_contracts')
    for e in es:
        require(all(f in e for f in fields), 'missing SEM-4/proposal field: ' + e['id'])
        require(e['status'] == 'candidate', 'candidate activation: ' + e['id'])
        require(isinstance(e['definition'], str) and bool(e['definition']), 'definition must be nonempty string')
        require(isinstance(e['authority_implications'], list) and bool(e['authority_implications']) and all(isinstance(x, str) and bool(x) for x in e['authority_implications']), 'authority implications must be nonempty strings')
        require(isinstance(e['requires'], list) and all(isinstance(x, str) for x in e['requires']), 'dependency type drift')
        require(e['owning_domain'] == 'Authorization', 'wrong semantic owner')
        require(e['registration_authority'] == 'C01', 'wrong registration owner')
        require(e['authority_contracts'] == ['C01', 'C14'], 'authority contract drift')
        require(e['relationships'] == [] and e['lifecycle'] is None, 'new relationship/lifecycle')
        require(not any(k in e for k in ('grants', 'roles', 'bundles', 'scope', 'actors', 'entitlement')), 'C14 policy copied into kernel naming overlay')
    concept, ident = by_id['Capability'], by_id['CapabilityId']
    require(concept['kind'] == 'value_object', 'Capability must not become mutable entity')
    require(concept['definition'] == 'A typed, dot-delimited action constant.', 'C14 definition drift')
    require(concept['identifier'] == 'CapabilityId' and concept['requires'] == ['CapabilityId'], 'Capability identity closure')
    require(ident['kind'] == 'identifier' and ident['represents'] == 'Capability', 'CapabilityId representation closure')
    require(ident['identifier'] is None and bool(ident['identifier_note']), 'identifier-type identity explanation')
    require(ident['value_type'] == 'string' and ident['requires'] == ['Capability'], 'CapabilityId type drift')
    require(ident['validation'] == {'pattern': policy['capability_identifier_grammar'], 'allowed_values_source': 'kernel/capabilities.json'}, 'name validation drift')
    for name, (i, op) in expected.items():
        e = by_id[name]
        require(e['definition'] == f'The canonical Capability action constant for the C14 operation {op["id"]}.', 'operation definition drift')
        require(e['authority_implications'] == ['Naming only: no actor, bundle, membership, principal or runtime grant is created.', 'The referenced C14 operation row and registered specification govern every authorization meaning and dependency.', 'Conditional and blocked operations remain conditional or blocked.', 'This candidate cannot authorize active-contract or merged-implementation use.'], 'capability authority implications drift')
        require(e['kind'] == 'capability' and e['identifier'] == 'CapabilityId', 'capability kind/identifier')
        require(re.fullmatch(policy['capability_identifier_grammar'], name) is not None, 'namespace drift')
        require(e['requires'] == ['Capability', 'CapabilityId'], 'capability type dependency drift')
        require(e['authorization_policy_ref'] == {'path': MATRIX, 'json_pointer': f'/operations/{i}', 'operation_id': op['id'], 'operation_kind': op['kind']}, 'operation policy reference drift')
    expected_set = [{'kind': e['kind'], 'id': e['id']} for e in es]
    require(manifest['proposed_future_promotion_set'] == expected_set, 'promotion set drift')
    require(ownership['existing_approved_owner_changes'] == [], 'existing owner change')
    require(ownership['existing_assignment_preserved'] == {'kind': 'identifier', 'id': 'CapabilityId', 'owner': 'Authorization'}, 'existing assignment drift')
    adds = ownership['proposed_additions']
    require(len(adds) == 35 and {e['id'] for e in adds} == set(by_id) - {'CapabilityId'}, 'ownership set drift')
    for e in adds:
        require(e['decision_state'] == 'proposed' and e['proposed_owner'] == 'Authorization', 'ownership approval fabricated')
        require(e['kind'] == by_id[e['id']]['kind'] and e['authority_contracts'] == ['C01', 'C14'], 'ownership definition drift')
    return True

def normative_closure(entries):
    """Synthetic name/type graph only. This package has NO approved hold exceptions.
    Not a replacement for the live all-family SEM-36/owner-approval verifier.
    """
    by_id = {e['id']: e for e in entries}
    require(len(by_id) == len(entries), 'ambiguous IDs')
    def walk(e, visited):
        if e['id'] in visited:
            return
        visited.add(e['id'])
        for field in FIELDS:
            value = e.get(field, [])
            for dep in (value if isinstance(value, list) else [value]):
                require(isinstance(dep, str) and dep in by_id, 'unresolved dependency: ' + str(dep))
                target = by_id[dep]
                if target['status'] != 'approved':
                    raise ValueError('candidate dependency (no holds authorized in this package): ' + dep)
                walk(target, visited)
    for e in entries:
        if e['status'] == 'approved':
            walk(e, set())
    return True

def candidate_only_status_gate(before, after):
    """Reject ANY promotion, additions, deletions or status changes in this proposal.
    This helper does not authenticate an owner or accept any approval token.
    """
    old = {(e['kind'], e['id']): e['status'] for e in before}
    new = {(e['kind'], e['id']): e['status'] for e in after}
    require(old == new and all(s == 'candidate' for s in new.values()),
            'this candidate-only artifact cannot authorize any status change')
    return True

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-root', required=True, type=Path)
    args = parser.parse_args()
    payload, manifest, policy, ownership = read('entries.proposed.json'), read('manifest.json'), read('c14-policy.snapshot.json'), read('ownership-additions.proposed.json')
    raw = (HERE / 'c14-policy.snapshot.json').read_bytes()
    source_raw = (args.source_root / MATRIX).read_bytes()
    checks = []
    def pass_check(name, action):
        action(); checks.append({'test': name, 'result': 'PASS'})
    def reject_check(name, action):
        try:
            action()
        except (ValueError, KeyError):
            checks.append({'test': name, 'result': 'PASS', 'expected': 'rejection'})
        else:
            raise AssertionError('negative fixture accepted: ' + name)
    def check(p=payload, m=manifest, po=policy, b=raw, own=ownership):
        return validate(p, m, po, b, source_raw, own)
    pass_check('exact_candidate_package_and_C14_policy', check)
    def source_hashes():
        for record in manifest['sources']:
            require(hashlib.sha256((args.source_root / record['path']).read_bytes()).hexdigest() == record['sha256'], 'source changed: ' + record['path'])
    pass_check('all_source_sha256_hashes', source_hashes)
    pass_check('candidate_package_makes_no_promotion', lambda: candidate_only_status_gate(payload['entries'], payload['entries']))
    overlay = copy.deepcopy(payload['entries'])
    for e in overlay: e['status'] = 'approved'
    pass_check('hypothetical_name_type_graph_closes_only', lambda: normative_closure(overlay))
    reject_check('hypothetical_promotion_without_owner_approval', lambda: candidate_only_status_gate(payload['entries'], overlay))
    p=copy.deepcopy(payload); p['entries'][0]['status']='approved'
    reject_check('status_activation_rejected', lambda: check(p=p))
    p=copy.deepcopy(payload); p['entries'][1]['represents']='NonexistentCapability'
    reject_check('represents_model_drift_rejected_separately', lambda: check(p=p))
    p=copy.deepcopy(payload); p['entries'][0]['kind']='entity'
    reject_check('mutable_Capability_entity_rejected', lambda: check(p=p))
    p=copy.deepcopy(payload); p['entries'][2]['id']='legacy.platform.operator'
    reject_check('new_or_legacy_name_rejected', lambda: check(p=p))
    p=copy.deepcopy(payload); p['entries'][2]['id']='INVALID.CAPABILITY.NAME'
    reject_check('namespace_drift_rejected', lambda: check(p=p))
    p=copy.deepcopy(payload); p['entries'].append(copy.deepcopy(p['entries'][2]))
    reject_check('duplicate_35th_capability_rejected', lambda: check(p=p))
    p=copy.deepcopy(payload); p['entries'].pop()
    reject_check('missing_capability_rejected', lambda: check(p=p))
    p=copy.deepcopy(payload); p['entries'][2]['owning_domain']='Identity'
    reject_check('operation_owner_cannot_replace_name_owner', lambda: check(p=p))
    p=copy.deepcopy(payload); p['entries'][2]['scope']='PLATFORM'
    reject_check('kernel_scope_grant_invention_rejected', lambda: check(p=p))
    for field in ('runtime_grants_created','activation_authorized','runtime_dependency_closure_proven'):
        m=copy.deepcopy(manifest); m[field]=True
        reject_check(field+'_rejected', lambda m=m: check(m=m))
    m=copy.deepcopy(manifest); m['owner_approval']={'state':'approved'}
    reject_check('fabricated_owner_approval_rejected', lambda: check(m=m))
    for field, value in [('scope','PLATFORM'),('bundles',['org_admin']),('capability','identity.credential.other')]:
        po=copy.deepcopy(policy); po['operations'][0][field]=value
        reject_check('C14_operation_'+field+'_drift_rejected', lambda po=po: check(po=po,b=json.dumps(po).encode()))
    po=copy.deepcopy(policy); po['bundles']['manager']['capabilities'].append('content.pack.publish')
    reject_check('C14_bundle_grant_drift_rejected', lambda: check(po=po,b=json.dumps(po).encode()))
    p=copy.deepcopy(payload); p['entries'][2]['definition']=['Not a string']
    reject_check('nonstring_definition_rejected', lambda: check(p=p))
    p=copy.deepcopy(payload); p['entries'][2]['authority_implications']=['Registration grants all actors access.']
    reject_check('invented_authority_implication_rejected', lambda: check(p=p))
    p=copy.deepcopy(payload); p['entries'][2]['authority_implications']=[42]
    reject_check('nonstring_authority_implication_rejected', lambda: check(p=p))
    extra=copy.deepcopy(overlay); extra.append({'id':'Unrelated','kind':'entity','status':'approved'})
    reject_check('unrelated_extra_promotion_rejected', lambda: candidate_only_status_gate(payload['entries'], extra))
    partial_status=copy.deepcopy(payload['entries']); partial_status[0]['status']='approved'
    reject_check('partial_promotion_rejected', lambda: candidate_only_status_gate(payload['entries'], partial_status))
    m=copy.deepcopy(manifest); m['proposed_future_promotion_set'].append({'kind':'entity','id':'Unrelated'})
    reject_check('promotion_manifest_extra_ID_rejected', lambda: check(m=m))
    m=copy.deepcopy(manifest); m['proposed_future_promotion_set'].pop()
    reject_check('promotion_manifest_missing_ID_rejected', lambda: check(m=m))
    for field in FIELDS:
        for form in ('scalar','array') if field in ('to','scope') else ('array',) if field == 'requires' else ('scalar',):
            f=[{'id':'Approved','kind':'capability','status':'approved',field:['Candidate'] if form=='array' else 'Candidate'}, {'id':'Candidate','kind':'value_object','status':'candidate'}]
            reject_check('SEM36_'+field+'_'+form+'_candidate_rejected', lambda f=f: normative_closure(f))
    chain=[{'id':'A','status':'approved','requires':['B']},{'id':'B','status':'approved','requires':['C']},{'id':'C','status':'candidate'}]
    reject_check('transitive_candidate_rejected', lambda: normative_closure(chain))
    missing=[{'id':'A','status':'approved','requires':['Missing']}]
    reject_check('unresolved_dependency_rejected', lambda: normative_closure(missing))
    hold=[{'id':'A','status':'approved','requires':['Held']},{'id':'Held','status':'candidate','promotion_hold':{'fixture_only':True}}]
    reject_check('unlisted_hold_rejected', lambda: normative_closure(hold))
    no_record=[{'id':'A','status':'approved','requires':['Held']},{'id':'Held','status':'candidate'}]
    reject_check('listed_hold_without_record_rejected', lambda: normative_closure(no_record))
    # Candidate dependency remains rejected when one of the 36-entry overlay is omitted.
    partial=copy.deepcopy(overlay); partial[1]['status']='candidate'
    reject_check('partial_35_entry_promotion_not_closed', lambda: normative_closure(partial))
    print(json.dumps({'package_id':PID,'version':VERSION,'baseline':BASELINE,'result':'PASS','checks':len(checks),'scope':'Static proposal and synthetic negative fixtures only; no runtime or live-kernel tests.','actual_promotions':0,'source_writes':0,'runtime_grants_created':False,'runtime_dependency_closure_proven':False,'results':checks},indent=2))

if __name__ == '__main__':
    main()
