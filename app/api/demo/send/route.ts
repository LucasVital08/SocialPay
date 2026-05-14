import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendXlmPayment,
  getAccountBalance,
} from "@/lib/stellar.service";
import { z } from "zod";

const schema = z.object({
  fromHandle: z.string().default("lucas"),
  toHandle: z.string().default("gabriel"),
  amount: z.string().default("10"),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = schema.parse(body);

    const fromHandle = data.fromHandle.replace(/^@/, "").toLowerCase();
    const toHandle = data.toHandle.replace(/^@/, "").toLowerCase();

    const [sender, receiver] = await Promise.all([
      prisma.user.findUnique({
        where: { handle: fromHandle },
        include: { wallet: true },
      }),
      prisma.user.findUnique({
        where: { handle: toHandle },
        include: { wallet: true },
      }),
    ]);

    if (!sender?.wallet) {
      return NextResponse.json(
        { error: `@${fromHandle} não encontrado ou sem carteira. Execute "Criar carteiras" primeiro.` },
        { status: 404 }
      );
    }

    if (!receiver?.wallet) {
      return NextResponse.json(
        { error: `@${toHandle} não encontrado ou sem carteira. Execute "Criar carteiras" primeiro.` },
        { status: 404 }
      );
    }

    const balance = await getAccountBalance(sender.wallet.publicKey);
    const balanceNum = parseFloat(balance);
    const amountNum = parseFloat(data.amount);

    if (balanceNum < amountNum + 1) {
      return NextResponse.json(
        {
          error: `Saldo insuficiente de @${fromHandle}. Disponível: ${balance} XLM. Financie a carteira primeiro.`,
          balance,
        },
        { status: 400 }
      );
    }

    const tx = await prisma.transaction.create({
      data: {
        senderUserId: sender.id,
        receiverUserId: receiver.id,
        senderHandle: sender.handle,
        receiverHandle: receiver.handle,
        senderPublicKey: sender.wallet.publicKey,
        receiverPublicKey: receiver.wallet.publicKey,
        amount: data.amount,
        assetCode: "XLM",
        description: data.description ?? "Transação demo SocialPay",
        visibility: "public",
        status: "submitted",
        submittedAt: new Date(),
      },
    });

    const result = await sendXlmPayment({
      sourceSecret: sender.wallet.encryptedSecret,
      destinationPublicKey: receiver.wallet.publicKey,
      amount: data.amount,
      memo: `SP-demo:${tx.id.slice(0, 16)}`,
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
      from: `@${fromHandle}`,
      to: `@${toHandle}`,
      fromPublicKey: sender.wallet.publicKey,
      toPublicKey: receiver.wallet.publicKey,
    });
  } catch (err) {
    console.error("[demo/send]", err);
    const message = err instanceof Error ? err.message : "Erro na transação";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
