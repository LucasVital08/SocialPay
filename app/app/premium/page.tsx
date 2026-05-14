"use client";

import { useState } from "react";
import { Zap, Info, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X402Gate } from "@/components/X402Gate";

export default function PremiumPage() {
  const [secretKey, setSecretKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link href="/app">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-400" />
            Premium — Protocolo x402
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Demo de monetização de APIs via HTTP 402 Payment Required na rede Stellar
          </p>
        </div>
      </div>

      {/* x402 explainer */}
      <Card className="border-blue-800/40 bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-blue-300">
            <Info className="h-4 w-4" />
            Como funciona o protocolo x402?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400 space-y-2">
          <p>
            O <strong className="text-white">x402</strong> é um padrão aberto que usa o código HTTP
            <code className="text-blue-300 bg-slate-800 rounded px-1 mx-1">402 Payment Required</code>
            para proteger APIs com micropagamentos blockchain.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400">
            <li>Cliente requisita o endpoint sem pagamento</li>
            <li>Servidor retorna <code className="text-amber-300">402</code> com header <code className="text-amber-300">X-PAYMENT-REQUIRED</code></li>
            <li>Cliente assina uma transação Stellar e envia no header <code className="text-amber-300">X-PAYMENT</code></li>
            <li>Servidor verifica via facilitador Coinbase e libera acesso</li>
          </ol>
          <p className="text-xs text-slate-500 mt-2">
            Pagamento atômico — sem cadastro, sem contrato. Apenas uma tx Stellar de $0.01 USDC.
          </p>
        </CardContent>
      </Card>

      {/* Wallet key input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configurar carteira para pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="sk">Chave secreta Stellar (para assinar pagamento)</Label>
            <div className="flex gap-2">
              <Input
                id="sk"
                type={showKey ? "text" : "password"}
                placeholder="SXXXXX... (Stellar testnet secret key)"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Apenas para fins de demonstração nesta testnet. A chave é usada apenas no seu navegador para assinar a transação.
          </p>
        </CardContent>
      </Card>

      {/* x402 Gate */}
      <X402Gate
        endpoint="/api/x402/analytics"
        title="Analytics de Pagamentos SocialPay"
        description="Acesse métricas de transações e ordens de câmbio pagando $0.01 USDC via Stellar testnet — sem login adicional, apenas uma transação blockchain."
        price="$0.01 USDC"
        secretKey={secretKey || null}
      />

      {/* Raw demo info */}
      <Card className="border-slate-700/40">
        <CardHeader>
          <CardTitle className="text-sm text-slate-300">Testar via curl/código</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs text-slate-400 bg-slate-900 rounded-lg p-3 overflow-auto">
{`# 1. Sem pagamento — retorna 402
curl -I http://localhost:3000/api/x402/analytics

# 2. Com pagamento via @x402/fetch (Node.js)
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { createEd25519Signer } from "@x402/stellar";
import { x402Client } from "@x402/core/client";

const signer = createEd25519Signer("SXXXXXXX");
const client = new x402Client()
  .register("stellar:testnet", new ExactStellarScheme(signer));

const fetchWithPay = wrapFetchWithPayment(fetch, client);
const res = await fetchWithPay("http://localhost:3000/api/x402/analytics");
const data = await res.json();`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
