import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const skip = (page - 1) * limit;

  type WhereClause = {
    OR?: Array<{
      visibility?: string;
      AND?: Array<{ senderUserId?: string; receiverUserId?: string }>;
    }>;
    AND?: Array<{
      OR?: Array<{ senderHandle?: string; receiverHandle?: string }>;
    }>;
  };

  let where: WhereClause = {};

  if (handle) {
    const normalizedHandle = handle.replace(/^@/, "").toLowerCase();
    where = {
      AND: [
        {
          OR: [
            { senderHandle: normalizedHandle },
            { receiverHandle: normalizedHandle },
          ],
        },
      ],
    };

    if (!session) {
      where.AND!.push({ OR: [{ visibility: "public" }] } as never);
    } else if (session.handle !== normalizedHandle) {
      where.AND!.push({
        OR: [
          { visibility: "public" },
          { visibility: "organizational" },
        ],
      } as never);
    }
  } else {
    if (session) {
      where = {
        OR: [
          { visibility: "public" },
          { visibility: "organizational" },
          {
            AND: [
              { senderUserId: session.id },
            ],
          } as never,
          {
            AND: [
              { receiverUserId: session.id },
            ],
          } as never,
        ],
      };
    } else {
      where = { OR: [{ visibility: "public" }, { visibility: "organizational" }] };
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      senderHandle: true,
      receiverHandle: true,
      senderPublicKey: true,
      receiverPublicKey: true,
      amount: true,
      assetCode: true,
      description: true,
      visibility: true,
      status: true,
      stellarHash: true,
      explorerUrl: true,
      createdAt: true,
      confirmedAt: true,
    },
  });

  return NextResponse.json({ transactions, page, limit });
}
