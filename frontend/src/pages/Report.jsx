import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import ScoreBar from '../components/ScoreBar';
import VerdictBadge from '../components/VerdictBadge';
import TranscriptViewer from '../components/TranscriptViewer';
import { formatDateTime } from '../utils/formatDate';
import { getScoreColor } from '../utils/scoreUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Report() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  useEffect(() => {
    if (!isAdmin) return; // Don't fetch if not admin
    const fetchCandidate = async () => {
      try {
        const res = await fetch(`${API_URL}/api/candidates/${id}`);
        if (!res.ok) throw new Error('Failed to load report');
        const data = await res.json();
        setCandidate(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidate();
  }, [id, isAdmin]);

  // Redirect AFTER all hooks have been called
  if (!isAdmin) {
    return <Navigate to="/thank-you" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 font-[Inter] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-[#00B050]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gray-50 font-[Inter] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">😔</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-500 text-sm mb-4">{error || 'This report does not exist.'}</p>
          <Link to="/" className="text-[#00B050] hover:underline text-sm font-medium">Return to Home</Link>
        </div>
      </div>
    );
  }

  const report = candidate.report;

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 font-[Inter] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Report Still Processing</h1>
          <p className="text-gray-500 text-sm mb-4">This candidate's report hasn't been generated yet.</p>
          <Link to="/" className="text-[#00B050] hover:underline text-sm font-medium">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-[Inter]">
      <div className="max-w-3xl mx-auto px-6 py-10 print:py-4 print:px-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 print:mb-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors print:hidden">
              ← Back
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#00B050] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-lg font-bold text-gray-800">Cuemath</span>
            </div>
          </div>
          <span className="text-sm text-gray-400">Tutor Screener Report</span>
        </div>

        {/* Candidate Info Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
              <p className="text-gray-500 text-sm mt-1">
                Grade {candidate.gradeLevel} · {formatDateTime(candidate.startedAt)}
              </p>
            </div>
            <VerdictBadge verdict={report.verdict} />
          </div>

          {/* Overall Score */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-600">Overall Score</span>
            <span className={`text-3xl font-bold ${getScoreColor(report.overallScore)}`}>
              {report.overallScore}<span className="text-lg text-gray-400">/100</span>
            </span>
          </div>
        </div>

        {/* Dimension Scores */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Dimension Scores</h2>
          <div className="space-y-4">
            {report.dimensions && report.dimensions.map((dim, i) => (
              <ScoreBar key={dim.name} name={dim.name} score={dim.score} delay={i * 150} />
            ))}
          </div>
        </div>

        {/* Evidence Quotes */}
        {report.dimensions && report.dimensions.some(d => d.evidence) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Evidence Quotes</h2>
            <div className="space-y-4">
              {report.dimensions.filter(d => d.evidence).map((dim) => (
                <div key={dim.name} className="border-l-3 border-emerald-400 pl-4">
                  <span className="text-sm font-semibold text-gray-700">{dim.name}</span>
                  <p className="text-sm text-gray-600 italic mt-1">"{dim.evidence}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {report.summary && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Summary</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{report.summary}</p>
          </div>
        )}

        {/* Transcript */}
        {candidate.conversation && candidate.conversation.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
            <TranscriptViewer conversation={candidate.conversation} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors cursor-pointer"
            id="download-report-btn"
          >
            📄 Download Report
          </button>
          <Link
            to="/"
            className="px-5 py-2.5 text-gray-600 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:py-4 { padding-top: 1rem; padding-bottom: 1rem; }
          .print\\:px-0 { padding-left: 0; padding-right: 0; }
          .print\\:mb-4 { margin-bottom: 1rem; }
        }
      `}</style>
    </div>
  );
}
