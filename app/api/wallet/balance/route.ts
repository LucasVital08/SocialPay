import { NextRequest, NextResponse } from "next/server";
import { getAccountBalances } from "@/lib/stellar.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle");
  const publicKey = searchParams.get("publicKey");

  let key = publicKey;

  if (!key && handle) {
    const normalizedHandle = handle.replace(/^@/, "").toLowerCase();
    const wallet = await prisma.wallet.findFirst({
      where: { user: { handle: normalizedHandle } },
    });
    if (!wallet) {
      return NextResponse.json({ error: "Carteira não encontrada" }, { status: 404 });
    }
    key = wallet.publicKey;
  }

  if (!key) {
    return NextResponse.json(
      { error: "Forneça handle ou publicKey" },
      { status: 400 }
    );
  }

  const balances = await getAccountBalances(key);

  // Expõe também o XLM isolado para compatibilidade com código legado
  const xlm = balances.find((b) => b.isNative);

  return NextResponse.json({
    balance: xlm?.balance ?? "0",
    balances,
    publicKey: key,
  });
}
