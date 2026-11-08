---
title: "Architecture"
description: "Required VDCs, payer-controlled issuer policy, optional intermediaries, and business contracts."
---

HAP requires verifiable delegated authorization while each payer chooses direct credential issuance, trusted intermediaries, or both.
This document describes the proposed architecture. It does not define a wire contract.

| Layer | Responsibility | Initial status |
| --- | --- | --- |
| Identity and access | Payers or approved intermediaries verify identity and provider delegation, then issue scoped VDCs | HAP-1 draft 4 |
| Voice authentication | Agents register before dialing; the payer or its selected verifier correlates the incoming call | HAP-1 pre-call proposal |
| Payer enforcement | A standard verifier checks signed grants, permitted operations, record limits, and local blocks | Proposed gateway integration |
| Payload privacy | An originating system can encrypt lookup data for the payer while agents forward an opaque payload | Optional pattern; detailed profile deferred |
| Business contracts | Define operation inputs, results, evidence, and business outcomes | Proposed capability catalog |
| Discovery and versions | Payers publish accepted issuers, issuance paths, access requirements, registration endpoints, destination policies, and versions | JSON card proposal; schemas and per-number DNS profile remain open |
| Transport bindings | Map contracts to HTTP, A2A, and voice channels | HAP-1 HTTP and pre-call proposals; protected voice operations need a credential mapping |
| Integration adapters | Connect contracts to payer APIs, X12, FHIR, or assisted workflows | To be implemented |

## Identity and authority

The VDC is mandatory for delegated RCM operations. A trusted intermediary is optional at the protocol level.
Each payer publishes its accepted issuers and the policies under which they can grant access.
This setup includes accepted provider delegation evidence, allowed operations, record rules, and revocation requirements.

The client first gets the payer's authenticated discovery requirements.
The payer can require a designated intermediary, allow direct payer issuance, or accept both paths.
The protocol requires no named intermediary and does not require every payer to offer the direct path.

The selected issuer verifies the organization and client, including its control of a cryptographic key.
It verifies authority through any provider, RCM organization, and automation client relationship.
It then issues short-lived VDCs under the payer-approved policy.

With intermediary issuance, the intermediary signs the VDC and the payer accepts it without issuing a replacement.
With direct issuance, the payer validates the bot's accepted authentication payload and provider delegation evidence, then issues the VDC itself.
Knowledge of patient or claim facts alone does not establish that delegation.

The payer checks VDCs through a standard verifier component in both paths.
The component checks credential validity, operation scope, record boundaries, and local blocks.
It runs within the payer's protected environment if it handles business requests.

The first pilot limits record access to claims matching the authorized billing-provider NPI.
An NPI supplied by the client does not establish delegation or override the stored claim relationship.
The issuer verifies delegation before granting access; the payer checks the record relationship before releasing data.

Issuer acceptance, provider delegation, and resource access remain separate checks.
An accepted VDC never overrides the payer's local access policy.

## Agent-initiated phone calls

The agent discovers the registration service from a payer-published JSON card or authenticated destination configuration.
The payer can select its own endpoint, Pindrop, or another service without requiring a universal registrar.
These examples do not claim vendor implementation or support.
The client authenticates and registers before dialing, receiving a session token and negotiated correlation instructions.
It carries the correlation into the phone call through an agreed method such as DTMF or spoken digits.

The payer can call a verification interface or get an authenticated result from its existing verifier integration.
An integrated verifier can observe an approved identity-only audio segment or supported signaling metadata.
The result binds the authenticated client and registration to the actual payer-side call.
This result does not grant record access; the VDC and payer authorization rules remain separate.

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

## Tasks and business outcomes

An agent task can finish while the underlying business process remains pending.
For example, a successful claim-status lookup can report a claim awaiting adjudication.
An accepted reprocessing request does not establish that reprocessing finished or that payment occurred.

Business records can outlive individual A2A tasks.
The business contract must define durable references separately from transport task identifiers.

## Data boundaries

Claim requests, claim responses, patient identifiers, and clinical documents pass directly between the client and payer.
When used, an intermediary receives identity information, provider delegation evidence, requested permissions, and grant metadata.
Intermediary enrollment and delegation evidence exclude patient and claim details.
Direct payer verification evidence stays with the originating system, client, and payer.
External token-status checks carry no business request bodies or claim content.
Voice registration carries identity and call metadata only; an external identity feed excludes protected conversation content.
An integration must state whether evidence comes from the payer, an intermediary observation, or a derived result.

All repository examples must use invented data.
Production records, customer scripts, and internal analysis exports do not belong in this repository.

## Optional payload encryption

End-to-end payload encryption is optional and separate from transport security and authorization.
The core flow works with or without it.

The practice system can encrypt lookup identifiers using the payer's authentic public encryption key.
The RCM bot can then forward the payload without reading those identifiers.
The payer validates the signed authorization, decrypts the payload, checks record access, and returns only the permitted result.
Routing and delegation checks must not require the bot to read the encrypted identifiers.

The signed delegation binds the request to the payload, bot key, intended payer, action, and expiry.
Encryption does not replace the access credential or establish authority by itself.
Results, visible metadata, errors, and receipts also need data minimization to preserve the intended privacy boundary.

V0 describes this pattern without requiring an encryption implementation.
A later profile will define the envelope, key discovery, rotation, algorithms, negotiation, request binding, and failure behavior.
The [HAP-1 walkthrough](../spec/identity/hap-1.md#optional-payload-encryption) includes the participant diagram.

## Design references

- [UCP overview](https://ucp.dev/specification/overview/): services, capabilities, versions, and extensions.
- [A2A specification](https://a2a-protocol.org/latest/specification/): agent discovery, tasks, messages, and results.
- [HAP-1](../spec/identity/hap-1.md): proposed identity and access establishment.
