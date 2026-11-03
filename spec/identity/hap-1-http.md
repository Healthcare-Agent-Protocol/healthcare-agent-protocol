---
title: "HAP-1 HTTP reference"
description: "Intermediary-issued access tokens and minimal enforcement at the payer boundary."
---

HAP-1 version `1.0-draft.2` delegates client authentication and access decisions to a trusted intermediary.
The payer acts as the protected resource service and accepts the intermediary's access tokens directly.
See the [walkthrough](hap-1.md) for the participant roles and flow.

This draft changes the trust model and wire contract. It remains a proposal for partner review.

## Use existing standards

| Area | Standard |
| --- | --- |
| Client authentication and token issuance at the intermediary | [OAuth 2.0 client credentials](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4) |
| Payer resource selection | [OAuth resource indicators](https://www.rfc-editor.org/rfc/rfc8707.html) |
| Provider and record constraints | [Rich authorization requests](https://www.rfc-editor.org/rfc/rfc9396.html), with the HAP type below |
| Signed access tokens and their validation | [JWT access token profile](https://www.rfc-editor.org/rfc/rfc9068.html) and [JWT security practices](https://www.rfc-editor.org/rfc/rfc8725.html) |
| Token binding, key possession, nonces, and replay handling | [DPoP](https://www.rfc-editor.org/rfc/rfc9449.html) |
| Optional online token status | [OAuth token introspection](https://www.rfc-editor.org/rfc/rfc7662.html) |

These standards supply the security mechanisms. HAP defines who can issue a grant and what its healthcare constraints mean.

## Establish trust before requests

The payer approves an issuer, its signing keys, and the policy under which it can grant access.
The agreement defines permitted scopes, provider delegation evidence, record rules, and revocation requirements.
Trust for identity checks alone does not permit an issuer to grant access.

The intermediary verifies the organization controlling the client and binds enrollment credentials to that client.
It checks the provider's delegation, including any RCM organization between the provider and automated client.
Accepted evidence can include signed delegation or another method the payer approved in the trust agreement.
The intermediary maintains this evidence and checks that the delegation remains active before issuing a token.

The client cannot authorize itself by supplying a provider NPI.
The intermediary uses its verified enrollment and delegation records to decide whether the request is permitted.
A provider's delegation alone does not override the payer's agreed access policy.

The payer uses a local verifier component for token and request checks.
No separate payer client enrollment, login, verification questionnaire, session service, or token issuance endpoint is required.

## Draft settings

| Setting | Proposed value |
| --- | --- |
| Protocol version | `1.0-draft.2`, matched exactly |
| Transport | HTTPS |
| Token request body | `application/x-www-form-urlencoded` |
| Token response body | `application/json`, with `Cache-Control: no-store` |
| Access token | Signed JWT following RFC 9068; `typ: at+jwt` |
| Token signature | RS256 baseline, as required for RFC 9068 interoperability |
| Key selection | `kid` resolves through the configured trusted issuer |
| Token lifetime | At most 300 seconds |
| Accepted clock skew | At most 30 seconds |
| Presenter binding | DPoP; `cnf.jkt` identifies the client's key |
| Initial permission | `claim.status.read` |
| Initial record rule | Claims with the authorized billing-provider NPI |

Additional algorithms require explicit configuration. Token-supplied key URLs never establish trust.

## Request a grant from the intermediary

The client calls the intermediary's OAuth token endpoint, such as `POST /oauth/token`.
It authenticates using its enrollment credentials and supplies a DPoP proof.
The proof establishes key possession; the intermediary also validates the enrollment credentials.

| Form parameter | Value |
| --- | --- |
| `grant_type` | `client_credentials` |
| `resource` | Intended payer API, such as `https://payer.example/rcm` |
| `scope` | `claim.status.read` |
| `hap_version` | `1.0-draft.2` |
| `authorization_details` | JSON array containing the single provider-access object below |

```json
[
  {
    "type": "hap_provider_access",
    "provider_npi": "<enrolled-provider-npi>",
    "record_rule": "billing_provider_claims"
  }
]
```

`hap_provider_access` and its fields are proposed HAP definitions, not existing industry registrations.
The first pilot permits one provider-access object per token.
The NPI is a string with its original formatting.
The intermediary checks it against the verified delegation; the request does not establish that delegation.

The intermediary grants only supported, requested permissions within its delegated authority.
If enrollment, provider delegation, or the payer-approved policy does not permit access, it refuses token issuance.
Unsupported versions fail explicitly. Unknown fields or record rules never expand access.
OAuth and rich authorization request errors follow the linked standards.

### Successful token response

```json
{
  "hap_version": "1.0-draft.2",
  "access_token": "<intermediary-signed-access-token>",
  "token_type": "DPoP",
  "expires_in": 300,
  "scope": "claim.status.read",
  "authorization_details": [
    {
      "type": "hap_provider_access",
      "provider_npi": "<enrolled-provider-npi>",
      "record_rule": "billing_provider_claims"
    }
  ]
}
```

Examples contain placeholders, not valid credentials or production identifiers.
The response and signed token carry the same granted permissions and provider constraints.
A grant never outlives the verified delegation or another applicable authorization limit.

## Access token fields

Use the registered fields and validation rules in RFC 9068.
HAP adds the provider constraints and draft version below.

| Field | Meaning |
| --- | --- |
| `iss` | Intermediary issuer approved to grant this access |
| `sub`, `client_id` | Enrolled automated client; client credentials use the client as the subject |
| `aud` | Intended payer API, matched exactly |
| `iat`, `exp`, `jti` | Issue time, expiry, and unique token identifier |
| `scope` | Granted operation scope; initially `claim.status.read` |
| `cnf.jkt` | Client DPoP public key thumbprint |
| `hap_version` | `1.0-draft.2` |
| `organization_id` | Organization responsible for the client |
| `delegation_id` | Opaque reference to the verified provider delegation maintained by the issuer |
| `authorization_details` | The single granted `hap_provider_access` object |

All fields in this table are required for this draft.
Missing provider constraints never imply unrestricted access.
The issuer and client identifier together identify the client.
Delegation references contain no patient or claim information.
Enrollment credentials remain between client and intermediary.

## Call the payer directly

The client presents the access token at the payer's business endpoint:

```http
POST /rcm/claim-status HTTP/1.1
Host: payer.example
Authorization: DPoP <intermediary-signed-access-token>
DPoP: <proof-for-this-request-and-token>
Content-Type: application/json
```

This endpoint illustrates credential presentation only. The business profile will define the claim-status path and body.
The payer does not exchange this token for another token or start a verification session.

The payer's verifier checks:

1. The issuer is trusted to issue this kind of grant, and the signature and token type are valid.
2. The audience, draft version, token times, and applicable revocation state are valid.
3. The DPoP proof matches the client's key and passes freshness, nonce, and replay checks.
4. The requested operation is covered by the granted scope and the payer's configured issuer policy.
5. The requested record satisfies the provider constraint and any local deny rule.

The initial record rule matches the claim's billing-provider NPI to the token's `provider_npi`.
A match to a rendering, referring, or unrelated provider does not satisfy this rule.
The payer checks the stored claim relationship before releasing data, regardless of identifiers supplied in the request.
Other record relationships require a versioned extension agreed by the payer.

The payer retains the right to block an issuer, client, provider, or operation.
Failures reject the request without a verification questionnaire or automatic fallback to the earlier session flow.
Errors follow the access-token and DPoP standards and omit protected record details.

This is credential validation and limited authorization enforcement at the payer boundary.
The intermediary performs organization checks, client authentication, provider delegation checks, and access decisions under the agreed policy.

## Expiry and revocation

The intermediary suspends enrollment credentials and delegations when their authority ends.
It stops new token issuance and exposes token status or another agreed revocation mechanism.
The trust agreement specifies how quickly the payer's verifier learns about revocations.

Local signature validation alone can accept a previously issued token until expiry, including permitted clock skew.
A shorter revocation window needs current status information, such as authenticated introspection or an agreed status feed.
If required status information is unavailable or too old, the verifier rejects the request.
The protocol does not claim immediate revocation from short token lifetimes alone.

Online status checks carry token information only, without patient identifiers, claim identifiers, or business request bodies.
An expired grant requires another intermediary-issued token after current authorization checks.
Renewal never expands the verified delegation or payer-approved policy.
Business operation retries and idempotency belong to their operation contracts.

## Data boundaries

The intermediary now handles identity, provider delegation evidence, requested scopes, provider constraints, and the access tokens it issues.
This replaces the earlier identity-only intermediary boundary.
Those enrollment and delegation records exclude patient and claim details.

Patient identifiers, claim identifiers, claim payloads, clinical documents, verification answers containing patient data, and protected call content stay with the client and payer.
Public discovery metadata contains no protected information.
Do not encode protected information into apparently opaque identifiers.
Operational logs omit credentials, tokens, protected business payloads, and delegation evidence.

A verifier that sees business requests runs within the payer's protected environment.
External introspection or identity systems receive no forwarded claim payloads or protected recordings and transcripts.
An identity-only audio feed, if a voice binding supports it, excludes protected content.
Voice bindings need secure call correlation and proof of credential control before claiming conformance.
A spoken token or an audio watermark alone is insufficient.

## Check an implementation

Use invented data and test credentials.
Check successful intermediary issuance and direct payer acceptance, plus these failure cases:

- Untrusted issuer, unapproved grant policy, invalid signature, wrong audience, or unsupported version.
- Invalid client credentials, missing or withdrawn provider delegation, or requests beyond the issuer's delegated policy.
- Expired token, revoked access, stale required status, incorrect key, or replayed DPoP proof.
- Wrong operation scope or a claim outside the authorized billing-provider relationship.
- Local payer blocks and attempts to widen access through unknown fields or record rules.
- Patient or claim data entering issuer traffic, logs, delegation evidence, or media feeds.

A production release still needs schemas, a trust-policy profile, a verifier implementation, and independent interoperability checks.
See the [pilot roadmap](../../docs/roadmap.md).
