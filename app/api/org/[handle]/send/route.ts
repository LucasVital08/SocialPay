import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendXlmPayment, getAccountBalance } from "@/lib/stellar.service";

type Params = { params: Promise<{ handle: string }> };

const schema = z.object({
  toHandle: z.string().min(1),
  amount: z.string().refine((v) => Number(v) > 0, "Valor deve ser positivo"),
  description: z.string().max(200).optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { handle } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const data = schema.parse(body);
    const toHandle = data.toHandle.replace(/^@/, "").toLowerCase();

    const org = await prisma.organization.findUnique({
      where: { handle: handle.replace(/^@/, "").toLowerCase() },
      include: { wallet: true },
    });

    if (!org || !org.wallet) return NextResponse.json({ error: "Organização/carteira não encontrada" }, { status: 404 });

    // Verifica permissão: owner, admin ou payer
    const isOwner = org.ownerUserId === session.id;
    let memberRecord = null;
    if (!isOwner) {
      memberRecord = await prisma.orgMember.findUnique({
        where: { orgId_userId: { orgId: org.id, userId: session.id } },
      });
      if (!memberRecord || !["admin", "payer"].includes(memberRecord.role)) {
        return NextResponse.json({ error: "Sem permissão para enviar pagamentos desta org" }, { status: 403 });
      }
    }

    // Verifica limite de gastos do membro
    if (memberRecord?.spendingLimit) {
      const spent = parseFloat(memberRecord.totalSpent ?? "0");
      const limit = parseFloat(memberRecord.spendingLimit);
      const amount = parseFloat(data.amount);
      if (spent + amount > limit) {
        return NextResponse.json({
          error: `Limite de gastos excedido. Limite: ${memberRecord.spendingLimit} XLM, Já gasto: ${memberRecord.totalSpent} XLM`,
        }, { status: 400 });
      }
    }

    // Busca destinatário
    const receiver = await prisma.user.findUnique({
      where: { handle: toHandle },
      include: { wallet: true },
    });
    if (!receiver?.wallet) return NextResponse.json({ error: `@${toHandle} não encontrado` }, { status: 404 });

    // Verifica saldo da org
    const balance = await getAccountBalance(org.wallet.publicKey);
    const amountNum = parseFloat(data.amount);
    if (parseFloat(balance) < amountNum + 1) {
      return NextResponse.json({ error: `Saldo insuficiente. Disponível: ${balance} XLM` }, { status: 400 });
    }

    // Cria registro
    const orgTx = await prisma.orgTransaction.create({
      data: {
        orgId: org.id,
        initiatedByUserId: session.id,
        toHandle: receiver.handle,
        toPublicKey: receiver.wallet.publicKey,
        amount: data.amount,
        description: data.description ?? null,
        status: "submitted",
      },
    });

    try {
      const result = await sendXlmPayment({
        sourceSecret: org.wallet.encryptedSecret,
        destinationPublicKey: receiver.wallet.publicKey,
        amount: data.amount,
        memo: `ORG:${org.handle.slice(0, 15)}`,
      });

      await prisma.orgTransaction.update({
        where: { id: orgTx.id },
        data: { status: "confirmed", stellarHash: result.hash, explorerUrl: result.explorerUrl, confirmedAt: new Date() },
      });

      // Atualiza totalSpent do membro
      if (memberRecord) {
        const newSpent = (parseFloat(memberRecord.totalSpent ?? "0") + amountNum).toFixed(7);
        await prisma.orgMember.update({
          where: { id: memberRecord.id },
          data: { totalSpent: newSpent },
        });
      }

      return NextResponse.json({ success: true, hash: result.hash, explorerUrl: result.explorerUrl });
    } catch (stellarErr) {
      const msg = stellarErr instanceof Error ? stellarErr.message : "Erro Stellar";
      await prisma.orgTransaction.update({ where: { id: orgTx.id }, data: { status: "failed", errorMessage: msg } });
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    console.error("[org/send]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
