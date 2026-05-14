/**
 * Stellar Testnet Service
 * WARNING: This module handles secret keys in plaintext for TESTNET/MVP purposes only.
 * NEVER use this approach in production. In production:
 * - Use a Hardware Security Module (HSM) or KMS for key storage
 * - Never store or transmit secret keys to the client
 * - Use encrypted vault storage
 */

import * as StellarSdk from "@stellar/stellar-sdk";

const HORIZON_URL =
  process.env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL =
  process.env.STELLAR_FRIENDBOT_URL ?? "https://friendbot.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ??
  "Test SDF Network ; September 2015";

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface Keypair {
  publicKey: string;
  secretKey: string;
}

export interface PaymentParams {
  sourceSecret: string;
  destinationPublicKey: string;
  amount: string;
  memo?: string;
}

export interface GenericPaymentParams {
  sourceSecret: string;
  destinationPublicKey: string;
  amount: string;
  assetCode: string;
  assetIssuer?: string;
  memo?: string;
}

export interface PaymentResult {
  hash: string;
  explorerUrl: string;
}

export interface AssetBalance {
  assetCode: string;
  assetIssuer?: string;
  balance: string;
  isNative: boolean;
}

export interface TrustlineParams {
  secretKey: string;
  assetCode: string;
  assetIssuer: string;
  limit?: string;
}

export interface SponsoredTrustlineParams {
  sponsorSecret: string;
  userSecret: string;
  assets: Array<{ assetCode: string; assetIssuer: string }>;
}

// ─── Keypair & Funding ─────────────────────────────────────────────────────────

export function createKeypair(): Keypair {
  const keypair = StellarSdk.Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}

