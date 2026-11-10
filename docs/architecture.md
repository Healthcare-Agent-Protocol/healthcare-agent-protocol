---
title: "Architecture"
description: "Pre-call authentication, server-side authorization, payer-controlled access, and shared business contracts."
---

HAP requires authenticated identity and verified provider authority while each payer chooses its verification and access methods.
HTTP clients use standard API authentication, and the payer resolves provider permissions from trusted records.
This document describes the proposed architecture. It does not define a wire contract.

| Layer | Responsibility | Initial status |
| --- | --- | --- |
| Identity and access | Payers or approved services authenticate agents and maintain verified provider delegation and permissions | HAP-1 draft 5 |
| Voice authentication | Agents register before dialing; the payer or its selected verifier correlates the incoming call | HAP-1 pre-call proposal |
| Payer enforcement | The payer checks trusted authorization context, permitted operations, record limits, and current local blocks | Proposed access integration |
| Payload privacy | An originating system can encrypt lookup data for the payer while agents forward an opaque payload | Optional pattern; detailed profile deferred |
| Business contracts | Define operation inputs, results, evidence, and business outcomes | Claim-status schemas and examples; other operations remain proposed |
| Discovery and versions | Payers publish authentication requirements, approved services, registration endpoints, destination policies, and versions | JSON card proposal; schemas and per-number DNS profile remain open |
| Transport bindings | Map contracts to HTTP, A2A, and voice channels | Draft 5 HTTP and voice proposals; A2A examples use ordinary OAuth API access |
| Integration adapters | Connect contracts to payer APIs, X12, FHIR, or assisted workflows | To be implemented |

## Identity and authority

Each payer publishes its accepted authentication methods, approved services, and access policy.
The policy includes accepted provider delegation evidence, allowed operations, record rules, and revocation requirements.
The payer can run verification itself or use an approved intermediary.

The client first gets the payer's authenticated discovery requirements.
The payer selects the registration service and any external service trusted to establish authorization.
The protocol requires no named intermediary or external authorization service.

The registration service authenticates the organization and client through the payer's accepted API authentication method.
The payer or its approved authorization service verifies the provider, RCM organization, and automation client relationships needed for the requested work.
Those records can stay on the server and be associated with the authenticated client and call.

An identity-only registration does not imply provider delegation.
The payer can check that delegation through its existing workflow before protected work.
Knowledge of patient or claim facts alone does not establish that delegation.

The payer checks current authorization before each protected operation.
It rejects missing, expired, revoked, or unverifiable authority and enforces operation scope, record boundaries, and local blocks.
Any component handling business requests runs within the payer's protected environment.

The first pilot limits record access to claims matching the authorized billing-provider NPI.
An NPI supplied by the client does not establish delegation or override the stored claim relationship.
The payer checks verified delegation and the stored claim relationship before releasing data.

Service trust, provider delegation, and resource access remain separate checks.
An authenticated identity never overrides the payer's local access policy.

The [HTTP access profile](../spec/identity/hap-1-http.md) uses standard API authentication and the same payer-side authorization checks.
Its OAuth example permits opaque access tokens and adds no custom token fields or separate HAP credential exchange.

## Agent-initiated phone calls

The agent discovers the registration service from a payer-published JSON card or authenticated destination configuration.
The payer can select its own endpoint, Pindrop, or another service without requiring a universal registrar.
These examples do not claim vendor implementation or support.
The client authenticates and registers before dialing, receiving a session token and negotiated correlation instructions.
It carries the correlation into the phone call through an agreed method such as DTMF or spoken digits.

The payer can call a verification interface or get an authenticated result from its existing verifier integration.
An integrated verifier can observe an approved identity-only audio segment or supported signaling metadata.
The result binds the authenticated client and registration to the actual payer-side call.
This result establishes call identity. The payer resolves provider authority and permissions from trusted records before releasing protected information.

Per-number NAPTR discovery and RN/JIP, watermark, or STIR/SHAKEN correlation require agreed extension profiles.
The [pre-call proposal](../spec/identity/hap-1-voice.md) describes the exchange, data boundaries, and failure cases.

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

The [claim-status operation](../spec/claims/claim-status.md) now defines the first draft business contract.
It provides versioned request and response schemas, typed question groups, matching rules, evidence, partial answers, and A2A messages.
Its business version changes independently of HAP-1 identity.
Read-only access to payment, document, or review details remains limited to the same authorized claim.

## Tasks and business outcomes

An agent task can finish while the underlying business process remains pending.
For example, a successful claim-status lookup can report a claim awaiting adjudication.
An accepted reprocessing request does not establish that reprocessing finished or that payment occurred.

Business records can outlive individual A2A tasks.
The business contract must define durable references separately from transport task identifiers.

## Data boundaries

Claim requests, claim responses, patient identifiers, and clinical documents pass directly between the client and payer.
When used, an intermediary receives identity information, approved provider delegation evidence, permissions, and verification metadata.
Intermediary enrollment and delegation evidence exclude patient and claim details.
Direct payer verification evidence stays with the originating system, client, and payer.
External verification and authorization-status checks carry no business request bodies or claim content.
Voice registration carries identity and call metadata only; an external identity feed excludes protected conversation content.
An integration must state whether evidence comes from the payer, an intermediary observation, or a derived result.

All repository examples must use invented data.
Production records, customer scripts, and internal analysis exports do not belong in this repository.

## Optional payload encryption

End-to-end payload encryption is optional and separate from transport security and authorization.
The core flow works with or without it.

The practice system can encrypt lookup identifiers using the payer's authentic public encryption key.
The RCM bot can then forward the payload without reading those identifiers.
The payer authenticates the request, verifies authorization, decrypts the payload, checks record access, and returns only the permitted result.
Routing and delegation checks must not require the bot to read the encrypted identifiers.

The encryption profile must bind the payload to the authenticated client, intended payer, permitted action, and current authorization context.
Encryption does not replace authentication or establish authority by itself.
Results, visible metadata, errors, and receipts also need data minimization to preserve the intended privacy boundary.

V0 describes this pattern without requiring an encryption implementation.
A later profile will define the envelope, key discovery, rotation, algorithms, negotiation, request binding, and failure behavior.
The [HAP-1 walkthrough](../spec/identity/hap-1.md#optional-payload-encryption) describes the core privacy pattern.

## Design references

- [UCP overview](https://ucp.dev/specification/overview/): services, capabilities, versions, and extensions.
- [A2A specification](https://a2a-protocol.org/latest/specification/): agent discovery, tasks, messages, and results.
- [HAP-1](../spec/identity/hap-1.md): proposed identity and access establishment.
