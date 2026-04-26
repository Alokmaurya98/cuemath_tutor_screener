import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useInterview, { STATES } from '../hooks/useInterview';
import useCountdown from '../hooks/useCountdown';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import ProgressBar from '../components/ProgressBar';
import CountdownTimer from '../components/CountdownTimer';
import WaveformAnimation from '../components/WaveformAnimation';
import { formatTimer } from '../utils/formatDate';

export default function Interview({ candidate }) {
  const navigate = useNavigate();
  const {
    state, setState, messages, currentAIText,
    questionNumber, exchangeCount, error, isComplete,
    isSubmitting,
    startInterview, sendAnswer, retry
  } = useInterview(candidate.candidateId, candidate.name, candidate.gradeLevel);

  const {
    liveTranscript, submittableTranscript, isListening,
    error: micError, isSupported, confidence,
    finalTranscriptRef, isRecordingRef,
    startListening, stopListening, resetTranscript
  } = useSpeechRecognition();

  const [reviewState, setReviewState] = useState(null);
  const [editableTranscript, setEditableTranscript] = useState('');

  const { isSpeaking: isTTSSpeaking, speak: ttsSpeak, cancel: ttsCancel } = useSpeechSynthesis();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // TTS tracking — which question number we've already spoken
  const ttsSpokenFor = useRef(0);
  const [waitingForTTS, setWaitingForTTS] = useState(false);

  // Silence detection state
  const [silenceDetected, setSilenceDetected] = useState(false);
  const [autoSubmitCount, setAutoSubmitCount] = useState(5);
  const lastSpeechRef = useRef(Date.now());
  const silenceCheckRef = useRef(null);
  const autoSubmitTimerRef = useRef(null);
  const previousTranscriptRef = useRef('');
  const submitAnswerRef = useRef(null);
  const [recordingSeconds, setRecordingSeconds] = useState(30);
  const [isTimeLimitAutoSubmitting, setIsTimeLimitAutoSubmitting] = useState(false);
  const recordingTimerRef = useRef(null);
  const timeLimitAutoSubmitTimerRef = useRef(null);

  const timerRef = useRef(null);
  const hasStarted = useRef(false);

  // ── Countdown: start recording when countdown completes ──
  const handleCountdownDone = useCallback(() => {
    setState(STATES.RECORDING);
    resetTranscript();
    finalTranscriptRef.current = '';
    startListening();
    lastSpeechRef.current = Date.now();
    setSilenceDetected(false);
    setAutoSubmitCount(5);
  }, [setState, resetTranscript, startListening, finalTranscriptRef]);

  const { count, isRunning: countdownRunning, start: startCountdown, skip: skipCountdown } =
    useCountdown(5, handleCountdownDone);

  // ── Start interview on mount ──
  useEffect(() => {
    if (!hasStarted.current && candidate.candidateId) {
      hasStarted.current = true;
      startInterview();
    }
  }, [candidate.candidateId, startInterview]);

  // ── Elapsed timer ──
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (isComplete && timerRef.current) clearInterval(timerRef.current);
  }, [isComplete]);

  // ── TTS: Speak AI question aloud, THEN start countdown ──
  useEffect(() => {
    if (state === STATES.COUNTDOWN && ttsSpokenFor.current !== questionNumber) {
      ttsSpokenFor.current = questionNumber;
      if (currentAIText) {
        setWaitingForTTS(true);
        ttsSpeak(currentAIText, () => {
          setWaitingForTTS(false);
          startCountdown();
        });
      } else {
        startCountdown();
      }
    }
  }, [state, questionNumber, currentAIText, ttsSpeak, startCountdown]);

  // Cancel TTS if we leave the page
  useEffect(() => {
    return () => ttsCancel();
  }, [ttsCancel]);

  // ── Navigate to thank-you when complete ──
  useEffect(() => {
    if (isComplete) {
      // Stop recording & timers but NOT TTS — let the farewell message play
      stopListening();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (timeLimitAutoSubmitTimerRef.current) clearInterval(timeLimitAutoSubmitTimerRef.current);
      if (autoSubmitTimerRef.current) clearInterval(autoSubmitTimerRef.current);
      if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);

      // Speak the closing message aloud, then navigate
      if (currentAIText) {
        ttsSpeak(currentAIText, () => {
          setTimeout(() => navigate('/thank-you'), 1500);
        });
        // Fallback: navigate after 15s even if TTS hangs
        setTimeout(() => navigate('/thank-you'), 15000);
      } else {
        setTimeout(() => navigate('/thank-you'), 2000);
      }
    }
  }, [isComplete, navigate, stopListening, currentAIText, ttsSpeak]);

  // ── Online / offline detection ──
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Track last speech timestamp for silence detection ──
  useEffect(() => {
    if (state === STATES.RECORDING) {
      const combined = (submittableTranscript + ' ' + liveTranscript).trim();
      if (combined && combined !== previousTranscriptRef.current) {
        previousTranscriptRef.current = combined;
        lastSpeechRef.current = Date.now();
        // If candidate resumes speaking, cancel auto-submit
        if (silenceDetected) {
          setSilenceDetected(false);
          setAutoSubmitCount(5);
          if (autoSubmitTimerRef.current) {
            clearInterval(autoSubmitTimerRef.current);
            autoSubmitTimerRef.current = null;
          }
        }
      }
    }
  }, [submittableTranscript, liveTranscript, state, silenceDetected]);

  // EC5 — Warn before unload mid-interview
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isComplete && hasStarted.current) {
        e.preventDefault();
        e.returnValue = 'Interview in progress. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isComplete]);

  // EC4 — 15s absolute silence timeout
  useEffect(() => {
    if (state === STATES.RECORDING && !submittableTranscript && !liveTranscript) {
      const timer = setTimeout(() => {
        stopListening();
        setReviewState('SILENCE');
        setState(STATES.COUNTDOWN); 
        setSilenceDetected(false);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [state, submittableTranscript, liveTranscript, stopListening, setState]);

  // ── Silence check: every second during RECORDING ──
  useEffect(() => {
    if (state !== STATES.RECORDING) {
      // Clean up when not recording
      clearInterval(silenceCheckRef.current);
      clearInterval(autoSubmitTimerRef.current);
      silenceCheckRef.current = null;
      autoSubmitTimerRef.current = null;
      setSilenceDetected(false);
      setAutoSubmitCount(5);
      return;
    }

    silenceCheckRef.current = setInterval(() => {
      const combined = (submittableTranscript + ' ' + liveTranscript).trim();
      const wordCount = combined.split(/\s+/).filter(Boolean).length;
      const silenceMs = Date.now() - lastSpeechRef.current;

      // Only trigger after candidate has said at least 5 words AND 3s of silence
      if (wordCount >= 5 && silenceMs > 3000 && !silenceDetected) {
        setSilenceDetected(true);
      }
    }, 500);

    return () => {
      clearInterval(silenceCheckRef.current);
      silenceCheckRef.current = null;
    };
  }, [state, submittableTranscript, liveTranscript, silenceDetected]);

  // ── Auto-submit countdown once silence is detected ──
  useEffect(() => {
    if (!silenceDetected || state !== STATES.RECORDING) return;

    setAutoSubmitCount(5);
    autoSubmitTimerRef.current = setInterval(() => {
      setAutoSubmitCount(prev => {
        if (prev <= 1) {
          clearInterval(autoSubmitTimerRef.current);
          autoSubmitTimerRef.current = null;
          // Auto-submit — use ref to get latest version
          submitAnswerRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (autoSubmitTimerRef.current) {
        clearInterval(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = null;
      }
    };
  }, [silenceDetected, state]);

  // FIX 1: Recording Timer (30 seconds max)
  useEffect(() => {
    if (state === STATES.RECORDING) {
      setRecordingSeconds(30);
      setIsTimeLimitAutoSubmitting(false);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => {
          if (s <= 1) {
            clearInterval(recordingTimerRef.current);
            setIsTimeLimitAutoSubmitting(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      clearInterval(timeLimitAutoSubmitTimerRef.current);
      setRecordingSeconds(30);
      setIsTimeLimitAutoSubmitting(false);
    }
    return () => {
      clearInterval(recordingTimerRef.current);
      clearInterval(timeLimitAutoSubmitTimerRef.current);
    };
  }, [state]);

  // FIX 2: Auto-submit countdown when 30s timer runs out
  useEffect(() => {
    if (isTimeLimitAutoSubmitting && state === STATES.RECORDING) {
      setAutoSubmitCount(3);
      timeLimitAutoSubmitTimerRef.current = setInterval(() => {
        setAutoSubmitCount(prev => {
          if (prev <= 1) {
            clearInterval(timeLimitAutoSubmitTimerRef.current);
            // Use ref to get latest version
            submitAnswerRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timeLimitAutoSubmitTimerRef.current);
  }, [isTimeLimitAutoSubmitting, state]);

  // ── Process transcript and decide whether to submit or show review ──
  const handleSubmitTranscript = useCallback((overrideTranscript = null) => {
    const textOverride = typeof overrideTranscript === 'string' ? overrideTranscript : null;
    const transcript = textOverride !== null ? textOverride : finalTranscriptRef.current;
    const text = transcript.trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // FIX 2: Deduplication safety net
    if (textOverride === null) {
      const words = text.split(/\s+/).filter(Boolean);
      const chunks = [];
      for (let i = 0; i < words.length; i += 20) {
        chunks.push(words.slice(i, i + 20).join(' '));
      }

      let isMalformed = false;
      let consecutiveCount = 1;
      for (let i = 1; i < chunks.length; i++) {
        if (chunks[i] === chunks[i - 1]) {
          consecutiveCount++;
        } else {
          consecutiveCount = 1;
        }
        if (consecutiveCount > 2) {
          isMalformed = true;
          break;
        }
      }

      if (isMalformed) {
        setReviewState('MALFORMED');
        setState(STATES.COUNTDOWN);
        return;
      }
    }

    // Empty / too short (< 5 words)
    if (wordCount < 5 || text.length < 5) {
      setReviewState('EMPTY');
      setState(STATES.COUNTDOWN);
      return;
    }

    // If user overrides, skip review
    if (textOverride !== null) {
      setReviewState(null);
      sendAnswer(text);
      resetTranscript();
      return;
    }

    // EC3 — Low confidence (< 0.5)
    if (confidence < 0.5) {
      setEditableTranscript(text);
      setReviewState('LOW_CONFIDENCE');
      setState(STATES.COUNTDOWN);
      return;
    }

    // EC1 — Short answer (< 10 words or < 10 chars)
    if (wordCount < 10 || text.length < 10) {
      setEditableTranscript(text);
      setReviewState('SHORT');
      setState(STATES.COUNTDOWN);
      return;
    }

    // If all good, send
    setReviewState(null);
    sendAnswer(text);
    resetTranscript();
  }, [setState, sendAnswer, resetTranscript, confidence, finalTranscriptRef]);

  // ── Submit answer (manual or auto) ──
  const submitAnswer = useCallback((overrideTranscript = null) => {
    // Clear all timers
    clearInterval(silenceCheckRef.current);
    clearInterval(autoSubmitTimerRef.current);
    clearInterval(recordingTimerRef.current);
    clearInterval(timeLimitAutoSubmitTimerRef.current);
    setSilenceDetected(false);
    setIsTimeLimitAutoSubmitting(false);

    // If override transcript provided (from review states), submit directly
    if (typeof overrideTranscript === 'string') {
      handleSubmitTranscript(overrideTranscript);
      return;
    }

    // Stop recording — onend will fire and trigger handleSubmitTranscript via callback
    stopListening(() => {
      handleSubmitTranscript();
    });
  }, [stopListening, handleSubmitTranscript]);

  // Keep the ref always pointing to the latest submitAnswer
  submitAnswerRef.current = submitAnswer;

  const currentTranscript = submittableTranscript + (liveTranscript ? ' ' + liveTranscript : '');
  const wordCount = currentTranscript.trim().split(/\s+/).filter(Boolean).length;
  const isRambling = wordCount > 500; // EC2

  // EC7: Browser not supported
  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-[Inter]">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Browser Not Supported</h2>
          <p className="text-gray-600 mb-6">Voice interviews work best on Google Chrome. Please open this page in Chrome to continue.</p>
          <a href="/" className="inline-block px-6 py-2.5 bg-[#00B050] text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors">Go Back</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-[Inter] flex flex-col">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium">
          ⚠️ You appear to be offline. Please check your internet connection.
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-semibold text-gray-800">{candidate.name}</span>
          <span className="ml-3 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
            Grade {candidate.gradeLevel}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ProgressBar exchangeCount={exchangeCount} isComplete={isComplete} />
          <div className="text-sm font-mono text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
            {formatTimer(elapsedSeconds)}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 flex flex-col relative">
        {/* EC2 — Rambling toast */}
        {isRambling && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-xs shadow-lg animate-[fadeIn_0.3s_ease-out] z-50">
            Try to keep answers concise for the best experience
          </div>
        )}

        {/* AI Message Area */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-[#00B050] rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <div className="flex-1 min-h-[40px]">
              {state === STATES.AI_THINKING && (
                <div className="flex items-center gap-1 pt-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
              {(state !== STATES.AI_THINKING && state !== STATES.COMPLETE && currentAIText) && (
                <div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {currentAIText}
                    {state === STATES.AI_SPEAKING && (
                      <span className="inline-block w-0.5 h-4 bg-[#00B050] ml-0.5 animate-pulse" />
                    )}
                  </p>
                  {/* TTS speaking indicator */}
                  {(isTTSSpeaking || waitingForTTS) && state === STATES.COUNTDOWN && (
                    <div className="flex items-center gap-2 mt-3 text-xs text-emerald-600">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      Speaking...
                    </div>
                  )}
                </div>
              )}
              {state === STATES.COMPLETE && (
                <p className="text-gray-700 leading-relaxed">{currentAIText}</p>
              )}
            </div>
          </div>
        </div>

        {/* Countdown + Recording Area */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Error State */}
          {error && (
            <div className="mb-6 w-full max-w-md p-4 bg-red-50 border border-red-200 rounded-xl text-center">
              <p className="text-red-700 text-sm mb-3">{error}</p>
              <button
                onClick={retry}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Mic Error */}
          {micError && (
            <div className="mb-6 w-full max-w-md p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-amber-700 text-sm">{micError}</p>
              <div className="mt-2 text-xs text-amber-600">
                <p>1. Click the 🔒 icon in the address bar</p>
                <p>2. Set Microphone to "Allow"</p>
                <p>3. Refresh and try again</p>
              </div>
            </div>
          )}

          {/* TTS Reading State — AI is speaking the question aloud */}
          {state === STATES.COUNTDOWN && waitingForTTS && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-[#00B050]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.586v12.828a1 1 0 01-1.707.707L5.586 15z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">AI is reading the question...</p>
              <button
                onClick={() => {
                  ttsCancel();
                  setWaitingForTTS(false);
                  startCountdown();
                }}
                className="text-xs text-gray-400 hover:text-gray-600 underline cursor-pointer"
              >
                Skip voice reading
              </button>
            </div>
          )}

          {/* Countdown State — after TTS finishes */}
          {state === STATES.COUNTDOWN && !waitingForTTS && countdownRunning && (
            <div className="flex flex-col items-center gap-4">
              <CountdownTimer count={count} />
              <p className="text-sm text-gray-500">Recording starts in {count} seconds...</p>
              <button
                onClick={skipCountdown}
                className="px-5 py-2 text-sm font-medium text-[#00B050] border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                id="start-recording-now-btn"
              >
                Start Recording Now
              </button>
            </div>
          )}

          {/* Review States (EC1, EC3, EC4) */}
          {state === STATES.COUNTDOWN && !waitingForTTS && !countdownRunning && !error && reviewState && (
            <div className="w-full max-w-md p-5 bg-white border border-gray-200 shadow-sm rounded-xl text-center">
              {reviewState === 'EMPTY' && (
                <>
                  <p className="text-amber-600 text-sm mb-4 font-medium">We didn't catch that. Please try again.</p>
                  <button onClick={() => { setReviewState(null); ttsSpokenFor.current = questionNumber - 1; startCountdown(); }} className="px-5 py-2 text-sm font-medium text-white bg-[#00B050] rounded-lg hover:bg-emerald-600">Re-record</button>
                </>
              )}
              {reviewState === 'SILENCE' && (
                <>
                  <p className="text-gray-600 text-sm mb-4 font-medium">We didn't hear anything. Take your time — click Record when you're ready.</p>
                  <button onClick={() => { setReviewState(null); handleCountdownDone(); }} className="px-5 py-2 text-sm font-medium text-white bg-[#00B050] rounded-lg hover:bg-emerald-600">Start Recording</button>
                </>
              )}
              {reviewState === 'SHORT' && (
                <>
                  <p className="text-amber-600 text-sm mb-4 font-medium">Your answer seems very short. Are you sure you want to send?</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => { setReviewState(null); submitAnswer(editableTranscript); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={isSubmitting}>Send Anyway</button>
                    <button onClick={() => { setReviewState(null); handleCountdownDone(); }} className="px-4 py-2 text-sm font-medium text-white bg-[#00B050] rounded-lg hover:bg-emerald-600" disabled={isSubmitting}>Re-record</button>
                  </div>
                </>
              )}
              {reviewState === 'LOW_CONFIDENCE' && (
                <>
                  <p className="text-amber-600 text-sm mb-3 font-medium">We had trouble understanding that clearly. Does this look right?</p>
                  <textarea value={editableTranscript} onChange={e => setEditableTranscript(e.target.value)} className="w-full p-3 text-sm border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" rows={3} />
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => { setReviewState(null); submitAnswer(editableTranscript); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={isSubmitting}>Submit</button>
                    <button onClick={() => { setReviewState(null); handleCountdownDone(); }} className="px-4 py-2 text-sm font-medium text-white bg-[#00B050] rounded-lg hover:bg-emerald-600" disabled={isSubmitting}>Re-record</button>
                  </div>
                </>
              )}
              {/* FIX 2: Malformed repeating transcription */}
              {reviewState === 'MALFORMED' && (
                <>
                  <p className="text-red-600 text-sm mb-4 font-medium">We noticed a transcription issue. Please re-record your answer.</p>
                  <button onClick={() => { setReviewState(null); ttsSpokenFor.current = questionNumber - 1; startCountdown(); }} className="px-5 py-2 text-sm font-medium text-white bg-[#00B050] rounded-lg hover:bg-emerald-600">Re-record</button>
                </>
              )}
            </div>
          )}

          {/* Fallback Try Again if stopped without review state */}
          {state === STATES.COUNTDOWN && !waitingForTTS && !countdownRunning && !error && !reviewState && (
            <div className="text-center">
              <button onClick={() => { ttsSpokenFor.current = questionNumber - 1; startCountdown(); }} className="px-5 py-2 text-sm font-medium text-white bg-[#00B050] rounded-lg hover:bg-emerald-600">Try Again</button>
            </div>
          )}

          {/* Recording State */}
          {state === STATES.RECORDING && (
            <div className="flex flex-col items-center gap-4 w-full max-w-md">
              {/* FIX 1: Time Limit Display */}
              {!silenceDetected && !isTimeLimitAutoSubmitting && (
                <div className={`text-xl font-mono font-bold ${
                  recordingSeconds <= 5 ? 'text-red-500' :
                  recordingSeconds <= 10 ? 'text-amber-500' :
                  'text-gray-700'
                }`}>
                  {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                </div>
              )}

              {/* FIX 2: Time limit auto-submit overlay */}
              {isTimeLimitAutoSubmitting && (
                <div className="w-full p-4 bg-red-50 border border-red-200 rounded-xl text-center animate-[fadeIn_0.3s_ease-out]">
                  <p className="text-red-700 text-sm font-medium mb-1">
                    Time's up.
                  </p>
                  <p className="text-red-600 text-xs mb-3">
                    Submitting in <span className="font-bold text-lg text-red-800">{autoSubmitCount}</span>...
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={submitAnswer}
                      disabled={isSubmitting}
                      className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      ✓ Submit Now
                    </button>
                  </div>
                </div>
              )}

              {/* Silence detected — auto-submit overlay */}
              {silenceDetected && !isTimeLimitAutoSubmitting && (
                <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-center animate-[fadeIn_0.3s_ease-out]">
                  <p className="text-amber-700 text-sm font-medium mb-1">
                    Done answering?
                  </p>
                  <p className="text-amber-600 text-xs mb-3">
                    Auto-submitting in <span className="font-bold text-lg text-amber-800">{autoSubmitCount}</span> seconds...
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={submitAnswer}
                      disabled={isSubmitting}
                      className="px-5 py-2 text-sm font-semibold text-white bg-[#00B050] rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
                      id="submit-answer-btn"
                    >
                      ✓ Submit Now
                    </button>
                    <button
                      onClick={() => {
                        setSilenceDetected(false);
                        setAutoSubmitCount(5);
                        lastSpeechRef.current = Date.now();
                        if (autoSubmitTimerRef.current) {
                          clearInterval(autoSubmitTimerRef.current);
                          autoSubmitTimerRef.current = null;
                        }
                      }}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Keep Recording
                    </button>
                  </div>
                </div>
              )}

              {/* Mic Button with Pulse */}
              <button
                onClick={submitAnswer}
                disabled={isSubmitting}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg cursor-pointer group transition-all disabled:opacity-50 ${
                  (silenceDetected || isTimeLimitAutoSubmitting) ? 'bg-amber-500' : 'bg-[#00B050]'
                }`}
                id="mic-button"
              >
                {!(silenceDetected || isTimeLimitAutoSubmitting) && (
                  <div className="absolute inset-0 bg-[#00B050] rounded-full animate-ping opacity-30" />
                )}
                <svg className="w-8 h-8 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                </svg>
              </button>

              <WaveformAnimation isActive={isListening && !silenceDetected} />

              {/* Live Transcript */}
              <div className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 min-h-[80px]">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {currentTranscript || (
                    <span className="text-gray-400 italic">Listening... speak clearly</span>
                  )}
                </p>
              </div>

              {/* Manual done button — always visible */}
              {!(silenceDetected || isTimeLimitAutoSubmitting) && (
                <button
                  onClick={submitAnswer}
                  disabled={isSubmitting}
                  className="px-6 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                  id="done-recording-btn"
                >
                  ✓ Done Speaking
                </button>
              )}
            </div>
          )}

          {/* Processing State */}
          {state === STATES.PROCESSING && (
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-[#00B050]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-500">Processing your answer...</p>
            </div>
          )}

          {/* AI Thinking / Speaking — mic disabled */}
          {(state === STATES.AI_THINKING || state === STATES.AI_SPEAKING) && !error && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">
                {state === STATES.AI_THINKING ? 'AI is thinking...' : 'Listen carefully...'}
              </p>
            </div>
          )}

          {/* Complete */}
          {state === STATES.COMPLETE && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-4xl">✅</div>
              <p className="text-gray-600 font-medium">Interview complete! Generating your report...</p>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="mt-auto pt-4 text-center">
          <p className="text-xs text-gray-400">
            {state === STATES.AI_THINKING && 'AI is thinking...'}
            {state === STATES.AI_SPEAKING && 'Listen carefully...'}
            {state === STATES.COUNTDOWN && waitingForTTS && '🔊 AI is reading the question aloud...'}
            {state === STATES.COUNTDOWN && !waitingForTTS && countdownRunning && `Recording starts in ${count} seconds...`}
            {state === STATES.RECORDING && !silenceDetected && 'Listening... speak clearly'}
            {state === STATES.RECORDING && silenceDetected && `Auto-submitting in ${autoSubmitCount}s...`}
            {state === STATES.PROCESSING && 'Processing your answer...'}
            {state === STATES.COMPLETE && 'Interview complete'}
          </p>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
