"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandleBadge } from "@/components/HandleBadge";
import { formatAmount } from "@/lib/utils";

type Step = "form" | "confirm" | "success";

interface SendResult {
  id: string;
  hash: string;
  explorerUrl: string;
  amount: string;
  toHandle: string;
}

export function SendPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("form");
  const [toHandle, setToHandle] = useState(searchParams.get("to") ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!toHandle.trim()) { setError("Informe o destinatário"); return; }
    if (!amount || Number(amount) <= 0) { setError("Valor deve ser maior que zero"); return; }
    setStep("confirm");
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toHandle, amount, description, visibility }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar");
      setResult(data);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  if (step === "confirm") {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Confirmar transferência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-6 text-center space-y-4">
            <p className="text-slate-400">Você está enviando</p>
            <p className="text-4xl font-bold text-white">
              {formatAmount(amount)} <span className="text-2xl text-slate-400">XLM</span>
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-slate-400 text-sm">para</span>
              <HandleBadge handle={toHandle} size="lg" linked={false} />
            </div>
            {description && (
              <p className="text-sm text-slate-400 italic">&ldquo;{description}&rdquo;</p>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("form")} className="flex-1">
              Voltar
            </Button>
            <Button onClick={handleSend} loading={loading} className="flex-1 gap-2">
              <Send className="h-4 w-4" />
              Confirmar envio
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "success" && result) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/20 border border-emerald-500/30 mx-auto">
            <Send className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Enviado com sucesso!</h2>
          <p className="text-slate-400">
            {formatAmount(result.amount)} XLM enviados para{" "}
            <HandleBadge handle={result.toHandle} size="sm" linked={false} className="inline-flex" />
          </p>
          <div className="rounded-lg bg-slate-800/60 p-3 font-mono text-xs text-slate-400 break-all text-left">
            Hash: {result.hash}
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              asChild
              variant="outline"
              className="flex-1"
            >
              <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer">
                Ver no explorer
              </a>
            </Button>
            <Button
              onClick={() => router.push(`/receipt/${result.id}`)}
              className="flex-1"
            >
              Ver comprovante
            </Button>
          </div>
          <Button variant="ghost" onClick={() => router.push("/app/feed")} className="w-full">
            Ir para o feed
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-blue-400" />
          Enviar XLM
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleConfirm} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="to">Destinatário</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm select-none">
                @
              </span>
              <Input
                id="to"
                placeholder="gabriel"
                value={toHandle.replace(/^@/, "")}
                onChange={(e) => setToHandle(e.target.value)}
                className="pl-7"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (XLM)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="10.00"
              min="0.0000001"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              placeholder="Pagamento pelo serviço..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Visibilidade</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Pública</SelectItem>
                <SelectItem value="private">Privada</SelectItem>
                <SelectItem value="organizational">Organizacional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" className="w-full gap-2" size="lg">
            Revisar transferência
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
