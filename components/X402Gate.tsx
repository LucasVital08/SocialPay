"use client";

import { useState } from "react";
import { Zap, Lock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface X402GateProps {
  endpoint: string;
  title?: string;
  description?: string;
  price?: string;
  /** User's Stellar secret key — required to sign payment */
  secretKey?: string | null;
  children?: React.ReactNode;
}

type State = "idle" | "loading" | "success" | "error" | "no-wallet";

export function X402Gate({
  endpoint,
  title = "Conteúdo Premium",
  description = "Este recurso requer pagamento via protocolo x402 na rede Stellar.",
  price = "$0.01 USDC",
  secretKey,
  children,
}: X402GateProps) {
  const [state, setState] = useState<State>("idle");
  const [data, setData] = useState<unknown | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentReqs, setPaymentReqs] = useState<unknown | null>(null);

  const handleAccess = async () => {
    if (!secretKey) {
      setState("no-wallet");
      return;
    }

    setState("loading");
    setErrorMsg(null);

    try {
      // Try request without payment first
      const probeRes = await fetch(endpoint);

      if (probeRes.status !== 402) {
        // Already accessible
        const json = await probeRes.json();
        setData(json);
        setState("success");
        return;
      }

      // Parse payment requirements from header
      const reqHeader = probeRes.headers.get("X-PAYMENT-REQUIRED");
      if (!reqHeader) {
        throw new Error("Servidor não retornou X-PAYMENT-REQUIRED header");
      }

      const payReqs = JSON.parse(atob(reqHeader));
      setPaymentReqs(payReqs);

      // Build payment using @x402/stellar client-side
      const { wrapFetchWithPayment } = await import("@x402/fetch");
      const { ExactStellarScheme } = await import("@x402/stellar/exact/client");
      const { createEd25519Signer } = await import("@x402/stellar");
      const { x402Client } = await import("@x402/core/client");

      const signer = createEd25519Signer(secretKey);
      const stellarScheme = new ExactStellarScheme(signer);
      const client = new x402Client().register("stellar:testnet", stellarScheme);

      const fetchWithPay = wrapFetchWithPayment(fetch, client);
      const paidRes = await fetchWithPay(endpoint);

      if (!paidRes.ok) {
        const errJson = await paidRes.json().catch(() => ({}));
        throw new Error((errJson as { error?: string }).error ?? `Erro ${paidRes.status}`);
      }

      const json = await paidRes.json();
      setData(json);
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  if (state === "success" && data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Pagamento x402 verificado — acesso liberado
        </div>
        {children ?? (
          <pre className="rounded-xl bg-slate-900 border border-slate-700/50 p-4 text-xs text-slate-300 overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return (
    <Card className="border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-5 w-5 text-amber-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-400">{description}</p>

        <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Protocolo</span>
            <span className="text-white font-medium">x402 (HTTP 402 Payment Required)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Rede</span>
            <span className="text-white font-medium">Stellar Testnet</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Preço</span>
            <span className="text-emerald-400 font-semibold">{price}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Endpoint</span>
            <code className="text-blue-300 text-xs">{endpoint}</code>
          </div>
        </div>

        {state === "no-wallet" && (
          <p className="text-sm bg-amber-900/20 text-amber-400 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Conecte sua carteira Stellar para pagar via x402.
          </p>
        )}

        {state === "error" && (
          <p className="text-sm bg-red-900/30 text-red-400 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        {state === "loading" && (
          <p className="text-sm text-slate-400 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Assinando e enviando pagamento Stellar...
          </p>
        )}

        <Button
          onClick={handleAccess}
          loading={state === "loading"}
          className="w-full"
        >
          <Zap className="h-4 w-4" />
          Pagar {price} e acessar
        </Button>

        <p className="text-xs text-slate-600 text-center">
          Pagamento atômico via Stellar — confirmado em segundos
        </p>
      </CardContent>
    </Card>
  );
}
