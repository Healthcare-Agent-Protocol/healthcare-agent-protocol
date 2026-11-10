# Healthcare Agent Protocol

Healthcare Agent Protocol (HAP) is a draft protocol for agents that work with payers, providers, and revenue cycle management organizations.

HAP-1 is intended to cover RCM business operations, structured inputs and results, capability discovery, and access controls.
Its proposed scope includes eligibility, authorizations, claims, payments, and appeals.
The same business contracts should support direct payer connections and connections through RCM organizations.

**Status: early design draft.** This repository contains design documents and proposed authentication profiles.
It includes claim-status schemas, invented examples, and contract checks.
It does not yet contain a complete protocol, executable client or payer service, or independent conformance suite.

The protocol and current business contract are pinned to `1.0-draft.1` during draft review.

## Start here

| Document | Contents |
| --- | --- |
| [Architecture](docs/architecture.md) | Protocol layers and authority boundaries |
| [Business capabilities](docs/capabilities.md) | Nine proposed business functions |
| [Claim status](spec/claims/claim-status.md) | Request and response schemas, follow-up question groups, and A2A 1.0 messages |
| [HAP-1 identity and access](spec/identity/hap-1.md) | Identity and access profile supporting the RCM business operations |
| [HAP-1 HTTP access](spec/identity/hap-1-http.md) | Standard API authentication and payer-side authorization for version `1.0-draft.1` |
| [HAP-1 pre-call authentication](spec/identity/hap-1-voice.md) | Agent-initiated registration, payer-card discovery, and phone-call verification |
| [Contributing](CONTRIBUTING.md) | Join GitHub Discussions and the HAP-1 organization |
| [Security](SECURITY.md) | Data handling and vulnerability reporting |

## First pilot

The first proposed pilot is authorized claim-status access.
The [claim-status contract](spec/claims/claim-status.md) defines operation `rcm.claims.status.get`, business version `1.0-draft.1`.

1. The client discovers the payer's registration service, accepted authentication, and destination policy.
2. The client authenticates through an API and registers the upcoming call.
3. The service stores the authenticated registration and returns a short-lived call reference.
4. The client calls the payer and sends the reference through the agreed method.
5. The payer verifies the call and checks provider delegation, permitted actions, record limits, and current local blocks.
6. The payer returns the authorized result with its source and observation time.

**HAP-1 draft 1 uses ordinary API authentication and payer-side authorization.**
Identity, provider delegation, and permissions can stay with the payer or its approved service.
Each payer can run verification directly or select an approved partner.
HTTP clients use the payer's published security scheme, such as OAuth, without another HAP credential exchange.
Claim data passes directly between client and payer. Payload encryption is an optional privacy pattern.

## Pre-call authentication

For phone calls, the agent discovers the payer-selected registration endpoint from a payer-published JSON card or authenticated configuration.
It authenticates to that service, registers the call, and gets a token plus correlation instructions before dialing.
The agent carries the correlation into the call through a negotiated method such as DTMF or spoken digits.
The payer checks it through a verification interface or gets a result from its existing verifier integration.
The endpoint can belong to the payer, Pindrop, or another approved service; HAP requires no universal registrar.
These are proposed roles, not claims of vendor support.

The call reference establishes call correlation, not permission to access patient or claim data.
The payer checks trusted server-side authorization records or its existing provider-verification workflow before protected work.
API authentication, verified delegation, and record-access checks remain required.
Per-number NAPTR, RN/JIP, watermark, and STIR/SHAKEN correlation remain proposed extensions requiring agreed profiles.

## Existing standards

[A2A](https://a2a-protocol.org/latest/specification/) is a proposed transport for agent tasks and results.
The protocol design also allows deployments without A2A.

X12 005010 transactions, FHIR resources, and payer APIs can support integrations behind these contracts.
HAP does not change the submission, receipt, or adjudication semantics of those integrations.

This project does not claim affiliation with A2A, industry endorsement, or production readiness.

## License

This repository uses the [Apache License 2.0](LICENSE).

## Documentation site

The documentation uses [Mintlify](https://www.mintlify.com/docs/quickstart).
Read the [live documentation](https://superdial-2e67a944.mintlify.app).
Site settings and navigation live in [docs.json](docs.json).
Pages use the existing Markdown documents and the MDX introduction pages.

Use Node.js 24 LTS.

```bash
npm ci
npm run docs:dev
```

Open `http://localhost:3000`.

Before a push, run:

```bash
npm run contracts:check
npm run docs:validate
npm run docs:links
```

Contract checks validate the versioned schemas and invented request/response examples.
They include failure cases for matching, payment facts, evidence, and incomplete service lines.

### Publishing

The connected Mintlify project deploys from `main` at the repository root.
Manage the connection in the project's [Git Settings](https://app.mintlify.com/settings/project/git-settings).

GitHub Actions checks the documentation build and internal links.
The temporary agent deployment workflow applied only before the site was claimed.
