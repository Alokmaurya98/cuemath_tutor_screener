import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GradePicker from '../components/GradePicker';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameRegex = /^[a-zA-Z\s'-]+$/;

export default function CandidateForm({ onCandidateCreated }) {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');

  // Field-level touched state — validation only fires after blur
  const [touched, setTouched] = useState({ name: false, email: false });

  // Field-level errors
  const [errors, setErrors] = useState({});

  // Positive feedback messages shown after valid blur
  const [successMessages, setSuccessMessages] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingStatus, setExistingStatus] = useState(null);
  const [existingCandidateId, setExistingCandidateId] = useState(null);

  // --- Validation helpers ---

  const validateName = (value) => {
    if (!value.trim()) return 'Please enter your full name';
    if (value.trim().length < 2) return 'Name must be at least 2 characters';
    if (!nameRegex.test(value.trim())) return 'Please enter a valid name (letters only)';
    return null;
  };

  const validateEmail = (value) => {
    if (!value.trim()) return 'Email address is required';
    if (!emailRegex.test(value.trim())) return 'Please enter a valid email address (e.g. priya@example.com)';
    return null;
  };

  // --- Blur handlers ---

  const handleNameBlur = () => {
    setTouched((prev) => ({ ...prev, name: true }));
    const error = validateName(name);
    setErrors((prev) => ({ ...prev, name: error }));
    if (!error && name.trim()) {
      setSuccessMessages((prev) => ({
        ...prev,
        name: `Great, nice to meet you ${name.trim().split(' ')[0]}!`,
      }));
    } else {
      setSuccessMessages((prev) => ({ ...prev, name: null }));
    }
  };

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const error = validateEmail(email);
    setErrors((prev) => ({ ...prev, email: error }));
    if (!error) {
      setSuccessMessages((prev) => ({
        ...prev,
        email: "Perfect, we'll send updates to this address",
      }));
    } else {
      setSuccessMessages((prev) => ({ ...prev, email: null }));
    }
  };

  const handleGradeChange = (value) => {
    setGradeLevel(value);
    setErrors((prev) => ({ ...prev, gradeLevel: null }));
  };

  // --- Form-level validity ---

  const isFormValid =
    name.trim() &&
    email.trim() &&
    emailRegex.test(email) &&
    gradeLevel &&
    !validateName(name) &&
    !validateEmail(email);

  const getButtonLabel = () => {
    if (isSubmitting) return null;
    if (!name.trim() && !email.trim() && !gradeLevel) return 'Fill in your details to continue';
    if (name.trim() && (!email.trim() || !gradeLevel)) return 'Almost there — a few more details';
    if (isFormValid) return 'Start Your Interview →';
    return 'Almost there — a few more details';
  };

  // --- Full submit validation (safety net) ---

  const validateAll = () => {
    const newErrors = {};
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    if (nameError) newErrors.name = nameError;
    if (emailError) newErrors.email = emailError;
    if (!gradeLevel) newErrors.gradeLevel = 'Please select a grade level';
    setErrors(newErrors);
    setTouched({ name: true, email: true });
    return Object.keys(newErrors).length === 0;
  };

  // --- Submit ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), gradeLevel }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // FIX 5: Handle Case 2 — already completed
        if (res.status === 409 && data.status === 'completed' && data.message === 'already_completed') {
          setExistingStatus('completed');
          setIsSubmitting(false);
          return;
        }
        throw new Error(data.error || 'Failed to create candidate');
      }

      const data = await res.json();

      // FIX 5: Handle Case 1 — in progress session exists
      if (data.status === 'in_progress' && data.message === 'existing_session') {
        setExistingStatus('in_progress');
        setExistingCandidateId(data.candidateId);
        setIsSubmitting(false);
        return;
      }

      const { candidateId } = data;
      const candidateData = {
        candidateId,
        name: name.trim(),
        email: email.trim(),
        gradeLevel,
      };
      localStorage.setItem('cuemath_active_interview', JSON.stringify(candidateData));
      onCandidateCreated(candidateData);
      navigate('/mic-check');
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // FIX 5: Restart existing in-progress session
  const handleRestartInterview = () => {
    const candidateData = {
      candidateId: existingCandidateId,
      name: name.trim(),
      email: email.trim(),
      gradeLevel,
    };
    localStorage.setItem('cuemath_active_interview', JSON.stringify(candidateData));
    onCandidateCreated(candidateData);
    navigate('/mic-check');
  };

  const cancelExisting = () => {
    setExistingStatus(null);
    setExistingCandidateId(null);
  };

  // --- Shared input class builder ---

  const inputClass = (field) => {
    const base =
      'w-full px-4 py-3 pr-10 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-800 placeholder:text-gray-400';
    if (touched[field] && errors[field]) return `${base} border-red-400 bg-red-50`;
    if (touched[field] && !errors[field] && (field === 'name' ? name : email))
      return `${base} border-emerald-400`;
    return `${base} border-gray-200`;
  };

  // --- Existing session screens ---

  if (existingStatus === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 font-[Inter] flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Already Completed</h2>
          <p className="text-gray-500 mb-8 leading-relaxed text-sm">
            It looks like <span className="font-medium text-gray-700">{name.trim()}</span> has already
            completed their Cuemath tutor screening using this email. Each candidate can only appear
            for the screening once. If you believe this is a mistake, please reach out to our team.
          </p>
          <button
            onClick={cancelExisting}
            className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  if (existingStatus === 'in_progress') {
    return (
      <div className="min-h-screen bg-gray-50 font-[Inter] flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-amber-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Resume Interview</h2>
          <p className="text-gray-500 mb-8 leading-relaxed text-sm">
            Welcome back <span className="font-medium text-gray-700">{name.trim()}</span>. It looks
            like you have an interview session already in progress. Would you like to restart your
            interview from the beginning?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRestartInterview}
              className="px-6 py-3 bg-[#00B050] text-white font-semibold rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all text-sm"
            >
              Yes, Restart Interview
            </button>
            <button
              onClick={cancelExisting}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main form ---

  return (
    <div className="min-h-screen bg-gray-50 font-[Inter] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </a>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Tell us about yourself</h1>
            <p className="text-gray-400 mt-2 text-sm">
              We need a few details before your interview begins
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    // Clear success message while retyping
                    if (touched.name) {
                      const error = validateName(e.target.value);
                      setErrors((prev) => ({ ...prev, name: error }));
                      setSuccessMessages((prev) => ({ ...prev, name: null }));
                    }
                  }}
                  onBlur={handleNameBlur}
                  placeholder="e.g. Priya Sharma"
                  className={inputClass('name')}
                />
                {/* Checkmark / cross icon */}
                {touched.name && name.trim() && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {!errors.name ? (
                      <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
              {/* Helper / error / success text */}
              {!touched.name && (
                <p className="text-gray-400 text-xs mt-1">Enter your name as you'd like to be addressed</p>
              )}
              {touched.name && errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
              {touched.name && !errors.name && successMessages.name && (
                <p className="text-emerald-600 text-xs mt-1">{successMessages.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) {
                      const error = validateEmail(e.target.value);
                      setErrors((prev) => ({ ...prev, email: error }));
                      setSuccessMessages((prev) => ({ ...prev, email: null }));
                    }
                  }}
                  onBlur={handleEmailBlur}
                  placeholder="e.g. priya@example.com"
                  className={inputClass('email')}
                />
                {touched.email && email.trim() && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {!errors.email ? (
                      <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
              {!touched.email && (
                <p className="text-gray-400 text-xs mt-1">We'll never share your email with anyone</p>
              )}
              {touched.email && errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
              {touched.email && !errors.email && successMessages.email && (
                <p className="text-emerald-600 text-xs mt-1">{successMessages.email}</p>
              )}
            </div>

            {/* Grade Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Grade Level You Want to Teach
              </label>
              <p className="text-gray-400 text-xs mb-3">
                Select the grade group you feel most confident teaching
              </p>
              <GradePicker selected={gradeLevel} onChange={handleGradeChange} />
              {errors.gradeLevel && (
                <p className="text-red-500 text-xs mt-2">{errors.gradeLevel}</p>
              )}
              {gradeLevel && (
                <p className="text-emerald-600 text-xs mt-2">
                  Great choice — {gradeLevel} grade students love Cuemath!
                </p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {errors.submit}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-3.5 rounded-xl text-white font-semibold text-base transition-all duration-200 ${isFormValid && !isSubmitting
                ? 'bg-[#00B050] hover:bg-emerald-600 shadow-md shadow-emerald-200 cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed'
                }`}
              id="start-interview-btn"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating your session...
                </span>
              ) : (
                getButtonLabel()
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}