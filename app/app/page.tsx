import Link from "next/link";
import { Send, Activity } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandleBadge } from "@/components/HandleBadge";
import { BalanceCard } from "@/components/BalanceCard";
import { FeedList } from "@/components/FeedList";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      wallet: true,
      sentTransactions: {
        orderBy: { createdAt: "desc" },
        take: 5,
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
        orderBy: { createdAt: "desc" },
        take: 5,
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

  if (!user) redirect("/auth/login");

  const recentTxs = [
    ...user.sentTransactions,
    ...user.receivedTransactions,
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const accountTypeLabel: Record<string, string> = {
    person: "Pessoa",
    company: "Empresa",
    project: "Projeto",
    supplier: "Fornecedor",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Bem-vindo de volta, {user.name}!</p>
      </div>

      {/* User info card */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white text-2xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{user.name}</h2>
                <Badge variant="secondary">
                  {accountTypeLabel[user.accountType] ?? user.accountType}
                </Badge>
              </div>
              <HandleBadge handle={user.handle} size="md" className="mt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Button asChild size="sm">
              <Link href="/app/send">
                <Send className="h-4 w-4" />
                Enviar dinheiro
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/feed">
                <Activity className="h-4 w-4" />
                Ver feed completo
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wallet balance */}
      {user.wallet && (
        <BalanceCard publicKey={user.wallet.publicKey} handle={user.handle} />
      )}

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Transações recentes</h2>
          <Button asChild size="sm" variant="ghost">
            <Link href="/app/feed">Ver todas</Link>
          </Button>
        </div>
        <FeedList
          transactions={recentTxs.map((tx) => ({
            ...tx,
            createdAt: tx.createdAt.toISOString(),
            confirmedAt: tx.confirmedAt?.toISOString() ?? null,
          }))}
          emptyMessage="Você ainda não fez nenhuma transação. Clique em Enviar para começar!"
        />
      </div>
    </div>
  );
}
