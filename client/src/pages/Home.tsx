import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, Send, LogOut, Settings, Loader2,
  Bell, BellRing, Plane, AlertTriangle, Info, X, MapPin,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useNeuralSphere } from "@/contexts/NeuralSphereContext";
import { useChatAPI } from "@/hooks/useChatAPI";
import { useNotifications } from "@/hooks/useNotifications";
import { NeuralSphere } from "@/components/NeuralSphere";
import { toast } from "sonner";

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  critical: { bg: "bg-red-50 dark:bg-red-950/40",   border: "border-red-300 dark:border-red-700",   icon: AlertTriangle },
  urgent:   { bg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-300 dark:border-orange-700", icon: BellRing },
  warning:  { bg: "bg-yellow-50 dark:bg-yellow-950/40", border: "border-yellow-300 dark:border-yellow-700", icon: AlertTriangle },
  info:     { bg: "bg-blue-50 dark:bg-blue-950/40",  border: "border-blue-300 dark:border-blue-700",  icon: Info },
};

export default function Home() {
  const { user, logout } = useAuth();
  const { setAgentState } = useNeuralSphere();
  const [, setLocation] = useLocation();
  const { messages, loading, agentPhase, sendMessage, clearMessages } = useChatAPI();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.uid);
  const [inputValue, setInputValue] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync sphere state with chat loading phases
  useEffect(() => {
    if (!loading) {
      setAgentState("idle");
    } else if (agentPhase) {
      setAgentState("searching");
    } else {
      setAgentState("thinking");
    }
  }, [loading, agentPhase, setAgentState]);

  // Flash sphere alert when new critical notification arrives
  useEffect(() => {
    const critical = notifications.find((n) => !n.read && (n.severity === "critical" || n.severity === "urgent"));
    if (critical) {
      setAgentState("alert");
      const t = setTimeout(() => setAgentState("idle"), 5000);
      return () => clearTimeout(t);
    }
  }, [notifications, setAgentState]);

  // Toast for new unread notifications
  useEffect(() => {
    const newest = notifications[0];
    if (newest && !newest.read) {
      toast(newest.title, {
        description: newest.message.slice(0, 80) + (newest.message.length > 80 ? "..." : ""),
        duration: 5000,
        action: { label: "Ver", onClick: () => setNotifOpen(true) },
      });
    }
    // We only want to fire when a truly new notification appears — deps intentionally narrow
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications[0]?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    try {
      await sendMessage(inputValue);
      setInputValue("");
    } catch {
      toast.error("Falha ao enviar mensagem. Tente novamente.");
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">Jarvis Travel</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>

            {/* Trips shortcut */}
            <Button variant="ghost" size="icon" onClick={() => setLocation("/trips")} title="Minhas viagens">
              <Plane className="w-5 h-5" />
            </Button>

            {/* Notification bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setNotifOpen((o) => !o); if (unreadCount > 0) markAllAsRead(); }}
                title="Notificações"
              >
                {unreadCount > 0 ? <BellRing className="w-5 h-5 text-orange-500 animate-pulse" /> : <Bell className="w-5 h-5" />}
              </Button>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>

            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Notification Panel (overlay) */}
      {notifOpen && (
        <div className="fixed inset-0 z-20 flex justify-end" onClick={() => setNotifOpen(false)}>
          <div
            className="w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">Notificações</h2>
              <Button variant="ghost" size="icon" onClick={() => setNotifOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notifications.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center mt-8">Nenhuma notificação</p>
              ) : (
                notifications.map((n) => {
                  const style = SEVERITY_STYLES[n.severity] ?? SEVERITY_STYLES.info;
                  const Icon = style.icon;
                  return (
                    <div
                      key={n.id}
                      className={`rounded-lg border p-3 cursor-pointer transition-opacity ${style.bg} ${style.border} ${n.read ? "opacity-60" : ""}`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          {n.createdAt && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {n.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 container py-6 flex flex-col gap-6 max-w-4xl mx-auto w-full overflow-hidden">
        {/* Neural Sphere */}
        <Card className="shadow-lg overflow-hidden">
          <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="w-full h-80 rounded-lg overflow-hidden">
              <NeuralSphere />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">Jarvis Neural Agent</h2>
              <p className="text-muted-foreground">Seu concierge de viagens inteligente</p>
            </div>
            {/* Agent state indicator */}
            <div className="flex items-center gap-2 text-sm">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  <span className="text-orange-600 dark:text-orange-400">
                    {agentPhase ? `🔍 ${agentPhase}...` : "Pensando..."}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 animate-pulse" />
                  <span className="text-green-600 dark:text-green-400">Rede neural ativa</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="shadow-lg flex-1 flex flex-col min-h-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Chat</CardTitle>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearMessages} className="text-xs text-muted-foreground">
                Limpar
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[500px] pb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <MessageCircle className="w-10 h-10 opacity-30" />
                <p className="text-sm">Inicie uma conversa com o Jarvis</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Status do meu voo", "Clima no destino", "Checklist de viagem"].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInputValue(q)}
                      className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-sm"
                          : "bg-gray-100 dark:bg-slate-800 text-foreground rounded-bl-sm"
                      }`}
                    >
                      {/* Tool progress indicator */}
                      {msg.toolProgress && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {msg.toolProgress}
                        </div>
                      )}
                      {/* Message text — preserve whitespace / line breaks */}
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && !messages[messages.length - 1]?.content && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                      <div className="flex gap-1.5">
                        {[0, 0.15, 0.3].map((delay, i) => (
                          <div
                            key={i}
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${delay}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>
        </Card>

        {/* GPS indicator + Input */}
        <div className="space-y-2">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              placeholder="Pergunte ao Jarvis..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shrink-0"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
