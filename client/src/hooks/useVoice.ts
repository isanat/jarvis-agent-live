import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseVoiceReturn {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  cancelSpeech: () => void;
  supported: { stt: boolean; tts: boolean };
}

export function useVoice(onFinalTranscript?: (t: string) => void): UseVoiceReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

  const SRClass =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!SRClass) return;
    const recognition = new SRClass();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += text;
        else interimText += text;
      }
      const current = finalText || interimText;
      setTranscript(current);
      if (finalText && onFinalRef.current) {
        onFinalRef.current(finalText.trim());
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      if (e.error !== 'aborted') console.warn('[useVoice] STT error:', e.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    try {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
      navigator.vibrate?.(50);
    } catch (err) {
      setIsListening(false);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || !text.trim()) return;
      window.speechSynthesis.cancel();

      // Strip markdown
      const clean = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/\n+/g, '. ')
        .slice(0, 600);

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.pitch = 0.9;
      utterance.volume = 1;

      const assignVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const v =
          voices.find((v) => v.lang === 'pt-BR') ||
          voices.find((v) => v.lang.startsWith('pt')) ||
          voices[0];
        if (v) utterance.voice = v;
      };
      assignVoice();
      if (!window.speechSynthesis.getVoices().length) {
        window.speechSynthesis.addEventListener('voiceschanged', assignVoice, { once: true });
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [ttsSupported],
  );

  const cancelSpeech = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [ttsSupported]);

  return {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    supported: { stt: !!SRClass, tts: ttsSupported },
  };
}
