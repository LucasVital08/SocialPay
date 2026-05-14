"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { abbreviateKey } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface WalletAddressProps {
  publicKey: string;
  chars?: number;
  className?: string;
}

export function WalletAddress({ publicKey, chars = 8, className }: WalletAddressProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-mono text-sm text-slate-400">
        {abbreviateKey(publicKey, chars)}
      </span>
      <button
        onClick={handleCopy}
        title="Copiar endereço completo"
        className="text-slate-500 hover:text-slate-300 transition-colors"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
