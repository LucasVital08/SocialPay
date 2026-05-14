import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ handle: string }> }
) {
  const { handle } = await props.params;
  const normalizedHandle = handle.replace(/^@/, "").toLowerCase();

  const user = await prisma.user.findUnique({
    where: { handle: normalizedHandle },
    include: {
      wallet: {
        select: { publicKey: true, funded: true, network: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    handle: user.handle,
    accountType: user.accountType,
    profileVisibility: user.profileVisibility,
    wallet: user.wallet
      ? {
          publicKey: user.wallet.publicKey,
          funded: user.wallet.funded,
          network: user.wallet.network,
        }
      : null,
    createdAt: user.createdAt,
  });
}
