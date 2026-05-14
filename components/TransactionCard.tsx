"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HandleBadge } from "@/components/HandleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { abbreviateHash, formatDate, formatAmount } from "@/lib/utils";

interface Transaction {
  id: string;
  senderHandle: string;
  receiverHandle: string;
  amount: string;
  assetCode: string;
  description?: string | null;
  visibility: string;
  status: string;
  stellarHash?: string | null;
  explorerUrl?: string | null;
  createdAt: string | Date;
}

interface TransactionCardProps {
  transaction: Transaction;
}

export function TransactionCard({ transaction: tx }: TransactionCardProps) {
  return (
    <Card className="hover:border-slate-600/60 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <HandleBadge handle={tx.senderHandle} size="sm" />
              <ArrowRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <HandleBadge handle={tx.receiverHandle} size="sm" />
              {tx.visibility === "organizational" && (
                <Badge variant="org">Organizacional</Badge>
              )}
              {tx.visibility === "private" && (
                <Badge variant="secondary">Privado</Badge>
              )}
            </div>

            {tx.description && (
              <p className="mt-2 text-sm text-slate-400 truncate">{tx.description}</p>
            )}

            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <StatusBadge status={tx.status} />
              <span className="text-xs text-slate-500">
                {formatDate(tx.createdAt)}
              </span>
              {tx.stellarHash && (
                <span className="font-mono text-xs text-slate-500">
                  {abbreviateHash(tx.stellarHash, 6)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-right">
              <span className="text-2xl font-bold text-white">
                {formatAmount(tx.amount)}
              </span>
              <span className="ml-1 text-sm text-slate-400">{tx.assetCode}</span>
            </div>

            <div className="flex gap-2">
              {tx.explorerUrl && (
                <a
                  href={tx.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver no explorer"
                  className="text-slate-500 hover:text-blue-400 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <Button asChild size="sm" variant="outline">
                <Link href={`/receipt/${tx.id}`}>Ver comprovante</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
