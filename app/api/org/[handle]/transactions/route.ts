import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ handle: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { handle } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { handle: handle.replace(/^@/, "").toLowerCase() },
  });
  if (!org) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const isOwner = org.ownerUserId === session.id;
  if (!isOwner) {
    const m = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: session.id } },
    });
    if (!m) return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  }

  const transactions = await prisma.orgTransaction.findMany({
    where: { orgId: org.id },
    include: { initiatedBy: { select: { id: true, name: true, handle: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ transactions });
}
