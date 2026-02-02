---
name: swig-agents
description: Manage multi-agent treasuries on Solana using Swig smart wallets. Use when creating agent wallets with budgets, adding/removing agent roles, setting spending limits, or executing transactions through Swig. Covers CEO/sub-agent hierarchies, SOL/token limits, program whitelists, and role-based access control.
---

# Swig Agent Wallet Management

Manage hierarchical agent treasuries using Swig smart wallets on Solana.

## Overview

Swig enables role-based wallet control where:
- **Root** (human) has full control and oversight
- **CEO** (primary agent) can manage sub-agents within limits
- **Agents** operate within assigned budgets and program restrictions

## Quick Start

### 1. Create Treasury Wallet

```typescript
import { createSwigWallet, addAuthority } from './scripts/swig-client';

// Create wallet with root authority
const wallet = await createSwigWallet({
  rootAuthority: rootKeypair.publicKey,
  id: 'my-treasury',
});
```

### 2. Add CEO Agent

```typescript
await addAuthority(wallet, {
  roleId: 1,
  authority: ceoKeypair.publicKey,
  authorityType: 'ed25519',
  actions: [
    { type: 'ManageAuthority' },           // Can add/remove agents
    { type: 'SolRecurringLimit', amount: 10_000_000_000, window: 86400 }, // 10 SOL/day
    { type: 'ProgramAll' },                // Can call any program
  ],
});
```

### 3. Add Worker Agent

```typescript
await addAuthority(wallet, {
  roleId: 2,
  actingRoleId: 1, // CEO adds this
  authority: workerKeypair.publicKey,
  authorityType: 'ed25519',
  actions: [
    { type: 'SolRecurringLimit', amount: 100_000_000, window: 86400 }, // 0.1 SOL/day
    { type: 'Program', programId: ALLOWED_PROGRAM },
  ],
});
```

### 4. Execute Transaction

```typescript
await signTransaction(wallet, {
  roleId: 2,
  authority: workerKeypair,
  instruction: transferInstruction,
});
```

## Permission Types

| Permission | Description | Use Case |
|------------|-------------|----------|
| `SolLimit` | One-time SOL cap | Large purchase approval |
| `SolRecurringLimit` | SOL cap per time window | Daily operating budget |
| `SolDestinationLimit` | SOL only to specific addresses | Payroll, known vendors |
| `TokenLimit` | One-time token cap | Token spending limit |
| `TokenRecurringLimit` | Token cap per window | Daily token budget |
| `TokenDestinationLimit` | Tokens to specific addresses | Approved recipients |
| `Program` | Single program whitelist | Specific DeFi protocol |
| `ProgramAll` | Any program allowed | Full DeFi access |
| `ProgramScope` | Program with budget scope | Isolated program budget |
| `ManageAuthority` | Add/remove roles | CEO-level management |
| `All` | Full permissions | Root authority |
| `SubAccount` | Isolated sub-wallet | Separate accounting |

## Authority Types

- **ed25519**: Standard Solana keypair (recommended for agents)
- **secp256k1**: Ethereum-style signatures
- **secp256r1**: WebAuthn/Passkey compatible
- **programExec**: Authorize via preceding instruction

## Scripts

- `scripts/swig-client.ts` — Core client for wallet operations
- `scripts/create-treasury.ts` — Create new treasury wallet
- `scripts/add-agent.ts` — Add agent with budget
- `scripts/remove-agent.ts` — Remove agent role
- `scripts/sign-tx.ts` — Execute transaction through wallet

## References

- `references/permissions.md` — Detailed permission configuration
- `references/architecture.md` — Multi-agent hierarchy patterns

## CLI Usage

```bash
# Create treasury
bun scripts/create-treasury.ts --root <ROOT_PUBKEY> --id my-treasury

# Add CEO agent
bun scripts/add-agent.ts --wallet <WALLET> --role 1 --authority <CEO_PUBKEY> \
  --permissions ManageAuthority,SolRecurringLimit:10:86400,ProgramAll

# Add worker agent (CEO signs)
bun scripts/add-agent.ts --wallet <WALLET> --role 2 --acting-role 1 \
  --authority <WORKER_PUBKEY> --signer <CEO_KEYPAIR> \
  --permissions SolRecurringLimit:0.1:86400

# Execute transaction
bun scripts/sign-tx.ts --wallet <WALLET> --role 2 --signer <WORKER_KEYPAIR> \
  --instruction <BASE64_IX>
```

## Error Handling

Common errors:
- `PermissionDenied` — Role lacks required permission
- `InsufficientBalance` — Exceeds budget limit
- `SessionExpired` — Re-authenticate required
- `InvalidAuthority` — Wrong signer for role
