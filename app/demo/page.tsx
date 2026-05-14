"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  Zap,
  Send,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandleBadge } from "@/components/HandleBadge";
import { WalletAddress } from "@/components/WalletAddress";
import { Badge } from "@/components/ui/badge";
import { abbreviateHash } from "@/lib/utils";

interface DemoUser {
  handle: string;
  name: string;
  publicKey?: string;
  balance?: string;
  funded?: boolean;
}

interface TxResult {
  id: string;
  hash: string;
  explorerUrl: string;
  amount: string;
  from: string;
  to: string;
  fromPublicKey: string;
  toPublicKey: string;
}

type Step = "idle" | "setup" | "fund" | "send" | "done";

export default function DemoPage() {
  const [step, setStep] = useState<Step>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [txResult, setTxResult] = useState<TxResult | null>(null);

  const fetchBalance = async (handle: string): Promise<string> => {
    const res = await fetch(`/api/wallet/balance?handle=${handle}`);
    const data = await res.json();
    return data.balance ?? "0";
  };

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
      setStep("setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar carteiras");
    } finally {
      setLoading(false);
    }
  };

  const handleFund = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all(
        ["lucas", "gabriel"].map((h) =>
          fetch("/api/wallet/fund", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ handle: h }),
          })
        )
      );
      const [lucasBalance, gabrielBalance] = await Promise.all([
        fetchBalance("lucas"),
        fetchBalance("gabriel"),
      ]);
      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          funded: true,
          balance: u.handle === "lucas" ? lucasBalance : gabrielBalance,
        }))
      );
      setStep("fund");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao financiar carteiras");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromHandle: "lucas",
          toHandle: "gabriel",
          amount: "10",
          description: "Demo SocialPay — @lucas → @gabriel",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTxResult(data);

      const [lucasBalance, gabrielBalance] = await Promise.all([
        fetchBalance("lucas"),
        fetchBalance("gabriel"),
      ]);
      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          balance: u.handle === "lucas" ? lucasBalance : gabrielBalance,
        }))
      );

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar transação");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBalances = async () => {
    setLoading(true);
    try {
      const [lucasBalance, gabrielBalance] = await Promise.all([
        fetchBalance("lucas"),
        fetchBalance("gabriel"),
      ]);
      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          balance: u.handle === "lucas" ? lucasBalance : gabrielBalance,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Demo SocialPay</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Transação real na Stellar Testnet entre @lucas e @gabriel
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-xl bg-amber-900/20 border border-amber-700/30 px-5 py-3">
          <p className="text-sm text-amber-400">
            ⚠️ Ambiente Stellar Testnet apenas. Sem valor financeiro real. XLM de teste não tem valor.
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { key: "idle", label: "Início" },
            { key: "setup", label: "Carteiras" },
            { key: "fund", label: "Fundadas" },
            { key: "done", label: "Enviado" },
          ].map((s, i, arr) => {
            const steps = ["idle", "setup", "fund", "done"];
            const currentIdx = steps.indexOf(step);
            const sIdx = steps.indexOf(s.key);
            const active = sIdx === currentIdx;
            const done = sIdx < currentIdx;
            return (
              <div key={s.key} className="flex items-center gap-2 shrink-0">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-emerald-600 text-white"
                      : active
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {done ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span
                  className={`text-sm font-medium ${
                    active ? "text-white" : done ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {s.label}
                </span>
                {i < arr.length - 1 && (
                  <div className="h-px w-8 bg-slate-700 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleSetup}
            loading={loading && step === "idle"}
            disabled={step !== "idle" || loading}
            variant={step === "idle" ? "default" : "secondary"}
            className="gap-2"
          >
            <Users size={16} />
            1. Criar carteiras de teste
          </Button>
          <Button
            onClick={handleFund}
            loading={loading && step === "setup"}
            disabled={step !== "setup" || loading}
            variant={step === "setup" ? "default" : "secondary"}
            className="gap-2"
          >
            <Zap size={16} />
            2. Financiar carteiras
          </Button>
          <Button
            onClick={handleSend}
            loading={loading && step === "fund"}
            disabled={step !== "fund" || loading}
            variant={step === "fund" ? "default" : "secondary"}
            className="gap-2"
          >
            <Send size={16} />
            3. Enviar 10 XLM de @lucas para @gabriel
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-900/20 border border-red-700/30 px-5 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Users wallets */}
        {users.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Carteiras</h2>
              {step !== "idle" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRefreshBalances}
                  loading={loading}
                >
                  <RefreshCw size={14} />
                  Atualizar saldos
                </Button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {users.map((u) => (
                <Card key={u.handle}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{u.name}</p>
                        <HandleBadge handle={u.handle} size="sm" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {u.publicKey && <WalletAddress publicKey={u.publicKey} />}
                    {u.balance !== undefined && (
                      <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                        <p className="text-xs text-slate-500">Saldo</p>
                        <p className="font-bold text-white">
                          {Number(u.balance).toFixed(4)}{" "}
                          <span className="text-slate-400 text-sm">XLM</span>
                        </p>
                      </div>
                    )}
                    {u.funded && (
                      <Badge variant="success">Financiada</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Transaction result */}
        {txResult && (
          <Card className="border-emerald-500/30 bg-emerald-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={20} />
                Transação confirmada na Stellar Testnet!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-lg">
                <HandleBadge handle="lucas" size="md" />
                <ArrowRight className="text-slate-500" size={20} />
                <HandleBadge handle="gabriel" size="md" />
                <span className="ml-auto font-bold text-white text-xl">
                  10 <span className="text-slate-400 text-base">XLM</span>
                </span>
              </div>

              <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 divide-y divide-slate-700/40">
                <div className="flex justify-between items-center px-4 py-3 gap-4">
                  <span className="text-xs text-slate-500">Hash Stellar</span>
                  <span className="font-mono text-xs text-slate-300">
                    {abbreviateHash(txResult.hash, 10)}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 gap-4">
                  <span className="text-xs text-slate-500">De</span>
                  <span className="font-mono text-xs text-slate-400">
                    {txResult.fromPublicKey.slice(0, 12)}...
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 gap-4">
                  <span className="text-xs text-slate-500">Para</span>
                  <span className="font-mono text-xs text-slate-400">
                    {txResult.toPublicKey.slice(0, 12)}...
                  </span>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <Button asChild variant="outline" className="gap-2 flex-1">
                  <a
                    href={txResult.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={14} />
                    Ver no Stellar Expert
                  </a>
                </Button>
                <Button asChild className="flex-1">
                  <Link href={`/receipt/${txResult.id}`}>Ver comprovante</Link>
                </Button>
              </div>

              <Button asChild variant="ghost" className="w-full">
                <Link href="/app/feed">Ver no feed</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Reset */}
        {step === "done" && (
          <Button
            variant="secondary"
            onClick={() => {
              setStep("idle");
              setUsers([]);
              setTxResult(null);
              setError(null);
            }}
            className="w-full"
          >
            Reiniciar demo
          </Button>
        )}

        <div className="text-center">
          <Link href="/app/feed" className="text-sm text-blue-400 hover:text-blue-300">
            Ver todas as transações no feed →
          </Link>
        </div>
      </div>
    </div>
  );
}
