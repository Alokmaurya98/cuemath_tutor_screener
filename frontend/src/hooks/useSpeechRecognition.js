import { useState, useRef, useCallback, useEffect } from 'react';

export default function useSpeechRecognition() {
  const [liveTranscript, setLiveTranscript] = useState('');
  const [submittableTranscript, setSubmittableTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  // EC3 — Track recognition confidence for low-quality audio detection
  const [confidence, setConfidence] = useState(1);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setError(null);
    setLiveTranscript('');
    setSubmittableTranscript('');
    setConfidence(1); // Reset confidence on new recording

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let minConfidence = 1;
      let hasFinalResult = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
          // EC3 — Track the lowest confidence score across all final results
          if (typeof result[0].confidence === 'number' && result[0].confidence > 0) {
            minConfidence = Math.min(minConfidence, result[0].confidence);
            hasFinalResult = true;
          }
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      setLiveTranscript(interimTranscript);
      if (finalTranscript) {
        setSubmittableTranscript(prev => prev + finalTranscript);
      }
      if (hasFinalResult) setConfidence(minConfidence);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access was denied. Please allow microphone permissions in your browser settings.');
      } else if (event.error === 'no-speech') {
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setLiveTranscript('');
    setSubmittableTranscript('');
    setConfidence(1);
  }, []);

  const recognitionRef = useRef(null);

  return {
    liveTranscript,
    submittableTranscript,
    isListening,
    error,
    isSupported,
    // EC3 — Expose confidence so Interview can show editable transcript for low confidence
    confidence,
    startListening,
    stopListening,
    resetTranscript
  };
}
