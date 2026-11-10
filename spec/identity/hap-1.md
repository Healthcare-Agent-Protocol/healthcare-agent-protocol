---
title: "Identity and access"
description: "How an agent authenticates and gets permission to work with a payer."
---

**Draft:** `1.0-draft.1`.

An agent must prove who it is and that it can act for the provider.
The payer checks those permissions before sharing information or performing an action.
Identity and permissions stay in server-side records.

## API requests

Use the payer's published API authentication over HTTPS, such as OAuth client credentials with an ordinary access token.
HAP adds no separate credential or grant exchange.
Tokens can be opaque references to server-side records.

The payer publishes its endpoints, accepted authentication, scopes, and provider-access rules through a payer card or authenticated configuration.
Clients verify that this information belongs to the intended payer before sending credentials.
If the payer requires sender-constrained tokens, clients must use that method.

## Phone calls

The agent authenticates over an API before dialing.
The phone call carries a short reference that connects it to that authenticated registration.

1. Read the payer's card or authenticated configuration for the registration service, covered phone numbers, and accepted correlation methods.
2. Authenticate to that service and register the upcoming call with `CreateCallRef`. Receive a call reference, expiry, and instructions.
3. Call the payer and send the reference using DTMF, spoken digits, or an agreed signaling method.
4. The payer verifies the reference against the actual incoming call using `VerifyCallRef` or an authenticated result from its integrated verifier.
5. The payer checks provider authority and access before doing protected work.

The payer can run verification itself or choose an approved service.
RN/JIP signaling and audio watermarks require an agreed integration; they are not assumed to work on every call.
Discovery and message schemas are still proposals.

A reference expires within five minutes unless matched to a call, and can match only one call.
The service binds it to the authenticated client, payer, destination, and call attempt.
References must be unpredictable, with bounded guessing attempts.
Matching consumes the registration atomically; retries for the same call are idempotent.
Expired, replayed, mismatched, or ambiguous references fail verification.
A verified call does not by itself grant data access.

## What the payer checks

Before each protected operation, including retries and later result retrieval, the payer checks:

- The authenticated client and its current, verified authority to act for the provider.
- The permitted action, record limits, and any local access blocks.
- Expiry or revocation of credentials and delegation. Unverifiable authority does not permit access.

For `claim.status.read`, the claim's stored billing-provider NPI must match the authorized provider.
Knowing an NPI or claim details is not proof of delegation.
A call verifier can establish provider authority only if the payer has also approved it for that role.

## Data handling

Patient and claim data pass between the client and payer.
External verification services receive identity and call metadata, not claim requests or results.
If verification uses audio, the external service receives only the identity segment, ending before protected information is discussed.
Keep credentials out of discovery documents, URLs, and logs.
Payload encryption is optional and needs an agreed profile; it does not replace access checks.
