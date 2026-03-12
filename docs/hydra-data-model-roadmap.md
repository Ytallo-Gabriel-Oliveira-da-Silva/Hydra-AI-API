# Hydra Data Model Roadmap

This file documents the next Prisma models recommended for Hydra API Panel and Hydra CLI Panel. It is a planning artifact first, not a migration execution file.

## Shared financial layer

### CreditWallet

Purpose:
- Keep current user balance available for API and CLI products

Suggested fields:
- `id`
- `userId`
- `balance`
- `currency`
- `createdAt`
- `updatedAt`

### CreditLedgerEntry

Purpose:
- Record every recharge, debit, refund, bonus and adjustment

Suggested fields:
- `id`
- `walletId`
- `userId`
- `kind` (`recharge`, `usage`, `refund`, `bonus`, `adjustment`)
- `amount`
- `referenceType`
- `referenceId`
- `metadata`
- `createdAt`

## Hydra API Panel

### ApiKey

Purpose:
- API credentials with scope and lifecycle control

Suggested fields:
- `id`
- `userId`
- `name`
- `prefix`
- `secretHash`
- `status`
- `scopes`
- `lastUsedAt`
- `expiresAt`
- `createdAt`
- `updatedAt`

### ApiRequestLog

Purpose:
- Observability, analytics and billing trace per request

Suggested fields:
- `id`
- `userId`
- `apiKeyId`
- `product` (`text`, `image`, `audio`)
- `endpoint`
- `statusCode`
- `latencyMs`
- `creditCost`
- `requestSize`
- `responseSize`
- `sourceIp`
- `userAgent`
- `metadata`
- `createdAt`

### ApiWebhookEndpoint

Purpose:
- Alerting for low balance, high error rate and operational events

Suggested fields:
- `id`
- `userId`
- `label`
- `url`
- `secret`
- `events`
- `active`
- `createdAt`
- `updatedAt`

## Hydra CLI Panel

### CliLicense

Purpose:
- Store purchased CLI licenses and lifecycle

Suggested fields:
- `id`
- `userId`
- `code`
- `status`
- `tier`
- `seatLimit`
- `deviceLimit`
- `updatesUntil`
- `issuedAt`
- `expiresAt`
- `metadata`
- `createdAt`
- `updatedAt`

### CliDeviceActivation

Purpose:
- Track machines activated by each license

Suggested fields:
- `id`
- `licenseId`
- `userId`
- `deviceName`
- `deviceFingerprint`
- `platform`
- `cliVersion`
- `lastSeenAt`
- `revokedAt`
- `createdAt`

### CliRelease

Purpose:
- Manage download channels and signed release metadata

Suggested fields:
- `id`
- `version`
- `channel`
- `platform`
- `arch`
- `downloadUrl`
- `checksum`
- `notes`
- `publishedAt`
- `createdAt`

### CliUsageEvent

Purpose:
- Telemetry and cost attribution for CLI commands

Suggested fields:
- `id`
- `userId`
- `licenseId`
- `command`
- `resourceType`
- `creditCost`
- `status`
- `deviceFingerprint`
- `metadata`
- `createdAt`

## Migration strategy

1. Create wallet and ledger first
2. Add API keys and request logs
3. Add CLI license and device activation tables
4. Add releases and usage telemetry
5. Only then connect dashboards and billing UI