export async function fundTestnetAccount(publicKey: string): Promise<boolean> {
  const response = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Friendbot error: ${response.status} — ${text}`);
  }
  return true;
}

// ─── Balance ───────────────────────────────────────────────────────────────────

/** Returns only XLM balance (legacy — use getAccountBalances for multi-asset) */
export async function getAccountBalance(publicKey: string): Promise<string> {
  try {
    const account = await server.loadAccount(publicKey);
    const xlm = account.balances.find(
      (b: { asset_type: string }) => b.asset_type === "native"
    ) as { balance: string } | undefined;
    return xlm ? xlm.balance : "0";
  } catch (err: unknown) {
    if (_isNotFound(err)) return "0";
    throw err;
  }
}

/** Returns all asset balances for an account (XLM + trustlines) */
export async function getAccountBalances(
  publicKey: string
): Promise<AssetBalance[]> {
  try {
    const account = await server.loadAccount(publicKey);
    return account.balances.map((b: {
      asset_type: string;
      asset_code?: string;
      asset_issuer?: string;
      balance: string;
    }) => ({
      assetCode: b.asset_type === "native" ? "XLM" : (b.asset_code ?? ""),
      assetIssuer: b.asset_type === "native" ? undefined : b.asset_issuer,
      balance: b.balance,
      isNative: b.asset_type === "native",
    }));
  } catch (err: unknown) {
    if (_isNotFound(err)) {
      return [{ assetCode: "XLM", balance: "0", isNative: true }];
    }
    throw err;
  }
}

// ─── Payments ──────────────────────────────────────────────────────────────────

/** Generic payment — supports XLM and any Stellar asset (USDC, TESOURO, etc.) */
export async function sendPayment(
  params: GenericPaymentParams
): Promise<PaymentResult> {
  const { sourceSecret, destinationPublicKey, amount, assetCode, assetIssuer, memo } = params;

  const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

  const asset =
    assetCode === "XLM" || !assetIssuer
      ? StellarSdk.Asset.native()
      : new StellarSdk.Asset(assetCode, assetIssuer);

  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: destinationPublicKey,
        asset,
        amount,
      })
    )
    .setTimeout(30);

  txBuilder.addMemo(
    StellarSdk.Memo.text((memo ?? "SocialPay").substring(0, 28))
  );

  const tx = txBuilder.build();
  tx.sign(sourceKeypair);

  const result = await server.submitTransaction(tx);
  return { hash: result.hash, explorerUrl: buildExplorerUrl(result.hash) };
}

/** XLM-only payment (kept for backwards compatibility) */
export async function sendXlmPayment(
  params: PaymentParams
): Promise<PaymentResult> {
  return sendPayment({
    ...params,
    assetCode: "XLM",
  });
}

// ─── Trustlines ────────────────────────────────────────────────────────────────

/** Adds a trustline for a custom asset (USDC, TESOURO, etc.) */
export async function createTrustline(
  params: TrustlineParams
): Promise<PaymentResult> {
  const { secretKey, assetCode, assetIssuer, limit } = params;

  const keypair = StellarSdk.Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keypair.publicKey());

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.changeTrust({
        asset: new StellarSdk.Asset(assetCode, assetIssuer),
        ...(limit ? { limit } : {}),
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.submitTransaction(tx);
  return { hash: result.hash, explorerUrl: buildExplorerUrl(result.hash) };
}

/**
 * Sponsored reserves pattern (Bloco 1 — SDK Avançado):
 * Sponsor (platform master account) pays for the reserve of the user's trustlines.
 * User enters without needing XLM for reserves.
 * Pattern: BeginSponsoring → ChangeTrust ops → EndSponsoring
 * Both sponsor and user must sign.
 */
export async function createSponsoredTrustlines(
  params: SponsoredTrustlineParams
): Promise<PaymentResult> {
  const { sponsorSecret, userSecret, assets } = params;

  const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecret);
  const userKeypair = StellarSdk.Keypair.fromSecret(userSecret);
  const userPublicKey = userKeypair.publicKey();

  const sponsorAccount = await server.loadAccount(sponsorKeypair.publicKey());

  const txBuilder = new StellarSdk.TransactionBuilder(sponsorAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  txBuilder.addOperation(
    StellarSdk.Operation.beginSponsoringFutureReserves({
      sponsoredId: userPublicKey,
    })
  );

  for (const { assetCode, assetIssuer } of assets) {
    txBuilder.addOperation(
      StellarSdk.Operation.changeTrust({
        asset: new StellarSdk.Asset(assetCode, assetIssuer),
        source: userPublicKey,
      })
    );
  }

  txBuilder.addOperation(
    StellarSdk.Operation.endSponsoringFutureReserves({
      source: userPublicKey,
    })
  );

  txBuilder.setTimeout(30);

  const tx = txBuilder.build();
  tx.sign(sponsorKeypair, userKeypair);

  const result = await server.submitTransaction(tx);
  return { hash: result.hash, explorerUrl: buildExplorerUrl(result.hash) };
}

// ─── Fee Bump (SDK Avançado — Bloco 1) ────────────────────────────────────────

/**
 * Builds (but does NOT submit) a transaction XDR.
 * Used when the user needs to sign locally and the platform wraps with fee bump.
 */
export async function buildPaymentXdr(
  params: GenericPaymentParams
): Promise<string> {
  const { sourceSecret, destinationPublicKey, amount, assetCode, assetIssuer, memo } = params;

  const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

  const asset =
    assetCode === "XLM" || !assetIssuer
      ? StellarSdk.Asset.native()
      : new StellarSdk.Asset(assetCode, assetIssuer);

  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({ destination: destinationPublicKey, asset, amount })
    )
    .setTimeout(30);

  txBuilder.addMemo(
    StellarSdk.Memo.text((memo ?? "SocialPay").substring(0, 28))
  );

  const tx = txBuilder.build();
  tx.sign(sourceKeypair);
  return tx.toXDR();
}

/**
 * Fee Bump: wraps a signed inner transaction XDR so the platform pays the fee.
 * The user never needs XLM for fees — gasless UX.
 */
export async function submitWithFeeBump(
  feeSourceSecret: string,
  innerXdr: string
): Promise<PaymentResult> {
  const feeSourceKeypair = StellarSdk.Keypair.fromSecret(feeSourceSecret);

  const innerTx = StellarSdk.TransactionBuilder.fromXDR(
    innerXdr,
    NETWORK_PASSPHRASE
  ) as StellarSdk.Transaction;

  const feeBumpTx = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
    feeSourceKeypair,
    String(parseInt(StellarSdk.BASE_FEE) * 10),
    innerTx,
    NETWORK_PASSPHRASE
  );

  feeBumpTx.sign(feeSourceKeypair);
  const result = await server.submitTransaction(feeBumpTx);
  return { hash: result.hash, explorerUrl: buildExplorerUrl(result.hash) };
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

export function buildExplorerUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function abbreviateKey(key: string, chars = 8): string {
  if (key.length <= chars * 2) return key;
  return `${key.slice(0, chars)}...${key.slice(-chars)}`;
}

export function abbreviateHash(hash: string, chars = 8): string {
  return abbreviateKey(hash, chars);
}

function _isNotFound(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "response" in err &&
    (err as { response?: { status?: number } }).response?.status === 404
  );
}
