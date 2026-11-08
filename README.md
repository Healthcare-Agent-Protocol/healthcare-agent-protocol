# Healthcare Agent Protocol

Healthcare Agent Protocol (HAP) is a draft protocol for agents that work with payers, providers, and revenue cycle management organizations.

HAP aims to define shared business operations, structured inputs and results, capability discovery, and access controls.
The same business contracts should support direct payer connections and connections through RCM organizations.

**Status: early design draft.** This repository contains design documents and proposed authentication profiles.
It includes claim-status schemas, invented examples, and contract checks.
It does not yet contain a complete protocol, executable client or payer service, or independent conformance suite.

## Start here

| Document | Contents |
| --- | --- |
| [Architecture](docs/architecture.md) | Protocol layers and authority boundaries |
| [Business capabilities](docs/capabilities.md) | Nine proposed business functions |
| [Claim status](spec/claims/claim-status.md) | Request and response schemas, follow-up question groups, and A2A 1.0 messages |
| [HAP-1 identity and access](spec/identity/hap-1.md) | Plain-language walkthrough of the partner-review draft |
| [HAP-1 HTTP reference](spec/identity/hap-1-http.md) | Payer-led discovery and both VDC issuance paths for version `1.0-draft.4` |
| [HAP-1 pre-call authentication](spec/identity/hap-1-voice.md) | Agent-initiated registration, payer-card discovery, and phone-call verification |
| [Roadmap](docs/roadmap.md) | Work required for the first complete pilot |
| [Contributing](CONTRIBUTING.md) | How to propose changes |
| [Security](SECURITY.md) | Data handling and vulnerability reporting |

## First pilot

The first proposed pilot is authorized claim-status access.
The [claim-status contract](spec/claims/claim-status.md) defines operation `rcm.claims.status.get`, business version `1.0-draft.1`.

1. The client discovers the payer's accepted issuers and credential acquisition requirements.
2. The client selects direct payer issuance or an intermediary path permitted by that payer.
3. The selected issuer verifies identity and provider delegation, then issues a scoped verifiable digital credential (VDC).
4. The client requests claim status and selected follow-up sections using the VDC and key proof.
5. The payer's verifier checks credential validity, operation scope, record limits, and local blocks.
6. The payer returns the authorized result with its source and observation time.

**VDCs are required; trusted intermediaries are optional at the protocol level.**
Each payer can require a designated intermediary, issue VDCs directly, or accept both paths.
An intermediary issues the VDC for its path; the payer accepts it without minting a replacement.
In the direct path, the payer validates accepted authentication and delegation evidence before issuing the VDC itself.
Claim data passes directly between client and payer. Payload encryption is an optional privacy pattern.

## Pre-call authentication

For phone calls, the agent discovers the payer-selected registration endpoint from a payer-published JSON card or authenticated configuration.
It authenticates to that service, registers the call, and gets a token plus correlation instructions before dialing.
The agent carries the correlation into the call through a negotiated method such as DTMF or spoken digits.
The payer checks it through a verification interface or gets a result from its existing verifier integration.
The endpoint can belong to the payer, Pindrop, or another approved service; HAP requires no universal registrar.
These are proposed roles, not claims of vendor support.

The call reference establishes call correlation, not permission to access patient or claim data.
The required VDC and payer authorization checks still apply before protected work.
Per-number NAPTR, RN/JIP, watermark, and STIR/SHAKEN correlation remain proposed extensions requiring agreed profiles.

## Inspiration and existing standards

The [Universal Commerce Protocol](https://ucp.dev/specification/overview/) inspires the separation of services, capabilities, extensions, and transport bindings.
HAP proposes healthcare business contracts with their own semantics.

[A2A](https://a2a-protocol.org/latest/specification/) is a proposed transport for agent tasks and results.
The HAP-1 identity core also supports deployments without A2A.

X12 005010 transactions, FHIR resources, and payer APIs can support integrations behind these contracts.
HAP does not change the submission, receipt, or adjudication semantics of those integrations.

This project does not claim affiliation with UCP or A2A, industry endorsement, or production readiness.

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
