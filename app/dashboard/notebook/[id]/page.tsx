"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/app/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Clock,
  Loader2,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Notebook, Summary } from "@/app/lib/supabase/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function NotebookPage({ params }: PageProps) {
  const { id } = use(params);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [nbResult, sumResult] = await Promise.all([
      supabase.from("notebooks").select("*").eq("id", id).single(),
      supabase
        .from("summaries")
        .select("*")
        .eq("notebook_id", id)
        .order("created_at", { ascending: false }),
    ]);

    setNotebook(nbResult.data);
    setSummaries(sumResult.data ?? []);
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteSummary = async (summaryId: string, title: string) => {
    if (!confirm(`¿Eliminar "${title}"?`)) return;
    const { error } = await supabase
      .from("summaries")
      .delete()
      .eq("id", summaryId);
    if (error) {
      toast.error("Error al eliminar");
    } else {
      toast.success("Resumen eliminado");
      fetchData();
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const statusLabel = (status: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      pending_payment: { text: "Pago pendiente", color: "text-yellow-400" },
      paid: { text: "Listo para procesar", color: "text-blue-400" },
      processing: { text: "Procesando...", color: "text-indigo-400" },
      transcribing: { text: "Transcribiendo...", color: "text-indigo-400" },
      summarizing: { text: "Resumiendo...", color: "text-violet-400" },
      completed: { text: "Completado", color: "text-emerald-400" },
      failed: { text: "Error", color: "text-red-400" },
    };
    return labels[status] ?? { text: status, color: "text-white/50" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto text-center py-20">
        <p className="text-white/50">Cuaderno no encontrado</p>
        <Link href="/dashboard" className="text-indigo-400 text-sm mt-2 block">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Mis cuadernos
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{notebook.name}</h1>
          <p className="text-white/40 text-sm mt-1">
            {summaries.length}{" "}
            {summaries.length === 1 ? "resumen" : "resúmenes"}
          </p>
        </div>
        <Link
          href={`/dashboard/new-summary?notebook=${id}`}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Nuevo resumen
        </Link>
      </div>

      {summaries.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-2">
            No hay resúmenes en este cuaderno
          </p>
          <Link
            href={`/dashboard/new-summary?notebook=${id}`}
            className="text-indigo-400 text-sm"
          >
            Crear el primero →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((summary) => {
            const status = statusLabel(summary.status);
            return (
              <div
                key={summary.id}
                className="glass rounded-xl p-5 flex items-center gap-4 group hover:border-indigo-500/20 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-600/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <Link
                  href={`/dashboard/summary/${summary.id}`}
                  className="flex-1 min-w-0"
                >
                  <h3 className="font-medium text-white truncate">
                    {summary.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs font-medium ${status.color}`}>
                      {status.text}
                    </span>
                    <span className="text-white/30 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(summary.created_at)}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() =>
                    handleDeleteSummary(summary.id, summary.title)
                  }
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
