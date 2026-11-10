const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

const root = join(__dirname, '..');
const version = '1.0-draft.1';
const schemaDir = join(root, 'schemas/claims', version);
const exampleDir = join(root, 'examples/claims', version);
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
for (const name of ['claim-status', 'request', 'response']) {
  ajv.addSchema(readJson(join(schemaDir, `${name}.schema.json`)));
}
const requestValidator = ajv.getSchema(readJson(join(schemaDir, 'request.schema.json')).$id);
const responseValidator = ajv.getSchema(readJson(join(schemaDir, 'response.schema.json')).$id);

function fixture(name) {
  return {
    request: readJson(join(exampleDir, `${name}.request.json`)),
    response: readJson(join(exampleDir, `${name}.response.json`)),
  };
}

function cents(money) {
  const negative = money.amount.startsWith('-');
  const [whole, fraction] = money.amount.replace('-', '').split('.');
  const amount = BigInt(whole) * 100n + BigInt(fraction);
  return negative ? -amount : amount;
}

function pointerValue(value, pointer) {
  if (pointer === '') return value;
  return pointer.slice(1).split('/').reduce((node, part) => {
    const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
    return node != null && Object.hasOwn(node, key) ? node[key] : undefined;
  }, value);
}

// These checks cover cross-field rules that JSON Schema cannot express.
// They check the fixtures, not a deployed payer's identity or authorization.
function semanticErrors(request, response) {
  const errors = [];
  for (const key of ['operation', 'operation_version', 'request_id', 'payer_id']) {
    if (request[key] !== response[key]) errors.push(`mismatched ${key}`);
  }
  const checkPeriod = (period) => {
    if (period && period.end < period.start) errors.push('reversed service period');
  };
  checkPeriod(request.claim.service_period);
  const evidence = new Map();
  for (const item of response.evidence || []) {
    if (evidence.has(item.evidence_id)) errors.push('duplicate evidence identifier');
    evidence.set(item.evidence_id, item);
    if (item.authority === 'payer_confirmed' &&
        (!item.source_type.startsWith('payer_') || item.source_organization_id !== response.payer_id)) {
      errors.push('unsupported payer authority');
    }
    const age = Date.parse(response.observed_at) - Date.parse(item.observed_at);
    if (age < 0) errors.push('future evidence');
    if (request.max_source_age_seconds > 0 && age > request.max_source_age_seconds * 1000) {
      errors.push('stale evidence');
    }
  }
  const checkEvidence = (ids) => {
    for (const id of ids || []) if (!evidence.has(id)) errors.push('unknown evidence reference');
  };
  const walkEvidence = (id, ancestors = new Set()) => {
    if (ancestors.has(id)) return errors.push('cyclic evidence');
    const item = evidence.get(id);
    if (!item) return;
    const next = new Set([...ancestors, id]);
    checkEvidence(item.derived_from);
    for (const source of item.derived_from || []) walkEvidence(source, next);
  };
  for (const id of evidence.keys()) walkEvidence(id);
  if (response.outcome === 'not_found' && ![...evidence.values()].some(item => item.authority === 'payer_confirmed')) {
    errors.push('unconfirmed lookup miss');
  }
  for (const section of Object.values(response.payer_guidance || {})) checkEvidence(section.evidence_ids);
  if (response.payer_guidance && !request.requested_sections.includes('submission')) errors.push('unsolicited payer guidance');
  if (response.outcome !== 'matched') return errors;
  const claim = response.claim;
  checkPeriod(claim.service_period);
  if (claim.billing_provider_npi !== request.billing_provider_npi) errors.push('wrong billing provider');
  checkEvidence(claim.evidence_ids);
  const context = response.sections.adjudication_context?.data;
  if (context) {
    checkPeriod(context.as_of_service_period);
    if (!claim.service_period || !isDeepStrictEqual(context.as_of_service_period, claim.service_period)) {
      errors.push('context is not bound to the claim service period');
    }
    for (const provider of context.provider_network || []) {
      if (provider.provider_role === 'billing' && provider.provider_npi && provider.provider_npi !== claim.billing_provider_npi) {
        errors.push('wrong billing provider in adjudication context');
      }
    }
  }
  for (const review of response.sections.reviews?.data || []) checkEvidence(review.evidence_ids);
  const requiredMatches = ['payer_claim_number', 'member_id', 'patient', 'service_period', 'billed_amount', 'patient_account_number']
    .filter(field => request.claim[field] !== undefined);
  for (const field of requiredMatches) {
    if (!claim.matched_on.includes(field)) errors.push(`unverified match constraint ${field}`);
  }
  if (claim.matched_on.some(field => !requiredMatches.includes(field))) errors.push('unrequested match constraint');
  for (const field of ['payer_claim_number', 'service_period', 'billed_amount']) {
    if (request.claim[field] !== undefined &&
        !isDeepStrictEqual(request.claim[field], claim[field])) {
      errors.push(`mismatched claim constraint ${field}`);
    }
  }
  if (request.requested_sections.some(name => !Object.hasOwn(response.sections, name))) errors.push('missing requested section');
  if (Object.keys(response.sections).some(name => !request.requested_sections.includes(name))) errors.push('unsolicited section');
  for (const section of Object.values(response.sections)) {
    checkEvidence(section.evidence_ids);
    for (const fact of section.field_evidence || []) {
      checkEvidence(fact.evidence_ids);
      if (pointerValue(section.data, fact.path) === undefined) errors.push('invalid field evidence path');
    }
  }
  const status = response.sections.status.data;
  const paid = response.sections.amounts?.data?.paid;
  if (status && ['paid', 'partially_paid'].includes(status.disposition) && paid && cents(paid) <= 0n) errors.push('paid status without positive payment');
  if (status?.phase === 'rejected' && status.disposition === 'denied') errors.push('rejection confused with denial');
  for (const payment of response.sections.payments?.data || []) {
    if (payment.payment_scope === 'single_claim' && payment.claim_paid_amount && payment.payment_total_amount &&
        (payment.claim_paid_amount.currency !== payment.payment_total_amount.currency ||
         cents(payment.claim_paid_amount) !== cents(payment.payment_total_amount))) errors.push('single-claim payment amount mismatch');
  }
  const linesSection = response.sections.service_lines;
  if (linesSection?.data) {
    const { items, page } = linesSection.data;
    if (page.returned_count !== items.length) errors.push('wrong returned line count');
    if (new Set(items.map(line => line.line_id)).size !== items.length) errors.push('duplicate line identifier');
    if (page.complete && page.total_count !== undefined && page.total_count !== items.length) errors.push('incomplete line coverage');
    if (!page.complete && linesSection.availability !== 'partial') errors.push('truncated lines reported as complete');
    for (const line of items) {
      checkEvidence(line.evidence_ids);
      checkPeriod(line.service_period);
    }
  }
  return errors;
}

