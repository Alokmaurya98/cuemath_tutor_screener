import { useState, useRef, useCallback, useEffect } from 'react';

export default function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const onEndRef = useRef(null);
  const keepAliveRef = useRef(null);

  const speak = useCallback((text, onEnd) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    clearInterval(keepAliveRef.current);

    if (!text || !window.speechSynthesis) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    // Pick the best available English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(v => v.name.includes('Google US English')) ||
      voices.find(v => v.name.includes('Samantha')) ||
      voices.find(v => v.lang === 'en-US' && !v.localService) ||
      voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    onEndRef.current = onEnd;

    utterance.onstart = () => setIsSpeaking(true);

    const handleDone = () => {
      clearInterval(keepAliveRef.current);
      setIsSpeaking(false);
      const cb = onEndRef.current;
      onEndRef.current = null;
      cb?.();
    };

    utterance.onend = handleDone;
    utterance.onerror = (e) => {
      console.warn('TTS error:', e.error);
      handleDone();
    };

    window.speechSynthesis.speak(utterance);

    // Chrome bug workaround: speechSynthesis pauses after ~15s for long text
    keepAliveRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        clearInterval(keepAliveRef.current);
      }
    }, 10000);
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    clearInterval(keepAliveRef.current);
    setIsSpeaking(false);
    onEndRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      clearInterval(keepAliveRef.current);
    };
  }, []);

  return { isSpeaking, speak, cancel };
}
