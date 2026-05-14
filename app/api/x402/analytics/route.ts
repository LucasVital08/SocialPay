/**
 * x402-protected analytics endpoint
 * GET /api/x402/analytics
 *
 * Returns 402 with X-PAYMENT-REQUIRED header when no payment header is present.
 * Clients using @x402/fetch + @x402/stellar automatically pay and retry.
 */

import { NextRequest, NextResponse } from "next/server";
import { enforceX402 } from "@/lib/x402-server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Enforce payment — returns 402 NextResponse if unpaid
  const { response } = await enforceX402(req, {
    description: "Métricas de pagamento SocialPay — acesso pago via Stellar x402",
    priceUsdc: "100000", // $0.01 USDC (7 decimals)
  });
  if (response) return response;

  // Payment verified — return analytics data
  try {
    const [txCount, rampOrderCount] = await Promise.all([
      prisma.transaction.count(),
      prisma.rampOrder.count(),
    ]);

    const topAssets = await prisma.transaction.groupBy({
      by: ["assetCode"],
      _count: { assetCode: true },
      orderBy: { _count: { assetCode: "desc" } },
      take: 5,
    });

    const recentCompletedRamps = await prisma.rampOrder.findMany({
      where: { status: "completed" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        type: true,
        fiatAmount: true,
        fiatCurrency: true,
        cryptoAssetCode: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      meta: {
        generatedAt: new Date().toISOString(),
        paidVia: "x402 / Stellar Testnet USDC",
        priceUSDC: "0.01",
      },
      stats: {
        totalTransactions: txCount,
        totalRampOrders: rampOrderCount,
        completedRampOrders: recentCompletedRamps.length,
      },
      topAssets: topAssets.map((a) => ({
        asset: a.assetCode,
        count: a._count.assetCode,
      })),
      recentRamps: recentCompletedRamps.map((r) => ({
        type: r.type,
        fiatAmount: r.fiatAmount,
        currency: r.fiatCurrency,
        asset: r.cryptoAssetCode,
        completedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[x402/analytics]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