function validPair(request, response) {
  assert.equal(requestValidator(request), true, JSON.stringify(requestValidator.errors));
  assert.equal(responseValidator(response), true, JSON.stringify(responseValidator.errors));
  assert.deepEqual(semanticErrors(request, response), []);
}

for (const name of readdirSync(exampleDir).filter(name => name.endsWith('.request.json')).map(name => name.replace('.request.json', ''))) {
  test(`invented ${name} request and response satisfy the contract`, () => {
    const { request, response } = fixture(name);
    validPair(request, response);
  });
}

test('A2A 1.0 examples carry the same validated business objects', () => {
  const rpc = readJson(join(exampleDir, 'a2a.send-message.json'));
  const result = readJson(join(exampleDir, 'a2a.completed-task.json'));
  assert.equal(rpc.method, 'SendMessage');
  assert.equal(rpc.params.message.role, 'ROLE_USER');
  assert.equal(result.result.task.status.state, 'TASK_STATE_COMPLETED');
  assert.equal(rpc.id, result.id);
  validPair(rpc.params.message.parts[0].data, result.result.task.artifacts[0].parts[0].data);
});

for (const [name, mutate] of [
  ['numeric money', pair => { pair.response.sections.amounts.data.paid.amount = 80; }],
  ['unknown version', pair => { pair.request.operation_version = '2.0'; }],
  ['implicit requested status', pair => { pair.request.requested_sections = ['payments']; }],
  ['empty member search', pair => { pair.request.claim = { lookup_method: 'member_service' }; }],
  ['authorization denial disguised as a result', pair => { pair.response.authorization = 'denied'; }],
  ['unavailable section with invented data', pair => { pair.response.sections.payments.availability = 'not_available'; }],
  ['partial result without gaps', pair => { pair.response.sections.payments.availability = 'partial'; }],
  ['issue date presented as cleared date', pair => { pair.response.sections.payments.data[0].cleared_date = '2026-10-12'; }],
  ['invalid date', pair => { pair.request.claim.service_period.start = '2026-02-30'; }],
]) {
  test(`rejects ${name}`, () => {
    const pair = fixture('paid_bulk_payment');
    mutate(pair);
    assert.equal(Boolean(requestValidator(pair.request) && responseValidator(pair.response)), false);
  });
}

