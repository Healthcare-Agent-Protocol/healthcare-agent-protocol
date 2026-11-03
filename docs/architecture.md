---
title: "Architecture"
description: "Intermediary-issued access grants, minimal payer enforcement, and business contracts."
---

HAP delegates identity and access decisions to trusted intermediaries while payers enforce signed grants at their data boundary.
This document describes the proposed architecture. It does not define a wire contract.

| Layer | Responsibility | Initial status |
| --- | --- | --- |
| Identity and access | Intermediaries verify clients and provider delegation, then issue scoped grants under payer-approved policy | HAP-1 draft 2 |
| Payer enforcement | A standard verifier checks signed grants, permitted operations, record limits, and local blocks | Proposed gateway integration |
| Business contracts | Define operation inputs, results, evidence, and business outcomes | Proposed capability catalog |
| Discovery and versions | Advertise supported operations, versions, extensions, and access requirements | To be specified |
| Transport bindings | Map contracts to HTTP and A2A messages | HAP-1 HTTP proposal; business bindings to be specified |
| Integration adapters | Connect contracts to payer APIs, X12, FHIR, or assisted workflows | To be implemented |

## Identity and authority

The payer approves trusted issuers and the policies under which they can grant access.
This setup includes accepted provider delegation evidence, allowed operations, record rules, and revocation requirements.

The intermediary verifies the organization and client, including its control of a cryptographic key.
It verifies authority through any provider, RCM organization, and automation client relationship.
It then authenticates the client and issues short-lived access tokens under the payer-approved policy.

The payer accepts these tokens directly through a standard verifier component.
It does not require separate client enrollment, login, verification questions, or payer-issued tokens.
The component checks credential validity, operation scope, record boundaries, and local blocks.
It runs within the payer's protected environment if it handles business requests.

The first pilot limits record access to claims matching the authorized billing-provider NPI.
An NPI supplied by the client does not establish delegation or override the stored claim relationship.
The issuer verifies delegation before granting access; the payer checks the record relationship before releasing data.

The CA comparison guides issuer trust and signature validation.
HAP also requires an agreed policy for provider delegation and access grants.

## Business contracts

Each operation needs:

- A stable identifier and version.
- Defined inputs and results.
- Required access scopes and record boundaries.
- Service, provider, plan, location, and date limits where applicable.
- Explicit business outcomes and missing-information responses.
- Evidence with its source, observation time, and applicable dates.
- Retry, idempotency, error, and receipt rules.

A capability groups related operations.
An implementation must state the exact operations it supports.
Claim-status support does not imply support for claim submission or reprocessing.

## Tasks and business outcomes

An agent task can finish while the underlying business process remains pending.
For example, a successful claim-status lookup can report a claim awaiting adjudication.
An accepted reprocessing request does not establish that reprocessing finished or that payment occurred.

Business records can outlive individual A2A tasks.
The business contract must define durable references separately from transport task identifiers.

## Data boundaries

Claim requests, claim responses, patient identifiers, and clinical documents pass directly between the client and payer.
The intermediary receives identity information, provider delegation evidence, requested permissions, and grant metadata.
Enrollment and delegation evidence exclude patient and claim details.
External token-status checks carry no business request bodies or claim content.
An integration must state whether evidence comes from the payer, an intermediary observation, or a derived result.

All repository examples must use invented data.
Production records, customer scripts, and internal analysis exports do not belong in this repository.

## Design references

- [UCP overview](https://ucp.dev/specification/overview/): services, capabilities, versions, and extensions.
- [A2A specification](https://a2a-protocol.org/latest/specification/): agent discovery, tasks, messages, and results.
- [HAP-1](../spec/identity/hap-1.md): proposed identity and access establishment.
