import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
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
    email: user.email,
    accountType: user.accountType,
    profileVisibility: user.profileVisibility,
    wallet: user.wallet,
  });
}
