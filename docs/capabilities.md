---
title: "Business capabilities"
description: "Nine proposed business functions for healthcare revenue cycle workflows."
---

These nine functions organize the initial RCM business scope.
The identifiers below are provisional design labels. They are not registered namespaces or published wire contracts.

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

The first proposed operation reads claim status under the HAP-1 scope `claim.status.read`.
Its request and result schemas remain to be specified.

The operation contract must distinguish transport success, authorization success, and the claim's business status.
It must define claim matching, line-level results, missing information, evidence, and the time of observation.

## Extensions

Specialties and payer workflows can require additional fields or operations.
Extensions need explicit identifiers, versions, schemas, and compatibility rules.
An extension must preserve the core identity, authority, and data boundaries.
