import { useState, useRef, useCallback, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Interview states
export const STATES = {
  AI_THINKING: 'AI_THINKING',
  AI_SPEAKING: 'AI_SPEAKING',
  COUNTDOWN: 'COUNTDOWN',
  RECORDING: 'RECORDING',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE'
};

export default function useInterview(candidateId, candidateName, gradeLevel) {
  const [state, setState] = useState(STATES.AI_THINKING);
  const [messages, setMessages] = useState([]);
  const [currentAIText, setCurrentAIText] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmittingState] = useState(false);
  const isSubmittingRef = useRef(false);
  
  const setIsSubmitting = useCallback((val) => {
    isSubmittingRef.current = val;
    setIsSubmittingState(val);
  }, []);

  const abortControllerRef = useRef(null);
  // EC6 — Preserve last answer so it can be resent on retry
  const lastAnswerRef = useRef(null);
  // EC6 — Auto-retry timer ref for cleanup
  const retryTimerRef = useRef(null);

  // ── Generic SSE reader — shared by startInterview and sendAnswer ──
  const readStream = useCallback(async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let interviewComplete = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token') {
              fullText += data.content;
              if (fullText.includes('[INTERVIEW_COMPLETE]')) {
                fullText = fullText.replace(/\[INTERVIEW_COMPLETE\]/g, '');
                interviewComplete = true;
              }
              setCurrentAIText(fullText);
            } else if (data.type === 'done') {
              fullText = data.content;
              setCurrentAIText(fullText);
              // Increment exchange count on every completed AI response
              setExchangeCount(prev => prev + 1);
              const closingPhrases = [
                "do you have any questions for me",
                "is there anything you'd like to ask",
                "any questions for me",
                "anything else you'd like to share"
              ];
              const lowerText = fullText.toLowerCase();
              if (closingPhrases.some(phrase => lowerText.includes(phrase))) {
                console.warn('Closing phrase detected on frontend — triggering completion fallback');
                interviewComplete = true;
              }
            } else if (data.type === 'interview_complete') {
              // Backend detected [INTERVIEW_COMPLETE] — interview is over
              interviewComplete = true;
            } else if (data.type === 'error') {
              throw new Error(data.content);
            }
          } catch (e) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
            // Skip malformed JSON lines
          }
        }
      }
    }

    return { fullText, interviewComplete };
  }, []);

  // ── Start the interview — first AI message ──
  const startInterview = useCallback(async () => {
    if (isSubmittingRef.current) return;
    
    setState(STATES.AI_THINKING);
    setError(null);
    setIsSubmitting(true);

    try {
      abortControllerRef.current = new AbortController();

      // Only send candidateId — backend fetches history from DB
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to start interview');
      }

      setState(STATES.AI_SPEAKING);
      setQuestionNumber(1);

      const { fullText, interviewComplete } = await readStream(response);

      const aiMessage = { role: 'assistant', content: fullText };
      setMessages([aiMessage]);

      if (interviewComplete) {
        setIsComplete(true);
        setState(STATES.COMPLETE);
      } else {
        setState(STATES.COUNTDOWN);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        setState(STATES.AI_THINKING);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [candidateId, readStream]);

  // ── Send candidate's answer and get next AI response ──
  const sendAnswer = useCallback(async (answerText) => {
    // EC8 — Block duplicate submissions
    if (isSubmittingRef.current) return;

    setState(STATES.PROCESSING);
    setError(null);
    setCurrentAIText('');
    setIsSubmitting(true);
    // EC6 — Save the answer in case we need to retry
    lastAnswerRef.current = answerText;

    const userMessage = { role: 'user', content: answerText };
    setMessages(prev => [...prev, userMessage]);

    try {
      abortControllerRef.current = new AbortController();

      // Only send candidateId + the new answer — backend fetches history from DB
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          newMessage: answerText
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get AI response');
      }

      setState(STATES.AI_SPEAKING);
      setQuestionNumber(prev => prev + 1);

      const { fullText, interviewComplete } = await readStream(response);

      const aiMessage = { role: 'assistant', content: fullText };
      setMessages(prev => [...prev, aiMessage]);
      // EC6 — Clear last answer on success
      lastAnswerRef.current = null;

      if (interviewComplete) {
        setIsComplete(true);
        setState(STATES.COMPLETE);
      } else {
        setState(STATES.COUNTDOWN);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        // EC6 — Auto-retry after 3 seconds on failure
        setError('Connection issue. Retrying in 3 seconds...');
        setMessages(prev => prev.slice(0, -1));

        retryTimerRef.current = setTimeout(() => {
          setError(null);
          // Retry with the saved answer
          if (lastAnswerRef.current) {
            setIsSubmitting(false);
            sendAnswer(lastAnswerRef.current);
          } else {
            setState(STATES.COUNTDOWN);
            setIsSubmitting(false);
          }
        }, 3000);
      }
    } finally {
      // Only clear submitting if not auto-retrying
      if (!retryTimerRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [candidateId, readStream, setIsSubmitting]);

  // EC6 — Manual retry with preserved last answer
  const retry = useCallback(() => {
    clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    setError(null);
    setIsSubmitting(false);

    if (messages.length === 0) {
      startInterview();
    } else if (lastAnswerRef.current) {
      // Resend the last answer that failed
      sendAnswer(lastAnswerRef.current);
    } else {
      setState(STATES.COUNTDOWN);
    }
  }, [messages, startInterview, sendAnswer, setIsSubmitting]);



  return {
    state,
    setState,
    messages,
    currentAIText,
    questionNumber,
    exchangeCount,
    error,
    isComplete,
    // EC8 — Expose isSubmitting to disable controls during API calls
    isSubmitting,
    startInterview,
    sendAnswer,
    retry
  };
}
