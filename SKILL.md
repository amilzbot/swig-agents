---
name: swig-agents
description: Manage multi-agent treasuries on Solana using Swig smart wallets. Use when creating agent wallets with budgets, adding/removing agent roles, setting spending limits, or executing transactions through Swig. Covers CEO/worker hierarchies, SOL/token limits, program whitelists, and role-based access control. Includes CLI commands and SDK usage.
---

# Swig Agent Wallet Management

Manage hierarchical agent treasuries using Swig smart wallets on Solana.

## Overview

Swig enables role-based wallet control where:
- **Root** (human) has full control and oversight
- **CEO** (primary agent) can manage sub-agents within limits
- **Workers** operate within assigned budgets and program restrictions

## CLI Installation

```bash
# Clone and build
git clone https://github.com/anagrambuild/swig-wallet.git
cd swig-wallet
cargo build --release -p swig-cli

# Binary at: ./target/release/swig-cli
```

## CLI Quick Reference

### Create Treasury

```bash
swig-cli -u https://api.devnet.solana.com create \
  --authority-type Ed25519 \
  --authority <ROOT_PUBKEY> \
  --authority-kp <ROOT_BASE58_PRIVKEY> \
  --fee-payer <ROOT_BASE58_PRIVKEY> \
  --swig-id "my-treasury-001"
```

**Note:** `--authority-kp` and `--fee-payer` require base58-encoded private keys, not file paths.

### View Wallet

```bash
swig-cli -u https://api.devnet.solana.com view \
  --authority-type Ed25519 \
  --authority <PUBKEY> \
  --authority-kp <BASE58_PRIVKEY> \
  --swig-id "my-treasury-001"
```

### Add Authority (Agent)

```bash
swig-cli -u https://api.devnet.solana.com add-authority \
  --authority-type Ed25519 \
  --authority <ACTING_PUBKEY> \
  --authority-kp <ACTING_PRIVKEY> \
  --fee-payer <PAYER_PRIVKEY> \
  --swig-id "my-treasury-001" \
  --new-authority <NEW_AGENT_PUBKEY> \
  --new-authority-type Ed25519 \
  -p '{"type":"manageAuthority"}'
```

### Permission JSON Formats

```bash
# Simple permissions (no commas)
-p '{"type":"all"}'
-p '{"type":"manageAuthority"}'
-p '{"type":"allButManageAuthority"}'
-p '{"type":"programAll"}'
-p '{"type":"programCurated"}'

# Program whitelist
-p '{"type":"program","programId":"<PROGRAM_ADDRESS>"}'

# Note: Permissions with nested objects (sol limits with recurring)
# may have issues due to comma parsing. Use SDK for complex permissions.
```

### Check Balance

```bash
swig-cli -u https://api.devnet.solana.com balance \
  --authority-type Ed25519 \
  --authority <PUBKEY> \
  --authority-kp <BASE58_PRIVKEY> \
  --swig-id "my-treasury-001"
```

## SDK Usage (TypeScript)

### Install

```bash
git clone https://github.com/anagrambuild/swig-ts.git
cd swig-ts && bun install && bun run build:packages
```

### Execute Transfer

```typescript
import { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { fetchSwig, findSwigPda, getSignInstructions, getSwigWalletAddress } from '@swig-wallet/classic';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Encode Swig ID (must match CLI format)
const swigId = new Uint8Array(32);
const paddedId = 'my-treasury-001'.padEnd(32, '0');
for (let i = 0; i < 32; i++) swigId[i] = paddedId.charCodeAt(i);

// Fetch wallet
const swigAccountAddress = findSwigPda(swigId);
const swig = await fetchSwig(connection, swigAccountAddress);
const swigWalletAddress = await getSwigWalletAddress(swig);

// Find agent's role
const agentRole = swig.findRolesByEd25519SignerPk(agentKeypair.publicKey)[0];

// Create and sign transfer
const transferIx = SystemProgram.transfer({
  fromPubkey: swigWalletAddress,
  toPubkey: recipient,
  lamports: 1000000, // 0.001 SOL
});

const signIxs = await getSignInstructions(swig, agentRole.id, [transferIx]);
const tx = new Transaction().add(...signIxs);
const sig = await sendAndConfirmTransaction(connection, tx, [agentKeypair]);
```

## Permission Types

| Permission | JSON | Description |
|------------|------|-------------|
| All | `{"type":"all"}` | Full access (root only) |
| ManageAuthority | `{"type":"manageAuthority"}` | Can add/remove roles |
| AllButManageAuthority | `{"type":"allButManageAuthority"}` | Everything except role management |
| ProgramAll | `{"type":"programAll"}` | Can call any program |
| Program | `{"type":"program","programId":"..."}` | Specific program only |
| Sol | `{"type":"sol","amount":1000000000}` | SOL limit (lamports) |
| SolRecurring | `{"type":"sol","amount":...,"recurring":{"window":86400}}` | Daily limit |

## Example: Multi-Agent Treasury

```bash
# 1. Create treasury (as root)
swig-cli create --swig-id "agent-treasury" ...

# 2. Add CEO agent
swig-cli add-authority --swig-id "agent-treasury" \
  --new-authority <CEO_PUBKEY> \
  -p '{"type":"manageAuthority"}' -p '{"type":"programAll"}'

# 3. CEO adds worker (CEO signs)
swig-cli add-authority --swig-id "agent-treasury" \
  --authority <CEO_PUBKEY> --authority-kp <CEO_PRIVKEY> \
  --new-authority <WORKER_PUBKEY> \
  -p '{"type":"allButManageAuthority"}'

# 4. Fund the wallet
solana transfer <SWIG_WALLET_ADDRESS> 1 --url devnet

# 5. Worker executes transactions via SDK
```

## Token Transfers

```typescript
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Get token accounts
const treasuryTokenAccount = await getAssociatedTokenAddress(
  MINT_ADDRESS,
  swigWalletAddress,
  true // allowOwnerOffCurve for PDAs
);

// Create transfer instruction
const transferIx = createTransferInstruction(
  treasuryTokenAccount,      // from
  recipientTokenAccount,     // to
  swigWalletAddress,         // authority (the PDA)
  1_000_000n,               // amount (with decimals)
  [],
  TOKEN_PROGRAM_ID
);

// Sign through Swig
const signIxs = await getSignInstructions(swig, workerRole.id, [transferIx]);
const tx = new Transaction().add(...signIxs);
await sendAndConfirmTransaction(connection, tx, [workerKeypair]);
```

**Tested:** Worker with `AllButManageAuthority` successfully transferred USDC from treasury.

## Key Learnings

1. **ID Encoding**: Swig IDs are right-padded with '0' to 32 chars, then converted to bytes
2. **Fee Payer**: Transaction signers need SOL for gas fees (separate from treasury balance)
3. **Permissions**: Use simple JSON for CLI; SDK for complex permission structures
4. **Wallet Address**: The PDA that signs transactions is derived from the config address

## References

- `references/permissions.md` — Detailed permission configuration
- `references/architecture.md` — Multi-agent hierarchy patterns
- Swig CLI: https://github.com/anagrambuild/swig-wallet/tree/main/cli
- Swig SDK: https://github.com/anagrambuild/swig-ts
