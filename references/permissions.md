# Swig Permissions Reference

Detailed configuration for all Swig permission types.

## Table of Contents
- [Spending Limits](#spending-limits)
- [Program Permissions](#program-permissions)
- [Authority Management](#authority-management)
- [Sub-Accounts](#sub-accounts)
- [Staking](#staking)

---

## Spending Limits

### SolLimit

One-time SOL spending cap. Resets only when explicitly updated.

```typescript
{
  type: 'SolLimit',
  amount: 1_000_000_000n, // 1 SOL in lamports
}
```

### SolRecurringLimit

SOL spending cap that resets after a time window.

```typescript
{
  type: 'SolRecurringLimit',
  amount: 1_000_000_000n, // 1 SOL
  window: 86400,          // 24 hours in seconds
}
```

**Use cases:**
- Daily operating budget: `{ amount: 100_000_000n, window: 86400 }` (0.1 SOL/day)
- Weekly allowance: `{ amount: 5_000_000_000n, window: 604800 }` (5 SOL/week)
- Hourly rate limit: `{ amount: 10_000_000n, window: 3600 }` (0.01 SOL/hour)

### SolDestinationLimit

SOL spending allowed only to specific addresses.

```typescript
{
  type: 'SolDestinationLimit',
  destination: address('payroll-wallet-address'),
  amount: 10_000_000_000n, // 10 SOL max to this address
}
```

**Note:** Can add multiple `SolDestinationLimit` actions for different addresses.

### SolRecurringDestinationLimit

Combines destination restriction with recurring window.

```typescript
{
  type: 'SolRecurringDestinationLimit',
  destination: address('vendor-address'),
  amount: 1_000_000_000n,
  window: 86400,
}
```

---

## Token Limits

Same patterns as SOL limits, but for SPL tokens:

- `TokenLimit` — One-time cap
- `TokenRecurringLimit` — Resets per window
- `TokenDestinationLimit` — Specific addresses only
- `TokenRecurringDestinationLimit` — Both restrictions

```typescript
{
  type: 'TokenRecurringLimit',
  amount: 1000_000_000n, // 1000 tokens (6 decimals)
  window: 86400,
}
```

---

## Program Permissions

### Program

Whitelist a single program the role can interact with.

```typescript
{
  type: 'Program',
  programId: address('DeFi-protocol-address'),
}
```

### ProgramAll

Allow interaction with any program. Use for trusted agents.

```typescript
{
  type: 'ProgramAll',
}
```

### ProgramCurated

Allow a curated list of programs (configured at wallet level).

```typescript
{
  type: 'ProgramCurated',
}
```

### ProgramScope

Scoped budget for a specific program. Spending against this program draws from an isolated balance.

```typescript
{
  type: 'ProgramScope',
  programId: address('gaming-program'),
  balance: 5_000_000_000n, // 5 SOL budget for this program
}
```

---

## Authority Management

### ManageAuthority

Allows adding, removing, and updating roles. **The "CEO" permission.**

```typescript
{
  type: 'ManageAuthority',
}
```

**Restrictions:**
- Cannot remove root authority (roleId 0)
- Cannot grant permissions beyond own permissions
- Cannot modify roles with higher privilege

### All

Full permissions. Use only for root authority.

```typescript
{
  type: 'All',
}
```

### AllButManageAuthority

Everything except role management. Useful for trusted operators.

```typescript
{
  type: 'AllButManageAuthority',
}
```

---

## Sub-Accounts

### SubAccount

Create and manage isolated sub-accounts with separate balances.

```typescript
{
  type: 'SubAccount',
}
```

Sub-accounts:
- Have their own lamport balance
- Can be toggled active/inactive
- Useful for accounting separation
- Withdrawals require SubAccount permission

---

## Staking

### StakeLimit

One-time stake/unstake cap.

```typescript
{
  type: 'StakeLimit',
  amount: 100_000_000_000n, // 100 SOL
}
```

### StakeRecurringLimit

Recurring stake operations limit.

```typescript
{
  type: 'StakeRecurringLimit',
  amount: 10_000_000_000n,
  window: 604800, // Weekly
}
```

### StakeAll

Full staking permissions without limits.

```typescript
{
  type: 'StakeAll',
}
```

---

## Permission Combinations

### Worker Agent (Conservative)

```typescript
actions: [
  { type: 'SolRecurringLimit', amount: 100_000_000n, window: 86400 },
  { type: 'Program', programId: APPROVED_PROGRAM },
]
```

### Operator Agent (Moderate)

```typescript
actions: [
  { type: 'SolRecurringLimit', amount: 1_000_000_000n, window: 86400 },
  { type: 'TokenRecurringLimit', amount: 10000_000_000n, window: 86400 },
  { type: 'ProgramCurated' },
]
```

### CEO Agent (High Trust)

```typescript
actions: [
  { type: 'ManageAuthority' },
  { type: 'SolRecurringLimit', amount: 10_000_000_000n, window: 86400 },
  { type: 'ProgramAll' },
]
```

### DeFi Agent (Protocol-Specific)

```typescript
actions: [
  { type: 'SolRecurringLimit', amount: 5_000_000_000n, window: 86400 },
  { type: 'Program', programId: RAYDIUM_PROGRAM },
  { type: 'Program', programId: JUPITER_PROGRAM },
  { type: 'TokenRecurringLimit', amount: 100000_000_000n, window: 86400 },
]
```
