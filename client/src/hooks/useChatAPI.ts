import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolProgress?: string;  // e.g. "Consultando status do voo..."
}

interface UserLocation {
  lat: number;
  lon: number;
  accuracy?: number;
}

interface UseChatAPIReturn {
  messages: ChatMessage[];
  loading: boolean;
  agentPhase: string | null;    // Current tool label while agent is working
  error: string | null;
  sendMessage: (message: string, tripContext?: object | null) => Promise<void>;
  clearMessages: () => void;
  /** Injeta mensagem da Flyisa sem usuário pedir (feed proativo) */
  injectAssistantMessage: (content: string) => void;
  location: UserLocation | null;
  activeTrip: object | null;    // Most imminent upcoming/active trip
}

export function useChatAPI(): UseChatAPIReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentPhase, setAgentPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeTrip, setActiveTrip] = useState<object | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Session starts fresh — mark history as loaded without restoring UI ──
  useEffect(() => {
    if (user) setHistoryLoaded(true);
  }, [user]);

  // ── Save messages to Firestore whenever they change ──
  useEffect(() => {
    if (!user || !historyLoaded || messages.length === 0) return;
    const save = async () => {
      try {
        const clean = messages.map(({ role, content }) => ({ role, content }));
        await setDoc(
          doc(db, 'chats', user.uid),
          { userId: user.uid, messages: clean, updatedAt: serverTimestamp() },
          { merge: true },
        );
      } catch {
        // Silently ignore save errors
      }
    };
    save();
  }, [messages, user, historyLoaded]);

  // ── Auto-load most imminent upcoming/active trip ──
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'trips'),
      where('userId', '==', user.uid),
      where('status', 'in', ['active', 'upcoming']),
      orderBy('departureDate', 'asc'),
      limit(1),
    );

    // Today in YYYY-MM-DD — trips whose returnDate (or departureDate) is in the
    // past are excluded even if their status was never updated to "completed".
    const todayStr = new Date().toISOString().slice(0, 10);

    const pickActiveTrip = (docs: any[]) => {
      const future = docs
        .map((d: any) => ({ id: d.id, ...d.data() }))
        .filter((t: any) => {
          // Keep trip if its end date (returnDate or departureDate) is today or later
          const end = t.returnDate || t.departureDate || '';
          return end >= todayStr;
        })
        .sort((a: any, b: any) => {
          const da = a.departureDate || '';
          const db_ = b.departureDate || '';
          return da < db_ ? -1 : da > db_ ? 1 : 0;
        });
      return future.length > 0 ? future[0] : null;
    };

    const unsub = onSnapshot(
      q,
      (snap) => {
        setActiveTrip(snap.empty ? null : pickActiveTrip(snap.docs));
      },
      (err) => {
        // Index may not exist yet — fall back to simpler query without orderBy
        console.warn('[useChatAPI] trips query failed, using fallback:', err.message);
        const fallback = query(
          collection(db, 'trips'),
          where('userId', '==', user.uid),
          where('status', 'in', ['active', 'upcoming']),
          limit(10),
        );
        onSnapshot(fallback, (snap) => {
          setActiveTrip(snap.empty ? null : pickActiveTrip(snap.docs));
        });
      },
    );

    return () => unsub();
  }, [user]);

  // Request GPS on mount — high accuracy so mobile uses real GPS, not IP
  useEffect(() => {
    if (!navigator.geolocation) return;

    const onSuccess = (pos: GeolocationPosition) => {
      setLocation({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,   // meters — server uses this to trust/distrust the fix
      });
    };

    // First try high accuracy (real GPS on mobile)
    const watchId = navigator.geolocation.watchPosition(
      onSuccess,
      () => {
        // Fallback: accept lower accuracy (WiFi triangulation on desktop)
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          () => { /* silently ignore if user denies */ },
          { enableHighAccuracy: false, maximumAge: 300_000, timeout: 15_000 }
        );
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 15_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const sendMessage = useCallback(async (userMessage: string, tripContext: object | null = null) => {
    // Use explicit tripContext if provided, otherwise fall back to the auto-loaded active trip
    const resolvedTrip = tripContext ?? activeTrip;
    if (!userMessage.trim()) return;

    // Add user message immediately
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setAgentPhase(null);
    setError(null);

    // Abort any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const backendUrl = import.meta.env.VITE_BACKEND_URL || '/api';

    // Build history excluding the message we just added
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch(`${backendUrl}/chat-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history,
          userId: user?.uid ?? null,
          userName: user?.displayName ?? user?.email ?? null,
          location,
          ...(resolvedTrip && { trip: resolvedTrip }),
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        // Fallback to regular POST if streaming fails
        const data = await response.json().catch(() => ({ message: 'Erro ao processar resposta.' }));
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.message || data.error || 'Erro desconhecido.' },
        ]);
        setLoading(false);
        setAgentPhase(null);
        return;
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';
      let messageAdded = false;

      // Add a placeholder assistant message to update in-place
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      messageAdded = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event: { type: string; data?: string; tool?: string; label?: string; message?: string; fullText?: string; success?: boolean };
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          switch (event.type) {
            case 'tool_call':
              setAgentPhase(event.label || event.tool || 'Processando...');
              // Update last message with tool progress indicator
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { ...last, toolProgress: `🔍 ${event.label || event.tool}...` };
                }
                return next;
              });
              break;

            case 'tool_result':
              setAgentPhase(null);
              // Clear tool progress indicator, keep existing text
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { ...last, toolProgress: undefined };
                }
                return next;
              });
              break;

            case 'text_chunk':
              if (event.data) {
                assistantText += event.data;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === 'assistant') {
                    next[next.length - 1] = { ...last, content: assistantText, toolProgress: undefined };
                  }
                  return next;
                });
              }
              break;

            case 'error':
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { ...last, content: `Erro: ${event.message}`, toolProgress: undefined };
                }
                return next;
              });
              break;

            case 'done':
              // Final text from server (use if assistantText is empty)
              if (!assistantText && event.fullText) {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === 'assistant') {
                    next[next.length - 1] = { ...last, content: event.fullText!, toolProgress: undefined };
                  }
                  return next;
                });
              }
              break;
          }
        }
      }

      // If no content arrived at all, show a fallback
      if (messageAdded && !assistantText) {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant' && !last.content) {
            next[next.length - 1] = { ...last, content: 'Desculpe, não consegui processar sua mensagem.', toolProgress: undefined };
          }
          return next;
        });
      }

    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const errorMessage = err instanceof Error ? err.message : 'Falha ao enviar mensagem';
      setError(errorMessage);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Erro: ${errorMessage}` }]);
    } finally {
      setLoading(false);
      setAgentPhase(null);
    }
  }, [messages, user, location, activeTrip]);

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setAgentPhase(null);
    if (user) {
      setDoc(
        doc(db, 'chats', user.uid),
        { userId: user.uid, messages: [], updatedAt: serverTimestamp() },
        { merge: true },
      ).catch(() => {});
    }
  }, [user]);

  // Injeta mensagem da Flyisa sem o usuário ter pedido (feed proativo)
  const injectAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => {
      if (prev.some((m) => m.role === 'assistant' && m.content === content)) return prev;
      return [...prev, { role: 'assistant', content }];
    });
  }, []);

  return { messages, loading, agentPhase, error, sendMessage, clearMessages, injectAssistantMessage, location, activeTrip };
}
