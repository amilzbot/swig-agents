#!/usr/bin/env bun
/**
 * Add an agent role to a Swig treasury
 * 
 * Usage:
 *   bun scripts/add-agent.ts --wallet <WALLET> --role <ROLE_ID> --authority <PUBKEY> --permissions <PERMS>
 */

import { parseArgs } from "util";
import { address } from "@solana/kit";
import { SwigClient, loadKeypair, parsePermission } from "./swig-client";

const DEVNET_RPC = "https://api.devnet.solana.com";
const DEVNET_WSS = "wss://api.devnet.solana.com";

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      wallet: { type: "string", short: "w" },
      role: { type: "string", short: "r" },
      authority: { type: "string", short: "a" },
      permissions: { type: "string", short: "P" },
      "acting-role": { type: "string" },
      signer: { type: "string", short: "s" },
      payer: { type: "string", short: "p", default: "~/.config/solana/id.json" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help || !values.wallet || !values.role || !values.authority || !values.permissions) {
    console.log(`
Add an agent role to a Swig treasury

Usage:
  bun scripts/add-agent.ts -w <WALLET> -r <ROLE_ID> -a <AUTHORITY> -P <PERMISSIONS>

Options:
  -w, --wallet <address>       Swig wallet config address
  -r, --role <number>          Role ID to assign (1-255)
  -a, --authority <pubkey>     Agent's public key
  -P, --permissions <string>   Comma-separated permissions
      --acting-role <number>   Role ID of the signer (for delegated adds)
  -s, --signer <path>          Acting authority keypair (if not root)
  -p, --payer <path>           Payer keypair (default: ~/.config/solana/id.json)
  -h, --help                   Show this help

Permission formats:
  ManageAuthority              - Can manage other roles
  ProgramAll                   - Can call any program
  Program:<program_id>         - Can call specific program
  SolLimit:<amount>            - One-time SOL limit (in SOL)
  SolRecurringLimit:<sol>:<window> - Recurring limit (SOL per seconds)
  SolDestinationLimit:<dest>:<amount> - Limit to specific destination

Examples:
  # Add CEO with management and 10 SOL/day budget
  bun scripts/add-agent.ts -w 5yX... -r 1 -a CEO... -P "ManageAuthority,SolRecurringLimit:10:86400,ProgramAll"

  # CEO adds worker with 0.1 SOL/day
  bun scripts/add-agent.ts -w 5yX... -r 100 -a WORKER... --acting-role 1 -s ceo.json \\
    -P "SolRecurringLimit:0.1:86400,Program:DEFI_PROGRAM..."
`);
    process.exit(values.help ? 0 : 1);
  }

  const payerPath = values.payer!.replace("~", process.env.HOME || "");
  const payer = await loadKeypair(payerPath);

  const actingSigner = values.signer 
    ? await loadKeypair(values.signer.replace("~", process.env.HOME || ""))
    : undefined;

  const permissions = values.permissions.split(",").map(p => parsePermission(p.trim()));

  console.log("🤖 Adding Agent to Swig Treasury\n");
  console.log(`Wallet:      ${values.wallet}`);
  console.log(`Role ID:     ${values.role}`);
  console.log(`Authority:   ${values.authority}`);
  console.log(`Permissions: ${values.permissions}`);
  if (values["acting-role"]) {
    console.log(`Acting Role: ${values["acting-role"]}`);
  }
  console.log();

  const client = new SwigClient({
    rpcUrl: DEVNET_RPC,
    wssUrl: DEVNET_WSS,
  });

  try {
    const result = await client.addAuthority({
      walletAddress: address(values.wallet),
      roleId: parseInt(values.role),
      actingRoleId: values["acting-role"] ? parseInt(values["acting-role"]) : undefined,
      authority: address(values.authority),
      authorityType: "ed25519",
      actions: permissions,
      payer,
      actingSigner,
    });

    console.log("✅ Agent added!\n");
    console.log(`Signature: ${result.signature}`);
    console.log(`\nThe agent can now operate within its assigned permissions.`);
  } catch (error) {
    console.error("❌ Failed to add agent:", error);
    process.exit(1);
  }
}

main();
