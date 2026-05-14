import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createKeypair } from "@/lib/stellar.service";

type Params = { params: Promise<{ handle: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { handle } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { handle: handle.replace(/^@/, "").toLowerCase() },
    include: {
      wallet: true,
      owner: { select: { id: true, name: true, handle: true } },
      members: {
        include: { user: { select: { id: true, name: true, handle: true, accountType: true } } },
        orderBy: { addedAt: "asc" },
      },
      _count: { select: { transactions: true, members: true } },
    },
  });

  if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

  // Verifica se o usuário tem acesso (owner ou membro)
  const isOwner = org.ownerUserId === session.id;
  const membership = org.members.find((m) => m.userId === session.id);
  if (!isOwner && !membership) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  }

  // Se não tem carteira ainda, cria automaticamente
  let wallet = org.wallet;
  if (!wallet) {
    const kp = createKeypair();
    wallet = await prisma.orgWallet.create({
      data: {
        orgId: org.id,
        publicKey: kp.publicKey,
        encryptedSecret: kp.secretKey,
      },
    });
  }

  return NextResponse.json({
    org: {
      id: org.id,
      name: org.name,
      handle: org.handle,
      description: org.description,
      ownerUserId: org.ownerUserId,
      owner: org.owner,
      createdAt: org.createdAt,
      wallet: { publicKey: wallet.publicKey, funded: wallet.funded },
      memberCount: org._count.members,
      txCount: org._count.transactions,
    },
    members: org.members.map((m) => ({
      id: m.id,
      user: m.user,
      role: m.role,
      spendingLimit: m.spendingLimit,
      totalSpent: m.totalSpent,
      addedAt: m.addedAt,
    })),
    myRole: isOwner ? "owner" : (membership?.role ?? null),
    mySpendingLimit: membership?.spendingLimit ?? null,
    myTotalSpent: membership?.totalSpent ?? "0",
  });
}
