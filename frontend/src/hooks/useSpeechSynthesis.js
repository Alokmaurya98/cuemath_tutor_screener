import { useState, useRef, useCallback, useEffect } from 'react';

export default function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const onEndRef = useRef(null);
  const keepAliveRef = useRef(null);

  const speak = useCallback((text, onEnd) => {
    const synth = window.speechSynthesis;

    // Cancel any ongoing speech first
    synth.cancel();
    clearInterval(keepAliveRef.current);

    if (!text || !synth) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;   // slightly slower — easier to understand
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

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
      console.error('SpeechSynthesis error:', e);
      handleDone(); // still trigger callback so interview does not get stuck
    };

    // Fix Bug 2: Chrome pauses TTS after ~15s — keep it alive with pause/resume
    const startKeepAlive = () => {
      keepAliveRef.current = setInterval(() => {
        if (!synth.speaking) {
          clearInterval(keepAliveRef.current);
          return;
        }
        synth.pause();
        synth.resume();
      }, 10000);
    };

    // Fix Bug 1: Wait for voices to be loaded before speaking
    const doSpeak = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        // Prefer a natural English voice if available
        const preferredVoice =
          voices.find(v => v.lang === 'en-US' && v.name.includes('Natural')) ||
          voices.find(v => v.name.includes('Google US English')) ||
          voices.find(v => v.name.includes('Samantha')) ||
          voices.find(v => v.lang === 'en-US' && !v.localService) ||
          voices.find(v => v.lang === 'en-US') ||
          voices.find(v => v.lang.startsWith('en')) ||
          voices[0];

        if (preferredVoice) utterance.voice = preferredVoice;
        synth.speak(utterance);
        startKeepAlive();
      }
    };

    if (synth.getVoices().length > 0) {
      doSpeak();
    } else {
      // Voices not loaded yet — wait for the onvoiceschanged event
      synth.onvoiceschanged = () => {
        synth.onvoiceschanged = null; // remove listener after first call
        doSpeak();
      };
      // Fallback: if onvoiceschanged never fires (some browsers), try after a delay
      setTimeout(() => {
        if (synth.getVoices().length > 0 && !synth.speaking) {
          synth.onvoiceschanged = null;
          doSpeak();
        }
      }, 500);
    }
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
