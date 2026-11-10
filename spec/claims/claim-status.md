---
title: "Claim status"
description: "Claim matching, adjudication, payment tracing, denial details, pending requirements, and follow-up through A2A."
---

`rcm.claims.status.get` returns claim status and the supporting details needed for routine claim follow-up.
The caller selects the question groups it needs. The payer returns structured answers, explicit gaps, and source evidence.

This contract defines a proposed business operation and an A2A 1.0 mapping.
The [HAP-1 identity and access profile](https://superdial-2e67a944.mintlify.app/spec/identity/hap-1) requires authenticated identity, verified provider delegation, and payer-enforced record limits.
These checks use the authenticated client identity and trusted server-side authorization records.
The A2A example on this page uses ordinary OAuth API authentication under the [API access rules](https://superdial-2e67a944.mintlify.app/spec/identity/hap-1#api-requests).

## V1 draft 1

| Setting | Value |
| --- | --- |
| Operation | `rcm.claims.status.get` |
| Business version | `1.0-draft.1`, matched exactly |
| Required scope | `claim.status.read` |
| Initial record boundary | The requested claim belongs to the authorized billing-provider NPI |
| Lookup unit | One claim submission; its service lines can have different outcomes |
| A2A binding | Version `1.0`, JSON-RPC `SendMessage`, with JSON data parts |
| Core identity version | HAP-1 `1.0-draft.1` |
| Example API authentication | OAuth client credentials with an ordinary bearer access token |
| Schema dialect | JSON Schema Draft 2020-12 |

The versioned [request schema](https://raw.githubusercontent.com/Healthcare-Agent-Protocol/healthcare-agent-protocol/main/schemas/claims/1.0-draft.1/request.schema.json),
[response schema](https://raw.githubusercontent.com/Healthcare-Agent-Protocol/healthcare-agent-protocol/main/schemas/claims/1.0-draft.1/response.schema.json), and
[shared definitions](https://raw.githubusercontent.com/Healthcare-Agent-Protocol/healthcare-agent-protocol/main/schemas/claims/1.0-draft.1/claim-status.schema.json) define the machine-readable structure.
The rules on this page define its business meaning.
These are HAP definitions, not registered A2A operations or X12 transactions.

## Questions the operation answers

Each request includes `status` and any additional sections below.
All answers concern the same authorized claim, including payment allocations and existing reviews linked to it.

| Section | Routine questions | Structured answer |
| --- | --- | --- |
| `status` | Is the claim on file? Was it received, processed, paid, denied, rejected, or left pending? When? | Lookup outcome, processing phase, disposition, payer status text, codes, and distinct event dates |
| `amounts` | What was billed, allowed, adjusted, or paid? What remains as deductible, copay, coinsurance, or other patient responsibility? | Exact amounts with currency and a separate responsibility breakdown |
| `payments` | Was payment issued? By check, EFT, or virtual card? What reference, issue date, payee, address, or clearing information exists? | Payment method, disbursement and settlement states, references, dates, payee, and remit-to address |
| `payments` | Is this a single or bulk payment? How much belongs to this claim? | Separate `payment_scope`, `claim_paid_amount`, and `payment_total_amount` |
| `denials` | Why was the claim denied? What codes, denial date, or bundled service apply? | Reason, category, code system, code, adjustment group, date, and bundled-into procedure |
| `pending_requirements` | What is holding processing? Who must supply what, by when, and through which route? | Outstanding requirements, responsible party, due dates, review dates, and submission routes |
| `service_lines` | Which services were paid, denied, or pending? What are their amounts, units, modifiers, and reasons? | Stable line identifiers, procedure details, per-line status, amounts, denials, and page coverage |
| `submission` | If the claim is missing or needs correction, where should it go? What filing deadline or payer ID applies? | Read-only submission routes, electronic payer ID, timely-filing rules, and corrected-claim instructions |
| `review_options` | Is an appeal, reconsideration, correction, dispute, or reprocessing available? What documents and deadlines apply? | Claim-specific options, instructions, deadlines, required documents, and submission routes |
| `remittance` | Is the EOB or remittance available? Was a requested copy sent? | Document references, availability, and existing delivery state |
| `coordination_of_benefits` | Was the claim forwarded? Is another payer or delegated organization responsible? | Forwarding state, destination, date, coordination status, and instructions |
| `adjudication_context` | Which plan, coverage dates, network determination, authorization, or referral did the payer use for this claim? | Claim-bound plan and coverage context, provider participation, and separate authorization and referral records |
| `reviews` | Was an appeal, reconsideration, or dispute already received? What is its status, reference, level, or decision? | Existing review cases, state, decision, references, dates, and evidence |
| `reprocessing` | Was reprocessing already requested? What is its reference, state, or expected completion date? | Existing reprocessing state, references, dates, and reason |
| `follow_up` | What is the interaction or case reference? Who owns the next step? When should we check again? | References, representative or department, owner, next step, follow-up date, and processing window |

Reading these details does not submit a claim, start reprocessing, file an appeal, or request document delivery.
Those changes need separate operation contracts, permissions, and idempotency rules.
This draft advertises no write operation.

The current business contract, schemas, and examples are pinned to `1.0-draft.1`.
The Agent Card advertises that version for both the business operation and its identity profile.

## Request and matching

The request names the payer, authorized billing provider, target claim, and requested sections.
The payer authenticates the client and verifies current provider delegation, permissions, and record limits before performing a protected lookup.
A supplied NPI, member identifier, or claim number does not establish permission.

Two selectors are supported:

1. `payer_claim_number` requires the payer's claim number. Member, patient, service dates, billed amount, and account number can constrain it further.
2. `member_service` requires member ID, patient date of birth, service period, and the claim's total billed amount.

Patient first and last names and the provider's patient-account number can resolve payer-specific matching requirements.
An account number, call reference, payment trace, and payer claim number remain different identifiers.

The payer checks every supplied constraint before accepting a match.
It compares claim totals with claim totals, rather than substituting a service-line amount.
It preserves opaque identifiers without silently deleting prefixes, suffixes, punctuation, or leading zeros.
Any alternative matching rule needs a separately agreed, versioned payer profile.

An authorized match returns one stable `record_reference` and the constraints verified in `matched_on`.
The record reference is distinct from an A2A task ID.
Multiple submissions remain distinct even when they share dates, amounts, or outcomes.
The service does not merge them or select one based on the most favorable outcome.
Separate claim submissions need separate requests.

| Outcome | Meaning | Result content |
| --- | --- | --- |
| `matched` | One authorized claim submission satisfies all supplied constraints | Claim identity, requested sections, and evidence |
| `not_found` | The payer completed the authorized search and confirmed no matching claim | Negative evidence and optional payer-level submission guidance; no claim details |
| `ambiguous` | More information is needed to select the target safely | Required input paths; no candidate records or section data |
| `input_required` | The request is structurally valid but this payer requires additional matching information | Required input paths; no claim or section data |
| `unavailable` | The lookup could not establish a reliable result | A safe problem code, retry flag, and optional retry delay |

No record, an unresolved search, and an upstream failure are different outcomes.
An empty upstream payload, authentication failure, or timeout never establishes `not_found`.
`not_found` does not establish that the member is absent or that no similar claim exists.

If the caller requested `submission`, a confirmed miss can also return `payer_guidance.submission`.
This contains payer-level routes or filing policy with `applicability: payer_policy`, not an invented claim receipt or deadline.
The response omits claim-specific sections and does not calculate a deadline for an unverified claim.

Missing schema-required fields produce an A2A invalid-parameters error before task execution.
`input_required` handles additional payer requirements after a valid request, not malformed JSON or omitted required fields.

## Request example

All examples use invented identifiers. The example NPI is a placeholder, not an enrolled provider credential.
The following request asks what is pending and what to do next.

```json
{
  "operation": "rcm.claims.status.get",
  "operation_version": "1.0-draft.1",
  "request_id": "example-lookup-001",
  "payer_id": "payer-example",
  "billing_provider_npi": "0000000000",
  "claim": {
    "lookup_method": "payer_claim_number",
    "payer_claim_number": "EXAMPLE-CLAIM-001",
    "service_period": {
      "start": "2026-10-01",
      "end": "2026-10-01"
    },
    "billed_amount": {
      "amount": "150.00",
      "currency": "USD"
    }
  },
  "requested_sections": [
    "status",
    "pending_requirements",
    "follow_up"
  ]
}
```

`max_source_age_seconds` defaults to `0`, which requests a new source read.
A positive value permits a previously observed source snapshot within that age.
This limit concerns source observation time, not the claim's service date or last business event.
The service reports `unavailable` or a section gap when it cannot meet the requested freshness.

## Answer sections and missing facts

A matched response accounts for every requested section, including unsupported or unavailable sections.
It does not send unrequested sections.
The `authorization: granted` field records the decision for this operation; it is not a reusable grant or an authentication credential.

Each section has one availability state:

- `available`: The source supports the returned answer without an unresolved gap in that answer.
- `partial`: Some facts are supported. `gaps` names unresolved fields or incomplete coverage.
- `not_available`: The selected source could not provide an answer.
- `not_applicable`: The source establishes that the section does not apply.
- `not_supported`: The implementation does not support the section.

`available` and `partial` include typed `data` and evidence references.
Other states include a reason and omit `data`.
An empty available array means the source confirmed there are no items; it does not mean the source was silent.
An omitted fact is unknown unless the response explicitly explains its absence.
Unknown amounts do not become zero. Missing dates do not become the observation date.

Gap paths are JSON Pointers relative to that section's `data`.
For example, `/0/cleared_date` names the first payment's clearing date.
Gap reasons distinguish unstated facts, unsupported fields, local restrictions, source failures, conflicts, truncation, and non-applicability.

Each answered section cites `evidence_ids`.
For mixed sources within a section, `field_evidence` associates specific JSON Pointers with their evidence.
Line items also carry their own evidence references.
All referenced evidence identifiers must resolve within the response.

## Status, money, and date rules

Processing phase and adjudication disposition remain separate fields.
For example, an adjudicated claim can be paid, denied, applied to deductible, or have mixed line outcomes.
The operation preserves the payer's original status text and code systems when available.

- `paid` requires evidence of an issued positive payment. Approval to pay remains `approved_to_pay` until issuance is established.
- A zero-dollar payment alone does not establish denial, deductible application, or any other adjudication reason.
- `rejected` means the submission did not enter adjudication. An adjudicated denial remains distinct.
- Offset and recoupment remain distinct from a new payment.
- Received, processed, denied, issued, cleared, status-effective, and observed dates retain their separate meanings.
- A payment's issue date does not answer its clearing date. Issued funds do not establish settlement.
- The source must establish single versus bulk payment. One requested claim does not imply a single-claim payment.
- A bulk payment's total does not become this claim's paid amount or expose allocations for unrelated claims.
- Allowed amount, paid amount, adjustments, and patient responsibility remain distinct. Missing amounts are not calculated from unrelated totals.
- A remit-to address names where payment went. Submission and appeal addresses belong to their corresponding routes.
- Missing authorization and missing referral remain distinct reasons.

Money uses decimal strings and an explicit ISO currency code, such as `{"amount":"80.00","currency":"USD"}`.
Amounts permit signed values for reported reversals. Lookup billed amounts remain nonnegative.
Implementations preserve the source's scope and currency before comparing or aggregating money.
Date-only values use `YYYY-MM-DD`; observation timestamps use UTC with `Z`.
Service-period ends cannot precede starts.

## Lines, documents, and follow-up

Every returned line has a stable `line_id` within its claim submission.
Procedure code alone is not a line identifier: repeated codes, modifiers, units, and service dates can describe different lines.
Claim totals and status describe the whole submission; line results describe individual charges.
Mixed line outcomes remain visible rather than inheriting the first line's status.
Lines from different claim numbers never form one synthetic claim.

`line_page_size` defaults to 50 and permits at most 100 lines per page.
The response states the returned count, whether coverage is complete, and the total count when known.
A continuation cursor stays bound to the client, payer, provider, claim, selector, and source snapshot.
A continuation uses a new `request_id` with the same selector and cursor.
Truncated or paged line results use `partial` with a `truncated` gap.
A missing continuation cursor does not imply complete coverage.

Remittance results return protected document references, not embedded recordings, transcripts, credentials, or public download URLs.
Reading a delivery state does not send a fax, request a duplicate EOB, or change its recipient.
Review deadlines and processing windows report the payer's stated dates, units, and starting event.
The service does not calculate an appeal deadline from an unrelated date.
Interaction, case, payment, and claim references retain separate fields.

`submission.claim_submission_type` distinguishes an original submission, correction, replacement, or void.
`original_payer_claim_number` and `corrected_payer_claim_number` retain explicitly reported relationships without merging their statuses or amounts.
`claim.payer_claim_reference` is distinct from the payer claim number, interaction reference, and payment reference.
The payer verifies access before returning related claim references.
Payer-level guidance after `not_found` never contains those claim-specific references.

## Adjudication context and existing reviews

`adjudication_context` reports facts recorded for the target claim's service period, with `basis: claim_record`.
Its service period must match the returned claim identity.
It can include plan type, product type, membership or coverage facts, provider network determinations, and coverage dates used during adjudication.
The billing-provider identity remains bound to the authorized claim.

Authorization and referral records remain separate entries with their own type, reference, requirement, on-file state, and determination for the claim.
A missing referral does not become a missing authorization.
Unknown requirements and on-file states are omitted or reported as gaps, rather than becoming `false`.
Claim existence alone does not establish member eligibility, network participation, or authorization validity.

This section does not perform a new eligibility, benefit, provider-participation, or prior-authorization lookup.
Those operations need their own contracts and access policy.
If the source cannot supply claim-bound context, the response reports that limitation instead of asserting current coverage.

`reviews` reports existing appeal, reconsideration, or dispute cases linked to the authorized claim.
Each case retains its type, review reference, level, processing state, decision, event dates, and source evidence.
A review can remain in progress while the underlying claim still reports its previous denial.
The service does not replace the claim's disposition with the review's state or assume that an expected date is a decision date.
`review_options` continues to describe available next steps; `reviews` describes work already on file.
Reading either section does not start a review or submit additional documents.

## Response example

The lookup below completed successfully. The claim remains pending while the provider supplies the requested itemized bill.
The payer's due date and follow-up date are business facts, distinct from when the service observed them.

```json
{
  "operation": "rcm.claims.status.get",
  "operation_version": "1.0-draft.1",
  "request_id": "example-lookup-001",
  "response_id": "example-snapshot-001",
  "payer_id": "payer-example",
  "authorization": "granted",
  "outcome": "matched",
  "observed_at": "2026-11-08T18:00:00Z",
  "evidence": [
    {
      "evidence_id": "example-observation-1",
      "source_type": "payer_api",
      "source_organization_id": "payer-example",
      "authority": "payer_confirmed",
      "observed_at": "2026-11-08T18:00:00Z",
      "source_reference": "example-payer-observation-1"
    }
  ],
  "claim": {
    "record_reference": "example-payer-record-1",
    "payer_claim_number": "EXAMPLE-CLAIM-001",
    "billing_provider_npi": "0000000000",
    "service_period": {
      "start": "2026-10-01",
      "end": "2026-10-01"
    },
    "billed_amount": {
      "amount": "150.00",
      "currency": "USD"
    },
    "matched_on": [
      "payer_claim_number",
      "service_period",
      "billed_amount"
    ],
    "evidence_ids": [
      "example-observation-1"
    ]
  },
  "sections": {
    "status": {
      "availability": "available",
      "data": {
        "phase": "pending",
        "disposition": "unknown",
        "received_date": "2026-10-03"
      },
      "evidence_ids": [
        "example-observation-1"
      ]
    },
    "pending_requirements": {
      "availability": "available",
      "data": [
        {
          "requirement_id": "example-requirement-1",
          "description": "The payer requires an itemized bill.",
          "status": "outstanding",
          "required_from": "provider",
          "due_date": "2026-12-01",
          "submission_routes": [
            {
              "channel": "portal",
              "url": "https://payer.example/documents"
            }
          ]
        }
      ],
      "evidence_ids": [
        "example-observation-1"
      ]
    },
    "follow_up": {
      "availability": "available",
      "data": {
        "next_step": "Provide the itemized bill.",
        "follow_up_date": "2026-12-02",
        "turnaround": {
          "value": 10,
          "unit": "business_days",
          "starts_from": "Receipt of the requested itemized bill."
        }
      },
      "evidence_ids": [
        "example-observation-1"
      ]
    }
  }
}
```

Other complete example pairs cover
[paid bulk payments](https://github.com/Healthcare-Agent-Protocol/healthcare-agent-protocol/tree/main/examples/claims/1.0-draft.1),
denials, zero-dollar deductible outcomes, mixed lines, partial payment details, confirmed misses, ambiguous matches, additional inputs, and outages.
The example directory contains fifteen request/response pairs and A2A envelopes.

## A2A discovery and messages

This binding follows the [A2A 1.0 definition](https://github.com/a2aproject/A2A/blob/v1.0.0/specification/a2a.proto).
It uses the existing A2A task and artifact model; it adds no new RPC method or task state.

The proposed extension identifier is:

```text
https://github.com/Healthcare-Agent-Protocol/healthcare-agent-protocol/blob/main/spec/claims/claim-status.md#v1-draft-1
```

An Agent Card advertises the extension through `capabilities.extensions` and the operation through `skills`.
The extension parameters name the operation version, request schema, response schema, supported sections, and initial record rule.
The card also declares the selected transport, security scheme, and required `claim.status.read` scope.
The [example Agent Card](https://raw.githubusercontent.com/Healthcare-Agent-Protocol/healthcare-agent-protocol/main/examples/claims/1.0-draft.1/a2a.agent-card.json) contains those declarations.
The Agent Card selects HAP-1 version `1.0-draft.1` and declares ordinary OAuth API authentication through `securitySchemes` and `securityRequirements`.
The payer resolves provider delegation and record permissions from trusted server-side records.
The business schemas do not prescribe a token format or another credential exchange.
This is an application profile under [A2A extension rules](https://a2a-protocol.org/latest/topics/extensions/), not a claim of A2A registration.

The client activates that exact extension through `A2A-Extensions` and sends `A2A-Version: 1.0`.
The ordinary OAuth access token accompanies the actual A2A HTTP request through its authorization header.
Tokens and protected claim data do not belong in discovery metadata or identifiers.

```http
POST /a2a HTTP/1.1
Host: payer.example
Authorization: Bearer <api-access-token>
A2A-Version: 1.0
A2A-Extensions: https://github.com/Healthcare-Agent-Protocol/healthcare-agent-protocol/blob/main/spec/claims/claim-status.md#v1-draft-1
Content-Type: application/json
```

The request body uses JSON-RPC `SendMessage`.
`params.message` has a unique `messageId`, `role: ROLE_USER`, and one JSON part whose `data` is the business request.
The message's `extensions` names the same HAP extension URI.
`configuration.returnImmediately: false` waits for a terminal or interrupted task state.
An asynchronous implementation can return a working task when the client sets it to `true`.

The response contains `result.task`.
Terminal lookup results appear in `task.artifacts[].parts[].data` under a stable artifact ID.
The artifact declares `mediaType: application/json` and the HAP extension URI.
An interrupted task carries the structured input request in `status.message.parts[].data`.
The server message identifies its task and context and uses `ROLE_AGENT`.
The [input-required task](https://raw.githubusercontent.com/Healthcare-Agent-Protocol/healthcare-agent-protocol/main/examples/claims/1.0-draft.1/a2a.input-required.json) shows an ambiguous match without candidate disclosure.

| Layer or outcome | Representation |
| --- | --- |
| HTTP transport | HTTP status only establishes whether the request reached the endpoint successfully |
| Authorization failure | HTTP 401 or 403 under the access profile; no claim-result artifact |
| Invalid parameters or unsupported contract | A2A/JSON-RPC error, without protected result data |
| Lookup still running | `TASK_STATE_SUBMITTED` or `TASK_STATE_WORKING`; no final business result yet |
| `matched` or confirmed `not_found` | `TASK_STATE_COMPLETED` with a result artifact |
| `ambiguous` or `input_required` | `TASK_STATE_INPUT_REQUIRED` with required input paths |
| Source failure giving `unavailable` | `TASK_STATE_FAILED` with a safe result describing the failure |
| Claim pending, denied, or awaiting payment | The lookup task can still be `TASK_STATE_COMPLETED`; claim business state stays in the result |

The [request envelope](https://raw.githubusercontent.com/Healthcare-Agent-Protocol/healthcare-agent-protocol/main/examples/claims/1.0-draft.1/a2a.send-message.json) and
[completed task](https://raw.githubusercontent.com/Healthcare-Agent-Protocol/healthcare-agent-protocol/main/examples/claims/1.0-draft.1/a2a.completed-task.json) contain complete invented examples.
A client supplies additional inputs through a new `SendMessage` on the same task and context, with a new business `request_id`.
Invalid credentials do not become a business `input_required` request or a claim denial.

## Evidence, retries, and access

Evidence identifies the source organization, source type, authority, observation time, and an optional opaque source reference.
`payer_confirmed`, `reported`, and `derived` remain distinct.
An identity verifier's result does not turn an inferred claim fact into a payer-confirmed fact.
Derived evidence cites its inputs; references cannot be missing or cyclic.
Source-effective time describes the underlying event and does not replace observation time.

The payer performs access checks before disclosing matching candidates or claim details.
Task retrieval, continuations, and follow-up messages repeat current authorization checks.
A valid task ID, call reference, or cached response does not bypass revocation or local payer blocks.
This initial binding does not advertise push delivery of protected artifacts.

Within an advertised retry window, the same client, `request_id`, and business payload identify the same lookup.
The proposed minimum retry window is ten minutes.
Retries can have new JSON-RPC and A2A message IDs while retaining that business `request_id`.
A changed payload under an existing `request_id` is rejected as a conflict.
A fresh observation, page continuation, or revised selector uses a new business `request_id`.
The service authorizes a retry before returning any existing result.

Protected request and response fields stay between the client and payer's authorized business service.
Public cards, logs, metrics labels, task IDs, and error text contain no patient, member, or claim attributes.
All committed examples are invented. Customer scripts and production records are not protocol fixtures.

## Implementation checks

`npm run contracts:check` validates the schemas and invented examples and checks cross-field failure cases.
The checks cover provider and payer mismatches, unresolved evidence, misleading zero-dollar results, payment dates, ambiguous matches, and incomplete lines.
They do not implement payer authentication, delegation verification, claim search, or access enforcement.
Independent client/payer testing and a deployed verifier remain required before production use.
