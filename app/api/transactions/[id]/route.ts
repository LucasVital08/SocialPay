import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: {
      sender: {
        select: { name: true, handle: true, accountType: true },
      },
      receiver: {
        select: { name: true, handle: true, accountType: true },
      },
    },
  });

  if (!tx) {
    return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
  }

  return NextResponse.json(tx);
}
