"use client";

import { useState } from "react";
import { Copy, CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface RampOrder {
  localOrderId: string;
  orderId: string;
  status: string;
  type: "onramp" | "offramp";
  // on-ramp fields
  pixKey?: string | null;
  pixQrCode?: string | null;
  pixExpiration?: string | null;
  // off-ramp fields
  memo?: string | null;
  destinationAddress?: string | null;
  // common
  amount?: string;
  asset?: string;
}

interface Props {
  order: RampOrder;
  onRefresh?: (orderId: string) => Promise<void>;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Aguardando", variant: "secondary" },
  processing: { label: "Processando", variant: "default" },
  awaiting_settlement: { label: "Liquidando", variant: "default" },
  completed: { label: "Concluído", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
  expired: { label: "Expirado", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "outline" },
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado!" : label}
    </button>
  );
}

export function RampOrderCard({ order, onRefresh }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const cfg = statusConfig[order.status] ?? { label: order.status, variant: "secondary" as const };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh(order.orderId);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card className="border-slate-700/50">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
            <span className="text-xs text-slate-500">
              {order.type === "onramp" ? "Depósito Pix" : "Saque Pix"}
            </span>
          </div>
          {onRefresh && (
            <Button size="sm" variant="ghost" onClick={handleRefresh} loading={refreshing}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {order.amount && (
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-white">{order.amount}</span>{" "}
            {order.asset ?? ""}
          </p>
        )}

        {/* On-ramp: Pix */}
        {order.type === "onramp" && order.pixKey && (
          <div className="rounded-lg bg-slate-800/60 border border-slate-700/40 p-3 space-y-2">
            <p className="text-xs text-slate-400 font-medium">Chave Pix</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs text-white break-all">{order.pixKey}</code>
              <CopyButton value={order.pixKey} label="Copiar chave" />
            </div>
          </div>
        )}

        {order.type === "onramp" && order.pixQrCode && (
          <div className="rounded-lg bg-slate-800/60 border border-slate-700/40 p-3 space-y-2">
            <p className="text-xs text-slate-400 font-medium">QR Code Pix (copia e cola)</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs text-white break-all line-clamp-2">{order.pixQrCode}</code>
              <CopyButton value={order.pixQrCode} label="Copiar QR" />
            </div>
          </div>
        )}

        {order.type === "onramp" && order.pixExpiration && (
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Expira: {new Date(order.pixExpiration).toLocaleString("pt-BR")}
          </p>
        )}

        {/* Off-ramp: Memo + Destination */}
        {order.type === "offramp" && order.memo && (
          <div className="rounded-lg bg-amber-900/20 border border-amber-700/40 p-3 space-y-2">
            <p className="text-xs text-amber-400 font-medium">Memo Stellar (OBRIGATÓRIO na transação)</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs text-white">{order.memo}</code>
              <CopyButton value={order.memo} label="Copiar memo" />
            </div>
          </div>
        )}

        {order.type === "offramp" && order.destinationAddress && (
          <div className="rounded-lg bg-slate-800/60 border border-slate-700/40 p-3 space-y-2">
            <p className="text-xs text-slate-400 font-medium">Endereço Stellar destino</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs text-white break-all">{order.destinationAddress}</code>
              <CopyButton value={order.destinationAddress} label="Copiar" />
            </div>
          </div>
        )}

        <p className="text-xs text-slate-600">ID Etherfuse: {order.orderId}</p>
      </CardContent>
    </Card>
  );
}
