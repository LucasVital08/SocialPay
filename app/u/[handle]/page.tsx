import { notFound } from "next/navigation";
import Link from "next/link";
import { Send } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { HandleBadge } from "@/components/HandleBadge";
import { WalletAddress } from "@/components/WalletAddress";
import { FeedList } from "@/components/FeedList";
import { Badge } from "@/components/ui/badge";

export default async function ProfilePage(props: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await props.params;
  const normalizedHandle = handle.replace(/^@/, "").toLowerCase();

  const user = await prisma.user.findUnique({
    where: { handle: normalizedHandle },
    include: {
      wallet: { select: { publicKey: true, network: true } },
      sentTransactions: {
        where: { visibility: "public" },
        orderBy: { createdAt: "desc" },
        take: 20,
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
      },
      receivedTransactions: {
        where: { visibility: "public" },
        orderBy: { createdAt: "desc" },
        take: 20,
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
      },
    },
  });

  if (!user) notFound();

  const publicTxs = [
    ...user.sentTransactions,
    ...user.receivedTransactions,
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  const accountTypeLabel: Record<string, string> = {
    person: "Pessoa",
    company: "Empresa",
    project: "Projeto",
    supplier: "Fornecedor",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Profile header */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900 p-8">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white text-3xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                <Badge variant="secondary">
                  {accountTypeLabel[user.accountType] ?? user.accountType}
                </Badge>
              </div>
              <HandleBadge handle={user.handle} size="lg" linked={false} />
              {user.wallet && (
                <WalletAddress publicKey={user.wallet.publicKey} />
              )}
            </div>
            <Button asChild>
              <Link href={`/app/send?to=${user.handle}`}>
                <Send className="h-4 w-4" />
                Enviar para @{user.handle}
              </Link>
            </Button>
          </div>
        </div>

        {/* Public transactions */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Transações públicas
          </h2>
          <FeedList
            transactions={publicTxs.map((tx) => ({
              ...tx,
              createdAt: tx.createdAt.toISOString(),
              confirmedAt: tx.confirmedAt?.toISOString() ?? null,
            }))}
            emptyMessage={`@${user.handle} ainda não tem transações públicas.`}
          />
        </div>
      </div>
    </div>
  );
}
