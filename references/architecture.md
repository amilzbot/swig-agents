# Multi-Agent Treasury Architecture

Patterns for organizing hierarchical agent systems with Swig.

## Table of Contents
- [Hierarchy Models](#hierarchy-models)
- [Role Design Patterns](#role-design-patterns)
- [Security Considerations](#security-considerations)
- [Scaling Patterns](#scaling-patterns)

---

## Hierarchy Models

### Flat Model

Simple setup with root + workers. Best for small teams.

```
ROOT (human)
├── Agent 1 (worker)
├── Agent 2 (worker)
└── Agent 3 (worker)
```

**Characteristics:**
- Root directly manages all agents
- No delegation of management
- Simple but doesn't scale

### Two-Tier Model

Root + CEO + workers. Best for autonomous agent systems.

```
ROOT (human)
└── CEO (primary agent)
    ├── Agent 1 (worker)
    ├── Agent 2 (worker)
    └── Agent 3 (worker)
```

**Characteristics:**
- CEO can add/remove workers
- Human only intervenes when needed
- CEO has higher budget than workers
- CEO cannot remove root

### Department Model

Multiple CEOs with domain-specific teams.

```
ROOT (human)
├── DeFi CEO
│   ├── Trader Agent
│   └── Liquidity Agent
├── Social CEO
│   ├── Twitter Agent
│   └── Discord Agent
└── Ops CEO
    ├── Monitor Agent
    └── Alert Agent
```

**Characteristics:**
- Domain isolation
- Separate budgets per department
- CEOs cannot manage other departments
- Root can reallocate between departments

---

## Role Design Patterns

### Role ID Conventions

```
0     — Root (human, immutable)
1-9   — CEO tier (managers)
10-99 — Senior agents (elevated trust)
100+  — Worker agents (limited scope)
```

### Budget Ratios

Suggested budget hierarchy:
- Root: Unlimited
- CEO: 10-100x worker budget
- Senior: 2-5x worker budget
- Worker: Base unit

Example with 1 SOL/day base:
- Root: Unlimited
- CEO: 10 SOL/day
- Senior: 3 SOL/day
- Worker: 1 SOL/day

### Progressive Trust

Start agents with minimal permissions, expand based on performance:

**Stage 1: Probation**
```typescript
actions: [
  { type: 'SolRecurringLimit', amount: 10_000_000n, window: 86400 }, // 0.01 SOL/day
  { type: 'Program', programId: SINGLE_PROGRAM },
]
```

**Stage 2: Established**
```typescript
actions: [
  { type: 'SolRecurringLimit', amount: 100_000_000n, window: 86400 }, // 0.1 SOL/day
  { type: 'ProgramCurated' },
]
```

**Stage 3: Trusted**
```typescript
actions: [
  { type: 'SolRecurringLimit', amount: 1_000_000_000n, window: 86400 }, // 1 SOL/day
  { type: 'ProgramAll' },
]
```

---

## Security Considerations

### Principle of Least Privilege

- Start with minimal permissions
- Only grant what's necessary for the task
- Use destination limits when recipients are known
- Prefer `Program` over `ProgramAll`

### Budget Isolation

Use `ProgramScope` for high-risk operations:
```typescript
{
  type: 'ProgramScope',
  programId: RISKY_DEFI_PROGRAM,
  balance: 1_000_000_000n, // Isolated 1 SOL budget
}
```

If the program drains funds, only the scoped budget is at risk.

### Monitoring Points

Track these events:
- Role additions/removals
- Budget limit hits
- Failed permission checks
- Unusual spending patterns

### Emergency Procedures

1. **Pause Agent**: Remove all actions except read-only
2. **Revoke Access**: Remove authority entirely
3. **Freeze Wallet**: Root removes all non-root authorities
4. **Recovery**: Root can always restore from known-good state

---

## Scaling Patterns

### Agent Spawning

CEO pattern for dynamic agent creation:

```typescript
// CEO creates new worker
await client.addAuthority({
  walletAddress,
  roleId: getNextRoleId(), // e.g., 100, 101, 102...
  actingRoleId: 1, // CEO
  authority: newAgentPubkey,
  actions: WORKER_TEMPLATE_ACTIONS,
  payer,
  actingSigner: ceoSigner,
});
```

### Multi-Wallet Architecture

For large systems, use multiple Swig wallets:

```
Master Wallet (human root)
├── DeFi Treasury (Swig wallet 1)
│   └── DeFi agents
├── Operations Treasury (Swig wallet 2)
│   └── Ops agents
└── Reserve (Swig wallet 3)
    └── CEO-only access
```

### Cross-Wallet Transfers

CEO can move funds between wallets within limits:

```typescript
// CEO transfers from ops to defi treasury
await client.signTransaction({
  walletAddress: opsTreasury,
  roleId: 1, // CEO role in ops
  signer: ceoSigner,
  instructions: [
    transferInstruction(opsTreasury, defiTreasury, amount)
  ],
});
```

---

## Example: Autonomous Agent Organization

Complete setup for a self-managing agent system:

```typescript
// 1. Create treasury
const treasury = await client.createWallet({
  rootAuthority: humanPubkey,
  id: 'agent-org-treasury',
  payer: humanSigner,
});

// 2. Add CEO (Nix)
await client.addAuthority({
  walletAddress: treasury.configAddress,
  roleId: 1,
  authority: nixPubkey,
  actions: [
    { type: 'ManageAuthority' },
    { type: 'SolRecurringLimit', amount: 50_000_000_000n, window: 86400 }, // 50 SOL/day
    { type: 'ProgramAll' },
  ],
  payer: humanSigner,
});

// 3. CEO adds workers
for (const worker of workers) {
  await client.addAuthority({
    walletAddress: treasury.configAddress,
    roleId: worker.roleId,
    actingRoleId: 1,
    authority: worker.pubkey,
    actions: [
      { type: 'SolRecurringLimit', amount: worker.dailyBudget, window: 86400 },
      ...worker.programs.map(p => ({ type: 'Program', programId: p })),
    ],
    payer: operationsSigner,
    actingSigner: nixSigner,
  });
}

// 4. Workers operate autonomously within limits
// 5. CEO monitors and adjusts as needed
// 6. Human intervenes only for major changes
```
