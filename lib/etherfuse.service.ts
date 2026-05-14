/**
 * Etherfuse Anchor Service — BRL on-ramp / off-ramp via Pix
 *
 * Sandbox: https://api.sand.etherfuse.com
 * Produção: https://api.etherfuse.com
 *
 * Pitfalls críticos (aula Wlad Mendes):
 * 1. customerId é POR USUÁRIO (por carteira G...) — nunca por sessão
 * 2. Memo OBRIGATÓRIO no off-ramp — sem memo = ordem órfã = usuário não recebe
 * 3. GET /ramp/order/:id logo após create → 404 (3-10s indexação). Usar retry com backoff.
 * 4. Não existe endpoint "Pix" separado — é o fluxo MXN com sourceAsset=BRL e banco "pix"
 * 5. Sandbox parado: chamar POST /ramp/order/fiat_received para simular Pix chegando
 */

const BASE_URL = process.env.ETHERFUSE_BASE_URL ?? "https://api.sand.etherfuse.com";
const API_KEY = process.env.ETHERFUSE_API_KEY ?? "";

// Headers padrão — sem prefixo Bearer (direto a chave)
function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: API_KEY,
  };
}

// ─── Interfaces ─────────────────────────────────────────────────────────────────

export interface EtherfuseAsset {
  symbol: string;
  identifier: string; // formato "CODE:ISSUER"
  currency: string;
  balance: string | null;
}

export interface EtherfuseQuote {
  quoteId: string;
  sourceAsset: string;
  targetAsset: string;
  sourceAmount: string;
  targetAmount: string;
  exchangeRate: string;
  expiresAt: string;
}

export interface OnrampOrderResult {
  orderId: string;
  status: string;
  pixKey: string | null;
  pixQrCode: string | null;
  pixExpiration: string | null;
  amount: string;
  asset: string;
}

export interface OfframpOrderResult {
  orderId: string;
  status: string;
  memo: string;           // OBRIGATÓRIO — incluir na tx Stellar
  destinationAddress: string; // endereço Stellar para enviar os tokens
  amount: string;
  asset: string;
}

export interface EtherfuseOrder {
  id: string;
  status: string;         // pending | processing | awaiting_settlement | completed | failed | expired | refunded
  type: string;           // onramp | offramp
  sourceAmount: string;
  targetAmount: string;
  sourceAsset: string;
  targetAsset: string;
  pixKey?: string;
  pixQrCode?: string;
  pixExpiration?: string;
  memo?: string;
  destinationAddress?: string;
  stellarTxHash?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Assets ─────────────────────────────────────────────────────────────────────

/**
 * Lista os assets disponíveis para um endereço Stellar.
 * Parâmetros obrigatórios: blockchain, currency, wallet (todos ou retorna 400).
 */
export async function getAssets(walletAddress: string): Promise<EtherfuseAsset[]> {
  const url = new URL(`${BASE_URL}/ramp/assets`);
  url.searchParams.set("blockchain", "stellar");
  url.searchParams.set("currency", "BRL");
  url.searchParams.set("wallet", walletAddress);

  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etherfuse getAssets ${res.status}: ${text}`);
  }

  const data = await res.json() as { assets?: EtherfuseAsset[] };
  return data.assets ?? [];
}

// ─── Quote ───────────────────────────────────────────────────────────────────────

/**
 * On-ramp quote: BRL → TESOURO (ou USDC)
 * sourceAsset: "BRL"
 * targetAsset: "TESOURO:GC3CW7E..." (identifier retornado em getAssets)
 */
export async function createQuote(params: {
  sourceAsset: string;
  targetAsset: string;
  sourceAmount: string;
  walletAddress: string;
  customerId: string;
  quoteId?: string;
  type: "onramp" | "offramp";
}): Promise<EtherfuseQuote> {
  const body = {
    quoteId: params.quoteId ?? crypto.randomUUID(),
    customerId: params.customerId,
    blockchain: "stellar",
    quoteAssets: {
      type: params.type,
      sourceAsset: params.sourceAsset,
      targetAsset: params.targetAsset,
    },
    sourceAmount: params.sourceAmount,
    walletAddress: params.walletAddress,
  };

  const res = await fetch(`${BASE_URL}/ramp/quote`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etherfuse createQuote ${res.status}: ${text}`);
  }

  return res.json() as Promise<EtherfuseQuote>;
}

