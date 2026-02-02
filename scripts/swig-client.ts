/**
 * Swig Agent Wallet Client
 * 
 * Core client for managing multi-agent treasuries on Solana using Swig.
 */

import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  address,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  getSignatureFromTransaction,
  type Address,
  type KeyPairSigner,
  type IInstruction,
} from "@solana/kit";

// Swig Program ID
export const SWIG_PROGRAM_ID = address("SWiGsrbFun區Kt4gRMJbRvbuPBmR2jL3wfJLvboKuPk5");

export interface SwigConfig {
  rpcUrl: string;
  wssUrl: string;
}

export interface CreateWalletParams {
  rootAuthority: Address;
  id: string;
  payer: KeyPairSigner;
}

export interface AddAuthorityParams {
  walletAddress: Address;
  roleId: number;
  actingRoleId?: number;
  authority: Address;
  authorityType: 'ed25519' | 'secp256k1' | 'secp256r1';
  actions: Action[];
  payer: KeyPairSigner;
  actingSigner?: KeyPairSigner;
}

export interface Action {
  type: ActionType;
  amount?: bigint;
  window?: number;
  programId?: Address;
  destination?: Address;
}

export type ActionType =
  | 'All'
  | 'AllButManageAuthority'
  | 'ManageAuthority'
  | 'SolLimit'
  | 'SolRecurringLimit'
  | 'SolDestinationLimit'
  | 'SolRecurringDestinationLimit'
  | 'TokenLimit'
  | 'TokenRecurringLimit'
  | 'TokenDestinationLimit'
  | 'TokenRecurringDestinationLimit'
  | 'Program'
  | 'ProgramAll'
  | 'ProgramCurated'
  | 'ProgramScope'
  | 'SubAccount'
  | 'StakeLimit'
  | 'StakeRecurringLimit'
  | 'StakeAll';

export interface SignTransactionParams {
  walletAddress: Address;
  walletWalletAddress: Address; // The swig_wallet_address PDA
  roleId: number;
  signer: KeyPairSigner;
  instructions: IInstruction[];
  payer: KeyPairSigner;
}

/**
 * Derive the Swig wallet config PDA
 */
export function deriveSwigConfigAddress(id: Uint8Array): Address {
  // PDA: ["swig", id]
  // Placeholder - actual derivation requires program
  return address("11111111111111111111111111111111");
}

/**
 * Derive the Swig wallet address PDA (the actual signing authority)
 */
export function deriveSwigWalletAddress(configAddress: Address): Address {
  // PDA: ["swig_wallet_address", config]
  return address("11111111111111111111111111111111");
}

/**
 * Swig Agent Wallet Client
 */
export class SwigClient {
  private rpc: ReturnType<typeof createSolanaRpc>;
  private rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions>;
  private sendAndConfirm: ReturnType<typeof sendAndConfirmTransactionFactory>;

