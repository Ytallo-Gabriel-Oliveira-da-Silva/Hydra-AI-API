# Hydra Platform Architecture

## Objective

Organize the current HYDRA AI codebase so the main app, Hydra API Panel and Hydra CLI Panel can live in the same repository, reuse the same database and evolve without splitting the platform too early.

## Product surfaces

- `hydra-ai.shop`: main multimodal workspace and account area
- `api.hydra-ai.shop`: Hydra API Panel
- `cli.hydra-ai.shop`: Hydra CLI Panel

## Shared foundations

- Same `User`, `Session`, `Plan`, `PaymentTransaction` and `UserSettings`
- Single authentication flow across product surfaces
- Single billing backbone with Pix and card support
- Shared credit wallet for API and CLI consumption
- Shared governance, analytics and audit trail

## Recommended app structure

- `src/app/`: public pages, dashboard and future panel surfaces
- `src/app/api-panel/`: public structure and future business pages for Hydra API Panel
- `src/app/cli-panel/`: public structure and future business pages for Hydra CLI Panel
- `src/components/platform/`: reusable visual shell for platform surfaces
- `src/lib/platform.ts`: shared product metadata, modules, roadmap and domain planning
- `docs/`: product architecture, schema roadmap and deployment decisions

## Hydra API Panel modules

- Overview dashboard
- API keys and scopes
- Wallet and credit ledger
- Billing and recharges
- Requests, latency and error analytics
- Documentation and playground
- Alerts, rate limits and webhook notifications

## Hydra CLI Panel modules

- License management
- Device activations
- Downloads and releases
- Session and token management
- CLI usage telemetry
- Billing, wallet and command-level consumption
- Changelog and distribution channels

## Economic model

- API key creation can be free
- API execution depends on available credits
- CLI panel access can be free
- CLI product usage depends on license status
- CLI requests still consume credits because inference has real cost
- Text costs less than image and audio

## Implementation order

1. Hydra API Panel foundation
2. Credit wallet and request tracking
3. API keys, scopes and observability
4. Hydra CLI Panel foundation
5. License, devices, releases and usage telemetry
6. Hydra Cyber only after the API and CLI are operational
