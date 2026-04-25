import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

export default function MicCheck() {
  const navigate = useNavigate();
  const { liveTranscript, submittableTranscript, isListening, error, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const transcript = (submittableTranscript + ' ' + liveTranscript).trim();
  const [hasTested, setHasTested] = useState(false);
  const [testPassed, setTestPassed] = useState(false);

  // Pull candidate's first name from localStorage
  const candidateFirstName = useMemo(() => {
    try {
      const data = JSON.parse(localStorage.getItem('cuemath_active_interview') || '{}');
      return data.name ? data.name.trim().split(' ')[0] : '';
    } catch {
      return '';
    }
  }, []);

  const handleTest = () => {
    resetTranscript();
    setHasTested(false);
    setTestPassed(false);
    startListening();
    // Auto-stop after 5 seconds
    setTimeout(() => {
      stopListening();
      setHasTested(true);
    }, 5000);
  };

  // Check if test passed after listening stops
  const isSuccess = hasTested && transcript.trim().length > 0;
  const isFail = hasTested && transcript.trim().length === 0;

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-50 font-[Inter] flex items-center justify-center p-6">
        <div className="max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Browser Not Supported</h1>
          <p className="text-gray-500 text-sm">
            Speech recognition is not available in your browser. Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for the best experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-[Inter] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10 text-center">
        <div className="text-5xl mb-4">🎙️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Let's test your microphone before we begin
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Click the button below and say <strong>"Hello, I am ready"</strong>
        </p>

        {/* Personalized tip */}
        <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl text-left">
          <p className="text-amber-800 text-sm leading-relaxed">
            <span className="font-semibold">{candidateFirstName ? `Hey ${candidateFirstName}` : 'Hey'} 👋</span> — before
            you begin, please find a <strong>quiet place</strong> with no background noise. The interview
            takes about <strong>8–10 minutes</strong> and needs to be completed in one go, so make sure you
            won't be interrupted. Good luck!
          </p>
        </div>

        {/* Test Button */}
        <button
          onClick={handleTest}
          disabled={isListening}
          className={`px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 cursor-pointer ${
            isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-[#00B050] text-white hover:bg-emerald-600 shadow-md shadow-emerald-200'
          }`}
          id="test-mic-btn"
        >
          {isListening ? (
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
              Listening...
            </span>
          ) : (
            '🎤 Test Microphone'
          )}
        </button>

        {/* Transcript Display */}
        {(isListening || hasTested) && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 min-h-[60px] flex items-center justify-center">
            <p className="text-gray-700 text-sm">
              {transcript || (isListening ? 'Waiting for speech...' : 'Nothing detected')}
            </p>
          </div>
        )}

        {/* Success State */}
        {isSuccess && (
          <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium text-sm">Microphone is working!</span>
          </div>
        )}

        {/* Fail State */}
        {isFail && (
          <div className="mt-4">
            <div className="flex items-center justify-center gap-2 text-red-500 mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="font-medium text-sm">Nothing detected — please check your browser mic permissions</span>
            </div>
            <div className="text-left bg-amber-50 rounded-lg p-4 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">How to enable microphone:</p>
              <p>1. Click the 🔒 lock icon in your browser's address bar</p>
              <p>2. Find "Microphone" and set it to "Allow"</p>
              <p>3. Refresh the page and try again</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={() => navigate('/interview')}
          disabled={!isSuccess}
          className={`mt-8 w-full py-3.5 rounded-xl font-semibold text-base transition-all duration-200 ${
            isSuccess
              ? 'bg-[#00B050] text-white hover:bg-emerald-600 shadow-md shadow-emerald-200 cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          id="continue-to-interview-btn"
        >
          Continue to Interview →
        </button>
      </div>
    </div>
  );
}
