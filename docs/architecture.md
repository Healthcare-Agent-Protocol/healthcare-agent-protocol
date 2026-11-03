---
title: "Architecture"
description: "Protocol layers, delegated authority, and business outcomes."
---

HAP separates identity, access decisions, business operations, and transport.
This document describes the proposed architecture. It does not define a wire contract.

| Layer | Responsibility | Initial status |
| --- | --- | --- |
| Identity and access | Identify the client; let the payer grant scoped access within record limits | HAP-1 partner-review draft |
| Business contracts | Define operation inputs, results, evidence, and business outcomes | Proposed capability catalog |
| Discovery and versions | Advertise supported operations, versions, extensions, and access requirements | To be specified |
| Transport bindings | Map contracts to HTTP and A2A messages | HAP-1 HTTP proposal; business bindings to be specified |
| Integration adapters | Connect contracts to payer APIs, X12, FHIR, or assisted workflows | To be implemented |

## Identity and authority

The intermediary vouches for an enrolled client identity.
The payer decides whether that client may perform an operation on particular records.

The payer also needs an accepted basis for the client's authority to act for a provider.
That relationship can include a provider, an RCM organization, and an automation client.
The first business profile must define the evidence and checks for this relationship.
The current identity draft leaves these decisions within payer policy.

Record lookup values identify records. They do not independently establish delegated authority.
Identity attestations and payer access credentials have separate purposes.

## Business contracts

Each operation needs:

- A stable identifier and version.
- Defined inputs and results.
- Required access scopes and record boundaries.
- Service, provider, plan, location, and date limits where applicable.
- Explicit business outcomes and missing-information responses.
- Evidence with its source, observation time, and applicable dates.
- Retry, idempotency, error, and receipt rules.

A capability groups related operations.
An implementation must state the exact operations it supports.
Claim-status support does not imply support for claim submission or reprocessing.

## Tasks and business outcomes

An agent task can finish while the underlying business process remains pending.
For example, a successful claim-status lookup can report a claim awaiting adjudication.
An accepted reprocessing request does not establish that reprocessing finished or that payment occurred.

Business records can outlive individual A2A tasks.
The business contract must define durable references separately from transport task identifiers.

## Data boundaries

Claim data and payer verification values pass directly between the client and payer.
An identity intermediary receives identity information only.
An integration must state whether evidence comes from the payer, an intermediary observation, or a derived result.

All repository examples must use invented data.
Production records, customer scripts, and internal analysis exports do not belong in this repository.

## Design references

- [UCP overview](https://ucp.dev/specification/overview/): services, capabilities, versions, and extensions.
- [A2A specification](https://a2a-protocol.org/latest/specification/): agent discovery, tasks, messages, and results.
- [HAP-1](../spec/identity/hap-1.md): proposed identity and access establishment.
