# Pilot roadmap

The first milestone is an interoperable claim-status pilot between one client, one identity intermediary, and one payer.
The repository currently contains design documents only.

1. Review HAP-1 with the pilot participants.
2. Define how the payer establishes provider-to-client authority.
3. Publish machine-readable schemas for HAP-1 identity and session messages.
4. Define the claim-status operation and its request and result schemas.
5. Define capability discovery, supported versions, and extension negotiation.
6. Specify how payer-issued credentials authenticate HTTP and A2A business requests.
7. Implement a local reference client, identity intermediary, and payer service with invented data.
8. Implement conformance checks for identity, authorization, record limits, replay, expiry, revocation, and retries.
9. Validate interoperability between independent implementations.
10. Review pilot results before publishing a production version.

## Open decisions

| Area | Decision required |
| --- | --- |
| Delegated authority | Accepted evidence for provider, RCM organization, and automation client relationships |
| Discovery | Profile format, endpoint discovery, operation identifiers, and version selection |
| Claim matching | Required identifiers, ambiguous matches, and safe missing-record responses |
| Evidence | Source, observation time, applicable dates, and payer-confirmed versus derived results |
| Transport | Exact HTTP and A2A mappings, including credential presentation and error behavior |
| Lifecycle | Grant expiry, revocation propagation, durable business references, and long-running work |
| Conformance | Versioned test cases and independent implementation requirements |
| Governance | Maintainer roles, change review, release authority, and extension ownership |

Broader RCM capabilities follow after the first operation has stable contracts and tested implementations.
