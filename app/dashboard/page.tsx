"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/app/lib/supabase/client";
import Link from "next/link";
import {
  PlusCircle,
  FolderOpen,
  FileText,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { Notebook } from "@/app/lib/supabase/types";

export default function DashboardPage() {
  const [notebooks, setNotebooks] = useState<
    (Notebook & { summary_count: number })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const supabase = createClient();

  const fetchNotebooks = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: nbs } = await supabase
      .from("notebooks")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!nbs) {
      setNotebooks([]);
      setLoading(false);
      return;
    }

    // Count summaries per notebook
    const withCounts = await Promise.all(
      nbs.map(async (nb) => {
        const { count } = await supabase
          .from("summaries")
          .select("*", { count: "exact", head: true })
          .eq("notebook_id", nb.id);
        return { ...nb, summary_count: count ?? 0 };
      }),
    );

    setNotebooks(withCounts);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("notebooks").insert({
      user_id: user.id,
      name: newName.trim(),
    });

    if (error) {
      toast.error("Error al crear el cuaderno");
    } else {
      toast.success("Cuaderno creado");
      setNewName("");
      setShowCreate(false);
      fetchNotebooks();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}" y todos sus resúmenes?`)) return;

    const { error } = await supabase.from("notebooks").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar el cuaderno");
    } else {
      toast.success("Cuaderno eliminado");
      fetchNotebooks();
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis cuadernos</h1>
          <p className="text-white/50 text-sm mt-1">
            Organizá tus resúmenes por materia
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Nuevo cuaderno
        </button>
      </div>

      {/* Create notebook form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="glass rounded-xl p-4 mb-6 flex gap-3"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la materia..."
            autoFocus
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-500/50"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear"}
          </button>
        </form>
      )}

      {/* Notebooks grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-white/30" />
        </div>
      ) : notebooks.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-2">No tenés cuadernos todavía</p>
          <p className="text-white/30 text-sm">
            Creá tu primer cuaderno para organizar tus resúmenes
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notebooks.map((nb) => (
            <div
              key={nb.id}
              className="glass rounded-xl p-5 group hover:border-indigo-500/20 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <Link
                  href={`/dashboard/notebook/${nb.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/10 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {nb.name}
                    </h3>
                    <div className="flex items-center gap-1 text-white/40 text-xs mt-0.5">
                      <FileText className="w-3 h-3" />
                      <span>
                        {nb.summary_count}{" "}
                        {nb.summary_count === 1 ? "resumen" : "resúmenes"}
                      </span>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(nb.id, nb.name)}
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  title="Eliminar cuaderno"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <Link
                href={`/dashboard/notebook/${nb.id}`}
                className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors"
              >
                Ver resúmenes →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