for (const [name, mutate] of [
  ['wrong provider', pair => { pair.response.claim.billing_provider_npi = '1111111111'; }],
  ['wrong payer', pair => { pair.response.payer_id = 'payer-other'; }],
  ['mismatched claim', pair => { pair.response.claim.payer_claim_number = 'EXAMPLE-OTHER'; }],
  ['reversed service period', pair => { pair.request.claim.service_period.start = '2026-10-02'; }],
  ['unverified billed constraint', pair => { pair.response.claim.matched_on = ['payer_claim_number', 'service_period']; }],
  ['missing requested section', pair => { delete pair.response.sections.payments; }],
  ['unknown evidence', pair => { pair.response.sections.payments.evidence_ids = ['example-missing']; }],
  ['duplicate evidence', pair => { pair.response.evidence.push(structuredClone(pair.response.evidence[0])); }],
  ['client data labeled payer confirmed', pair => { pair.response.evidence[0].source_type = 'client_record'; }],
  ['zero-dollar payment labeled paid', pair => { pair.response.sections.amounts.data.paid.amount = '0.00'; }],
  ['bulk amount labeled single-claim payment', pair => { pair.response.sections.payments.data[0].payment_scope = 'single_claim'; }],
  ['stale evidence', pair => { pair.request.max_source_age_seconds = 60; pair.response.evidence[0].observed_at = '2026-11-08T17:00:00Z'; }],
  ['evidence path with no fact', pair => { pair.response.sections.payments.field_evidence = [{ path: '/0/cleared_date', evidence_ids: ['example-observation-1'] }]; }],
]) {
  test(`detects ${name}`, () => {
    const pair = fixture('paid_bulk_payment');
    mutate(pair);
    assert.equal(requestValidator(pair.request), true);
    assert.equal(responseValidator(pair.response), true);
    assert.notDeepEqual(semanticErrors(pair.request, pair.response), []);
  });
}

test('not-found and ambiguous results cannot disclose candidate claim data', () => {
  for (const name of ['not_found', 'ambiguous']) {
    const pair = fixture(name);
    pair.response.claim = fixture('paid_bulk_payment').response.claim;
    assert.equal(responseValidator(pair.response), false);
  }
});

test('an upstream failure cannot be converted into a confirmed lookup miss', () => {
  const pair = fixture('not_found');
  pair.response.evidence[0].authority = 'reported';
  pair.response.evidence[0].source_type = 'client_record';
  assert.notDeepEqual(semanticErrors(pair.request, pair.response), []);
});

test('repeated procedure codes remain distinct lines', () => {
  const pair = fixture('mixed_service_lines');
  validPair(pair.request, pair.response);
  const lines = pair.response.sections.service_lines.data.items;
  assert.equal(lines[0].procedure.code, lines[1].procedure.code);
  pair.response.sections.service_lines.data.items[1].line_id = lines[0].line_id;
  assert.notDeepEqual(semanticErrors(pair.request, pair.response), []);
});

test('truncated lines require a partial section', () => {
  const pair = fixture('mixed_service_lines');
  pair.response.sections.service_lines.data.page.complete = false;
  assert.notDeepEqual(semanticErrors(pair.request, pair.response), []);
  pair.response.sections.service_lines.availability = 'partial';
  pair.response.sections.service_lines.gaps = [{ path: '/items', reason: 'truncated' }];
  validPair(pair.request, pair.response);
});

test('derived evidence cannot cite itself', () => {
  const pair = fixture('paid_bulk_payment');
  pair.response.evidence[0] = {
    ...pair.response.evidence[0], source_type: 'derived', authority: 'derived', derived_from: ['example-observation-1'],
  };
  assert.equal(responseValidator(pair.response), true);
  assert.notDeepEqual(semanticErrors(pair.request, pair.response), []);
});

test('a confirmed miss can return payer-level submission guidance without claim details', () => {
  const pair = fixture('not_found_submission_guidance');
  validPair(pair.request, pair.response);
  pair.response.payer_guidance.submission.data.timely_filing_deadline = '2027-01-01';
  assert.equal(responseValidator(pair.response), false);
});

test('object key order does not change claim identity', () => {
  const pair = fixture('paid_bulk_payment');
  pair.response.claim.service_period = { end: '2026-10-01', start: '2026-10-01' };
  validPair(pair.request, pair.response);
});

