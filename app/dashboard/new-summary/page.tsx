"use client";

import { Suspense, useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Upload,
  FileText,
  FolderOpen,
  ArrowRight,
  Loader2,
  Clock,
  DollarSign,
  AlertCircle,
  PlusCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Notebook } from "@/app/lib/supabase/types";

type UploadInfo = {
  filePath: string;
  fileName: string;
  fileSize: number;
  duration: number;
  durationMinutes: number;
  estimatedCost: number;
  estimatedTimeSeconds: number;
};

type Step = "setup" | "upload" | "confirm" | "processing";

const MAX_DURATION_HOURS = 4;
const MAX_DURATION_SECONDS = MAX_DURATION_HOURS * 3600;
const SINGLE_PRICE = 5000;

export default function NewSummaryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>}>
      <NewSummaryContent />
    </Suspense>
  );
}

function NewSummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const txtInputRef = useRef<HTMLInputElement>(null);

  // User & subscription
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("none");
  const [userId, setUserId] = useState<string>("");

  // Step state
  const [step, setStep] = useState<Step>("setup");

  // Setup
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<string>(
    searchParams.get("notebook") ?? "",
  );
  const [newNotebookName, setNewNotebookName] = useState("");
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [title, setTitle] = useState("");

  // Upload
  const [uploadInfo, setUploadInfo] = useState<UploadInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"video" | "transcript">("video");
  const [isDragging, setIsDragging] = useState(false);
  const [transcriptUploaded, setTranscriptUploaded] = useState(false);
  const [transcriptContent, setTranscriptContent] = useState<string>("");

  // Processing
  const [summaryId, setSummaryId] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ progress: 0, status: "" });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [error, setError] = useState("");

  // Load user info + notebooks
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [profileRes, nbRes] = await Promise.all([
        supabase.from("profiles").select("subscription_status").eq("id", user.id).single(),
        supabase.from("notebooks").select("*").eq("user_id", user.id).order("name"),
      ]);

      setSubscriptionStatus(profileRes.data?.subscription_status ?? "none");
      setNotebooks(nbRes.data ?? []);
    };
    load();
  }, [supabase]);

  // Cleanup polling
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const isSubscribed = subscriptionStatus === "active";

  const handleCreateNotebook = async () => {
    if (!newNotebookName.trim() || !userId) return;
    const { data, error } = await supabase
      .from("notebooks")
      .insert({ user_id: userId, name: newNotebookName.trim() })
      .select()
      .single();

    if (error || !data) {
      toast.error("Error al crear cuaderno");
      return;
    }

    setNotebooks((prev) => [...prev, data]);
    setSelectedNotebook(data.id);
    setNewNotebookName("");
    setShowNewNotebook(false);
    toast.success("Cuaderno creado");
  };

  const handleUploadVideo = useCallback(
    async (file: File) => {
      setUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error al subir archivo");

        if (data.duration > MAX_DURATION_SECONDS) {
          setError(
            `El video dura más de ${MAX_DURATION_HOURS} horas. El máximo permitido es ${MAX_DURATION_HOURS} horas.`,
          );
          setUploading(false);
          return;
        }

        setUploadInfo(data);
        if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
      setUploading(false);
    },
    [title],
  );

  const handleUploadTranscript = useCallback(
    async (file: File) => {
      setUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload-transcript", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al subir transcripción");

        setTranscriptUploaded(true);
        setTranscriptContent(data.transcriptContent ?? "");
        if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
      setUploading(false);
    },
    [title],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (uploadMode === "video") handleUploadVideo(file);
      else handleUploadTranscript(file);
    },
    [uploadMode, handleUploadVideo, handleUploadTranscript],
  );

  const startProcessing = async () => {
    if (!selectedNotebook || !title.trim()) {
      toast.error("Completá todos los campos");
      return;
    }

    setProcessing(true);
    setStep("processing");

    try {
      // Create summary record
      const { data: summary, error: sumError } = await supabase
        .from("summaries")
        .insert({
          notebook_id: selectedNotebook,
          user_id: userId,
          title: title.trim(),
          status: isSubscribed ? "paid" : "pending_payment",
          video_duration_seconds: uploadInfo?.duration
            ? Math.round(uploadInfo.duration)
            : null,
        })
        .select()
        .single();

      if (sumError || !summary) throw new Error("Error al crear resumen");
      setSummaryId(summary.id);

      // If not subscribed, redirect to payment
      if (!isSubscribed) {
        const prefRes = await fetch("/api/create-preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summaryId: summary.id }),
        });
        const prefData = await prefRes.json();
        if (!prefRes.ok) throw new Error(prefData.error || "Error al crear pago");

        window.location.href = prefData.init_point;
        return;
      }

      // If transcript was uploaded, save it to the summary record
      if (transcriptContent) {
        await supabase
          .from("summaries")
          .update({ transcript_text: transcriptContent })
          .eq("id", summary.id);
      }

      // Subscribed user: process directly
      await runProcessing(summary.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setProcessing(false);
      setStep("confirm");
    }
  };

  const runProcessing = async (sid: string) => {
    try {
      // Step 1: Transcribe (if video was uploaded)
      if (uploadInfo) {
        // 1a. Prepare — segments video in seconds (stream copy, no re-encoding)
        setProgress({ progress: 2, status: "Preparando video..." });

        const prepRes = await fetch("/api/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summaryId: sid, filePath: uploadInfo.filePath }),
        });

        if (!prepRes.ok) {
          const d = await prepRes.json();
          throw new Error(d.error || "Error al preparar el video");
        }

        const { chunks, totalChunks } = await prepRes.json();

        // 1b. Transcribe each chunk individually — each call is ~60s, well within timeout
        const transcriptParts: string[] = new Array(totalChunks);

        for (let i = 0; i < totalChunks; i++) {
          setProgress({
            progress: 5 + Math.round((i / totalChunks) * 90),
            status: `Transcribiendo parte ${i + 1} de ${totalChunks}...`,
          });

          let attempts = 0;
          while (attempts < 3) {
            try {
              const chunkRes = await fetch("/api/transcribe-chunk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chunkPath: chunks[i],
                  chunkIndex: i,
                  totalChunks,
                  summaryId: sid,
                }),
              });

              if (!chunkRes.ok) {
                const d = await chunkRes.json();
                throw new Error(d.error || "Error al transcribir");
              }

              const { text } = await chunkRes.json();
              transcriptParts[i] = text;
              break;
            } catch (err) {
              attempts++;
              if (attempts >= 3) throw err;
              // Wait 2s before retry
              await new Promise((r) => setTimeout(r, 2000));
            }
          }
        }

        // 1c. Save assembled transcript to DB
        setProgress({ progress: 96, status: "Guardando transcripción..." });
        const fullTranscript = transcriptParts.join("\n\n").trim();
        await supabase
          .from("summaries")
          .update({ transcript_text: fullTranscript })
          .eq("id", sid);
      }

      // Step 2: Summarize
      setProgress({ progress: 98, status: "Generando resumen con IA..." });

      const sumRes = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryId: sid }),
      });

      if (!sumRes.ok) {
        const data = await sumRes.json();
        throw new Error(data.error || "Error al resumir");
      }

      toast.success("¡Resumen generado exitosamente!");
      router.push(`/dashboard/summary/${sid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en el procesamiento");
      setProcessing(false);
    }
  };

  const canProceed =
    step === "setup"
      ? selectedNotebook && title.trim()
      : step === "upload"
        ? uploadInfo || transcriptUploaded
        : true;

  const formatSize = (bytes: number) => {
    if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
    return `${(bytes / 1_000).toFixed(1)} KB`;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Nuevo resumen</h1>
      <p className="text-white/50 text-sm mb-8">
        Subí tu clase y generá un resumen automáticamente
      </p>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {["Datos", "Archivo", "Confirmar"].map((label, i) => {
          const steps: Step[] = ["setup", "upload", "confirm"];
          const current = steps.indexOf(step);
          const isActive = i <= current;
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "bg-white/[0.06] text-white/30"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm ${isActive ? "text-white/80" : "text-white/30"}`}
              >
                {label}
              </span>
              {i < 2 && (
                <div
                  className={`flex-1 h-px ${isActive ? "bg-indigo-600/50" : "bg-white/[0.06]"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError("")} className="ml-auto">
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* ---------- Step: Setup ---------- */}
      {step === "setup" && (
        <div className="space-y-6">
          {/* Notebook selection */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Cuaderno (materia)
            </label>
            {showNewNotebook ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  placeholder="Nombre de la materia..."
                  autoFocus
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-500/50"
                />
                <button
                  onClick={handleCreateNotebook}
                  className="bg-indigo-600 text-white text-sm px-4 rounded-lg"
                >
                  Crear
                </button>
                <button
                  onClick={() => setShowNewNotebook(false)}
                  className="text-white/40 px-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedNotebook}
                  onChange={(e) => setSelectedNotebook(e.target.value)}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50 appearance-none"
                >
                  <option value="" className="bg-[#0f172a]">
                    Seleccioná un cuaderno
                  </option>
                  {notebooks.map((nb) => (
                    <option key={nb.id} value={nb.id} className="bg-[#0f172a]">
                      {nb.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewNotebook(true)}
                  className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] text-white/60 text-sm px-3 rounded-lg hover:bg-white/[0.08] transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Título del resumen
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Clase 5 - Derivadas"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <button
            onClick={() => setStep("upload")}
            disabled={!canProceed}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Siguiente
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ---------- Step: Upload ---------- */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Toggle */}
          <div className="flex gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg p-1">
            <button
              onClick={() => setUploadMode("video")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                uploadMode === "video"
                  ? "bg-indigo-600 text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              Subir video
            </button>
            <button
              onClick={() => setUploadMode("transcript")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                uploadMode === "transcript"
                  ? "bg-indigo-600 text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              Subir transcripción
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() =>
              uploadMode === "video"
                ? fileInputRef.current?.click()
                : txtInputRef.current?.click()
            }
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-indigo-500 bg-indigo-500/5"
                : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]"
            }`}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
            ) : (
              <Upload className="w-8 h-8 text-white/30 mx-auto mb-3" />
            )}
            <p className="text-white/60 text-sm">
              {uploadMode === "video"
                ? "Arrastrá tu video acá o hacé click para seleccionar"
                : "Arrastrá tu archivo .txt acá o hacé click para seleccionar"}
            </p>
            <p className="text-white/30 text-xs mt-2">
              {uploadMode === "video"
                ? "MP4, AVI, WebM, MOV — Máximo 4 horas"
                : "Archivos .txt"}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/avi,video/webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadVideo(file);
            }}
          />
          <input
            ref={txtInputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadTranscript(file);
            }}
          />

          {/* Upload info */}
          {uploadInfo && (
            <div className="glass rounded-xl p-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-white/40 text-xs">Archivo</span>
                <p className="text-white text-sm truncate">
                  {uploadInfo.fileName}
                </p>
              </div>
              <div>
                <span className="text-white/40 text-xs">Tamaño</span>
                <p className="text-white text-sm">
                  {formatSize(uploadInfo.fileSize)}
                </p>
              </div>
              <div>
                <span className="text-white/40 text-xs">Duración</span>
                <p className="text-white text-sm">
                  {formatDuration(uploadInfo.duration)}
                </p>
              </div>
              <div>
                <span className="text-white/40 text-xs">Tiempo estimado</span>
                <p className="text-white text-sm">
                  ~{formatDuration(uploadInfo.estimatedTimeSeconds)}
                </p>
              </div>
            </div>
          )}

          {transcriptUploaded && (
            <div className="glass rounded-xl p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span className="text-white text-sm">
                Transcripción subida correctamente
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("setup")}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white/60 font-medium py-2.5 rounded-lg transition-colors hover:bg-white/[0.08]"
            >
              Atrás
            </button>
            <button
              onClick={() => setStep("confirm")}
              disabled={!canProceed}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ---------- Step: Confirm ---------- */}
      {step === "confirm" && !processing && (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">
              Resumen del pedido
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">Cuaderno</span>
                <span className="text-white text-sm">
                  {notebooks.find((n) => n.id === selectedNotebook)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">Título</span>
                <span className="text-white text-sm">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">Tipo</span>
                <span className="text-white text-sm">
                  {uploadInfo ? "Video" : "Transcripción"}
                </span>
              </div>
              {uploadInfo && (
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">Duración</span>
                  <span className="text-white text-sm">
                    {formatDuration(uploadInfo.duration)}
                  </span>
                </div>
              )}
              <div className="border-t border-white/[0.06] pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Precio
                  </span>
                  <span className="text-white font-semibold">
                    {isSubscribed ? (
                      <span className="text-emerald-400">
                        Incluido en tu suscripción
                      </span>
                    ) : (
                      `$${SINGLE_PRICE.toLocaleString("es-AR")} ARS`
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {!isSubscribed && (
            <div className="glass rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-white/50 text-sm">
                Serás redirigido a Mercado Pago para completar el pago. Una vez
                confirmado, tu resumen se generará automáticamente.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("upload")}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white/60 font-medium py-2.5 rounded-lg transition-colors hover:bg-white/[0.08]"
            >
              Atrás
            </button>
            <button
              onClick={startProcessing}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubscribed ? (
                <>
                  Generar resumen
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Pagar y generar
                  <DollarSign className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---------- Step: Processing ---------- */}
      {step === "processing" && processing && (
        <div className="glass rounded-xl p-8 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {progress.status || "Procesando..."}
          </h3>
          {progress.progress > 0 && (
            <div className="w-full bg-white/[0.06] rounded-full h-2 mt-4 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress.progress, 100)}%` }}
              />
            </div>
          )}
          <p className="text-white/40 text-sm mt-4 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            No cierres esta pestaña
          </p>
        </div>
      )}
    </div>
  );
}

