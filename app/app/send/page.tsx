import { Suspense } from "react";
import { SendPaymentForm } from "@/components/SendPaymentForm";

export default function SendPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Enviar XLM</h1>
        <p className="text-slate-400 mt-1">Transferência instantânea via Stellar Testnet</p>
      </div>
      <Suspense>
        <SendPaymentForm />
      </Suspense>
    </div>
  );
}
