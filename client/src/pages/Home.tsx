import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useNeuralSphere } from "@/contexts/NeuralSphereContext";
import { useChatAPI } from "@/hooks/useChatAPI";
import { useNotifications } from "@/hooks/useNotifications";
import { useVoice } from "@/hooks/useVoice";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { NeuralPulse } from "@/components/NeuralPulse";
import { BottomNav } from "@/components/BottomNav";
import { useProactiveFeed, type ProactiveCard } from "@/hooks/useProactiveFeed";
import { toast } from "sonner";
import {
  Send, Mic, MicOff, Bell, BellRing, Plane, Settings,
  X, AlertTriangle, Info, LogOut, User, MessageCircle,
  Volume2, VolumeX, Loader2, ChevronRight, Sparkles, MapPin,
  Home as HomeIcon, Zap, ArrowLeft,
} from "lucide-react";

// ── Animated Orb (CSS-only, used when sphere is hidden) ──────────────────────
function FlyisaOrb({ state, size = 38 }: { state: string; size?: number }) {
  const glow =
    state === "thinking" || state === "searching"
      ? "rgba(251,191,36,0.7)"
      : state === "alert"
      ? "rgba(239,68,68,0.7)"
      : "rgba(124,58,237,0.7)";

  const grad =
    state === "thinking" || state === "searching"
      ? "linear-gradient(135deg,#f59e0b,#ef4444)"
      : state === "alert"
      ? "linear-gradient(135deg,#ef4444,#dc2626)"
      : "linear-gradient(135deg,#7c3aed,#3b82f6)";

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      {/* Ping ring */}
      <div
        className="absolute inset-0 rounded-full animate-ping opacity-30"
        style={{ background: glow, animationDuration: "2.5s" }}
      />
      {/* Glow blur */}
      <div
        className="absolute inset-0 rounded-full blur-sm opacity-60 animate-orb-pulse"
        style={{ background: grad }}
      />
      {/* Face */}
      <div
        className="relative flex items-center justify-center rounded-full text-white font-extrabold"
        style={{ width: size, height: size, background: grad, fontSize: size * 0.38 }}
      >
        F
      </div>
    </div>
  );
}

// ── Voice waveform bars ───────────────────────────────────────────────────────
function VoiceWave({ bars = 7 }: { bars?: number }) {
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-red-400 animate-voice-bar"
          style={{ height: 18, animationDelay: `${i * 0.09}s` }}
        />
      ))}
    </div>
  );
}

