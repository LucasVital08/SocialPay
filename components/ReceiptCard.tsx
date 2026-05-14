"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HandleBadge } from "@/components/HandleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { abbreviateKey, formatDate, formatAmount } from "@/lib/utils";

interface ReceiptData {
  id: string;
  status: string;
  amount: string;
  assetCode: string;
  senderHandle: string;
  receiverHandle: string;
  senderPublicKey: string;
  receiverPublicKey: string;
  description?: string | null;
  visibility: string;
  stellarHash?: string | null;
  explorerUrl?: string | null;
  createdAt: string | Date;
  confirmedAt?: string | Date | null;
  sender?: { name: string };
  receiver?: { name: string };
}

interface ReceiptCardProps {
  receipt: ReceiptData;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-2 text-slate-500 hover:text-slate-300 transition-colors"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function ReceiptCard({ receipt }: ReceiptCardProps) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/60 to-slate-900 p-8 text-center border-b border-slate-700/50">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
              SP
            </div>
            <span className="font-bold text-white text-xl tracking-tight">SocialPay</span>
          </div>
          {receipt.status === "confirmed" && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <Badge variant="success" className="text-sm px-3 py-1">
                Confirmado na Stellar Testnet
              </Badge>
            </div>
          )}
          {receipt.status !== "confirmed" && (
            <div className="mb-3">
              <StatusBadge status={receipt.status} />
            </div>
          )}
          <div className="text-4xl font-bold text-white mt-2">
            {formatAmount(receipt.amount)}{" "}
            <span className="text-2xl text-slate-400">{receipt.assetCode}</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">De</p>
              <HandleBadge handle={receipt.senderHandle} size="md" />
              {receipt.sender && (
                <p className="text-xs text-slate-500 mt-1">{receipt.sender.name}</p>
              )}
            </div>
            <ArrowRight className="h-5 w-5 text-slate-500 shrink-0" />
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Para</p>
              <HandleBadge handle={receipt.receiverHandle} size="md" />
              {receipt.receiver && (
                <p className="text-xs text-slate-500 mt-1">{receipt.receiver.name}</p>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 divide-y divide-slate-700/40">
            <Row label="Data">
              {formatDate(receipt.createdAt)}
            </Row>
            {receipt.confirmedAt && (
              <Row label="Confirmado em">
                {formatDate(receipt.confirmedAt)}
              </Row>
            )}
            {receipt.description && (
              <Row label="Descrição">{receipt.description}</Row>
            )}
            <Row label="Visibilidade">
              {{
                public: "Pública",
                private: "Privada",
                organizational: "Organizacional",
              }[receipt.visibility] ?? receipt.visibility}
            </Row>
            <Row label="Ativo">{receipt.assetCode} (Stellar)</Row>
          </div>

          {receipt.stellarHash && (
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-4 space-y-3">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Registro na Blockchain
              </p>
              <div>
                <p className="text-xs text-slate-500 mb-1">Hash da transação</p>
                <div className="flex items-center">
                  <span className="font-mono text-xs text-slate-300 break-all">
                    {receipt.stellarHash}
                  </span>
                  <CopyButton text={receipt.stellarHash} />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Carteira remetente</p>
                <div className="flex items-center">
                  <span className="font-mono text-xs text-slate-400">
                    {abbreviateKey(receipt.senderPublicKey, 12)}
                  </span>
                  <CopyButton text={receipt.senderPublicKey} />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Carteira destinatária</p>
                <div className="flex items-center">
                  <span className="font-mono text-xs text-slate-400">
                    {abbreviateKey(receipt.receiverPublicKey, 12)}
                  </span>
                  <CopyButton text={receipt.receiverPublicKey} />
                </div>
              </div>
              {receipt.explorerUrl && (
                <a
                  href={receipt.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver no Stellar Expert Testnet
                </a>
              )}
            </div>
          )}

          <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 px-4 py-3">
            <p className="text-xs text-amber-400/80">
              ⚠️ Transação realizada em ambiente Stellar Testnet, sem valor financeiro real.
            </p>
          </div>

          <div className="flex gap-3">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/app/feed">Ver feed</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/app/send">Nova transferência</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 gap-4">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-slate-300 text-right">{children}</span>
    </div>
  );
}
