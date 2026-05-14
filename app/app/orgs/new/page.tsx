"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!handle) {
      setHandle(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 30));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, handle, description: description || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`/org/${json.org.handle}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar organização");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link href="/app"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Nova organização</h1>
          <p className="text-slate-400 text-sm">Crie uma conta para gerenciar fundos em equipe</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-400" />
            Dados da organização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Ex: Obra Vitória"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="handle">Handle (identificador único)</Label>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-sm">@</span>
                <Input
                  id="handle"
                  placeholder="obra-vitoria"
                  value={handle}
                  onChange={(e) =>
                    setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30))
                  }
                  required
                />
              </div>
              <p className="text-xs text-slate-500">Apenas letras minúsculas, números e hífens</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Descrição (opcional)</Label>
              <Input
                id="desc"
                placeholder="Ex: Conta de pagamentos do projeto..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" loading={loading} disabled={!name || !handle} className="w-full">
              <Building2 className="h-4 w-4" /> Criar organização
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
