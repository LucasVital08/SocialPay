import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ handle: string; userId: string }> };

const updateSchema = z.object({
  role: z.enum(["admin", "payer", "viewer"]).optional(),
  spendingLimit: z.string().nullable().optional(),
});

async function getOrgAndCheckAdmin(handle: string, sessionId: string) {
  const org = await prisma.organization.findUnique({ where: { handle: handle.replace(/^@/, "").toLowerCase() } });
  if (!org) return { org: null, allowed: false };
  const isOwner = org.ownerUserId === sessionId;
  if (isOwner) return { org, allowed: true };
  const m = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId: org.id, userId: sessionId } } });
  return { org, allowed: m?.role === "admin" };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { handle, userId } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { org, allowed } = await getOrgAndCheckAdmin(handle, session.id);
    if (!org) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
    if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    // Owner não pode ser editado
    if (userId === org.ownerUserId) return NextResponse.json({ error: "Não é possível editar o proprietário" }, { status: 400 });

    const body = updateSchema.parse(await req.json());
    const member = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId: org.id, userId } } });
    if (!member) return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });

    const updated = await prisma.orgMember.update({
      where: { id: member.id },
      data: {
        ...(body.role !== undefined && { role: body.role }),
        ...(body.spendingLimit !== undefined && { spendingLimit: body.spendingLimit }),
      },
      include: { user: { select: { id: true, name: true, handle: true } } },
    });

    return NextResponse.json({ member: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { handle, userId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { org, allowed } = await getOrgAndCheckAdmin(handle, session.id);
  if (!org) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  if (userId === org.ownerUserId) return NextResponse.json({ error: "Não é possível remover o proprietário" }, { status: 400 });

  const member = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId: org.id, userId } } });
  if (!member) return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });

  await prisma.orgMember.delete({ where: { id: member.id } });
  return NextResponse.json({ success: true });
}
