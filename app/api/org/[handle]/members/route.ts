import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ handle: string }> };

const addSchema = z.object({
  userHandle: z.string().min(1),
  role: z.enum(["admin", "payer", "viewer"]).default("viewer"),
  spendingLimit: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const { handle } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { handle: handle.replace(/^@/, "").toLowerCase() } });
  if (!org) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const isOwner = org.ownerUserId === session.id;
  if (!isOwner) {
    const m = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId: org.id, userId: session.id } } });
    if (!m) return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  }

  const members = await prisma.orgMember.findMany({
    where: { orgId: org.id },
    include: { user: { select: { id: true, name: true, handle: true, accountType: true } } },
    orderBy: { addedAt: "asc" },
  });

  return NextResponse.json({ members });
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { handle } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const org = await prisma.organization.findUnique({ where: { handle: handle.replace(/^@/, "").toLowerCase() } });
    if (!org) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

    // Apenas owner ou admin podem adicionar membros
    const isOwner = org.ownerUserId === session.id;
    if (!isOwner) {
      const m = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId: org.id, userId: session.id } } });
      if (!m || m.role !== "admin") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = addSchema.parse(await req.json());
    const userHandle = body.userHandle.replace(/^@/, "").toLowerCase();

    const targetUser = await prisma.user.findUnique({ where: { handle: userHandle } });
    if (!targetUser) return NextResponse.json({ error: `@${userHandle} não encontrado` }, { status: 404 });
    if (targetUser.id === org.ownerUserId) return NextResponse.json({ error: "Proprietário já tem acesso total" }, { status: 400 });

    const existing = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId: org.id, userId: targetUser.id } } });
    if (existing) return NextResponse.json({ error: "Usuário já é membro" }, { status: 409 });

    const member = await prisma.orgMember.create({
      data: {
        orgId: org.id,
        userId: targetUser.id,
        role: body.role,
        spendingLimit: body.spendingLimit ?? null,
        addedBy: session.id,
      },
      include: { user: { select: { id: true, name: true, handle: true } } },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    console.error("[org/members POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
