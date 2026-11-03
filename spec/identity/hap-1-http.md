---
title: "HAP-1 HTTP reference"
description: "Endpoints, fields, and draft choices for implementing the HAP-1 identity and access flow."
---

This reference defines the proposed HTTP contract for HAP-1 version `1.0-draft.1`.
Start with the [identity and access walkthrough](hap-1.md) for the flow and participant roles.

The November 3, 2026 documentation revision simplifies the original draft without changing its wire contract.
The endpoints and HAP-specific settings remain proposals for partner review.

## Underlying standards

Use the linked standards for their mechanisms and validation rules.
The sections below define the HAP-specific choices needed to use them together.

| Area | Standard |
| --- | --- |
| Client authentication and token issuance | [OAuth 2.0, section 4.4](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4) |
| Intended payer service in the token request | [OAuth resource indicators](https://www.rfc-editor.org/rfc/rfc8707.html) |
| Identity token format and registered fields | [JWT](https://www.rfc-editor.org/rfc/rfc7519.html) |
| JWT validation and separation of token types | [JWT security practices, section 3](https://www.rfc-editor.org/rfc/rfc8725.html#section-3) |
| Key binding, presenter proofs, replay detection, nonces, and authentication errors | [DPoP](https://www.rfc-editor.org/rfc/rfc9449.html) |

## Draft settings

| Setting | Value |
| --- | --- |
| Protocol version | `1.0-draft.1`, matched exactly |
| Transport | HTTPS; JSON bodies use `application/json` |
| Identity JWT signature | ES256 |
| Identity JWT header | `typ: hap-identity+jwt`; `kid` selects a configured issuer key |
| Identity lifetime | At most 300 seconds |
| Accepted clock skew | At most 30 seconds |
| Payer verification session | 300 seconds from session creation |
| Payer access grant | At most 900 seconds; never beyond its authorization session |
| Token and session responses | `Cache-Control: no-store` |
| Retry record retention | At least 15 minutes |

The token type `hap-identity+jwt` is a proposed HAP identifier, not an IANA registration.
Deployments configure endpoints and trusted issuers directly. Public discovery is optional.

## Trust and credentials

The identity service verifies the organization responsible for each enrolled client.
It binds enrollment credentials to that identity and supports credential suspension and revocation.
Each client enrolls separately with each identity service it uses.

The payer explicitly configures trusted issuers and their keys.
A key URL supplied by a token does not establish trust.
The combination of issuer and subject identifies a client; subject strings from different issuers are separate identities.

| Credential | Issuer | Use |
| --- | --- | --- |
| Enrollment credential | Identity service | Authenticate the client to that service only. |
| Identity token | Identity service | Present the enrolled client identity to the intended payer. |
| Access token | Payer | Authorize operations on records within the payer's grant. |

The client keeps enrollment credentials away from the payer.
The payer accepts its own access token at the claim service, not the identity service's token.
The identity service never receives the payer access token or record-specific grant.
Consortium membership and enrollment do not themselves grant record access.

## Get an identity token

Use the identity service's OAuth token endpoint with `grant_type=client_credentials`, scope `hap.identity`, and the intended payer resource.
Client authentication uses the agreed enrollment method.
The DPoP proof establishes possession of a key; it does not replace enrollment authentication.

```http
POST /oauth/token HTTP/1.1
Host: identity.example
Authorization: Basic <enrollment-client-credentials>
DPoP: <proof-for-this-token-request>
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&scope=hap.identity&resource=https%3A%2F%2Fpayer.example%2Fhap%2Fv1
```

The response uses the OAuth fields `access_token`, `token_type: DPoP`, `expires_in`, and `scope: hap.identity`.
The OAuth field name `access_token` does not give this identity token permission to read claims.
The request contains no claim scopes, record references, or payer verification values.

### Identity JWT fields

| Field | HAP use |
| --- | --- |
| `iss` | Configured identity service issuer |
| `sub` | Enrolled client identity within that issuer |
| `client_id` | Client identifier; the draft example uses the same value as `sub` |
| `organization_id` | Organization responsible for the client |
| `aud` | Intended payer identity-validation service |
| `iat`, `exp` | Issue and expiry times |
| `jti` | Unpredictable token identifier for status and replay controls |
| `scope` | Fixed value `hap.identity` |
| `hap_version` | `1.0-draft.1` |
| `cnf.jkt` | Thumbprint of the client's DPoP public key |

The token contains identity information only, without patient data, claim permissions, record references, or verification answers.
Do not encode protected information into apparently opaque identifiers.

The payer validates the trusted issuer, signature, audience, times, version, token type, and presenter binding.
Unsigned tokens, unsupported algorithms, expired tokens, and invalid proofs fail authentication.
The payer uses the RFC validation rules above with these required HAP checks and settings.

The payer can validate the signed token locally.
Any external token-status request contains identity information only.
Short expiry limits the lifetime of an issued token; immediate issuer-side revocation requires a configured status mechanism.

## Start a payer session

```http
POST /hap/v1/sessions HTTP/1.1
Host: payer.example
Authorization: DPoP <identity-token>
DPoP: <proof-for-this-request-and-token>
Idempotency-Key: request_example_01
Content-Type: application/json
```

```json
{
  "hap_version": "1.0-draft.1",
  "requested_scopes": ["claim.status.read"]
}
```

The payer authenticates the client before evaluating the requested scopes.
It binds the session to the issuer, subject, organization, and client key.
Unsupported versions fail before payer verification starts.

If the payer needs verification information, it returns HTTP 201:

```json
{
  "hap_version": "1.0-draft.1",
  "session_id": "session_example",
  "state": "payer_verification_required",
  "requested_scopes": ["claim.status.read"],
  "granted_scopes": [],
  "expires_in": 300,
  "verification": {
    "required_fields": ["member_id", "provider_npi", "date_of_service"]
  }
}
```

The supported verification fields are `member_id`, `provider_npi`, and `date_of_service`, all strings.
The payer can request a subset. Dates use `YYYY-MM-DD`; identifiers retain their formatting.
The response names required fields without prefilling protected values.
Additional verification methods or fields need an agreed binding extension.

The payer decides which evidence establishes access under its policy.
Knowledge of a lookup field alone does not establish authority.
If existing evidence suffices, the payer can grant access immediately without requesting more verification.

## Complete payer verification

Send `POST /hap/v1/sessions/{session_id}/verification` with an identity token, a DPoP proof, and a separate idempotency key.
The body contains `hap_version` and a `verification_information` object with exactly the fields the payer requested.
Values pass directly to the payer.

The payer checks that the session belongs to the same client and key.
A session identifier alone provides no access.
A failed verification marks the session `denied`; further attempts follow payer policy and attempt limits.
The payer limits repeated verification attempts.
The response never supplies expected answers or discloses record existence to an unauthorized client.

An expired identity token can be replaced during an unexpired session.
The replacement retains the same issuer, subject, organization, and key.
An expired verification session requires a new request.

Successful verification returns HTTP 200:

```json
{
  "hap_version": "1.0-draft.1",
  "session_id": "session_example",
  "state": "granted",
  "requested_scopes": ["claim.status.read"],
  "granted_scopes": ["claim.status.read"],
  "expires_in": 900,
  "grant": {
    "access_token": "<payer-issued-access-token>",
    "token_type": "DPoP",
    "resource": "https://payer.example/rcm",
    "expires_in": 900
  }
}
```

All examples use invented identifiers or placeholders.

## Enforce the grant

The first scope, `claim.status.read`, permits claim-status reading within the authorized record set.
The granted set is nonempty and contains only supported scopes from the request.
The payer returns `granted_scopes` explicitly.
An empty set results in denial. Unknown scopes never expand access.

The payer binds its access token to the verified client, the same DPoP key, the granted scopes, record permissions, payer service, and expiry.
It checks those limits and revocation on every protected request.
Broader provider-level access still has explicit record boundaries.
Additional records or actions can require a new decision.

Every session request validates the identity token and DPoP proof.
Proof freshness, replay handling, nonces, and authentication errors follow RFC 9449.
Required DPoP tokens cannot be downgraded to Bearer tokens.

A new identity token does not extend an existing grant.
Revocation of a session revokes every grant issued for it.
The grant permits access; it does not establish claim acceptance, adjudication, payment, or an appeal filing date.
Claim-status request and result schemas belong to the business protocol.

### Read session status

Use `GET /hap/v1/sessions/{session_id}` with an identity token and DPoP proof.
Only the session's client and key can read or resume it.
The response does not repeat verification answers or access credentials.

| State | Meaning |
| --- | --- |
| `payer_verification_required` | More verification information is needed; no access token. |
| `granted` | Access is permitted within the returned scope and internal record limits. |
| `denied` | Access was refused; no access token. |
| `expired` | The session or grant expired; access is unusable. |
| `revoked` | The payer withdrew access; access is unusable. |

## Retries and errors

Session creation and verification submission accept `Idempotency-Key`.
Clients supply a key for retryable operations. Keys contain no protected information.
The payer binds each key to the authenticated client, operation, and request body.
A changed body with the same key returns `idempotency_conflict`.

An identical retry returns the current session result without repeating authorization side effects or extending access.
It can return the original credential only while that credential remains valid.
Retained responses need credential-level protection.

Application errors use this envelope:

```json
{
  "hap_version": "1.0-draft.1",
  "error": {
    "code": "payer_verification_failed",
    "message": "Payer verification did not establish access.",
    "retryable": false
  }
}
```

OAuth and DPoP authentication errors keep their standard status codes, headers, and response behavior.
The HAP envelope does not replace those rules.
Messages omit protected data, credentials, verification answers, and other clients' session details.
Identity failures omit session details before authentication.

| HAP code | HTTP status |
| --- | --- |
| `invalid_request`, `version_unsupported`, `scope_not_supported` | 400 |
| `identity_invalid`, `identity_expired` | 401 |
| `issuer_not_trusted`, `client_not_accepted`, `payer_verification_failed`, `access_denied`, `session_revoked` | 403 |
| `session_not_found` | 404 |
| `idempotency_conflict` | 409 |
| `session_expired` | 410 |
| `rate_limited` | 429 |
| `temporarily_unavailable` | 503 |

`scope_not_supported` means no requested scope is supported.
`session_not_found` means no session is visible to the authenticated client.
Clients do not automatically retry a non-retryable denial.
For 429 or 503 responses, they honor `Retry-After` when present.
Unknown fields never expand permissions; unsupported verification requirements fail explicitly.

## Data handling and voice

Identity service traffic and logs contain identity events only.
The service does not receive claim scopes, record-specific grants, verification answers, protected claim content, documents, recordings, or transcripts.
Public metadata, scope strings, and identity tokens contain no protected health information.

Client and payer operational logs omit verification answers, claim payloads, credentials, and tokens.
Payers can retain business records within protected systems under their retention policy.

Any identity audio feed excludes protected content and verification answers.
Payer-local software can perform identity checks without forwarding call content.
A voice binding needs live-call correlation, presenter proof, and replay protection before it can claim conformance.
A spoken token, code, or watermark alone does not authenticate the client.

## Check an implementation

Use invented or redacted values, never production data or live credentials.
Check these cases for each participant and binding:

- Reject untrusted issuers, wrong audiences, invalid or expired tokens, incorrect keys, and replayed proofs.
- Reject an identity token at the claim service and access outside the granted scopes or record limits.
- Keep verification values and claim content between client and payer, including audio feeds and logs.
- Prevent another client from reading or resuming a session.
- Enforce session and grant expiry, denial, and revocation.
- Prevent retries from repeating side effects or extending access.
- Reject unsupported versions and verification requirements explicitly.

Implementations name their supported binding and protocol version.
Breaking wire changes require a new version.
A production release needs published schemas, binding requirements, and interoperable implementations.

Voice-to-digital switching, intermediary federation, shared directory handles, additional scopes, and additional verification methods remain optional extensions.
Extensions preserve payer authorization and the identity-only intermediary boundary.
See the [pilot roadmap](../../docs/roadmap.md) for release work.
