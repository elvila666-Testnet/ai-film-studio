import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Users, Shield, Settings, Zap, Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModelNodeCard } from "@/features/Project/ModelNodeCard";
import { ModelConfigModal } from "@/features/Project/ModelConfigModal";
import { AIModel, MODEL_CATEGORIES } from "@/features/Project/types";

interface User {
    id: number;
    email: string;
    name: string;
    role: string | null;
}

export function AdminPanel() {
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);

    const utils = trpc.useUtils();
    const modelsQuery = trpc.admin.getModels.useQuery();
    const models = (modelsQuery.data as any as AIModel[]) || [];

    const upsertModel = trpc.admin.upsertModel.useMutation({
        onSuccess: () => { utils.admin.getModels.invalidate(); toast.success("Matrix parameters synced"); }
    });
    const setActiveModel = trpc.admin.setActiveModel.useMutation({
        onSuccess: () => { utils.admin.getModels.invalidate(); toast.success("Primary node switched"); }
    });
    const deleteModel = trpc.admin.deleteModel.useMutation({
        onSuccess: () => { utils.admin.getModels.invalidate(); toast.success("Node purged"); }
    });
    const seedModels = trpc.admin.seedModels.useMutation({
        onSuccess: () => { utils.admin.getModels.invalidate(); toast.success("Initial matrix established"); },
        onError: (err) => toast.error(`Seed failed: ${err.message}`)
    });

    const [editingModel, setEditingModel] = useState<AIModel | null>(null);

    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);
            const response = await fetch("/api/auth/admin/users");
            if (!response.ok) throw new Error("Manifest retrieval failed");
            const data = await response.json();
            setUsers(data.users || []);
        } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to load users"); }
        finally { setLoadingUsers(false); }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || !newPassword || !newName) return;
        try {
            setCreating(true);
            const response = await fetch("/api/auth/admin/users", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: newEmail, password: newPassword, name: newName }),
            });
            if (!response.ok) throw new Error((await response.json()).error || "Grant failed");
            setNewEmail(""); setNewPassword(""); setNewName("");
            await fetchUsers(); toast.success("Access granted to new operative");
        } catch (err) { toast.error(err instanceof Error ? err.message : "Handshake failed"); }
        finally { setCreating(false); }
    };

    const handleDeleteUser = async (email: string) => {
        if (!confirm(`Revoke access for ${email}?`)) return;
        try {
            const response = await fetch(`/api/auth/admin/users/${encodeURIComponent(email)}`, {
                method: "DELETE", headers: { "Content-Type": "application/json" }
            });
            if (!response.ok) throw new Error((await response.json()).error || "Revocation failed");
            await fetchUsers(); toast.success("Operative access terminated");
        } catch (err) { toast.error(err instanceof Error ? err.message : "Termination error"); }
    };

    useEffect(() => { fetchUsers(); }, []);

    return (
        <div className="space-y-12 animate-fade-in max-w-7xl mx-auto py-12">
            <div className="flex items-center justify-between glass-panel p-8 rounded-[2.5rem]">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-primary/20 rounded-3xl flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(79,70,229,0.2)]">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">System Overlord</h2>
                        <p className="production-label !text-primary">Core Architecture Control</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-end">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Latency</span>
                        <span className="text-sm font-black text-emerald-400">12ms</span>
                    </div>
                    <div className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-end">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Active Nodes</span>
                        <span className="text-sm font-black text-primary">{models.length}</span>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="models" className="w-full">
                <TabsList className="bg-transparent h-auto p-0 mb-12 flex gap-4 border-none">
                    <TabsTrigger value="models" className="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/5 bg-white/5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary transition-all">
                        <Settings className="w-4 h-4 mr-2" /> Matrix Registry
                    </TabsTrigger>
                    <TabsTrigger value="users" className="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/5 bg-white/5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary transition-all">
                        <Users className="w-4 h-4 mr-2" /> Operatives
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="models" className="m-0 space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {MODEL_CATEGORIES.map(cat => {
                            const active = models.find(m => m.category === cat.id && m.isActive);
                            return (
                                <div key={cat.id} className="glass-panel p-8 rounded-3xl relative overflow-hidden group">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-primary/40"><cat.icon className="w-5 h-5 text-primary" /></div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{cat.name}</span>
                                    </div>
                                    <div className="text-2xl font-black text-white italic tracking-tighter uppercase truncate mb-1">{active ? active.modelId : "Disconnected"}</div>
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-primary uppercase font-bold tracking-widest">
                                        <div className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                                        {active ? `Provider: ${active.provider}` : "Offline"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between">
                        <h3 className="production-node-title !text-lg !mb-0">Provider Distribution</h3>
                        <Button onClick={() => seedModels.mutate()} disabled={seedModels.isPending} className="bg-primary text-white font-bold rounded-xl h-12">
                            {seedModels.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />} Sync Matrix Registry
                        </Button>
                    </div>

                    {MODEL_CATEGORIES.map(category => (
                        <div key={category.id} className="space-y-6">
                            <div className="flex items-center gap-4"><category.icon className="w-5 h-5 text-primary" /><h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">{category.name} Nodes</h3></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {models.filter(m => m.category === category.id).map(model => (
                                    <ModelNodeCard key={model.id} model={model} onEnable={(id) => setActiveModel.mutate({ id })} onConfigure={setEditingModel} onDelete={(id) => deleteModel.mutate({ id })} isEnablePending={setActiveModel.isPending} />
                                ))}
                                <button className="glass-panel border-dashed p-8 rounded-3xl flex flex-col items-center justify-center gap-4 text-slate-500 hover:bg-white/5 hover:border-primary/40 hover:text-primary transition-all group" onClick={() => setEditingModel({ id: 0, category: category.id as any, provider: "", modelId: "", isActive: false, isBuiltIn: false })}>
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/20"><Plus className="w-6 h-6" /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Enlist Node</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </TabsContent>

                <TabsContent value="users" className="m-0 space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-1">
                            <div className="glass-panel p-8 rounded-[2.5rem] space-y-8">
                                <div className="space-y-2"><h3 className="production-node-title !text-lg">Authorize Access</h3><p className="text-xs text-slate-500">Onboard a new studio operative into the matrix.</p></div>
                                <form onSubmit={handleCreateUser} className="space-y-6">
                                    <div className="space-y-2"><label className="production-label">Operative Name</label><Input placeholder="DIRECTOR X" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={creating} className="bg-white/5 border-white/5 h-12" /></div>
                                    <div className="space-y-2"><label className="production-label">Security Email</label><Input type="email" placeholder="operative@filmstudio.ai" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} disabled={creating} className="bg-white/5 border-white/5 h-12" /></div>
                                    <div className="space-y-2"><label className="production-label">Passkey</label><Input type="text" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={creating} className="bg-white/5 border-white/5 h-12" /></div>
                                    <Button type="submit" disabled={creating || !newEmail || !newPassword || !newName} className="w-full bg-primary text-white h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20">{creating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Grant Access"}</Button>
                                </form>
                            </div>
                        </div>
                        <div className="lg:col-span-2 space-y-8">
                            <div className="flex items-center justify-between"><h3 className="production-node-title !text-lg !mb-0">Authenticated Manifest</h3><div className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono text-slate-500 uppercase tracking-widest">{users.length} Active Sessions</div></div>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
                                {loadingUsers ? <div className="flex items-center justify-center py-24 glass-panel rounded-3xl border-dashed border-white/10"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div> : users.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {users.map((user) => (
                                            <div key={user.id} className="glass-panel p-6 rounded-2xl flex items-center justify-between group hover:bg-white/[0.03] transition-all border-white/5">
                                                <div className="flex items-center gap-6 overflow-hidden">
                                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-primary text-xl shadow-inner group-hover:bg-primary group-hover:text-white transition-all">{user.name?.charAt(0).toUpperCase()}</div>
                                                    <div className="overflow-hidden"><div className="font-black text-white uppercase tracking-tighter truncate">{user.name}</div><div className="text-[9px] font-mono text-slate-500 truncate">{user.email}</div></div>
                                                </div>
                                                <div className="flex items-center gap-3">{user.role === "admin" ? <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Level 4</div> : <Button size="icon" variant="ghost" onClick={() => handleDeleteUser(user.email)} className="h-10 w-10 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-xl"><Trash2 className="w-4 h-4" /></Button>}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="py-24 text-center glass-panel rounded-3xl border-dashed border-white/10"><Database className="w-12 h-12 text-slate-800 mx-auto mb-4" /><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Registry Empty</p></div>}
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {editingModel && <ModelConfigModal model={editingModel} onClose={() => setEditingModel(null)} onSave={(m) => { upsertModel.mutate(m as any); setEditingModel(null); }} isSaving={upsertModel.isPending} />}
        </div>
    );
}
