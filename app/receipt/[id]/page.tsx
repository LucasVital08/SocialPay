import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ReceiptCard } from "@/components/ReceiptCard";

export default async function ReceiptPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: {
      sender: { select: { name: true, handle: true } },
      receiver: { select: { name: true, handle: true } },
    },
  });

  if (!tx) notFound();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <Link
          href="/app/feed"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao feed
        </Link>

        <ReceiptCard
          receipt={{
            id: tx.id,
            status: tx.status,
            amount: tx.amount,
            assetCode: tx.assetCode,
            senderHandle: tx.senderHandle,
            receiverHandle: tx.receiverHandle,
            senderPublicKey: tx.senderPublicKey,
            receiverPublicKey: tx.receiverPublicKey,
            description: tx.description,
            visibility: tx.visibility,
            stellarHash: tx.stellarHash,
            explorerUrl: tx.explorerUrl,
            createdAt: tx.createdAt.toISOString(),
            confirmedAt: tx.confirmedAt?.toISOString() ?? null,
            sender: tx.sender,
            receiver: tx.receiver,
          }}
        />
      </div>
    </div>
  );
}
