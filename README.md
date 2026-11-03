# Healthcare Agent Protocol

Healthcare Agent Protocol (HAP) is a draft protocol for agents that work with payers, providers, and revenue cycle management organizations.

HAP aims to define shared business operations, structured inputs and results, capability discovery, and access controls.
The same business contracts should support direct payer connections and connections through RCM organizations.

**Status: early design draft.** This repository contains design documents and a proposed authentication binding.
It does not yet contain a complete protocol, executable reference implementation, or conformance suite.

## Start here

| Document | Contents |
| --- | --- |
| [Architecture](docs/architecture.md) | Protocol layers and authority boundaries |
| [Business capabilities](docs/capabilities.md) | Nine proposed business functions |
| [HAP-1 identity and access](spec/identity/hap-1.md) | Plain-language walkthrough of the partner-review draft |
| [HAP-1 HTTP reference](spec/identity/hap-1-http.md) | Implementation details for version `1.0-draft.1` |
| [Roadmap](docs/roadmap.md) | Work required for the first complete pilot |
| [Contributing](CONTRIBUTING.md) | How to propose changes |
| [Security](SECURITY.md) | Data handling and vulnerability reporting |

## First pilot

The first proposed pilot is authorized claim-status access.

1. An identity intermediary authenticates an enrolled client.
2. The payer validates the client's identity.
3. The payer establishes the client's authority to access the requested records.
4. The payer issues a scoped access grant.
5. The client requests claim status directly from the payer.
6. The payer returns a structured result with its source and observation time.

The intermediary handles identity only. Claim data and payer verification values pass directly between the client and payer.

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
Read the [live documentation](https://healthcare-agent-protocol.mintlify.site).
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
npm run docs:validate
npm run docs:links
```

### Publishing

The Mintlify site is claimed. Connect this repository in the project's
[Git Settings](https://app.mintlify.com/settings/project/git-settings) to deploy future changes.
Select branch `main`. Keep the documentation directory at the repository root.

GitHub Actions checks the documentation build and internal links.
The temporary agent deployment workflow applied only before the site was claimed.
