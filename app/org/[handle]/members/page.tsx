"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, Trash2, Crown, Shield, CreditCard, Eye, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAmount } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = { owner: "Proprietário", admin: "Admin", payer: "Pagador", viewer: "Visualizador" };
const ROLE_COLOR: Record<string, string> = {
  owner: "text-amber-400 border-amber-700/40 bg-amber-900/20",
  admin: "text-blue-400 border-blue-700/40 bg-blue-900/20",
  payer: "text-emerald-400 border-emerald-700/40 bg-emerald-900/20",
  viewer: "text-slate-400 border-slate-700/40 bg-slate-800/40",
};
const ROLE_ICON: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3.5 w-3.5" />,
  admin: <Shield className="h-3.5 w-3.5" />,
  payer: <CreditCard className="h-3.5 w-3.5" />,
  viewer: <Eye className="h-3.5 w-3.5" />,
};

interface Member {
  id: string;
  user: { id: string; name: string; handle: string };
  role: string;
  spendingLimit: string | null;
  totalSpent: string;
  addedAt: string;
}

export default function OrgMembersPage() {
  const params = useParams();
  const handle = params.handle as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<string>("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);

  // Add form
  const [addHandle, setAddHandle] = useState("");
  const [addRole, setAddRole] = useState("viewer");
  const [addLimit, setAddLimit] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editing, setEditing] = useState<Record<string, { role: string; limit: string }>>({});

  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canManage = ["owner", "admin"].includes(myRole);

  const load = async () => {
    setLoading(true);
    try {
      const [orgRes, membersRes] = await Promise.all([
        fetch(`/api/org/${handle}`),
        fetch(`/api/org/${handle}/members`),
      ]);
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setMyRole(orgData.myRole);
        setOrgName(orgData.org.name);
        // Include owner as virtual member
        const ownerEntry: Member = {
          id: "owner",
          user: orgData.org.owner,
          role: "owner",
          spendingLimit: null,
          totalSpent: "0",
          addedAt: orgData.org.createdAt,
        };
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers([ownerEntry, ...membersData.members]);
        }
      }
    } finally { setLoading(false); }
  };

  const handleAdd = async () => {
    setAddLoading(true); setMsg(null);
    try {
      const res = await fetch(`/api/org/${handle}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userHandle: addHandle, role: addRole, spendingLimit: addLimit || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg({ type: "success", text: `@${addHandle} adicionado como ${ROLE_LABEL[addRole]}` });
      setAddHandle(""); setAddLimit("");
      await load();
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erro" }); }
    finally { setAddLoading(false); }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remover ${name} da organização?`)) return;
    const res = await fetch(`/api/org/${handle}/members/${userId}`, { method: "DELETE" });
    if (res.ok) { setMsg({ type: "success", text: `${name} removido` }); await load(); }
    else setMsg({ type: "error", text: (await res.json()).error });
  };

  const handleUpdate = async (userId: string) => {
    const e = editing[userId];
    if (!e) return;
    const res = await fetch(`/api/org/${handle}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: e.role, spendingLimit: e.limit || null }),
    });
    if (res.ok) { setMsg({ type: "success", text: "Atualizado!" }); setEditing((prev) => { const n = { ...prev }; delete n[userId]; return n; }); await load(); }
    else setMsg({ type: "error", text: (await res.json()).error });
  };

  useEffect(() => { load(); }, [handle]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button asChild size="sm" variant="ghost"><Link href={`/org/${handle}`}><ArrowLeft className="h-4 w-4" />Painel</Link></Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Membros — {orgName}</h1>
          <p className="text-slate-400 text-sm">@{handle}</p>
        </div>
      </div>

      {msg && (
        <p className={`text-sm rounded-lg px-3 py-2 ${msg.type === "success" ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"}`}>
          {msg.text}
        </p>
      )}

      {/* Adicionar membro */}
      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4 text-blue-400" />Adicionar membro</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Handle do usuário</Label>
                <Input placeholder="@usuario" value={addHandle} onChange={(e) => setAddHandle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Papel</Label>
                <Select value={addRole} onValueChange={setAddRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="payer">Pagador</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Limite de gastos (XLM)</Label>
                <Input type="number" placeholder="Ex: 500 (vazio = ilimitado)" value={addLimit} onChange={(e) => setAddLimit(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAdd} loading={addLoading} disabled={!addHandle}>
              <UserPlus className="h-4 w-4" /> Adicionar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de membros */}
      <div className="space-y-3">
        {members.map((m) => {
          const isOwner = m.role === "owner";
          const isEditing = !!editing[m.user.id];
          const editState = editing[m.user.id] ?? { role: m.role, limit: m.spendingLimit ?? "" };

          return (
            <Card key={m.id} className="border-slate-700/40">
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white font-bold">
                    {m.user.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold">{m.user.name}</p>
                      <span className="text-slate-500 text-sm">@{m.user.handle}</span>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${ROLE_COLOR[m.role]}`}>
                        {ROLE_ICON[m.role]} {ROLE_LABEL[m.role]}
                      </span>
                    </div>

                    {/* Spending info */}
                    {m.spendingLimit && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Gasto: <span className="text-white">{formatAmount(m.totalSpent)} XLM</span></span>
                          <span>Limite: <span className="text-white">{formatAmount(m.spendingLimit)} XLM</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{ width: `${Math.min(100, (parseFloat(m.totalSpent) / parseFloat(m.spendingLimit)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {!m.spendingLimit && !isOwner && (
                      <p className="text-xs text-slate-500 mt-1">Limite: ilimitado · Gasto: {formatAmount(m.totalSpent)} XLM</p>
                    )}

                    {/* Edit inline */}
                    {canManage && !isOwner && isEditing && (
                      <div className="mt-3 flex gap-2 flex-wrap items-end">
                        <div>
                          <Label className="text-xs">Papel</Label>
                          <Select
                            value={editState.role}
                            onValueChange={(v) => setEditing((prev) => ({ ...prev, [m.user.id]: { ...editState, role: v } }))}
                          >
                            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="payer">Pagador</SelectItem>
                              <SelectItem value="viewer">Visualizador</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Limite XLM</Label>
                          <Input
                            className="h-8 text-xs w-28"
                            type="number"
                            placeholder="ilimitado"
                            value={editState.limit}
                            onChange={(e) => setEditing((prev) => ({ ...prev, [m.user.id]: { ...editState, limit: e.target.value } }))}
                          />
                        </div>
                        <Button size="sm" onClick={() => handleUpdate(m.user.id)}><Save className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing((prev) => { const n = { ...prev }; delete n[m.user.id]; return n; })}>Cancelar</Button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {canManage && !isOwner && (
                    <div className="flex gap-1.5 shrink-0">
                      {!isEditing && (
                        <Button
                          size="sm" variant="ghost" className="text-xs"
                          onClick={() => setEditing((prev) => ({ ...prev, [m.user.id]: { role: m.role, limit: m.spendingLimit ?? "" } }))}
                        >
                          Editar
                        </Button>
                      )}
                      <Button
                        size="sm" variant="ghost" className="text-red-400 hover:text-red-300"
                        onClick={() => handleRemove(m.user.id, m.user.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
