import { useState } from 'react';

export default function TranscriptViewer({ conversation }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!conversation || conversation.length === 0) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
      >
        <span>Full Transcript</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden">
          {conversation.map((msg, i) => (
            <div
              key={i}
              className={`px-5 py-3 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
            >
              <span className={`text-xs font-bold uppercase tracking-wider ${
                msg.role === 'assistant' ? 'text-[#00B050]' : 'text-blue-600'
              }`}>
                {msg.role === 'assistant' ? 'AI' : 'Candidate'}
              </span>
              <p className="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