test('Agent Card selects the pinned business schemas and standard OAuth access', () => {
  const card = readJson(join(exampleDir, 'a2a.agent-card.json'));
  const declaration = card.capabilities.extensions[0];
  const request = readJson(join(exampleDir, 'a2a.send-message.json'));
  assert.equal(card.version, version);
  assert.equal(declaration.uri, request.params.message.extensions[0]);
  assert.equal(declaration.params.operation_version, version);
  assert.equal(declaration.params.request_schema, readJson(join(schemaDir, 'request.schema.json')).$id);
  assert.equal(declaration.params.response_schema, readJson(join(schemaDir, 'response.schema.json')).$id);
  assert.deepEqual(declaration.params.supported_sections,
    readJson(join(schemaDir, 'claim-status.schema.json')).$defs.Request.properties.requested_sections.items.enum);
  assert.equal(declaration.params.hap_version, version);
  assert.equal(Object.hasOwn(declaration.params, 'issuer_policy_url'), false);
  assert.equal(declaration.params.resource, card.supportedInterfaces[0].url);
  const requiredScopes = card.securityRequirements[0].schemes.payer_oauth.list;
  const oauthFlow = card.securitySchemes.payer_oauth.oauth2SecurityScheme.flows.clientCredentials;
  assert.deepEqual(requiredScopes, ['claim.status.read']);
  for (const scope of requiredScopes) assert.equal(Object.hasOwn(oauthFlow.scopes, scope), true);
  assert.equal(new URL(oauthFlow.tokenUrl).protocol, 'https:');
  assert.equal(card.supportedInterfaces[0].protocolVersion, '1.0');
});

test('A2A input-required message contains a valid business clarification', () => {
  const task = readJson(join(exampleDir, 'a2a.input-required.json')).result.task;
  const message = task.status.message;
  assert.equal(task.status.state, 'TASK_STATE_INPUT_REQUIRED');
  assert.equal(message.role, 'ROLE_AGENT');
  assert.equal(message.taskId, task.id);
  assert.equal(message.contextId, task.contextId);
  assert.equal(responseValidator(message.parts[0].data), true);
  assert.equal(message.parts[0].data.outcome, 'ambiguous');
});

test('the operation page shows the validated pending request and response', () => {
  const page = readFileSync(join(root, 'spec/claims/claim-status.md'), 'utf8');
  const examples = [...page.matchAll(/^```json\n([\s\S]*?)^```/gm)].map(match => JSON.parse(match[1]));
  assert.equal(examples.length, 2);
  validPair(examples[0], examples[1]);
  assert.deepEqual(examples[0], fixture('pending_information').request);
  assert.deepEqual(examples[1], fixture('pending_information').response);
});

test('adjudication context cannot represent a fresh eligibility inquiry', () => {
  const pair = fixture('claim_adjudication_context');
  pair.response.sections.adjudication_context.data.basis = 'current_eligibility';
  assert.equal(responseValidator(pair.response), false);
});

test('adjudication context must identify the same service period and billing provider', () => {
  for (const mutate of [
    data => { data.as_of_service_period.start = '2026-11-01'; data.as_of_service_period.end = '2026-11-01'; },
    data => { data.provider_network[0].provider_npi = '1111111111'; },
  ]) {
    const pair = fixture('claim_adjudication_context');
    mutate(pair.response.sections.adjudication_context.data);
    assert.equal(responseValidator(pair.response), true);
    assert.notDeepEqual(semanticErrors(pair.request, pair.response), []);
  }
});

test('existing review status does not replace the claim adjudication status', () => {
  const pair = fixture('existing_review');
  validPair(pair.request, pair.response);
  assert.equal(pair.response.sections.reviews.data[0].status, 'in_review');
  assert.equal(pair.response.sections.status.data.disposition, 'denied');
});

test('existing reviews require their own evidence', () => {
  const pair = fixture('existing_review');
  pair.response.sections.reviews.data[0].evidence_ids = ['example-missing'];
  assert.notDeepEqual(semanticErrors(pair.request, pair.response), []);
});

test('an in-progress review cannot report a terminal decision or decision date', () => {
  for (const fields of [{ decision: 'overturned' }, { decision_date: '2026-11-20' }]) {
    const pair = fixture('existing_review');
    Object.assign(pair.response.sections.reviews.data[0], fields);
    assert.equal(responseValidator(pair.response), false);
  }
});

test('a delegated administrator does not imply the claim was forwarded', () => {
  const pair = fixture('delegated_administrator');
  validPair(pair.request, pair.response);
  assert.equal(Object.hasOwn(pair.response.sections.coordination_of_benefits.data, 'forwarded'), false);
});

test('a lookup miss cannot return original or corrected claim references', () => {
  const pair = fixture('not_found_submission_guidance');
  pair.response.payer_guidance.submission.data.original_payer_claim_number = 'EXAMPLE-ORIGINAL-CLAIM-001';
  assert.equal(responseValidator(pair.response), false);
});
