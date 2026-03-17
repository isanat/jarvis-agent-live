import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolProgress?: string;  // e.g. "Consultando status do voo..."
}

interface UserLocation {
  lat: number;
  lon: number;
}

interface UseChatAPIReturn {
  messages: ChatMessage[];
  loading: boolean;
  agentPhase: string | null;    // Current tool label while agent is working
  error: string | null;
  sendMessage: (message: string, tripContext?: object | null) => Promise<void>;
  clearMessages: () => void;
  location: UserLocation | null;
}

export function useChatAPI(): UseChatAPIReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentPhase, setAgentPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Request GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => { /* silently ignore permission denial */ },
      { enableHighAccuracy: false, maximumAge: 120_000, timeout: 10_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const sendMessage = useCallback(async (userMessage: string, tripContext: object | null = null) => {
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
          ...(tripContext && { trip: tripContext }),
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
  }, [messages, user, location]);

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setAgentPhase(null);
  }, []);

  return { messages, loading, agentPhase, error, sendMessage, clearMessages, location };
}
