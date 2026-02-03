#!/usr/bin/env bun
/**
 * Create a new Swig treasury wallet
 * 
 * Usage:
 *   bun scripts/create-treasury.ts --root <ROOT_PUBKEY> --id <TREASURY_ID> [--payer <KEYPAIR_PATH>]
 */

import { parseArgs } from "util";
import { address } from "@solana/kit";
import { SwigClient, loadKeypair } from "./swig-client";

const DEVNET_RPC = "https://api.devnet.solana.com";
const DEVNET_WSS = "wss://api.devnet.solana.com";

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      root: { type: "string", short: "r" },
      id: { type: "string", short: "i" },
      payer: { type: "string", short: "p", default: "~/.config/solana/id.json" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help || !values.root || !values.id) {
    console.log(`
Create a new Swig treasury wallet

Usage:
  bun scripts/create-treasury.ts --root <ROOT_PUBKEY> --id <TREASURY_ID>

Options:
  -r, --root <pubkey>   Root authority public key (human owner)
  -i, --id <string>     Treasury identifier (max 32 chars)
  -p, --payer <path>    Path to payer keypair (default: ~/.config/solana/id.json)
  -h, --help            Show this help

Example:
  bun scripts/create-treasury.ts --root BiE2BPx... --id my-agent-treasury
`);
    process.exit(values.help ? 0 : 1);
  }

  const payerPath = values.payer!.replace("~", process.env.HOME || "");
  const payer = await loadKeypair(payerPath);

  console.log("🏦 Creating Swig Treasury Wallet\n");
  console.log(`Root Authority: ${values.root}`);
  console.log(`Treasury ID:    ${values.id}`);
  console.log(`Payer:          ${payer.address}\n`);

  const client = new SwigClient({
    rpcUrl: DEVNET_RPC,
    wssUrl: DEVNET_WSS,
  });

  try {
    const result = await client.createWallet({
      rootAuthority: address(values.root),
      id: values.id,
      payer,
    });

    console.log("✅ Treasury created!\n");
    console.log(`Signature:      ${result.signature}`);
    console.log(`Config Address: ${result.configAddress}`);
    console.log(`Wallet Address: ${result.walletAddress}`);
    console.log(`\nThe wallet address is the PDA that signs transactions.`);
    console.log(`Fund it with SOL to enable agent operations.`);
  } catch (error) {
    console.error("❌ Failed to create treasury:", error);
    process.exit(1);
  }
}

main();
