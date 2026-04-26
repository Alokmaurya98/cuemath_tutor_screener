import { useState, useRef, useCallback, useEffect } from 'react';

export default function useSpeechRecognition() {
  const [liveTranscript, setLiveTranscript] = useState('');
  const [submittableTranscript, setSubmittableTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  // EC3 — Track recognition confidence for low-quality audio detection
  const [confidence, setConfidence] = useState(1);

  const recognitionRef = useRef(null);
  // Ref-based recording flag — avoids stale closure issues with onend auto-restart
  const isRecordingRef = useRef(false);
  // Ref-based final transcript accumulator — avoids stale closure issues with onresult
  const finalTranscriptRef = useRef('');
  // Callback to invoke when recording intentionally stops (via stopListening)
  const onStopCallbackRef = useRef(null);

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
    finalTranscriptRef.current = '';
    isRecordingRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let newFinalTranscript = '';
      let minConfidence = 1;
      let hasFinalResult = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          newFinalTranscript += result[0].transcript + ' ';
          // EC3 — Track the lowest confidence score across all final results
          if (typeof result[0].confidence === 'number' && result[0].confidence > 0) {
            minConfidence = Math.min(minConfidence, result[0].confidence);
            hasFinalResult = true;
          }
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Show interim in UI immediately for live feedback
      setLiveTranscript(interimTranscript);

      // Accumulate final transcript in ref (not just state) to avoid stale closure issues
      if (newFinalTranscript) {
        finalTranscriptRef.current += newFinalTranscript;
        setSubmittableTranscript(finalTranscriptRef.current);
      }

      if (hasFinalResult) setConfidence(minConfidence);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access was denied. Please allow microphone permissions in your browser settings.');
        isRecordingRef.current = false;
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        // no-speech is not fatal — onend will fire and we'll auto-restart if still recording
      } else if (event.error === 'network') {
        setError('Network error. Please check your connection.');
        isRecordingRef.current = false;
        setIsListening(false);
      } else if (event.error === 'aborted') {
        // aborted is expected when we call .abort() — not an error
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // If we're still supposed to be recording, auto-restart (fixes Chrome auto-stop on silence)
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // recognition may already be starting — ignore the error
          console.warn('Recognition restart skipped:', e.message);
          setIsListening(false);
        }
      } else {
        // Recording was intentionally stopped
        setIsListening(false);
        // If a stop callback is registered, call it
        const cb = onStopCallbackRef.current;
        if (cb) {
          onStopCallbackRef.current = null;
          cb();
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start failed:', e.message);
      setError('Something went wrong starting the microphone. Please try again.');
    }
  }, []);

  const stopListening = useCallback((onStopCallback) => {
    isRecordingRef.current = false;
    // Register the callback to be called when onend fires
    if (onStopCallback) {
      onStopCallbackRef.current = onStopCallback;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Recognition stop failed:', e.message);
        // If stop failed, still clean up
        setIsListening(false);
        if (onStopCallback) {
          onStopCallbackRef.current = null;
          onStopCallback();
        }
      }
    } else {
      setIsListening(false);
      if (onStopCallback) {
        onStopCallbackRef.current = null;
        onStopCallback();
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setLiveTranscript('');
    setSubmittableTranscript('');
    finalTranscriptRef.current = '';
    setConfidence(1);
  }, []);

  return {
    liveTranscript,
    submittableTranscript,
    isListening,
    error,
    isSupported,
    // EC3 — Expose confidence so Interview can show editable transcript for low confidence
    confidence,
    // Expose refs so Interview.jsx can read latest values without stale closures
    finalTranscriptRef,
    isRecordingRef,
    startListening,
    stopListening,
    resetTranscript
  };
}
