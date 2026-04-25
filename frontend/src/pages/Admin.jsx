import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/formatDate';
import { getScoreColor } from '../utils/scoreUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Admin() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');

  useEffect(() => {
    localStorage.setItem('isAdmin', 'true');
    const fetchCandidates = async () => {
      try {
        const res = await fetch(`${API_URL}/api/candidates`);
        if (!res.ok) throw new Error('Failed to load candidates');
        const data = await res.json();
        setCandidates(data);
      } catch (err) {
        console.error('Error loading candidates:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  // Client-side filtering
  const filtered = candidates.filter((c) => {
    if (gradeFilter !== 'all' && c.gradeLevel !== gradeFilter) return false;
    if (scoreFilter !== 'all' && c.report?.overallScore !== undefined) {
      const score = c.report.overallScore;
      if (scoreFilter === '90-100' && (score < 90 || score > 100)) return false;
      if (scoreFilter === '70-89' && (score < 70 || score > 89)) return false;
      if (scoreFilter === '50-69' && (score < 50 || score > 69)) return false;
      if (scoreFilter === 'below-50' && score >= 50) return false;
    } else if (scoreFilter !== 'all' && !c.report?.overallScore) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-[Inter]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#00B050] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Tutor Screener</h1>
              <p className="text-xs text-gray-400">Admin Dashboard</p>
            </div>
          </div>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            id="grade-filter"
          >
            <option value="all">All Grades</option>
            <option value="K-2">K–2</option>
            <option value="3-5">3–5</option>
            <option value="6-8">6–8</option>
            <option value="9-10">9–10</option>
            <option value="11-12">11–12</option>
          </select>

          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            id="score-filter"
          >
            <option value="all">All Scores</option>
            <option value="90-100">90–100</option>
            <option value="70-89">70–89</option>
            <option value="50-69">50–69</option>
            <option value="below-50">Below 50</option>
          </select>

          <span className="text-sm text-gray-400 ml-auto">
            {filtered.length} candidate{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-[#00B050]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-1">No candidates yet</h2>
            <p className="text-sm text-gray-400">Candidates will appear here after completing their interview.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Candidate</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Grade</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Score</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{c.name}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        {c.gradeLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(c.startedAt)}
                    </td>
                    <td className="px-6 py-4">
                      {c.status === 'completed' && c.report?.overallScore !== undefined ? (
                        <span className={`text-sm font-semibold ${getScoreColor(c.report.overallScore)}`}>
                          {c.report.overallScore}/100
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.status === 'completed' ? (
                        <Link
                          to={`/report/${c._id}`}
                          className="text-sm text-[#00B050] hover:text-emerald-700 font-medium transition-colors"
                        >
                          View Report →
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
