import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createTrustline } from "@/lib/stellar.service";

const schema = z.object({
  assetCode: z.string().min(1).max(12),
  assetIssuer: z.string().length(56),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { assetCode, assetIssuer } = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { wallet: true },
    });

    if (!user?.wallet) {
      return NextResponse.json(
        { error: "Carteira não encontrada" },
        { status: 404 }
      );
    }

    const result = await createTrustline({
      secretKey: user.wallet.encryptedSecret,
      assetCode,
      assetIssuer,
    });

    return NextResponse.json({
      success: true,
      hash: result.hash,
      explorerUrl: result.explorerUrl,
      assetCode,
      assetIssuer,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[trustline]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
