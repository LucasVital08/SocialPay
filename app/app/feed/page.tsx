import { prisma } from "@/lib/prisma";
import { FeedList } from "@/components/FeedList";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [{ visibility: "public" }, { visibility: "organizational" }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Feed</h1>
        <p className="text-slate-400 mt-1">Transações públicas na rede SocialPay</p>
      </div>
      <FeedList
        transactions={transactions.map((tx) => ({
          ...tx,
          createdAt: tx.createdAt.toISOString(),
          confirmedAt: tx.confirmedAt?.toISOString() ?? null,
        }))}
        emptyMessage="Nenhuma transação pública ainda. Seja o primeiro a enviar!"
      />
    </div>
  );
}
