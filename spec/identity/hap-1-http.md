---
title: "HAP-1 HTTP reference"
description: "Payer-led discovery, required VDCs, and direct or intermediary credential issuance."
---

HAP-1 version `1.0-draft.4` requires a payer-accepted VDC for protected delegated RCM operations.
The issuer can be the payer itself or a payer-approved trusted intermediary.
Each payer chooses its accepted paths. A payer can require an intermediary without making intermediaries a protocol requirement.
See the [walkthrough](hap-1.md) for the participant roles and flow.

Draft 4 retains direct and intermediary VDC issuance and adds the separate [pre-call authentication proposal](hap-1-voice.md).
It remains a proposal for partner review.
The HTTP profile represents a VDC as a signed, sender-constrained access grant with verified provider delegation.
This HAP-specific use of VDC does not claim AP2 or W3C credential-format conformance.

## Use existing standards

| Area | Standard |
| --- | --- |
| Client authentication and token issuance at the selected issuer | [OAuth 2.0 client credentials](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4) |
| Payer resource selection | [OAuth resource indicators](https://www.rfc-editor.org/rfc/rfc8707.html) |
| Provider and record constraints | [Rich authorization requests](https://www.rfc-editor.org/rfc/rfc9396.html), with the HAP type below |
| Signed access tokens and their validation | [JWT access token profile](https://www.rfc-editor.org/rfc/rfc9068.html) and [JWT security practices](https://www.rfc-editor.org/rfc/rfc8725.html) |
| Token binding, key possession, nonces, and replay handling | [DPoP](https://www.rfc-editor.org/rfc/rfc9449.html) |
| Optional online token status | [OAuth token introspection](https://www.rfc-editor.org/rfc/rfc7662.html) |

These standards supply the security mechanisms. HAP defines who can issue a grant and what its healthcare constraints mean.

## Discover the payer's requirements

The client MUST get its credential requirements from authenticated payer-controlled discovery information before selecting an issuer.
That information can come from a configured payer profile or a payer-published JSON card using an agreed A2A Agent Card extension.
An intermediary's own advertisement does not establish payer acceptance.
The client needs an authenticated payer-to-domain or payer-to-card mapping before trusting the advertised endpoint.
The [voice profile](hap-1-voice.md#discover-where-to-register) adds destination coverage, registration endpoints, and accepted correlation methods.
Per-number ENUM/NAPTR discovery remains a proposed extension, not a defined HAP lookup contract.

The payer MUST publish:

| Requirement | Contents |
| --- | --- |
| Version and resource | Accepted HAP versions and intended payer API audience |
| Accepted issuers | Issuer identifiers and accepted VDC profiles |
| Issuance paths | Direct payer issuance, designated intermediary issuance, or both |
| Credential acquisition | Issuer endpoint, client authentication requirements, and accepted delegation evidence profile |
| Key binding | Required presenter proof and client key requirements |
| Policy validity | Cache lifetime or another explicit refresh rule |

These are required discovery contents, not a finalized discovery serialization or a new standardized well-known endpoint.
The production profile still needs that mapping and its schemas.
Public discovery information MUST contain no PHI or credentials.

The protocol MUST NOT require any named intermediary or third-party issuer.
A payer MAY advertise only intermediary issuance. A payer MAY advertise direct issuance or both paths.
A client MUST follow the payer's accepted issuer policy and MUST NOT bypass a required intermediary.

Discovery and credential acquisition do not require an existing HAP access VDC.
They MUST NOT perform protected RCM operations or return protected lookup results.
An already valid, accepted VDC MAY skip issuance when payer policy permits.

## Establish trust before requests

The payer approves an issuer, its signing keys, and the policy under which it can grant access.
The agreement defines permitted scopes, provider delegation evidence, record rules, and revocation requirements.
Trust for identity checks alone does not permit an issuer to grant access.

The selected issuer verifies the organization controlling the client and binds accepted authentication evidence to that client.
It checks the provider's delegation, including any RCM organization between the provider and automated client.
Accepted evidence can include an approved practice credential, signed provider delegation, or another method approved by the payer.
The issuer checks that the delegation remains active before issuing a VDC.

The client cannot authorize itself by supplying a provider NPI.
The issuer uses verified identity and delegation evidence to decide whether the request is permitted.
Knowledge of patient identifiers or claim facts alone MUST NOT establish provider-to-bot delegation.
A provider's delegation alone does not override the payer's agreed access policy.

The payer uses a local verifier component for token and request checks in both paths.
With intermediary issuance, the payer accepts that VDC directly and does not mint a replacement.
With direct issuance, the payer validates the bot's accepted payload and delegation evidence through its own credential service.
The direct path has no intermediary hop. Its resulting VDC uses the same presentation and resource enforcement rules.

## Draft settings

| Setting | Proposed value |
| --- | --- |
| Protocol version | `1.0-draft.4`, matched exactly |
| Transport | HTTPS |
| Credential issuer | Payer or payer-approved intermediary, according to payer discovery policy |
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

## Request a VDC from the selected issuer

The client calls the token endpoint for the accepted path, such as `POST /oauth/token` at the selected issuer.
It authenticates using the issuer's accepted credentials and supplies a DPoP proof.
The proof establishes key possession; the issuer separately validates client identity and provider delegation.

| Path | Issuance behavior |
| --- | --- |
| Payer-designated intermediary | The intermediary validates the bot and delegation, then signs the VDC. The payer accepts it without reissuance. |
| Direct payer | The payer validates the authentication payload and delegation evidence, then signs the VDC itself. No intermediary participates. |

The initial client-credentials mapping uses credentials whose identity and delegation checks are already established at that issuer.
Other direct evidence methods need an explicit payer-approved authentication profile defining their payload, challenge, validation, and error rules.
Clients MUST NOT place evidence in unspecified token fields or treat an unverified payload as a VDC.
Evidence containing patient information MUST go only to the payer through a separately agreed protected verification method.

| Form parameter | Value |
| --- | --- |
| `grant_type` | `client_credentials` |
| `resource` | Intended payer API, such as `https://payer.example/rcm` |
| `scope` | `claim.status.read` |
| `hap_version` | `1.0-draft.4` |
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
The issuer checks it against the verified delegation; the request does not establish that delegation.

The issuer grants only supported, requested permissions within the payer's policy and the verified provider delegation.
If enrollment, provider delegation, or the payer-approved policy does not permit access, it refuses token issuance.
Unsupported versions fail explicitly. Unknown fields or record rules never expand access.
OAuth and rich authorization request errors follow the linked standards.

### Successful token response

```json
{
  "hap_version": "1.0-draft.4",
  "access_token": "<accepted-issuer-signed-access-vdc>",
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
| `iss` | Payer issuer or intermediary issuer approved by the payer to grant this access |
| `sub`, `client_id` | Enrolled automated client; client credentials use the client as the subject |
| `aud` | Intended payer API, matched exactly |
| `iat`, `exp`, `jti` | Issue time, expiry, and unique token identifier |
| `scope` | Granted operation scope; initially `claim.status.read` |
| `cnf.jkt` | Client DPoP public key thumbprint |
| `hap_version` | `1.0-draft.4` |
| `organization_id` | Organization responsible for the client |
| `delegation_id` | Opaque reference to the verified provider delegation maintained by the issuer |
| `authorization_details` | The single granted `hap_provider_access` object |

All fields in this table are required for this draft.
Missing provider constraints never imply unrestricted access.
The issuer and client identifier together identify the client.
Delegation references contain no patient or claim information.
Authentication credentials remain between the client and its selected issuer.

## Call the payer directly

The client presents the access token at the payer's business endpoint:

```http
POST /rcm/claim-status HTTP/1.1
Host: payer.example
Authorization: DPoP <accepted-issuer-signed-access-vdc>
DPoP: <proof-for-this-request-and-token>
Content-Type: application/json
```

This endpoint illustrates credential presentation only. The business profile will define the claim-status path and body.
The payer verifies the presented VDC without exchanging it for another token or starting another issuance flow.

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
Failures reject the protected request without automatically substituting a phone-call reference for an access VDC.
Errors follow the access-token and DPoP standards and omit protected record details.

This is credential validation and limited authorization enforcement at the payer boundary.
The issuer performs organization checks, client authentication, provider delegation checks, and issuance under the payer-approved policy.

## Expiry and revocation

The issuer suspends authentication credentials and delegations when their authority ends.
It stops new token issuance and exposes token status or another agreed revocation mechanism.
The trust agreement specifies how quickly the payer's verifier learns about revocations.

Local signature validation alone can accept a previously issued token until expiry, including permitted clock skew.
A shorter revocation window needs current status information, such as authenticated introspection or an agreed status feed.
If required status information is unavailable or too old, the verifier rejects the request.
The protocol does not claim immediate revocation from short token lifetimes alone.

Online status checks carry token information only, without patient identifiers, claim identifiers, or business request bodies.
An expired grant requires another VDC from a payer-accepted issuer after current authorization checks.
Renewal never expands the verified delegation or payer-approved policy.
Business operation retries and idempotency belong to their operation contracts.

## Data boundaries

When used, an intermediary handles identity, provider delegation evidence, requested scopes, provider constraints, and the VDCs it issues.
Its enrollment and delegation records exclude patient and claim details.
The direct path sends identity and accepted delegation evidence to the payer without an intermediary.

Patient identifiers, claim identifiers, claim payloads, clinical documents, verification answers containing patient data, and protected call content stay with the client and payer.
Public discovery metadata contains no protected information.
Do not encode protected information into apparently opaque identifiers.
Operational logs omit credentials, tokens, protected business payloads, and delegation evidence.

A verifier that sees business requests runs within the payer's protected environment.
External introspection or identity systems receive no forwarded claim payloads or protected recordings and transcripts.
An identity-only audio feed, if a voice binding supports it, excludes protected content.
Voice bindings need secure call correlation and proof of credential control before claiming conformance.
A spoken token or an audio watermark alone is insufficient.

The [voice proposal](hap-1-voice.md) registers calls before dialing and supports payer lookup or integrated verification results.
Its registration token is distinct from this profile's access VDC.
The same organization can perform both roles only when payer policy separately approves registration verification and credential issuance.

### Optional payload encryption

End-to-end payload encryption is an optional implementation choice.
HTTPS, signed access grants, provider delegation checks, and payer authorization remain required.

The [privacy pattern](hap-1.md#optional-payload-encryption) shows a practice system encrypting lookup identifiers for the payer.
The client forwards that payload without reading the identifiers.
This binding does not define an encrypted lookup envelope or add encryption fields to token requests or grants.
Implementations need a separately agreed profile before exchanging encrypted business payloads.
The [roadmap](../../docs/roadmap.md#optional-privacy-profile-after-v0) lists the deferred interoperability work.

## Check an implementation

Use invented data and test credentials.
Check both successful issuance paths:

- Payer discovery leads to an approved intermediary; its VDC authorizes a permitted payer request without payer reissuance.
- Payer discovery permits direct issuance; accepted evidence produces a payer-issued VDC without any intermediary contact.
- An existing accepted VDC skips issuance while it remains valid under payer policy.

Check these failure cases:

- A protected operation has no VDC, or a client attempts to bypass a payer-required intermediary.
- Discovery information is unauthenticated, expired, or inconsistent with the selected issuer.
- Untrusted issuer, unapproved grant policy, invalid signature, wrong audience, or unsupported version.
- Invalid client credentials, missing or withdrawn provider delegation, or requests beyond the issuer's delegated policy.
- Expired token, revoked access, stale required status, incorrect key, or replayed DPoP proof.
- Wrong operation scope or a claim outside the authorized billing-provider relationship.
- Local payer blocks and attempts to widen access through unknown fields or record rules.
- Patient or claim data entering intermediary traffic, intermediary delegation evidence, operational logs, or external media feeds.

A production release still needs schemas, a trust-policy profile, a verifier implementation, and independent interoperability checks.
See the [pilot roadmap](../../docs/roadmap.md).
