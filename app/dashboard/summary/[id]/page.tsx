"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/app/lib/supabase/client";
import Link from "next/link";
import { marked } from "marked";
import {
  ArrowLeft,
  Download,
  Loader2,
  FileText,
  Clock,
  AlertCircle,
  BookOpen,
  Eye,
  Code,
} from "lucide-react";
import { toast } from "sonner";
import type { Summary } from "@/app/lib/supabase/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ViewMode = "rendered" | "markdown";

export default function SummaryViewPage({ params }: PageProps) {
  const { id } = use(params);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("rendered");
  const [showTranscript, setShowTranscript] = useState(false);
  const supabase = createClient();

  const fetchSummary = useCallback(async () => {
    const { data } = await supabase
      .from("summaries")
      .select("*")
      .eq("id", id)
      .single();
    setSummary(data);
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Auto-refresh while processing
  useEffect(() => {
    if (
      !summary ||
      ["completed", "failed", "pending_payment"].includes(summary.status)
    )
      return;

    const interval = setInterval(fetchSummary, 3000);
    return () => clearInterval(interval);
  }, [summary, fetchSummary]);

  const handleDownloadPdf = async () => {
    if (!summary?.summary_markdown) return;
    setDownloading(true);

    try {
      const res = await fetch(`/api/download-summary?id=${id}`);
      if (!res.ok) throw new Error("Error al generar PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${summary.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al descargar el PDF");
    }
    setDownloading(false);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto text-center py-20">
        <p className="text-white/50">Resumen no encontrado</p>
        <Link href="/dashboard" className="text-indigo-400 text-sm mt-2 block">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const isProcessing = [
    "paid",
    "processing",
    "transcribing",
    "summarizing",
  ].includes(summary.status);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <Link
        href={`/dashboard/notebook/${summary.notebook_id}`}
        className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al cuaderno
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{summary.title}</h1>
          <p className="text-white/40 text-sm mt-1 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {formatDate(summary.created_at)}
          </p>
        </div>
        {summary.status === "completed" && (
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Descargar PDF
          </button>
        )}
      </div>

      {/* Processing state */}
      {isProcessing && (
        <div className="glass rounded-xl p-8 text-center mb-6">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {summary.status === "transcribing"
              ? "Transcribiendo..."
              : summary.status === "summarizing"
                ? "Generando resumen..."
                : "Procesando..."}
          </h3>
          <p className="text-white/40 text-sm">
            Esto puede tomar unos minutos. No cierres esta pestaña.
          </p>
        </div>
      )}

      {/* Error state */}
      {summary.status === "failed" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">
              Error al generar el resumen
            </h3>
          </div>
          <p className="text-red-300/70 text-sm">
            {summary.error_message || "Ocurrió un error inesperado"}
          </p>
        </div>
      )}

      {/* Pending payment */}
      {summary.status === "pending_payment" && (
        <div className="glass rounded-xl p-8 text-center mb-6">
          <BookOpen className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Pago pendiente
          </h3>
          <p className="text-white/40 text-sm">
            Este resumen está esperando confirmación de pago.
          </p>
        </div>
      )}

      {/* Completed: Show summary */}
      {summary.status === "completed" && summary.summary_markdown && (
        <div className="space-y-4">
          {/* View toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("rendered")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "rendered"
                  ? "bg-indigo-600/10 text-indigo-400"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <Eye className="w-4 h-4" />
              Visualizar
            </button>
            <button
              onClick={() => setViewMode("markdown")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "markdown"
                  ? "bg-indigo-600/10 text-indigo-400"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <Code className="w-4 h-4" />
              Markdown
            </button>
            {summary.transcript_text && (
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ml-auto ${
                  showTranscript
                    ? "bg-indigo-600/10 text-indigo-400"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <FileText className="w-4 h-4" />
                Transcripción
              </button>
            )}
          </div>

          {/* Content */}
          <div className="glass rounded-xl p-6 md:p-8 min-h-[400px]">
            {viewMode === "rendered" ? (
              <div
                className="summary-content prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: marked(summary.summary_markdown),
                }}
              />
            ) : (
              <pre className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                {summary.summary_markdown}
              </pre>
            )}
          </div>

          {/* Transcript panel */}
          {showTranscript && summary.transcript_text && (
            <div className="glass rounded-xl p-6 md:p-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                Transcripción completa
              </h3>
              <pre className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {summary.transcript_text}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
