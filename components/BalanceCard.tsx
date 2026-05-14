"use client";

import { useState } from "react";
import { Wallet, RefreshCw, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WalletAddress } from "@/components/WalletAddress";
import { formatAmount } from "@/lib/utils";

interface BalanceCardProps {
  publicKey: string;
  handle: string;
}

export function BalanceCard({ publicKey, handle }: BalanceCardProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingFund, setLoadingFund] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBalance = async () => {
    setLoadingBalance(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/wallet/balance?publicKey=${publicKey}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBalance(data.balance);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao buscar saldo" });
    } finally {
      setLoadingBalance(false);
    }
  };

  const fundWallet = async () => {
    setLoadingFund(true);
    setMessage(null);
    try {
      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: "success", text: "Carteira financiada com Friendbot! Atualize o saldo." });
      await fetchBalance();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao financiar" });
    } finally {
      setLoadingFund(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-5 w-5 text-blue-400" />
          Carteira Stellar Testnet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <WalletAddress publicKey={publicKey} />

        {balance !== null && (
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4">
            <p className="text-xs text-slate-500 mb-1">Saldo disponível</p>
            <p className="text-3xl font-bold text-white">
              {formatAmount(balance)}{" "}
              <span className="text-lg text-slate-400">XLM</span>
            </p>
          </div>
        )}

        {message && (
          <p
            className={`text-sm rounded-lg px-3 py-2 ${
              message.type === "success"
                ? "bg-emerald-900/30 text-emerald-400"
                : "bg-red-900/30 text-red-400"
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchBalance}
            loading={loadingBalance}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar saldo
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={fundWallet}
            loading={loadingFund}
          >
            <Zap className="h-3.5 w-3.5" />
            Financiar via Friendbot
          </Button>
        </div>
        <p className="text-xs text-slate-600">
          Rede: Stellar Testnet · Sem valor financeiro real
        </p>
      </CardContent>
    </Card>
  );
}
