---
title: "Pilot roadmap"
description: "The work required for an interoperable claim-status pilot."
---

The first milestone connects one client, one trusted intermediary, and one payer for claim-status reading.
The repository currently contains design documents only.

1. Review HAP-1 draft 2 with the pilot participants.
2. Agree on issuer trust, accepted provider delegation evidence, and the payer's delegated grant policy.
3. Publish schemas for intermediary-issued grants and provider constraints.
4. Define the claim-status operation and its request and result schemas.
5. Define capability discovery, supported versions, and extension negotiation.
6. Specify how intermediary-issued credentials accompany HTTP and A2A business requests.
7. Implement a reference client, intermediary, payer verifier, and payer service with invented data.
8. Implement conformance checks for identity, authorization, record limits, replay, expiry, revocation, and retries.
9. Validate interoperability between independent implementations.
10. Review pilot results before publishing a production version.

## Open decisions

| Area | Decision required |
| --- | --- |
| Delegated authority | Evidence the intermediary accepts for provider, RCM organization, and automation client relationships |
| Trust policy | Issuer grant authority, provider constraints, allowed operations, and local payer blocks |
| Discovery | Profile format, endpoint discovery, operation identifiers, and version selection |
| Claim matching | Required identifiers, ambiguous matches, and safe missing-record responses |
| Evidence | Source, observation time, applicable dates, and payer-confirmed versus derived results |
| Transport | Exact HTTP and A2A mappings, including credential presentation and error behavior |
| Lifecycle | Intermediary grant expiry, revocation freshness and outages, durable business references, and long-running work |
| Conformance | Versioned test cases and independent implementation requirements |
| Governance | Maintainer roles, change review, release authority, and extension ownership |

Broader RCM capabilities follow after the first operation has stable contracts and tested implementations.
