import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome';
import CandidateForm from './pages/CandidateForm';
import MicCheck from './pages/MicCheck';
import Instructions from './pages/Instructions';
import Interview from './pages/Interview';
import ThankYou from './pages/ThankYou';
import Report from './pages/Report';
import Admin from './pages/Admin';

export default function App() {
  const [candidate, setCandidate] = useState({
    candidateId: null,
    name: '',
    email: '',
    gradeLevel: ''
  });

  const handleCandidateCreated = (data) => {
    setCandidate(data);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/apply" element={<CandidateForm onCandidateCreated={handleCandidateCreated} />} />
        <Route path="/mic-check" element={<MicCheck />} />
        <Route path="/instructions" element={<Instructions />} />
        <Route path="/interview" element={<Interview candidate={candidate} />} />
        <Route path="/thank-you" element={<ThankYou candidate={candidate} />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}
