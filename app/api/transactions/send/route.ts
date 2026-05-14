import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendXlmPayment, getAccountBalance } from "@/lib/stellar.service";

const schema = z.object({
  toHandle: z.string().min(1),
  amount: z.string().refine((v) => Number(v) > 0, "Valor deve ser maior que zero"),
  description: z.string().max(200).optional(),
  visibility: z.enum(["public", "private", "organizational"]).default("public"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const toHandle = data.toHandle.replace(/^@/, "").toLowerCase();

    const [senderUser, receiverUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.id },
        include: { wallet: true },
      }),
      prisma.user.findUnique({
        where: { handle: toHandle },
        include: { wallet: true },
      }),
    ]);

    if (!senderUser || !senderUser.wallet) {
      return NextResponse.json(
        { error: "Remetente sem carteira configurada" },
        { status: 400 }
      );
    }

    if (!receiverUser || !receiverUser.wallet) {
      return NextResponse.json(
        { error: `Usuário @${toHandle} não encontrado ou sem carteira` },
        { status: 404 }
      );
    }

    if (senderUser.id === receiverUser.id) {
      return NextResponse.json(
        { error: "Não é possível enviar para você mesmo" },
        { status: 400 }
      );
    }

    const balance = await getAccountBalance(senderUser.wallet.publicKey);
    const balanceNum = parseFloat(balance);
    const amountNum = parseFloat(data.amount);

    if (balanceNum < amountNum + 1) {
      return NextResponse.json(
        {
          error: `Saldo insuficiente. Disponível: ${balance} XLM (mínimo 1 XLM de reserva)`,
        },
        { status: 400 }
      );
    }

    const tx = await prisma.transaction.create({
      data: {
        senderUserId: senderUser.id,
        receiverUserId: receiverUser.id,
        senderHandle: senderUser.handle,
        receiverHandle: receiverUser.handle,
        senderPublicKey: senderUser.wallet.publicKey,
        receiverPublicKey: receiverUser.wallet.publicKey,
        amount: data.amount,
        assetCode: "XLM",
        description: data.description ?? null,
        visibility: data.visibility,
        status: "submitted",
        submittedAt: new Date(),
      },
    });

    try {
      const result = await sendXlmPayment({
        sourceSecret: senderUser.wallet.encryptedSecret,
        destinationPublicKey: receiverUser.wallet.publicKey,
        amount: data.amount,
        memo: `SP:${tx.id.slice(0, 20)}`,
      });

      const confirmed = await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: "confirmed",
          stellarHash: result.hash,
          explorerUrl: result.explorerUrl,
          confirmedAt: new Date(),
        },
      });

      return NextResponse.json({
        id: confirmed.id,
        status: "confirmed",
        hash: result.hash,
        explorerUrl: result.explorerUrl,
        amount: data.amount,
        toHandle: receiverUser.handle,
      });
    } catch (stellarErr) {
      const message =
        stellarErr instanceof Error ? stellarErr.message : "Erro na Stellar";

      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: "failed",
          errorMessage: message,
        },
      });

      return NextResponse.json(
        { error: `Transação falhou na Stellar: ${message}`, txId: tx.id },
        { status: 500 }
      );
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Erro de validação" }, { status: 400 });
    }
    console.error("[send]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
