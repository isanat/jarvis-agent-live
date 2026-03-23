import { useEffect, useRef, useState } from "react";
import {
  collection, query, where, orderBy, getDocs,
} from "firebase/firestore";
import { ref as storageRef, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, Download, Upload, Loader2, File,
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
  const [, params] = useRoute("/trips/:id/documents");
  const tripId = params?.id;

  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = tripId
        ? query(
            collection(db, "documents"),
            where("userId", "==", user.uid),
            where("tripId", "==", tripId),
            orderBy("createdAt", "desc"),
          )
        : query(
            collection(db, "documents"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
          );
      const snap = await getDocs(q);
      setDocuments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DocItem, "id">) })));
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
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      if (title) a.download = title;
      a.click();
    } catch {
      toast.error("Falha ao baixar documento");
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user) { toast.error("Faça login para enviar documentos."); return; }
    if (!tripId) { toast.error("Viagem não identificada."); return; }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tripId", tripId);

    try {
      setUploading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "/api";
      const response = await fetch(`${backendUrl}/docs/process`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || "Documento processado e salvo.");
        await fetchDocs();
      } else {
        toast.error(data.error || "Erro ao processar documento.");
      }
    } catch {
      toast.error("Falha ao enviar documento.");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      <header className="border-b border-border bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center h-16 gap-3">
          <Button variant="ghost" size="icon" onClick={() => tripId ? setLocation(`/trips/${tripId}`) : setLocation("/trips")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold">Documentos</h1>
            <p className="text-xs text-muted-foreground leading-none">
              {tripId ? "desta viagem" : "de todas as viagens"}
            </p>
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-2xl mx-auto space-y-4">
        {/* Upload area — only available for a specific trip */}
        {tripId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="w-4 h-4 text-blue-500" />
                Enviar documento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-6 text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-sm text-muted-foreground">Processando com IA...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-blue-400" />
                    <p className="text-sm font-medium">Arraste ou clique para enviar</p>
                    <p className="text-xs text-muted-foreground">PDF, JPG ou PNG — processado automaticamente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-blue-500" />
              {loading ? "Carregando..." : `${documents.length} documento${documents.length !== 1 ? "s" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <File className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhum documento ainda.{tripId ? " Envie acima para começar." : ""}
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{docTitle(d)}</p>
                        <p className="text-xs text-muted-foreground truncate">{docMeta(d)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      title="Baixar"
                      onClick={() => handleDownload(d.storagePath, docTitle(d))}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
