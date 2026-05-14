"use client";

import { TransactionCard } from "@/components/TransactionCard";

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

interface FeedListProps {
  transactions: Transaction[];
  emptyMessage?: string;
}

export function FeedList({ transactions, emptyMessage = "Nenhuma transação ainda." }: FeedListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <div className="text-4xl mb-4">💸</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {transactions.map((tx) => (
        <TransactionCard key={tx.id} transaction={tx} />
      ))}
    </div>
  );
}
