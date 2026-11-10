---
title: "Pilot roadmap"
description: "The work required for an interoperable claim-status pilot."
---

The first milestone connects one client and one payer for claim-status reading, with an intermediary when payer policy selects that path.
The repository contains design documents, claim-status schemas, invented examples, and contract checks.
It does not yet implement a payer service or an executable client.

1. Review HAP-1 draft 5, including the pre-call authentication proposal, with the pilot participants.
2. Agree on payer-selected authentication, trusted verification services, provider delegation evidence, and access policy.
3. Define server-side authorization context, provider constraints, validity, revocation, and any trusted authorization-result schema.
4. Review the claim-status `1.0-draft.2` contract and validate its request and response schemas with pilot participants.
5. Define payer-card discovery, destination policies, supported versions, and extension negotiation.
6. Test claim-status access through voice and the A2A HTTP binding with authenticated identity and server-side authorization.
7. Agree on call-registration schemas, client authentication, correlation assurance, and both payer verification paths for a voice pilot.
8. Implement a reference client, registration service, call verifier, authorization integration, and payer service with invented data.
9. Check authentication, call binding, payer policy, record limits, replay, expiry, revocation, retries, and media boundaries.
10. Validate interoperability between independent implementations.
11. Review pilot results before publishing a production version.

## Open decisions

Draft 5 uses standard API authentication, secure call binding, and verified provider authority.
The payer chooses its approved services and can keep authorization context on the server.
The remaining work defines the exchanges and checks needed for independent implementations.

| Area | Decision required |
| --- | --- |
| Delegated authority | Evidence the payer or its approved service validates for provider, RCM organization, and automation client relationships |
| Trust policy | Services approved to establish identity or authorization, provider constraints, allowed operations, and local payer blocks |
| Access discovery | Serialization for authentication methods, approved services, evidence requirements, cache validity, and version selection |
| Voice discovery | JSON Agent Card extension schema, authenticated payer/domain mapping, destination coverage, endpoint precedence, and cache validity |
| Call registration | CreateCallRef schema, authentication profile, token entropy, expiry, idempotency, rate limits, and negotiation errors |
| Call verification | Payer lookup and integrated result schemas, actual-call binding, token consumption, result authentication, and media controls |
| Authorization context | Server-side client and provider relationships, permitted actions, record constraints, authenticated results, and current validity checks |
| Telephony extensions | Per-number ENUM/NAPTR discovery, RN/JIP and watermark encoding, and carrier-supported STIR/SHAKEN association |
| Claim matching | Payer-specific additional identifiers, source matching behavior, and independent checks of the defined ambiguity rules |
| Evidence | Source adapters, freshness guarantees, and independent checks of payer-confirmed versus derived facts |
| Transport | Implement the claim-status A2A mapping; define direct HTTP business bindings and mappings for other operations |
| Lifecycle | Registration expiry, delegation expiry, revocation freshness and outages, durable business references, and long-running work |
| Conformance | Versioned test cases and independent implementation requirements |
| Governance | Maintainer roles, change review, release authority, and extension ownership |

Broader RCM capabilities follow after the first operation has stable contracts and tested implementations.

## Claim-status contract

The [claim-status operation](../spec/claims/claim-status.md) defines business version `1.0-draft.2` and JSON Schema Draft 2020-12 files.
It includes fifteen invented request/response pairs and A2A envelopes.
The automated checks cover schema validation and cross-field failures; they do not verify a deployed payer's access enforcement.
The pilot still needs source adapters, trusted authentication and authorization setup, a client, a payer service, and independent interoperability checks.
The published A2A Agent Cards now select draft 5 identity and ordinary OAuth API authentication; their business schemas remain unchanged.

## Pre-call authentication pilot

The [voice proposal](../spec/identity/hap-1-voice.md) uses one agent-facing registration exchange before dialing.
OAuth credential acquisition remains separate when needed. The payer selects its verifier through authenticated discovery.
The payer can look up a call reference or get an authenticated result through the selected verifier's integration.

The pilot needs an agreed JSON card schema and exact destination rules before implementations can discover endpoints consistently.
It also needs a tested binding between the authenticated registration and the actual incoming call.
A detected token alone does not complete that assurance or authorize protected work.
The pilot must test provider delegation and record limits through the authenticated client identity and trusted server-side authorization context.
It must also reject identity-only results as proof of provider authority and stop protected work when authorization expires or is revoked.

NAPTR discovery, RN/JIP, audio watermarks, and STIR/SHAKEN correlation remain separate extension proposals.
The pilot does not assume carrier support or unrestricted access to protected call audio.

## Optional privacy profile after v0

V0 includes an optional payload encryption pattern.
The first core implementation does not require payload encryption.
Transport security, authenticated requests, provider delegation checks, and payer authorization remain required.

A later encryption profile needs:

- An envelope format, such as JWE, and supported algorithms.
- Authenticated payer key discovery, key selection, rotation, and retirement rules.
- Capability negotiation and explicit behavior when encryption is required but unavailable.
- Binding between the payload, authenticated client, payer, permitted action, current authorization context, and replay controls.
- Rules for response encryption, visible metadata, safe errors, and permitted result fields.
- Schemas, test vectors, and interoperability checks with invented data.

Choosing JWE alone does not complete this profile.
If a pilot requires the bot to remain unable to read lookup identifiers, that pilot needs the agreed profile before implementation.
