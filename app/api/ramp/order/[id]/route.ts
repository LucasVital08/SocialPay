import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getOrderWithRetry } from "@/lib/etherfuse.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;

    // Busca a ordem local pelo ID local ou pelo Etherfuse order ID
    const localOrder = await prisma.rampOrder.findFirst({
      where: {
        userId: session.id,
        OR: [{ id }, { etherfuseOrderId: id }],
      },
    });

    if (!localOrder) {
      return NextResponse.json({ error: "Ordem não encontrada" }, { status: 404 });
    }

    // Se não tiver etherfuseOrderId ainda, retorna o estado local
    if (!localOrder.etherfuseOrderId) {
      return NextResponse.json({ order: localOrder });
    }

    // Busca status atualizado na Etherfuse (com retry — indexação pós-create leva 3-10s)
    const efOrder = await getOrderWithRetry(localOrder.etherfuseOrderId);

    // Sincroniza status no DB se mudou
    if (efOrder.status !== localOrder.status) {
      await prisma.rampOrder.update({
        where: { id: localOrder.id },
        data: {
          status: efOrder.status,
          stellarHash: efOrder.stellarTxHash ?? localOrder.stellarHash,
        },
      });
    }

    return NextResponse.json({
      order: {
        ...localOrder,
        status: efOrder.status,
        stellarHash: efOrder.stellarTxHash ?? localOrder.stellarHash,
        etherfuse: efOrder,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[ramp/order/:id]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
