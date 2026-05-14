/**
 * x402 payment protocol — server-side helpers for Next.js Route Handlers
 *
 * Protocol flow:
 * 1. Client requests without X-PAYMENT header → server returns 402 + X-PAYMENT-REQUIRED header
 * 2. Client builds payment payload (via @x402/fetch + @x402/stellar) → retries with X-PAYMENT header
 * 3. Server decodes header → verifies via facilitator → settles → returns 200
 */

import { NextRequest, NextResponse } from "next/server";
import {
  x402ResourceServer,
  HTTPFacilitatorClient,
} from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import {
  STELLAR_TESTNET_CAIP2,
  USDC_TESTNET_ADDRESS,
} from "@x402/stellar";
import {
  encodePaymentRequiredHeader,
  decodePaymentSignatureHeader,
} from "@x402/core/http";
import type { PaymentRequirements } from "@x402/core/types";

// ─── Singleton server setup ────────────────────────────────────────────────────

let _server: x402ResourceServer | null = null;

function getServer(): x402ResourceServer {
  if (!_server) {
    const facilitator = new HTTPFacilitatorClient();
    _server = new x402ResourceServer(facilitator).register(
      STELLAR_TESTNET_CAIP2,
      new ExactStellarScheme()
    );
  }
  return _server;
}

// ─── Build payment requirements ───────────────────────────────────────────────

export function buildRequirements(params: {
  priceUsdc?: string; // in USDC atomic units (7 decimals). $0.01 = "100000"
}): PaymentRequirements {
  const payTo = process.env.PLATFORM_PUBLIC_KEY ?? "";
  return {
    scheme: "exact",
    network: STELLAR_TESTNET_CAIP2,
    payTo,
    amount: params.priceUsdc ?? "100000", // default $0.01
    asset: USDC_TESTNET_ADDRESS,
    maxTimeoutSeconds: 300,
    extra: {},
  };
}

// ─── Middleware helper ─────────────────────────────────────────────────────────

export interface X402Result {
  /** null = payment verified, proceed to handler */
  response: NextResponse | null;
}

/**
 * Call at the top of a Route Handler to enforce x402 payment.
 * Returns { response: NextResponse } with 402 if unpaid, or { response: null } if payment ok.
 */
export async function enforceX402(
  req: NextRequest,
  options?: {
    description?: string;
    priceUsdc?: string;
  }
): Promise<X402Result> {
  const requirements = buildRequirements({ priceUsdc: options?.priceUsdc });

  const resourceInfo = {
    url: req.url,
    description: options?.description ?? "Acesso pago via x402",
    mimeType: "application/json",
  };

  const paymentHeader = req.headers.get("X-PAYMENT");

  if (!paymentHeader) {
    const server = getServer();
    const paymentRequired = await server.createPaymentRequiredResponse(
      [requirements],
      resourceInfo,
      "Payment required"
    );
    const encoded = encodePaymentRequiredHeader(paymentRequired);
    return {
      response: NextResponse.json(
        { error: "Payment Required", x402Version: paymentRequired.x402Version, accepts: paymentRequired.accepts },
        {
          status: 402,
          headers: {
            "X-PAYMENT-REQUIRED": encoded,
            "Access-Control-Expose-Headers": "X-PAYMENT-REQUIRED",
          },
        }
      ),
    };
  }

  try {
    const payload = decodePaymentSignatureHeader(paymentHeader);
    const server = getServer();
    const verifyResult = await server.verifyPayment(payload, requirements);

    if (!verifyResult.isValid) {
      return {
        response: NextResponse.json(
          { error: "Payment verification failed", reason: verifyResult.invalidReason },
          { status: 402 }
        ),
      };
    }

    // Settle asynchronously — don't block the response
    server.settlePayment(payload, requirements).catch((err: unknown) => {
      console.error("[x402] settle error:", err);
    });

    return { response: null };
  } catch (err: unknown) {
    console.error("[x402] verify error:", err);
    return {
      response: NextResponse.json(
        { error: "Payment processing error" },
        { status: 402 }
      ),
    };
  }
}
