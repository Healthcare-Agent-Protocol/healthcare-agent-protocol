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

Read the [introduction](https://superdial-2e67a944.mintlify.app) and the two protocol pages:

- [Business capabilities](https://superdial-2e67a944.mintlify.app/docs/capabilities) covers the proposed RCM operations.
- [Identity and access](https://superdial-2e67a944.mintlify.app/spec/identity/hap-1) covers endpoint discovery through a payer JSON card or phone-number NAPTR lookup, API authentication, phone verification, and payer access checks.

The first operation is `rcm.claims.status.get`.
Its detailed [claim-status contract](spec/claims/claim-status.md), [schemas](schemas/claims/1.0-draft.1), and [invented examples](examples/claims/1.0-draft.1) stay in this repository.

To participate, read [Contributing](https://superdial-2e67a944.mintlify.app/community/contributing).
Report vulnerabilities using the [security policy](https://superdial-2e67a944.mintlify.app/community/security).

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
The site includes an introduction, business capabilities, identity and access, contributing, and security.
[.mintignore](.mintignore) excludes repository-only references from the website.

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
