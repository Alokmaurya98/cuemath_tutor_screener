import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ThankYou({ candidate }) {
  useEffect(() => {
    if (candidate.candidateId) {
      fetch(`${API_URL}/api/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.candidateId }),
      }).catch(err => console.error('Assess trigger failed', err));
    }
  }, [candidate.candidateId]);

  return (
    <div className="min-h-screen bg-gray-50 font-[Inter] flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* Checkmark Animation */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center animate-[scaleIn_0.5s_ease-out]">
            <svg className="w-10 h-10 text-[#00B050]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Interview Complete
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Thank you {candidate.name || 'Candidate'}, your Cuemath tutor screening is now complete. 
          Our team will carefully review your responses and get back to you within 2 business days. 
          We appreciate your time and interest in joining the Cuemath family.
        </p>

        <div className="flex justify-center mb-8">
          <Link
            to="/"
            className="px-6 py-3 bg-[#00B050] text-white font-semibold rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all"
          >
            Return to Home
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          Your session data has been securely saved.
        </p>
      </div>

      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
