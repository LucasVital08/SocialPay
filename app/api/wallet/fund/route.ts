import { NextRequest, NextResponse } from "next/server";
import { fundTestnetAccount } from "@/lib/stellar.service";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const handle = body.handle as string | undefined;

    let publicKey: string | undefined;

    if (handle) {
      const normalizedHandle = handle.replace(/^@/, "").toLowerCase();
      const wallet = await prisma.wallet.findFirst({
        where: { user: { handle: normalizedHandle } },
      });
      if (!wallet) {
        return NextResponse.json({ error: "Carteira não encontrada" }, { status: 404 });
      }
      publicKey = wallet.publicKey;
      await fundTestnetAccount(publicKey);
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { funded: true },
      });
      return NextResponse.json({ ok: true, publicKey });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.id },
    });
    if (!wallet) {
      return NextResponse.json({ error: "Carteira não encontrada" }, { status: 404 });
    }

    await fundTestnetAccount(wallet.publicKey);
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { funded: true },
    });

    return NextResponse.json({ ok: true, publicKey: wallet.publicKey });
  } catch (err) {
    console.error("[fund]", err);
    const message = err instanceof Error ? err.message : "Erro ao financiar carteira";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
