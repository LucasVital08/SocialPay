"use client";

import { useState } from "react";
import { ArrowLeft, ArrowUpCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RampOrderCard, type RampOrder } from "@/components/RampOrderCard";

type Step = "amount" | "quote" | "order" | "done";

interface Quote {
  quoteId: string;
  sourceAsset: string;
  targetAsset: string;
  sourceAmount: string;
  targetAmount: string;
  exchangeRate: string;
  expiresAt: string;
}

const TESOURO_ISSUER = process.env.NEXT_PUBLIC_TESOURO_ASSET_ISSUER ?? "";
const USDC_ISSUER = process.env.NEXT_PUBLIC_USDC_ASSET_ISSUER ?? "";

const ASSETS = [
  { code: "TESOURO", issuer: TESOURO_ISSUER, label: "Tesouro BRL" },
  { code: "USDC", issuer: USDC_ISSUER, label: "USD Coin" },
];

export default function WithdrawPage() {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]!);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<RampOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetQuote = async () => {
    const parsed = parseFloat(amount.replace(",", "."));
    if (isNaN(parsed) || parsed < 1) {
      setError("Informe um valor mínimo de 1");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const sourceIdentifier = `${selectedAsset.code}:${selectedAsset.issuer}`;
      const res = await fetch("/api/ramp/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "offramp",
          sourceAsset: sourceIdentifier,
          targetAsset: "BRL",
          sourceAmount: parsed.toFixed(2),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar cotação");
      setQuote(data as Quote);
      setStep("quote");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!quote) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ramp/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "offramp",
          quoteId: quote.quoteId,
          bankAccountId: "pix",
          fiatAmount: quote.targetAmount,
          fiatCurrency: "BRL",
          cryptoAssetCode: selectedAsset.code,
          cryptoAssetIssuer: selectedAsset.issuer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar ordem");
      setOrder({
        localOrderId: data.localOrderId,
        orderId: data.orderId,
        status: data.status,
        type: "offramp",
        memo: data.memo,
        destinationAddress: data.destinationAddress,
        amount: data.amount,
        asset: data.asset,
      });
      setStep("order");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshOrder = async (orderId: string) => {
    const res = await fetch(`/api/ramp/order/${orderId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.order && order) {
      setOrder({ ...order, status: data.order.status ?? order.status });
      if (data.order.status === "completed") setStep("done");
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link href="/app">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ArrowUpCircle className="h-6 w-6 text-emerald-400" />
            Sacar via Pix
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Converta tokens Stellar em BRL via Etherfuse Anchor
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {(["amount", "quote", "order", "done"] as Step[]).map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${
                step === s
                  ? "bg-emerald-600 text-white"
                  : i < ["amount", "quote", "order", "done"].indexOf(step)
                  ? "bg-emerald-700 text-white"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {i + 1}
            </span>
            <span className={step === s ? "text-white" : ""}>
              {s === "amount" ? "Valor" : s === "quote" ? "Cotação" : s === "order" ? "Enviar" : "Concluído"}
            </span>
            {i < 3 && <span className="text-slate-700">→</span>}
          </span>
        ))}
      </div>

      {/* Step: amount */}
      {step === "amount" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quanto deseja sacar?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Quantidade de tokens</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="10.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGetQuote()}
              />
            </div>

            <div className="space-y-2">
              <Label>Ativo a enviar</Label>
              <div className="flex gap-2 flex-wrap">
                {ASSETS.map((a) => (
                  <button
                    key={a.code}
                    onClick={() => setSelectedAsset(a)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      selectedAsset.code === a.code
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {a.code}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm bg-red-900/30 text-red-400 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button onClick={handleGetQuote} loading={loading} className="w-full">
              Ver cotação
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: quote */}
      {step === "quote" && quote && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirmação da cotação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Você envia</span>
                <span className="text-white font-semibold">
                  {quote.sourceAmount} {selectedAsset.code}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Você recebe</span>
                <span className="text-white font-semibold">R$ {quote.targetAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Taxa de câmbio</span>
                <span className="text-slate-300">{quote.exchangeRate}</span>
              </div>
            </div>

            <div className="rounded-lg bg-amber-900/20 border border-amber-700/40 p-3">
              <p className="text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Após criar a ordem, você precisará enviar os tokens para o endereço Stellar
                informado, incluindo o <strong>memo obrigatório</strong>. Sem o memo, a ordem
                ficará órfã e você não receberá o Pix.
              </p>
            </div>

            {error && (
              <p className="text-sm bg-red-900/30 text-red-400 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("amount")} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleCreateOrder} loading={loading} className="flex-1">
                Criar ordem
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: order (show memo + destination) */}
      {step === "order" && order && (
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-900/20 border border-amber-700/40 p-4">
            <p className="text-sm text-amber-300 font-medium">
              Envie os tokens para o endereço abaixo com o memo exato. Após confirmação on-chain, o Pix será creditado.
            </p>
          </div>
          <RampOrderCard order={order} onRefresh={handleRefreshOrder} />
        </div>
      )}

      {/* Step: done */}
      {step === "done" && (
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-white">Saque concluído!</h2>
              <p className="text-slate-400 text-sm mt-1">
                O valor em BRL será creditado via Pix em breve.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/app">Ver dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
