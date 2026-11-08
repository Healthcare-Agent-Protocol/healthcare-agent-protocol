---
title: "Business capabilities"
description: "Nine proposed business functions for healthcare revenue cycle workflows."
---

These nine functions organize the initial RCM business scope.
The capability identifiers below are provisional design labels, not registered namespaces.
The first operation has a separate draft contract and schemas.

| Proposed identifier | Business function | Example operations |
| --- | --- | --- |
| `rcm.coverage` | Coverage and benefits | Verify eligibility; get service benefits, accumulators, exclusions, and coordination of benefits |
| `rcm.providers` | Provider participation and enrollment | Check participation by plan and location; track enrollment; get contracting requirements |
| `rcm.authorizations` | Authorizations and referrals | Check requirements; submit requests; get decisions, approved units, dates, and missing information |
| `rcm.claims` | Claims and adjudication | Submit claims; get claim and line status; explain adjudication; request correction or reprocessing |
| `rcm.payments` | Payments and reconciliation | Get remittance details; trace payments; explain adjustments; reconcile payment allocations |
| `rcm.reviews` | Denials, appeals, and disputes | Get review options and deadlines; submit evidence; track decisions and escalations |
| `rcm.documents` | Documents and evidence | Request, send, and get documents; associate evidence with a case; confirm receipt |
| `rcm.policies` | Payer policies and requirements | Get applicable filing, coding, submission, documentation, and medical necessity requirements |
| `rcm.cases` | Case coordination and follow-up | Track ownership, next steps, commitments, deadlines, references, and escalations |

Documents, policies, and cases support the other business functions.
Implementations can support a subset of operations within a function.
Discovery must show that subset and its applicable limits.

## First operation

[`rcm.claims.status.get`](../spec/claims/claim-status.md) reads one authorized claim under the HAP-1 scope `claim.status.read`.
Its business version is `1.0-draft.2`, separate from the identity protocol version.

The caller selects status and supporting groups: amounts, payments, denials, pending requirements, service lines, submission, reviews, remittance, coordination, adjudication context, reprocessing, and follow-up.
The response separates lookup outcome, authorization, claim business state, missing facts, source evidence, and observation time.
It preserves line-level outcomes and distinguishes payment issuance, settlement, bulk totals, and this claim's allocation.

The [operation reference](../spec/claims/claim-status.md) defines matching, JSON schemas, example requests and responses, and its A2A 1.0 mapping.
A confirmed lookup miss can return payer-level submission guidance without inventing claim facts.
Reading instructions or an existing case does not submit a claim, start reprocessing, file an appeal, or request an EOB.

## Extensions

Specialties and payer workflows can require additional fields or operations.
Extensions need explicit identifiers, versions, schemas, and compatibility rules.
An extension must preserve the core identity, authority, and data boundaries.
