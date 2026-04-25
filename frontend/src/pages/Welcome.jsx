import { Link } from 'react-router-dom';

export default function Welcome() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 font-[Inter]">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00B050] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-xl font-bold text-gray-800">Cuemath</span>
        </div>
        <Link
          to="/admin"
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
          id="admin-portal-btn"
        >
          Admin Portal
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-full mb-6">
          <div className="w-2 h-2 bg-[#00B050] rounded-full animate-pulse" />
          <span className="text-sm font-medium text-emerald-700">AI-Powered Screening</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
          Find Your Place as a{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00B050] to-emerald-600">
            Cuemath Tutor
          </span>
        </h1>

        <p className="mt-5 text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Complete a short 8–10 minute AI-powered screener to get started on your journey to teaching math.
        </p>

        {/* Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14">
          {[
            {
              step: '01',
              title: 'Enter your details',
              desc: 'Tell us your name, email, and preferred grade level',
              icon: '📝',
            },
            {
              step: '02',
              title: 'Complete the voice interview',
              desc: 'Answer 5-7 questions in a conversational AI interview',
              icon: '🎙️',
            },
            {
              step: '03',
              title: 'Hear back from us ',
              desc: 'Our team will review your interview and get back to you within 24-48 hours.',
              icon: '🔔',
            },
          ].map((card) => (
            <div
              key={card.step}
              className="group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="absolute top-4 right-4 text-xs font-bold text-gray-400 group-hover:text-emerald-600 transition-colors">
                STEP {card.step}
              </div>
              <div className="text-3xl mb-4">{card.icon}</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{card.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Link
          to="/apply"
          className="inline-flex items-center gap-2 mt-12 px-8 py-4 bg-[#00B050] text-white text-lg font-semibold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-300 transition-all duration-300 hover:-translate-y-0.5"
          id="get-started-btn"
        >
          Get Started
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-400 border-t border-gray-100">
        Powered by Cuemath © 2026
      </footer>
    </div>
  );
}
