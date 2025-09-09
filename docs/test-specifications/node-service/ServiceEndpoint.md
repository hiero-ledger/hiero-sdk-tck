---
title: ServiceEndpoint Structure
parent: Node Service
nav_order: 2
---

# ServiceEndpoint Structure

## Description

The `ServiceEndpoint` structure defines the parameters for service endpoints used in node creation transactions. This structure is used for both gossip endpoints and service endpoints.

## Structure Definition

| Parameter Name | Type   | Required/Optional | Description/Notes                                            |
| -------------- | ------ | ----------------- | ------------------------------------------------------------ |
| ipAddressV4    | string | optional          | IPv4 address as hex string. |
| port           | number | optional          | Port number for the service endpoint.                        |
| domainName     | string | optional          | Fully qualified domain name (max 253 characters).            |

## Usage Notes

- Either `ipAddressV4` or `domainName` must be provided, but not both in the same endpoint
- The `port` field is always required
- Domain names are limited to a maximum of 253 characters
- IPv4 addresses should be provided as standard dotted decimal notation strings
