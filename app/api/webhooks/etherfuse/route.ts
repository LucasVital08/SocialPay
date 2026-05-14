import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Webhook Etherfuse — atualiza status das ordens RampOrder
 * Eventos esperados: order.completed, order.failed, order.expired, order.refunded
 *
 * Etherfuse não documenta assinatura HMAC no sandbox, então apenas validamos
 * que o payload tem os campos obrigatórios. Em produção, adicionar verificação
 * de assinatura via ETHERFUSE_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      event?: string;
      data?: {
        order_id?: string;
        status?: string;
        stellar_tx_hash?: string;
        error_message?: string;
      };
    };

    const event = body.event;
    const data = body.data;

    if (!event || !data?.order_id) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const order = await prisma.rampOrder.findUnique({
      where: { etherfuseOrderId: data.order_id },
    });

    if (!order) {
      // Pode chegar webhook de ordem não registrada (ex: ordem criada externamente)
      console.warn("[webhook/etherfuse] ordem não encontrada:", data.order_id);
      return NextResponse.json({ ok: true });
    }

    const updateData: Record<string, string | null> = {};

    if (data.status) updateData.status = data.status;
    if (data.stellar_tx_hash) updateData.stellarHash = data.stellar_tx_hash;
    if (data.error_message) updateData.errorMessage = data.error_message;

    if (Object.keys(updateData).length > 0) {
      await prisma.rampOrder.update({
        where: { id: order.id },
        data: updateData,
      });
    }

    console.info(`[webhook/etherfuse] ${event} → ordem ${order.id} → status ${data.status}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/etherfuse]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