// ─── Order ────────────────────────────────────────────────────────────────────────

/**
 * On-ramp: cria ordem BRL → TESOURO via Pix
 * Retorna chave Pix dinâmica para o usuário pagar
 */
export async function createOnrampOrder(params: {
  quoteId: string;
  customerId: string;
  walletAddress: string;
  bankAccountId: string; // "pix" na sandbox
}): Promise<OnrampOrderResult> {
  const body = {
    quoteId: params.quoteId,
    customerId: params.customerId,
    walletAddress: params.walletAddress,
    bankAccountId: params.bankAccountId,
  };

  const res = await fetch(`${BASE_URL}/ramp/order`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etherfuse createOnrampOrder ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    order_id: string;
    status: string;
    pix_key?: string;
    pix_qr_code?: string;
    pix_expiration?: string;
    amount?: string;
    asset?: string;
  };

  return {
    orderId: data.order_id,
    status: data.status,
    pixKey: data.pix_key ?? null,
    pixQrCode: data.pix_qr_code ?? null,
    pixExpiration: data.pix_expiration ?? null,
    amount: data.amount ?? "",
    asset: data.asset ?? "",
  };
}

/**
 * Off-ramp: cria ordem USDC/TESOURO → BRL via Pix
 * Retorna endereço Stellar + memo (OBRIGATÓRIO na tx on-chain)
 */
export async function createOfframpOrder(params: {
  quoteId: string;
  customerId: string;
  walletAddress: string;
  bankAccountId: string;
}): Promise<OfframpOrderResult> {
  const body = {
    quoteId: params.quoteId,
    customerId: params.customerId,
    walletAddress: params.walletAddress,
    bankAccountId: params.bankAccountId,
  };

  const res = await fetch(`${BASE_URL}/ramp/order`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etherfuse createOfframpOrder ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    order_id: string;
    status: string;
    memo?: string;
    destination_address?: string;
    amount?: string;
    asset?: string;
  };

  if (!data.memo) {
    throw new Error("Etherfuse não retornou memo — off-ramp impossível sem memo");
  }

  return {
    orderId: data.order_id,
    status: data.status,
    memo: data.memo,
    destinationAddress: data.destination_address ?? "",
    amount: data.amount ?? "",
    asset: data.asset ?? "",
  };
}

// ─── Order Status ─────────────────────────────────────────────────────────────────

/**
 * Busca status da ordem.
 * ATENÇÃO: após create, aguardar 3-10s (indexação). GET imediato retorna 404.
 * Use getOrderWithRetry para evitar esse problema.
 */
export async function getOrder(orderId: string): Promise<EtherfuseOrder> {
  const res = await fetch(`${BASE_URL}/ramp/order/${orderId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etherfuse getOrder ${res.status}: ${text}`);
  }

  return res.json() as Promise<EtherfuseOrder>;
}

/**
 * Retry com exponential backoff — resolve o pitfall de indexação pós-create.
 * Tenta até maxAttempts vezes, com delay crescente.
 */
export async function getOrderWithRetry(
  orderId: string,
  maxAttempts = 5,
  initialDelay = 3000
): Promise<EtherfuseOrder> {
  let delay = initialDelay;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await getOrder(orderId);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const isNotFound =
        err instanceof Error && err.message.includes("404");
      if (!isNotFound) throw err;
      await sleep(delay);
      delay = Math.min(delay * 1.5, 15000);
    }
  }
  throw new Error("getOrderWithRetry: esgotou tentativas");
}

// ─── Sandbox helpers ──────────────────────────────────────────────────────────────

/**
 * SANDBOX ONLY: simula chegada do Pix (sandbox não avança sozinho).
 * Chame após criar a ordem para avançar o fluxo nos testes.
 */
export async function simulateFiatReceived(orderId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/ramp/order/fiat_received`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ order_id: orderId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`simulateFiatReceived ${res.status}: ${text}`);
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parseia o identifier "CODE:ISSUER" retornado pela API */
export function parseIdentifier(identifier: string): { code: string; issuer: string } | null {
  const parts = identifier.split(":");
  if (parts.length !== 2) return null;
  return { code: parts[0]!, issuer: parts[1]! };
}
