"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Building2, Wallet, Send, Users, RefreshCw, Zap,
  ArrowLeft, CheckCircle2, ExternalLink, Crown, Shield, CreditCard, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAmount } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = { owner: "Proprietário", admin: "Admin", payer: "Pagador", viewer: "Visualizador" };
const ROLE_ICON: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3.5 w-3.5 text-amber-400" />,
  admin: <Shield className="h-3.5 w-3.5 text-blue-400" />,
  payer: <CreditCard className="h-3.5 w-3.5 text-emerald-400" />,
  viewer: <Eye className="h-3.5 w-3.5 text-slate-400" />,
};

interface OrgData {
  org: {
    id: string; name: string; handle: string; description: string | null;
    owner: { name: string; handle: string };
    wallet: { publicKey: string; funded: boolean };
    memberCount: number; txCount: number;
  };
  members: Array<{
    id: string; user: { id: string; name: string; handle: string };
    role: string; spendingLimit: string | null; totalSpent: string; addedAt: string;
  }>;
  myRole: string;
  mySpendingLimit: string | null;
  myTotalSpent: string;
}

interface AssetBalance { assetCode: string; balance: string; isNative: boolean }

export default function OrgDashboardPage() {
  const params = useParams();
  const handle = params.handle as string;

  const [data, setData] = useState<OrgData | null>(null);
  const [balances, setBalances] = useState<AssetBalance[] | null>(null);
  const [txHistory, setTxHistory] = useState<Array<{
    id: string; toHandle: string | null; amount: string; status: string;
    stellarHash: string | null; explorerUrl: string | null; createdAt: string;
    initiatedBy: { name: string; handle: string };
  }> | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingFund, setLoadingFund] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendDesc, setSendDesc] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSend = data && ["owner", "admin", "payer"].includes(data.myRole);
  const canManage = data && ["owner", "admin"].includes(data.myRole);

  const loadOrg = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/${handle}`);
      if (!res.ok) { setError((await res.json()).error); return; }
      setData(await res.json());
    } catch { setError("Erro ao carregar organização"); }
    finally { setLoading(false); }
  };

  const loadBalance = async () => {
    if (!data) return;
    setLoadingBalance(true);
    try {
      const res = await fetch(`/api/wallet/balance?publicKey=${data.org.wallet.publicKey}`);
      const json = await res.json();
      setBalances(json.balances ?? []);
    } finally { setLoadingBalance(false); }
  };

  const loadHistory = async () => {
    const res = await fetch(`/api/org/${handle}/transactions`);
    if (res.ok) setTxHistory((await res.json()).transactions);
  };

  const fundWallet = async () => {
    setLoadingFund(true); setMsg(null);
    try {
      const res = await fetch(`/api/org/${handle}/fund`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg({ type: "success", text: "Carteira financiada com Friendbot!" });
      await loadBalance();
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erro" }); }
    finally { setLoadingFund(false); }
  };

  const handleSend = async () => {
    setSendLoading(true); setMsg(null);
    try {
      const res = await fetch(`/api/org/${handle}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toHandle: sendTo, amount: sendAmount, description: sendDesc }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg({ type: "success", text: `Enviado! Hash: ${json.hash?.slice(0, 16)}...` });
      setSendTo(""); setSendAmount(""); setSendDesc("");
      await Promise.all([loadBalance(), loadHistory()]);
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erro" }); }
    finally { setSendLoading(false); }
  };

  useEffect(() => { loadOrg(); }, [handle]);
  useEffect(() => { if (data) { loadBalance(); loadHistory(); } }, [data?.org.id]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;
  if (error) return (
    <div className="space-y-4">
      <p className="text-red-400 bg-red-900/20 rounded-lg p-4">{error}</p>
      <Button asChild variant="outline" size="sm"><Link href="/app"><ArrowLeft className="h-4 w-4" />Voltar</Link></Button>
    </div>
  );
  if (!data) return null;

  const { org, myRole, mySpendingLimit, myTotalSpent } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button asChild size="sm" variant="ghost"><Link href="/app"><ArrowLeft className="h-4 w-4" />Dashboard</Link></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 text-white text-xl font-bold">
              {org.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{org.name}</h1>
              <p className="text-slate-400 text-sm">@{org.handle}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {ROLE_ICON[myRole]}
              <Badge variant="secondary">{ROLE_LABEL[myRole]}</Badge>
            </div>
          </div>
          {org.description && <p className="text-slate-400 text-sm mt-2">{org.description}</p>}
        </div>
        {canManage && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/org/${handle}/members`}><Users className="h-4 w-4" />Membros ({org.memberCount})</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carteira */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-400" />
              Carteira da Organização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-800/60 border border-slate-700/40 p-3">
              <p className="text-xs text-slate-500 mb-1">Endereço Stellar</p>
              <p className="text-xs text-slate-300 font-mono break-all">{org.wallet.publicKey}</p>
            </div>

            {balances !== null && (
              <div className="space-y-2">
                {balances.length === 0 && <p className="text-sm text-slate-500">Sem saldo. Financie com Friendbot.</p>}
                {balances.map((b) => (
                  <div key={b.isNative ? "XLM" : b.assetCode} className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">{b.isNative ? "XLM" : b.assetCode}</span>
                    <span className="text-lg font-bold text-white">{formatAmount(b.balance)}</span>
                  </div>
                ))}
              </div>
            )}

            {msg && (
              <p className={`text-sm rounded-lg px-3 py-2 ${msg.type === "success" ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"}`}>
                {msg.text}
              </p>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={loadBalance} loading={loadingBalance}>
                <RefreshCw className="h-3.5 w-3.5" /> Atualizar
              </Button>
              {canManage && (
                <Button size="sm" variant="secondary" onClick={fundWallet} loading={loadingFund}>
                  <Zap className="h-3.5 w-3.5" /> Friendbot
                </Button>
              )}
            </div>

            {/* Meu limite */}
            {myRole !== "owner" && mySpendingLimit && (
              <div className="rounded-lg bg-slate-800/60 border border-slate-700/40 p-3 text-sm">
                <p className="text-slate-400 text-xs mb-1">Meu limite de gastos</p>
                <div className="flex justify-between">
                  <span className="text-slate-300">Gasto: <span className="text-white font-semibold">{formatAmount(myTotalSpent)} XLM</span></span>
                  <span className="text-slate-300">Limite: <span className="text-white font-semibold">{formatAmount(mySpendingLimit)} XLM</span></span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{ width: `${Math.min(100, (parseFloat(myTotalSpent) / parseFloat(mySpendingLimit)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enviar pagamento */}
        {canSend && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-400" />
                Enviar Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="to">Para (@handle)</Label>
                <Input id="to" placeholder="@usuario" value={sendTo} onChange={(e) => setSendTo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Valor (XLM)</Label>
                <Input id="amount" type="number" placeholder="10" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Descrição (opcional)</Label>
                <Input id="desc" placeholder="Pagamento fornecedor..." value={sendDesc} onChange={(e) => setSendDesc(e.target.value)} />
              </div>
              <Button onClick={handleSend} loading={sendLoading} className="w-full" disabled={!sendTo || !sendAmount}>
                <Send className="h-4 w-4" /> Enviar da org
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Histórico de transações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {!txHistory && <p className="text-sm text-slate-500">Carregando...</p>}
          {txHistory && txHistory.length === 0 && <p className="text-sm text-slate-500">Nenhuma transação ainda.</p>}
          {txHistory && txHistory.length > 0 && (
            <div className="space-y-3">
              {txHistory.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg bg-slate-800/40 border border-slate-700/30 px-4 py-3">
                  <div>
                    <p className="text-sm text-white font-medium">
                      Para <span className="text-blue-400">@{tx.toHandle ?? "desconhecido"}</span>
                    </p>
                    <p className="text-xs text-slate-500">por @{tx.initiatedBy.handle} · {new Date(tx.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">{formatAmount(tx.amount)} XLM</span>
                    {tx.status === "confirmed" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Badge variant="destructive" className="text-xs">{tx.status}</Badge>
                    )}
                    {tx.explorerUrl && (
                      <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 text-slate-500 hover:text-blue-400" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
