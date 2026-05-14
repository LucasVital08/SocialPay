import Link from "next/link";
import { ArrowRight, AtSign, Wallet, Send, Activity, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
            SP
          </div>
          <span className="font-bold text-white text-lg tracking-tight">SocialPay</span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/demo">Demo</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/auth/register">Criar conta</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-24 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/10 px-4 py-1.5 text-sm text-blue-400 mb-8">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          Rodando na Stellar Testnet
        </div>
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight">
          Envie dinheiro por{" "}
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            @
          </span>
        </h1>
        <p className="mt-6 text-xl text-slate-400 max-w-2xl leading-relaxed">
          A rede social financeira auditável na Stellar. Envie XLM para qualquer{" "}
          <span className="text-blue-400 font-mono font-semibold">@usuario</span> sem conhecer
          endereço de carteira, chave pública ou detalhes técnicos de blockchain.
        </p>
        <div className="flex flex-wrap gap-3 mt-10 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/app">
              Entrar no app
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/demo">Ver demo ao vivo</Link>
          </Button>
        </div>
      </section>

      {/* Steps */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-12 text-white">Como funciona</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: AtSign, n: "01", title: "Crie seu @", desc: "Escolha um identificador único no formato @usuario." },
            { icon: Wallet, n: "02", title: "Receba uma carteira Stellar", desc: "Automaticamente criamos e financiamos sua carteira Testnet." },
            { icon: Send, n: "03", title: "Envie para outro @", desc: "Digite @gabriel e o valor. A transação vai direto na blockchain." },
            { icon: Activity, n: "04", title: "Acompanhe no feed", desc: "Cada transferência aparece na timeline com hash auditável." },
          ].map((step) => (
            <div
              key={step.n}
              className="rounded-2xl border border-slate-700/50 bg-slate-900 p-6 space-y-3 hover:border-blue-500/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-blue-500">{step.n}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
                  <step.icon size={18} />
                </div>
              </div>
              <h3 className="font-semibold text-white">{step.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Enterprise section */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900 to-slate-900/60 p-10 flex flex-col md:flex-row items-start gap-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Building2 size={24} />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Para Empresas</h2>
            <p className="text-slate-400 leading-relaxed max-w-2xl">
              Empresas podem liberar verbas para projetos, funcionários e fornecedores,
              acompanhando o caminho do dinheiro em uma{" "}
              <strong className="text-white">timeline auditável</strong>. Cada transferência
              gera um comprovante com hash imutável na blockchain Stellar.
            </p>
            <ul className="space-y-2 mt-4">
              {[
                "Auditoria em tempo real de cada centavo",
                "Comprovantes com link direto no explorer Stellar",
                "Transações organizacionais com visibilidade controlada",
                "Identificadores @ para projetos, times e fornecedores",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-6 py-20">
        <h2 className="text-3xl font-bold text-white mb-4">Pronto para testar?</h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          Acesse o demo e veja uma transação real acontecendo entre @lucas e @gabriel na Stellar Testnet.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/demo">Abrir demo</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/register">Criar minha conta</Link>
          </Button>
        </div>
        <p className="mt-8 text-xs text-slate-600">
          Ambiente Stellar Testnet · Sem valor financeiro real · Apenas para fins educacionais e de teste
        </p>
      </section>

      <footer className="border-t border-slate-800/60 py-8 text-center text-sm text-slate-600">
        <p>SocialPay — Rede social financeira auditável na Stellar</p>
        <p className="mt-1">Testnet only · Sem integração com dinheiro real</p>
      </footer>
    </div>
  );
}