  constructor(config: SwigConfig) {
    this.rpc = createSolanaRpc(config.rpcUrl);
    this.rpcSubscriptions = createSolanaRpcSubscriptions(config.wssUrl);
    this.sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc: this.rpc,
      rpcSubscriptions: this.rpcSubscriptions,
    });
  }

  /**
   * Create a new Swig treasury wallet
   */
  async createWallet(params: CreateWalletParams): Promise<{
    signature: string;
    configAddress: Address;
    walletAddress: Address;
  }> {
    const idBytes = new TextEncoder().encode(params.id.padEnd(32, '\0').slice(0, 32));
    const idArray = new Uint8Array(32);
    idArray.set(idBytes);
    
    const configAddress = deriveSwigConfigAddress(idArray);
    const walletAddress = deriveSwigWalletAddress(configAddress);

    // Build create instruction
    // This is a placeholder - actual implementation requires swig-ts
    const createIx: IInstruction = {
      programAddress: SWIG_PROGRAM_ID,
      accounts: [
        { address: configAddress, role: 'writable' },
        { address: params.payer.address, role: 'writable_signer' },
        { address: walletAddress, role: 'writable' },
        { address: address("11111111111111111111111111111111"), role: 'readonly' },
      ],
      data: new Uint8Array([/* create instruction data */]),
    };

    const signature = await this.sendTransaction([createIx], params.payer);

    return {
      signature,
      configAddress,
      walletAddress,
    };
  }

  /**
   * Add an authority (agent) to the wallet
   */
  async addAuthority(params: AddAuthorityParams): Promise<{ signature: string }> {
    // Build add_authority instruction
    // Actual implementation requires serializing actions properly
    const addAuthorityIx: IInstruction = {
      programAddress: SWIG_PROGRAM_ID,
      accounts: [
        { address: params.walletAddress, role: 'writable' },
        { address: params.payer.address, role: 'writable_signer' },
        { address: address("11111111111111111111111111111111"), role: 'readonly' },
        ...(params.actingSigner ? [{ address: params.actingSigner.address, role: 'readonly_signer' as const }] : []),
      ],
      data: new Uint8Array([/* add authority instruction data */]),
    };

    const signers = params.actingSigner 
      ? [params.payer, params.actingSigner]
      : [params.payer];

    const signature = await this.sendTransaction([addAuthorityIx], params.payer, signers);

    return { signature };
  }

  /**
   * Remove an authority from the wallet
   */
  async removeAuthority(params: {
    walletAddress: Address;
    roleId: number;
    actingRoleId: number;
    payer: KeyPairSigner;
    actingSigner: KeyPairSigner;
  }): Promise<{ signature: string }> {
    const removeAuthorityIx: IInstruction = {
      programAddress: SWIG_PROGRAM_ID,
      accounts: [
        { address: params.walletAddress, role: 'writable' },
        { address: params.payer.address, role: 'writable_signer' },
        { address: address("11111111111111111111111111111111"), role: 'readonly' },
        { address: params.actingSigner.address, role: 'readonly_signer' },
      ],
      data: new Uint8Array([/* remove authority instruction data */]),
    };

    const signature = await this.sendTransaction(
      [removeAuthorityIx], 
      params.payer, 
      [params.payer, params.actingSigner]
    );

    return { signature };
  }

  /**
   * Sign and execute a transaction through the Swig wallet
   */
  async signTransaction(params: SignTransactionParams): Promise<{ signature: string }> {
    // Wrap instructions in Swig sign instruction
    // The wallet PDA becomes the signer for inner instructions
    const signIx: IInstruction = {
      programAddress: SWIG_PROGRAM_ID,
      accounts: [
        { address: params.walletAddress, role: 'writable' },
        { address: params.walletWalletAddress, role: 'writable' },
        { address: params.signer.address, role: 'readonly_signer' },
        // ... inner instruction accounts
      ],
      data: new Uint8Array([/* sign instruction with compact inner instructions */]),
    };

    const signature = await this.sendTransaction([signIx], params.payer, [params.payer, params.signer]);

    return { signature };
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(configAddress: Address): Promise<{
    exists: boolean;
    roles: number;
    lamports: bigint;
  }> {
    const accountInfo = await this.rpc.getAccountInfo(configAddress, {
      encoding: 'base64',
    }).send();

    if (!accountInfo.value) {
      return { exists: false, roles: 0, lamports: 0n };
    }

    return {
      exists: true,
      roles: 0, // Parse from account data
      lamports: accountInfo.value.lamports,
    };
  }

  /**
   * Send and confirm a transaction
   */
  private async sendTransaction(
    instructions: IInstruction[],
    feePayer: KeyPairSigner,
    signers?: KeyPairSigner[],
  ): Promise<string> {
    const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send();

    const message = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayer(feePayer.address, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstructions(instructions, tx),
    );

    const signedTx = await signTransactionMessageWithSigners(message);
    await this.sendAndConfirm(signedTx, { commitment: "confirmed" });

    return getSignatureFromTransaction(signedTx);
  }
}

/**
 * Load a keypair from a JSON file
 */
export async function loadKeypair(path: string): Promise<KeyPairSigner> {
  const file = Bun.file(path);
  const bytes = new Uint8Array(await file.json());
  return createKeyPairSignerFromBytes(bytes);
}

/**
 * Parse permission string into Action
 * Format: "Type" or "Type:amount:window" or "Type:address"
 */
export function parsePermission(permission: string): Action {
  const parts = permission.split(':');
  const type = parts[0] as ActionType;

  switch (type) {
    case 'SolLimit':
    case 'TokenLimit':
    case 'StakeLimit':
      return {
        type,
        amount: BigInt(Math.floor(parseFloat(parts[1] || '0') * 1e9)),
      };
    
    case 'SolRecurringLimit':
    case 'TokenRecurringLimit':
    case 'StakeRecurringLimit':
      return {
        type,
        amount: BigInt(Math.floor(parseFloat(parts[1] || '0') * 1e9)),
        window: parseInt(parts[2] || '86400'),
      };
    
    case 'SolDestinationLimit':
    case 'TokenDestinationLimit':
      return {
        type,
        destination: address(parts[1] || '11111111111111111111111111111111'),
        amount: BigInt(Math.floor(parseFloat(parts[2] || '0') * 1e9)),
      };
    
    case 'Program':
      return {
        type,
        programId: address(parts[1] || '11111111111111111111111111111111'),
      };
    
    default:
      return { type };
  }
}
