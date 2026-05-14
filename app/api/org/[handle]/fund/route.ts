import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { fundTestnetAccount } from "@/lib/stellar.service";

type Params = { params: Promise<{ handle: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { handle } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { handle: handle.replace(/^@/, "").toLowerCase() },
    include: { wallet: true },
  });

  if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
  if (!org.wallet) return NextResponse.json({ error: "Carteira não encontrada" }, { status: 404 });

  // Apenas owner ou admin podem financiar
  const isOwner = org.ownerUserId === session.id;
  if (!isOwner) {
    const member = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId: org.id, userId: session.id } } });
    if (!member || !["admin"].includes(member.role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
  }

  await fundTestnetAccount(org.wallet.publicKey);
  await prisma.orgWallet.update({ where: { orgId: org.id }, data: { funded: true } });

  return NextResponse.json({ success: true, publicKey: org.wallet.publicKey });
}
