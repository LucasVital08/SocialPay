import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createQuote } from "@/lib/etherfuse.service";

const schema = z.object({
  type: z.enum(["onramp", "offramp"]),
  sourceAsset: z.string().min(1),
  targetAsset: z.string().min(1),
  sourceAmount: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { type, sourceAsset, targetAsset, sourceAmount } = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { wallet: true },
    });

    if (!user?.wallet) {
      return NextResponse.json({ error: "Carteira não encontrada" }, { status: 404 });
    }

    // customerId é por carteira (por usuário) — nunca por sessão
    const customerId = user.etherfuseCustomerId ?? user.wallet.publicKey;

    const quote = await createQuote({
      type,
      sourceAsset,
      targetAsset,
      sourceAmount,
      walletAddress: user.wallet.publicKey,
      customerId,
    });

    // Persiste customerId se ainda não estava salvo
    if (!user.etherfuseCustomerId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { etherfuseCustomerId: customerId },
      });
    }

    return NextResponse.json(quote);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[ramp/quote]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