// ── Proactive card component ──────────────────────────────────────────────────
function ProactiveCardItem({
  card,
  onTap,
}: {
  card: ProactiveCard;
  onTap: (query: string) => void;
}) {
  // Cards de alta prioridade (1-2) têm borda colorida
  const isUrgent = card.priority <= 2;

  return (
    <button
      onClick={() => card.query && onTap(card.query)}
      className="relative rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98] overflow-hidden w-full"
      style={{
        background: card.accent,
        border: `1px solid ${isUrgent ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      {/* Splash de cor */}
      <div
        className="absolute -top-4 -right-4 w-20 h-20 rounded-full pointer-events-none"
        style={{ background: card.accent, filter: "blur(20px)", opacity: 0.7 }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
          style={{ background: "rgba(0,0,0,0.2)" }}
        >
          {card.icon}
        </div>
        <div className="min-w-0 flex-1">
          {isUrgent && (
            <p className="text-violet-400/80 text-[9px] uppercase tracking-wider font-bold mb-0.5">
              {card.type === "flight_imminent" ? "⚡ Urgente" :
               card.type === "trip_end" ? "✅ Encerrar viagem" :
               card.type === "arrived" ? "📍 Chegada" : "🔔 Proativo"}
            </p>
          )}
          <p className="text-white font-semibold text-[13px] leading-snug">{card.title}</p>
          <p className="text-white/50 text-[11px] mt-0.5 leading-snug">{card.subtitle}</p>
        </div>
        <ArrowLeft className="w-3.5 h-3.5 text-white/20 shrink-0 rotate-180" />
      </div>
    </button>
  );
}

// ── Quick suggestion chips ────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: "✈️", label: "Status do meu voo",   accent: "rgba(59,130,246,0.22)" },
  { icon: "🌤️", label: "Clima no destino",    accent: "rgba(251,191,36,0.18)" },
  { icon: "🏨", label: "Hotéis próximos",     accent: "rgba(167,139,250,0.22)" },
  { icon: "📋", label: "Checklist de viagem", accent: "rgba(52,211,153,0.18)" },
] as const;

// ── Severity styles for notification items ───────────────────────────────────
const SEV: Record<string, { color: string; Icon: typeof AlertTriangle }> = {
  critical: { color: "#ef4444", Icon: AlertTriangle },
  urgent:   { color: "#f97316", Icon: BellRing },
  warning:  { color: "#eab308", Icon: AlertTriangle },
  info:     { color: "#3b82f6", Icon: Info },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, logout } = useAuth();
  const { setAgentState, agentState } = useNeuralSphere();
  const [, setLocation] = useLocation();
  const { messages, loading, agentPhase, sendMessage, clearMessages, injectAssistantMessage, activeTrip } = useChatAPI();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.uid);
  usePushNotifications(user?.uid);

  const [inputValue, setInputValue] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "trips" | "alerts" | "profile">("chat");
  // chatMode=false → esfera home (padrão sempre); chatMode=true → tela de chat
  const [chatMode, setChatMode] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Voice ──
  const { isListening, isSpeaking, transcript, startListening, stopListening, speak, cancelSpeech, supported } =
    useVoice((final) => {
      if (final.trim()) setInputValue(final);
    });

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Sphere state ──
  useEffect(() => {
    if (!loading) setAgentState("idle");
    else if (agentPhase) setAgentState("searching");
    else setAgentState("thinking");
  }, [loading, agentPhase, setAgentState]);

  // ── Critical notification → sphere alert ──
  useEffect(() => {
    const critical = notifications.find((n) => !n.read && (n.severity === "critical" || n.severity === "urgent"));
    if (critical) {
      setAgentState("alert");
      const t = setTimeout(() => setAgentState("idle"), 5000);
      return () => clearTimeout(t);
    }
  }, [notifications, setAgentState]);

  // ── Auto-speak last assistant message ──
  useEffect(() => {
    if (!autoSpeak || !supported.tts || loading) return;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && last.content) speak(last.content);
  }, [messages, loading, autoSpeak, speak, supported.tts]);

  // ── Toast for new notification ──
  useEffect(() => {
    const n = notifications[0];
    if (n && !n.read) {
      toast(n.title, {
        description: n.message.slice(0, 80),
        duration: 5000,
        action: { label: "Ver", onClick: () => { setNotifOpen(true); setActiveTab("alerts"); } },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications[0]?.id]);

  // ── Update input from transcript ──
  useEffect(() => {
    if (transcript) setInputValue(transcript);
  }, [transcript]);

  // ── Send ──
  const handleSend = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const msg = inputValue.trim();
      if (!msg || loading) return;
      setInputValue("");
      cancelSpeech();
      setChatMode(true); // entra no modo chat ao enviar
      try { await sendMessage(msg); }
      catch { toast.error("Falha ao enviar mensagem."); }
    },
    [inputValue, loading, sendMessage, cancelSpeech],
  );

  // ── Mic toggle ──
  const handleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleLogout = async () => { await logout(); setLocation("/login"); };

  if (!user) return null;

  const hasMessages = messages.length > 0;
  const sphereState = agentState || "idle";

  // ── Feed proativo ──
  const { cards: proactiveCards, greeting, hasNewGreeting, markGreetingRead } =
    useProactiveFeed(user?.uid, activeTrip as Record<string, any> | null);

  // Quando a Flyisa tem uma saudação nova → injeta no chat automaticamente (uma vez)
  useEffect(() => {
    if (!greeting || !hasNewGreeting) return;
    injectAssistantMessage(greeting.message);
    markGreetingRead();
    // Se urgente (voo próximo, viagem terminando) → abre o chat direto
    if (greeting.urgent) {
      setChatMode(true);
      toast(greeting.message.slice(0, 60) + "…", {
        description: "Flyisa tem algo importante para você",
        duration: 6000,
        action: { label: "Ver", onClick: () => setChatMode(true) },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting, hasNewGreeting]);

  // Navega para alertas/perfil inline via estado
  const showAlerts = () => { setActiveTab("alerts"); markAllAsRead(); };
  const showProfile = () => setActiveTab("profile");

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 80% 10%, rgba(124,58,237,0.18) 0%,transparent 55%), radial-gradient(ellipse at 20% 90%, rgba(37,99,235,0.12) 0%,transparent 55%), #060011",
      }}
    >
      {/* ── Top header ────────────────────────────────────────── */}
      <header
        className="glass-dark pt-safe flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2.5">
          <FlyisaOrb state={sphereState} size={36} />
          <div className="leading-tight">
            <p className="text-white font-bold text-base tracking-wide">Flyisa</p>
            <div className="flex items-center gap-1.5">
              {loading ? (
                <>
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
                  <span className="text-[11px] text-amber-400">{agentPhase || "Processando..."}</span>
                </>
              ) : activeTrip ? (
                <>
                  <Plane className="w-2.5 h-2.5 text-violet-400" />
                  <span className="text-[11px] text-violet-400 truncate max-w-[120px]">
                    {(activeTrip as any).destination || (activeTrip as any).route || "Viagem ativa"}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-emerald-400">Online</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* TTS toggle */}
          {supported.tts && (
            <button
              onClick={() => { setAutoSpeak((v) => !v); cancelSpeech(); }}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
              style={{ background: autoSpeak ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)" }}
              title={autoSpeak ? "Silenciar Flyisa" : "Flyisa falar"}
            >
              {isSpeaking ? (
                <Volume2 className="w-4 h-4 text-violet-400" />
              ) : autoSpeak ? (
                <Volume2 className="w-4 h-4 text-violet-300" />
              ) : (
                <VolumeX className="w-4 h-4 text-white/40" />
              )}
            </button>
          )}

          {/* Notifications bell */}
          <button
            onClick={showAlerts}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {unreadCount > 0 ? (
              <BellRing className="w-4 h-4 text-orange-400 animate-pulse" />
            ) : (
              <Bell className="w-4 h-4 text-white/50" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => setActiveTab("profile")}
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <Settings className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────── */}
      {/* position:relative wrapper so the absolute scroll child fills exactly this area */}
      <main className="flex-1 relative" style={{ minHeight: 0 }}>

        {/* ── CHAT TAB ── */}
        {activeTab === "chat" && (
          <>
            {/* ══════════════════════════════════════════════════════
                MODO HOME: esfera + feed proativo (padrão ao abrir)
                Nunca mostra histórico de mensagens aqui.
            ══════════════════════════════════════════════════════ */}
            {!chatMode && (
              <div
                className="absolute inset-0 overflow-y-auto scrollbar-hidden"
                style={{ scrollbarWidth: "none" }}
              >
                <div className="flex flex-col items-center min-h-full">

                  {/* ── Neural Pulse (Canvas) ── */}
                  <div
                    className="relative w-full shrink-0 overflow-hidden"
                    style={{
                      height: "min(38vh, 260px)",
                      background: "radial-gradient(circle at 50% 60%, #1a103d 0%, #0a0516 100%)",
                    }}
                  >
                    {/* Canvas neural network background */}
                    <NeuralPulse />

                    {/* Centre overlay: glowing ring + lightning icon (like mockup) */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                      style={{ zIndex: 10 }}
                    >
                      {/* Outer glow blur */}
                      <div
                        className="absolute rounded-full"
                        style={{
                          width: 140, height: 140,
                          background:
                            agentState === "thinking" || agentState === "searching"
                              ? "radial-gradient(circle, rgba(0,220,255,0.22) 0%, transparent 70%)"
                              : agentState === "alert"
                              ? "radial-gradient(circle, rgba(239,68,68,0.22) 0%, transparent 70%)"
                              : "radial-gradient(circle, rgba(150,100,255,0.22) 0%, transparent 70%)",
                          filter: "blur(16px)",
                          transition: "background 0.8s ease",
                        }}
                      />
                      {/* Ring */}
                      <div
                        className="absolute rounded-full"
                        style={{
                          width: 100, height: 100,
                          border: agentState === "thinking" || agentState === "searching"
                            ? "1.5px solid rgba(0,220,255,0.45)"
                            : agentState === "alert"
                            ? "1.5px solid rgba(239,68,68,0.45)"
                            : "1.5px solid rgba(150,100,255,0.45)",
                          boxShadow: "0 0 24px 6px rgba(150,100,255,0.15)",
                          transition: "border-color 0.6s ease",
                        }}
                      />
                      {/* Lightning icon */}
                      <div
                        className="relative flex items-center justify-center rounded-full"
                        style={{
                          width: 64, height: 64,
                          background: "rgba(0,0,0,0.4)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <Zap
                          className="w-8 h-8"
                          style={{
                            color:
                              agentState === "thinking" || agentState === "searching"
                                ? "#00DCFF"
                                : agentState === "alert"
                                ? "#EF4444"
                                : "#9664FF",
                            filter: "drop-shadow(0 0 8px currentColor)",
                            transition: "color 0.5s ease",
                          }}
                        />
                      </div>

                      {/* Status pill below icon */}
                      <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                        style={{ background: "rgba(0,255,150,0.12)", border: "1px solid rgba(0,255,150,0.25)" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse block" />
                        <span className="text-emerald-400 text-[11px] font-medium tracking-wide">
                          {agentState === "thinking" ? "Processando..." :
                           agentState === "searching" ? "Buscando..." :
                           agentState === "alert" ? "Atenção!" :
                           "Online"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── FEED PROATIVO: cards gerados pela Flyisa ── */}
                  {proactiveCards.length > 0 ? (
                    <div className="w-full px-4 mb-2">
                      {/* Badge "Flyisa escaneou" */}
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <Zap className="w-3 h-3 text-violet-400" />
                        <p className="text-violet-400/70 text-[10px] uppercase tracking-widest font-semibold">
                          Flyisa · Feed Proativo
                        </p>
                        {hasNewGreeting && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </div>

                      {/* Cards proativos em coluna */}
                      <div className="flex flex-col gap-2.5">
                        {proactiveCards.map((card) => (
                          <ProactiveCardItem
                            key={card.id}
                            card={card}
                            onTap={(query) => {
                              setInputValue(query);
                              setChatMode(true);
                              // Envia após pequeno delay para o input ser setado
                              setTimeout(() => {
                                if (query) {
                                  setInputValue("");
                                  setChatMode(true);
                                  sendMessage(query).catch(() => {});
                                }
                              }, 80);
                            }}
                          />
                        ))}
                      </div>

                      {/* Separador */}
                      <div className="mt-4 mb-3 flex items-center gap-3">
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                        <p className="text-white/20 text-[10px]">ou pergunte</p>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                      </div>
                    </div>
                  ) : (
                    /* Sem viagem: sugestões padrão em grid 2x2 */
                    <div className="w-full px-4 grid grid-cols-2 gap-2.5 mb-4">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => { setInputValue(s.label); inputRef.current?.focus(); }}
                          className="relative rounded-2xl p-3 text-left transition-all active:scale-95 overflow-hidden flex items-center gap-2.5"
                          style={{
                            background: "rgba(255,255,255,0.045)",
                            border: "1px solid rgba(255,255,255,0.09)",
                          }}
                        >
                          <div className="absolute -top-3 -left-3 w-14 h-14 rounded-full pointer-events-none" style={{ background: s.accent, filter: "blur(12px)" }} />
                          <span className="relative text-xl shrink-0">{s.icon}</span>
                          <p className="relative text-white/80 text-[11px] leading-snug font-medium">{s.label}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Botão "ver conversa" quando há mensagens */}
                  {hasMessages && (
                    <div className="w-full px-4 mb-4">
                      <button
                        onClick={() => setChatMode(true)}
                        className="rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.98] w-full flex items-center gap-3"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        <MessageCircle className="w-4 h-4 text-white/40 shrink-0" />
                        <p className="text-white/55 text-[13px]">Ver conversa com Flyisa</p>
                        <ArrowLeft className="w-3.5 h-3.5 text-white/25 ml-auto rotate-180" />
                      </button>
                    </div>
                  )}

                  <p className="text-white/20 text-[11px] pb-5 tracking-wide">
                    Toque em um card ou pergunte abaixo
                  </p>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                MODO CHAT: histórico de mensagens (tela separada)
            ══════════════════════════════════════════════════════ */}
            {chatMode && (
              <div className="absolute inset-0 flex flex-col">
                {/* Cabeçalho do chat com botão voltar */}
                <div
                  className="shrink-0 flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <button
                    onClick={() => setChatMode(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
                    style={{ background: "rgba(255,255,255,0.07)" }}
                  >
                    <ArrowLeft className="w-4 h-4 text-white/70" />
                  </button>
                  <div className="flex items-center gap-2.5 flex-1">
                    <FlyisaOrb state={sphereState} size={28} />
                    <div>
                      <p className="text-white font-semibold text-sm leading-tight">Flyisa</p>
                      {loading ? (
                        <p className="text-amber-400 text-[10px]">{agentPhase || "Pensando..."}</p>
                      ) : (
                        <p className="text-emerald-400 text-[10px]">Online</p>
                      )}
                    </div>
                  </div>
                  {hasMessages && (
                    <button onClick={clearMessages} className="text-[11px] text-white/20 px-2">
                      Limpar
                    </button>
                  )}
                </div>

                {/* Mensagens */}
                <div
                  className="flex-1 overflow-y-auto scrollbar-hidden px-4 pt-3 pb-2"
                  style={{ scrollbarWidth: "none" }}
                >
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                        alignItems: "flex-start",
                        marginBottom: 12,
                        gap: 8,
                      }}
                    >
                      {msg.role === "assistant" && (
                        <div style={{ marginTop: 2, flexShrink: 0 }}>
                          <FlyisaOrb state={loading && idx === messages.length - 1 ? sphereState : "idle"} size={24} />
                        </div>
                      )}
                      <div
                        style={{
                          maxWidth: "76%",
                          borderRadius: 18,
                          padding: "10px 14px",
                          fontSize: 14,
                          lineHeight: 1.55,
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                          ...(msg.role === "user"
                            ? { background: "linear-gradient(135deg,#7c3aed,#3b82f6)", color: "#fff", borderBottomRightRadius: 4 }
                            : { background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.92)", borderBottomLeftRadius: 4 }),
                        }}
                      >
                        {msg.toolProgress && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {msg.toolProgress}
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {/* Indicador de digitação */}
                  {loading && !messages[messages.length - 1]?.content && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
                      <div style={{ marginTop: 2, flexShrink: 0 }}><FlyisaOrb state="thinking" size={24} /></div>
                      <div style={{ borderRadius: 18, borderBottomLeftRadius: 4, padding: "12px 16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {[0, 0.15, 0.3].map((d, i) => (
                            <div key={i} className="animate-bounce" style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", animationDelay: `${d}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── ALERTS TAB ── */}
        {activeTab === "alerts" && (
          <div className="absolute inset-0 overflow-y-auto scrollbar-hidden px-4 py-4" style={{ scrollbarWidth: "none" }}>
            <h2 className="text-white font-bold text-lg mb-3">Notificações</h2>
            <div className="flex flex-col gap-3">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 mt-16 text-white/30">
                <Bell className="w-12 h-12" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((n) => {
                const s = SEV[n.severity] ?? SEV.info;
                const Icon = s.Icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className="glass rounded-2xl p-4 text-left w-full transition-all active:scale-[0.98]"
                    style={{ opacity: n.read ? 0.5 : 1, display: "block" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${s.color}22` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: s.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm">{n.title}</p>
                        <p className="text-white/55 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                        {n.createdAt && (
                          <p className="text-white/25 text-[10px] mt-1">
                            {n.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
            </div>{/* end inner gap container */}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <div className="absolute inset-0 overflow-y-auto scrollbar-hidden px-4 py-6" style={{ scrollbarWidth: "none" }}>
            <div className="flex flex-col gap-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 mb-2">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-extrabold text-white"
                style={{ background: "linear-gradient(135deg,#7c3aed,#3b82f6)" }}
              >
                {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="text-center">
                <p className="text-white font-bold">{user.displayName || "Usuário"}</p>
                <p className="text-white/45 text-sm">{user.email}</p>
              </div>
            </div>

            {/* Options */}
            {[
              { icon: Sparkles, label: "Plano Premium", sub: "Ativo" },
              { icon: MapPin, label: "GPS", sub: "Localização ativada" },
              { icon: Bell, label: "Notificações push", sub: "Ativadas" },
            ].map((item) => (
              <div
                key={item.label}
                className="glass rounded-2xl px-4 py-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-violet-400" />
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-white/40 text-xs">{item.sub}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/25" />
              </div>
            ))}

            <button
              onClick={handleLogout}
              className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3 w-full mt-2"
              style={{ borderColor: "rgba(239,68,68,0.2)" }}
            >
              <LogOut className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-medium text-sm">Sair</span>
            </button>
            </div>{/* end inner flex-col gap-4 */}
          </div>
        )}
      </main>

      {/* ── Voice listening overlay ────────────────────────────── */}
      {isListening && (
        <div
          className="absolute left-4 right-4 animate-slide-up"
          style={{ bottom: 145, zIndex: 20 }}
        >
          <div
            className="glass-dark rounded-2xl px-5 py-3 flex items-center justify-between"
            style={{ borderColor: "rgba(239,68,68,0.3)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white/80 text-sm">Ouvindo...</span>
            </div>
            <VoiceWave />
          </div>
        </div>
      )}

      {/* ── Input bar ─────────────────────────────────────────── */}
      {activeTab === "chat" && (
        <div
          className="glass-dark shrink-0 px-4 py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <form onSubmit={handleSend} className="flex items-center gap-2 w-full overflow-hidden">
            {/* Mic button */}
            {supported.stt && (
              <button
                type="button"
                onPointerDown={handleMic}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-90"
                style={{
                  background: isListening
                    ? "linear-gradient(135deg,#ef4444,#dc2626)"
                    : "rgba(255,255,255,0.08)",
                  boxShadow: isListening ? "0 0 20px rgba(239,68,68,0.5)" : "none",
                }}
                title={isListening ? "Parar" : "Falar"}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5 text-white" />
                ) : (
                  <Mic className="w-5 h-5 text-white/60" />
                )}
              </button>
            )}

            {/* Text input */}
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSend(); }}
              placeholder="Pergunte ao Flyisa..."
              disabled={loading}
              className="flex-1 h-11 rounded-2xl px-4 text-sm outline-none transition-all"
              style={{
                minWidth: 0,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.9)",
              }}
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-30"
              style={{ background: "linear-gradient(135deg,#7c3aed,#3b82f6)" }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Send className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
              )}
            </button>
          </form>
        </div>
      )}

      {/* ── Bottom navigation — shared BottomNav (Flyisa, Feed, Sugestões, Reservas, Mapa) ── */}
      <BottomNav active="chat" />
    </div>
  );
}
