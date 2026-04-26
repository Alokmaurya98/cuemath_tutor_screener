import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Instructions() {
  const navigate = useNavigate();

  const candidateFirstName = useMemo(() => {
    try {
      const data = JSON.parse(localStorage.getItem('cuemath_active_interview') || '{}');
      return data.name ? data.name.trim().split(' ')[0] : '';
    } catch {
      return '';
    }
  }, []);

  const tips = [
    { icon: '🎙️', text: 'The AI interviewer will ask you questions one at a time. Listen carefully, then speak your answer clearly.' },
    { icon: '⏱️', text: 'You have 30 seconds to answer each question. A timer will be visible so you can pace yourself.' },
    { icon: '🔇', text: 'Make sure you are in a quiet environment with no background noise for the best experience.' },
    { icon: '🚫', text: 'Do not refresh or close the browser tab during the interview — it cannot be restarted.' },
    { icon: '📝', text: 'The entire interview takes about 8–10 minutes. Your responses will be transcribed and evaluated automatically.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-[Inter] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {candidateFirstName ? `You're almost there, ${candidateFirstName}!` : "You're almost there!"}
          </h1>
          <p className="text-gray-500 text-sm">
            Here's how the interview works
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xl shrink-0 mt-0.5">{tip.icon}</span>
              <p className="text-gray-700 text-sm leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/interview')}
          className="w-full py-3.5 rounded-xl font-semibold text-base bg-[#00B050] text-white hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all duration-200 cursor-pointer"
          id="start-interview-btn"
        >
          Start Interview →
        </button>
      </div>
    </div>
  );
}
