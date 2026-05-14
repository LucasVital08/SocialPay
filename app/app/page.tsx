import Link from "next/link";
import { Send, Activity, Building2, Plus, Crown, Shield, CreditCard, Eye, ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandleBadge } from "@/components/HandleBadge";
import { BalanceCard } from "@/components/BalanceCard";
import { FeedList } from "@/components/FeedList";
import { Badge } from "@/components/ui/badge";

const ROLE_LABEL: Record<string, string> = {
  owner: "Proprietário",
  admin: "Admin",
  payer: "Pagador",
  viewer: "Visualizador",
};
const ROLE_COLOR: Record<string, string> = {
  owner: "text-amber-400 border-amber-700/40 bg-amber-900/20",
  admin: "text-blue-400 border-blue-700/40 bg-blue-900/20",
  payer: "text-emerald-400 border-emerald-700/40 bg-emerald-900/20",
  viewer: "text-slate-400 border-slate-700/40 bg-slate-800/40",
};
const ROLE_ICON: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  payer: <CreditCard className="h-3 w-3" />,
  viewer: <Eye className="h-3 w-3" />,
};

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
      ownedOrganizations: {
        include: { wallet: { select: { publicKey: true, funded: true } }, _count: { select: { members: true } } },
        orderBy: { createdAt: "desc" },
      },
      orgMemberships: {
        include: {
          org: {
            include: { wallet: { select: { publicKey: true, funded: true } }, _count: { select: { members: true } } },
          },
        },
        orderBy: { addedAt: "desc" },
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

  const allOrgs = [
    ...user.ownedOrganizations.map((o) => ({
      id: o.id, name: o.name, handle: o.handle, description: o.description,
      role: "owner" as string, memberCount: o._count.members,
      wallet: o.wallet,
    })),
    ...user.orgMemberships.map((m) => ({
      id: m.org.id, name: m.org.name, handle: m.org.handle, description: m.org.description,
      role: m.role, memberCount: m.org._count.members,
      wallet: m.org.wallet,
    })),
  ];

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

      {/* Minhas organizações */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-400" />
            Minhas organizações
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link href="/app/orgs/new">
              <Plus className="h-4 w-4" /> Nova org
            </Link>
          </Button>
        </div>

        {allOrgs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Building2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Você ainda não faz parte de nenhuma organização.</p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/app/orgs/new"><Plus className="h-4 w-4" />Criar organização</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allOrgs.map((org) => (
              <Link key={org.id} href={`/org/${org.handle}`} className="group block">
                <Card className="border-slate-700/40 hover:border-purple-700/50 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 text-white font-bold text-lg">
                        {org.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold truncate">{org.name}</p>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-600 group-hover:text-purple-400 shrink-0 transition-colors" />
                        </div>
                        <p className="text-slate-500 text-xs">@{org.handle}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${ROLE_COLOR[org.role]}`}>
                            {ROLE_ICON[org.role]} {ROLE_LABEL[org.role]}
                          </span>
                          <span className="text-slate-500 text-xs">{org.memberCount + 1} membro{org.memberCount + 1 !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

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
