# Swig Multi-Agent Treasury

Swig enables role-based multi-signature wallets on Solana. Perfect for agent hierarchies where different agents need different spending permissions.

## Quick Start

### 1. Clone and Build Swig SDK

```bash
# Clone the Swig TypeScript SDK
git clone https://github.com/anagrambuild/swig-ts.git
cd swig-ts

# Install bun (required for workspace deps)
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

# Install dependencies and build packages
bun install
bun run build:packages
```

**Critical:** Must use their repo environment due to workspace dependencies. The `@swig-wallet/kit` package references `workspace:*` dependencies that won't resolve outside their monorepo.

### 2. Create Treasury

```typescript
import {
  Actions,
  createEd25519AuthorityInfo,
  getCreateSwigInstruction,
  findSwigPda,
} from '@swig-wallet/kit';

// Generate treasury ID and address
const treasuryId = randomBytes(32);
const treasuryAddress = await findSwigPda(treasuryId);

// Create with initial authority (you)
const rootActions = Actions.set().all().get(); // Full permissions
const rootAuthority = createEd25519AuthorityInfo(rootSigner.address);

const createIx = await getCreateSwigInstruction({
  payer: rootSigner.address,
  id: treasuryId,
  authorityInfo: rootAuthority,
  actions: rootActions,
});

await sendTransaction([createIx]);
```

### 3. Add Agent Roles

```typescript
import { getAddAuthorityInstructions } from '@swig-wallet/kit';

// Add Manager (can manage roles, but not spend)
const managerActions = Actions.set().manageAuthority().get();
const addManagerIxs = await getAddAuthorityInstructions(
  swig,
  rootRoleId,
  createEd25519AuthorityInfo(managerSigner.address),
  managerActions,
  { payer: rootSigner.address }
);

// Add Worker (can spend, but not manage roles)
const workerActions = Actions.set().programAll().get();
const addWorkerIxs = await getAddAuthorityInstructions(
  swig,
  rootRoleId,
  createEd25519AuthorityInfo(workerSigner.address),
  workerActions,
  { payer: rootSigner.address }
);

// Add Budget-Limited Agent (spend up to 0.1 SOL)
const budgetActions = Actions.set()
  .solLimit({ amount: LAMPORTS_PER_SOL / 10n })
  .get();
const addBudgetIxs = await getAddAuthorityInstructions(
  swig,
  rootRoleId,
  createEd25519AuthorityInfo(budgetSigner.address),
  budgetActions,
  { payer: rootSigner.address }
);
```

### 4. Agent Transfers

```typescript
import { getSignInstructions } from '@swig-wallet/kit';
import { getTransferSolInstruction } from '@solana-program/system';

// Agent creates their desired transaction
const transferIx = getTransferSolInstruction({
  source: treasuryWalletAddress,
  destination: recipient,
  amount: lamports(5_000_000n), // 0.005 SOL
});

// Get signing instructions for this agent's role
const signIxs = await getSignInstructions(
  swig,                    // Treasury state
  agentRoleId,            // Which role is signing
  [transferIx],           // What they want to do
  false,                  // Not simulation
  { payer: agentSigner.address }
);

// Build and send transaction
const message = pipe(
  createTransactionMessage({ version: 0 }),
  m => setTransactionMessageFeePayerSigner(agentSigner, m),
  m => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
  m => appendTransactionMessageInstructions(signIxs, m),
);

const signed = await signTransactionMessageWithSigners(message);
const signature = await sendTransaction(signed);
```

## Permission Types

| Action | Description |
|--------|-------------|
| `Actions.set().all().get()` | Full access |
| `Actions.set().manageAuthority().get()` | Can add/remove roles |
| `Actions.set().programAll().get()` | Can call any program |
| `Actions.set().solLimit({ amount }).get()` | SOL spending limit |
| `Actions.set().tokenLimit({ mint, amount }).get()` | Token spending limit |

## Treasury Inspection

```typescript
import { fetchSwig, getSwigWalletAddress } from '@swig-wallet/kit';

const swig = await fetchSwig(rpc, treasuryAddress);
const walletAddress = await getSwigWalletAddress(swig);
const balance = await rpc.getBalance(walletAddress).send();

console.log(`Treasury: ${treasuryAddress}`);
console.log(`Wallet: ${walletAddress}`);
console.log(`Balance: ${Number(balance.value) / 1e9} SOL`);
console.log(`Roles: ${swig.roles.length}`);

swig.roles.forEach((role, i) => {
  console.log(`  Role ${role.id}: ${role.authority}`);
  console.log(`    Can spend SOL: ${role.actions.canSpendSol}`);
  console.log(`    Can manage: ${role.actions.canManageAuthority}`);
});
```

## Working Example

See `/examples/basic/kit/test-nix-treasury.ts` in the swig-ts repo for a complete working example that:
- Connects to a live treasury
- Inspects all roles and permissions  
- Shows the exact structure for agent transfers

## Key Insights

**✅ What Works:**
- Multi-role permission management
- Budget limits per agent
- Program-specific permissions
- Real-time balance/role inspection

**⚠️ Dependencies:**
- Must use swig-ts repo environment
- Requires `bun` for workspace deps
- `@swig-wallet/kit` not published standalone yet

**🔥 Perfect For:**
- Agent hierarchies with different permission levels
- Automated treasury management
- Budget-controlled AI agents
- Multi-signature workflows

## Architecture

```
Treasury (PDA) → Wallet Address (derived)
├── Role 0: Root (All permissions)
├── Role 1: Manager (ManageAuthority only)  
├── Role 2: Worker1 (ProgramAll)
├── Role 3: Worker2 (SOL limit: 0.1)
└── Role 4: Worker3 (Token limit: USDC)
```

Each agent holds a keypair corresponding to one role. When they want to transact, they call `getSignInstructions()` with their role ID, and Swig validates their permissions before allowing the action.

## Next Steps

1. **Load agent keypairs** from secure storage
2. **Implement permission checks** in your agent logic
3. **Set spending limits** appropriate for each agent's role
4. **Monitor treasury activity** via role-based logs

This creates a complete multi-agent financial system on Solana! 🌑