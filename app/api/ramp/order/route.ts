import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  createOnrampOrder,
  createOfframpOrder,
} from "@/lib/etherfuse.service";

const schema = z.object({
  type: z.enum(["onramp", "offramp"]),
  quoteId: z.string().min(1),
  bankAccountId: z.string().min(1),
  fiatAmount: z.string().min(1),
  fiatCurrency: z.string().default("BRL"),
  cryptoAssetCode: z.string().min(1),
  cryptoAssetIssuer: z.string().length(56),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { wallet: true },
    });

    if (!user?.wallet) {
      return NextResponse.json({ error: "Carteira não encontrada" }, { status: 404 });
    }

    const customerId = user.etherfuseCustomerId ?? user.wallet.publicKey;

    const orderParams = {
      quoteId: parsed.quoteId,
      customerId,
      walletAddress: user.wallet.publicKey,
      bankAccountId: parsed.bankAccountId,
    };

    // Cria registro local antes de chamar a API (status pending)
    const localOrder = await prisma.rampOrder.create({
      data: {
        userId: user.id,
        type: parsed.type,
        status: "pending",
        etherfuseQuoteId: parsed.quoteId,
        fiatAmount: parsed.fiatAmount,
        fiatCurrency: parsed.fiatCurrency,
        cryptoAssetCode: parsed.cryptoAssetCode,
        cryptoAssetIssuer: parsed.cryptoAssetIssuer,
        walletPublicKey: user.wallet.publicKey,
        bankAccountId: parsed.bankAccountId,
      },
    });

    try {
      if (parsed.type === "onramp") {
        const result = await createOnrampOrder(orderParams);

        await prisma.rampOrder.update({
          where: { id: localOrder.id },
          data: {
            etherfuseOrderId: result.orderId,
            status: result.status,
            cryptoAmount: result.amount,
            pixKey: result.pixKey,
            pixQrCode: result.pixQrCode,
            pixExpiration: result.pixExpiration ? new Date(result.pixExpiration) : null,
          },
        });

        return NextResponse.json({
          localOrderId: localOrder.id,
          orderId: result.orderId,
          status: result.status,
          pixKey: result.pixKey,
          pixQrCode: result.pixQrCode,
          pixExpiration: result.pixExpiration,
          amount: result.amount,
          asset: result.asset,
        });
      } else {
        const result = await createOfframpOrder(orderParams);

        await prisma.rampOrder.update({
          where: { id: localOrder.id },
          data: {
            etherfuseOrderId: result.orderId,
            status: result.status,
            cryptoAmount: result.amount,
            memo: result.memo,
            destinationAddress: result.destinationAddress,
          },
        });

        return NextResponse.json({
          localOrderId: localOrder.id,
          orderId: result.orderId,
          status: result.status,
          memo: result.memo,
          destinationAddress: result.destinationAddress,
          amount: result.amount,
          asset: result.asset,
        });
      }
    } catch (apiErr) {
      // Marca ordem local como falha se a API retornar erro
      await prisma.rampOrder.update({
        where: { id: localOrder.id },
        data: {
          status: "failed",
          errorMessage: apiErr instanceof Error ? apiErr.message : "Erro API Etherfuse",
        },
      });
      throw apiErr;
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[ramp/order POST]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const orders = await prisma.rampOrder.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ orders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[ramp/order GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
