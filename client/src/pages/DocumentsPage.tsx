import { useEffect, useRef, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ref as storageRef, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useRoute } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, Download, Upload, Loader2, File,
  ScanText, Plane, Hotel, CheckCircle2,
} from "lucide-react";

interface DocItem {
  id: string;
  title?: string;
  fileName?: string;
  fileType?: string;
  storagePath?: string;
  tripId?: string;
  tripRoute?: string;
  createdAt?: { seconds: number } | null;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, tripParams] = useRoute("/trips/:id/documents");
  const tripId = tripParams?.id;

  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<"idle" | "uploading" | "reading" | "saving" | "done">("idle");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = tripId
        ? query(collection(db, "documents"), where("userId", "==", user.uid), where("tripId", "==", tripId))
        : query(collection(db, "documents"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const docs = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<DocItem, "id">) }))
        .sort((a, b) => ((b.createdAt as any)?.seconds ?? 0) - ((a.createdAt as any)?.seconds ?? 0));
      setDocuments(docs);
    } catch (err) {
      console.error("Erro ao buscar documentos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, [user, tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async (path?: string, title?: string) => {
    if (!path) { toast.error("Sem arquivo disponível"); return; }
    try {
      const url = await getDownloadURL(storageRef(storage, path));
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
      if (title) a.download = title;
      a.click();
    } catch {
      toast.error("Falha ao baixar documento");
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user) { toast.error("Faça login para enviar documentos."); return; }

    const formData = new FormData();
    formData.append("file", file);
    if (tripId) formData.append("tripId", tripId);

    try {
      setUploading(true);
      setUploadStep("uploading");

      const response = await fetch("/api/docs/process", {
        method: "POST",
        body: formData,
      });

      setUploadStep("reading");

      const data = await response.json();

      if (data.success) {
        setUploadStep("saving");
        await fetchDocs();
        setUploadStep("done");
        setTimeout(() => setUploadStep("idle"), 2500);
        toast.success(data.message || "Documento processado! Flyisa aprendeu com seus dados de viagem.");
      } else {
        setUploadStep("idle");
        toast.error(data.error || "Erro ao processar documento.");
      }
    } catch {
      setUploadStep("idle");
      toast.error("Falha ao enviar documento. Verifique sua conexão.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const docTitle = (d: DocItem) => d.title || d.fileName || "Documento";
  const docMeta = (d: DocItem) => {
    const parts: string[] = [];
    if (d.fileType) parts.push(d.fileType.toUpperCase());
    if (d.tripRoute) parts.push(d.tripRoute);
    else if (d.tripId && !tripId) parts.push(`Viagem ${d.tripId.slice(0, 6)}`);
    return parts.join(" · ") || "Arquivo";
  };

  const stepLabel: Record<typeof uploadStep, string> = {
    idle: "",
    uploading: "Enviando arquivo...",
    reading: "GLM Vision lendo documento...",
    saving: "Salvando dados de viagem...",
    done: "Concluído!",
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 60% 10%, rgba(124,58,237,0.12) 0%,transparent 55%), radial-gradient(ellipse at 20% 90%, rgba(37,99,235,0.10) 0%,transparent 55%), #060011",
      }}
    >
      {/* Header */}
      <header
        className="pt-safe shrink-0 flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <button
          onClick={() => tripId ? setLocation(`/trips/${tripId}`) : setLocation("/trips")}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft className="w-4 h-4 text-white/70" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-extrabold text-lg leading-none">Documentos</p>
          <p className="text-white/35 text-xs mt-0.5">
            {tripId ? "Envie e-tickets e reservas desta viagem" : "Envie documentos para alimentar a Flyisa"}
          </p>
        </div>
        <ScanText className="w-5 h-5 text-violet-400" />
      </header>

      <div className="flex-1 overflow-y-auto pb-20 pt-4 space-y-4 px-4" style={{ scrollbarWidth: "none" }}>

        {/* Upload zone */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          <div className="px-4 pt-4 pb-3">
            <p className="text-violet-300 text-[11px] font-bold uppercase tracking-widest mb-1">
              ✈️ Alimentar a Flyisa
            </p>
            <p className="text-white/60 text-xs leading-relaxed">
              Envie e-tickets, confirmações de hotel, itinerários — a Flyisa lê com OCR (GLM Vision) e cadastra a viagem automaticamente.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
          />

          <button
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full px-4 pb-4"
          >
            <div
              className="rounded-xl p-5 flex flex-col items-center gap-3 transition-all active:scale-[0.98]"
              style={{
                background: "rgba(0,0,0,0.2)",
                border: "2px dashed rgba(124,58,237,0.4)",
              }}
            >
              {uploading ? (
                <>
                  <div className="flex items-center gap-2">
                    {uploadStep === "done"
                      ? <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      : <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                    }
                  </div>
                  <p className="text-violet-300 text-sm font-medium">{stepLabel[uploadStep]}</p>
                  <div className="flex gap-1">
                    {(["uploading","reading","saving","done"] as const).map((s) => (
                      <div
                        key={s}
                        className="h-1 w-8 rounded-full transition-all"
                        style={{
                          background: ["uploading","reading","saving","done"].indexOf(s) <= ["uploading","reading","saving","done"].indexOf(uploadStep)
                            ? "#7c3aed" : "rgba(255,255,255,0.1)"
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-violet-400" />
                  <p className="text-white/80 text-sm font-semibold">Toque para enviar</p>
                  <p className="text-white/35 text-[11px]">PDF, JPG ou PNG · máx. 10 MB</p>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 px-1">
          <div className="flex gap-3 text-white/25 text-[11px] leading-relaxed">
            <Plane className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400/50" />
            E-tickets de voo
          </div>
          <div className="flex gap-3 text-white/25 text-[11px] leading-relaxed">
            <Hotel className="w-3.5 h-3.5 mt-0.5 shrink-0 text-violet-400/50" />
            Confirmações de hotel
          </div>
          <div className="flex gap-3 text-white/25 text-[11px] leading-relaxed">
            <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400/50" />
            Itinerários PDF
          </div>
        </div>

        {/* Documents list */}
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-2">
            {loading ? "Carregando..." : `${documents.length} documento${documents.length !== 1 ? "s" : ""} salvo${documents.length !== 1 ? "s" : ""}`}
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          ) : documents.length === 0 ? (
            <div
              className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <File className="w-8 h-8 text-white/15" />
              <p className="text-white/40 text-sm">Nenhum documento ainda</p>
              <p className="text-white/20 text-xs">Envie acima para começar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(124,58,237,0.2)" }}
                  >
                    <FileText className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{docTitle(d)}</p>
                    <p className="text-white/35 text-[11px] truncate">{docMeta(d)}</p>
                  </div>
                  <button
                    onClick={() => handleDownload(d.storagePath, docTitle(d))}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                    title="Baixar"
                  >
                    <Download className="w-4 h-4 text-white/50" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <BottomNav active="trips" />
    </div>
  );
}
