import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createKeypair } from "@/lib/stellar.service";

const schema = z.object({
  name: z.string().min(2).max(80),
  handle: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
  description: z.string().max(300).optional(),
});

// Lista orgs do usuário (owns + is member)
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [ownedOrgs, memberships] = await Promise.all([
    prisma.organization.findMany({
      where: { ownerUserId: session.id },
      include: { wallet: { select: { publicKey: true, funded: true } }, _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.orgMember.findMany({
      where: { userId: session.id },
      include: {
        org: {
          include: { wallet: { select: { publicKey: true, funded: true } }, _count: { select: { members: true } } },
        },
      },
      orderBy: { addedAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    owned: ownedOrgs.map((o) => ({
      id: o.id, name: o.name, handle: o.handle, description: o.description,
      role: "owner", memberCount: o._count.members,
      wallet: o.wallet ? { publicKey: o.wallet.publicKey, funded: o.wallet.funded } : null,
    })),
    memberships: memberships.map((m) => ({
      id: m.org.id, name: m.org.name, handle: m.org.handle, description: m.org.description,
      role: m.role, spendingLimit: m.spendingLimit, totalSpent: m.totalSpent,
      memberCount: m.org._count.members,
      wallet: m.org.wallet ? { publicKey: m.org.wallet.publicKey, funded: m.org.wallet.funded } : null,
    })),
  });
}

// Cria nova org
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = schema.parse(await req.json());
    const handle = body.handle.toLowerCase();

    const exists = await prisma.organization.findUnique({ where: { handle } });
    if (exists) return NextResponse.json({ error: `@${handle} já está em uso` }, { status: 409 });

    // Cria org + carteira Stellar em uma transação
    const kp = createKeypair();
    const org = await prisma.organization.create({
      data: {
        name: body.name,
        handle,
        description: body.description ?? null,
        ownerUserId: session.id,
        wallet: { create: { publicKey: kp.publicKey, encryptedSecret: kp.secretKey } },
      },
      include: { wallet: true },
    });

    return NextResponse.json({
      org: { id: org.id, name: org.name, handle: org.handle, wallet: { publicKey: org.wallet!.publicKey } },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    console.error("[org POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
