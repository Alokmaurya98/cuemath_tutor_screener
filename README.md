# Cuemath Tutor Screener

An AI-powered voice-based interview tool that automates the first-round screening of Cuemath tutor candidates. Candidates complete a short 8–10 minute voice interview, and HR receives a structured assessment report scored across five dimensions.

**Live URL:** 

---

## What I Built

The Cuemath Tutor Screener is a full-stack web application that replaces the manual 10-minute phone screening call with an intelligent, voice-driven AI interview. A candidate lands on the welcome page, enters their name, email, and the grade level they want to teach, completes a voice interview with an AI interviewer, and then sees a warm thank-you screen. The HR team can then open the admin dashboard to review every candidate's full report — including dimension scores, evidence quotes pulled directly from the conversation, and the complete transcript.

The product is built to solve a real, expensive problem Cuemath faces: screening hundreds of tutors every month is slow and hard to scale. This tool handles the entire first round without any human involvement.

---

## Which Problem I Picked

**Problem 3 — The AI Tutor Screener**

I chose this problem because it solves a live operational pain point for Cuemath specifically, not a generic ed-tech problem. The flashcard engine and social media studio are excellent products but they exist in crowded spaces. A tutor screener tailored to Cuemath's exact grade levels, soft-skill dimensions, and hiring culture is something only someone who read the brief carefully could build. That felt like the right place to focus.

---

## Key Decisions and Tradeoffs

**1. Grade-level adaptive questioning**

The interview questions and example concepts change based on the grade level the candidate selects. A candidate applying for K–2 is asked about teaching shapes and counting. A candidate applying for 11–12 is asked about calculus and statistics. This required careful prompt engineering to make the AI adapt naturally without making the transition feel mechanical.

The tradeoff: more complex prompt logic means more things that can go wrong. I tested each grade level separately to make sure the AI stayed in character and asked relevant questions.

**2. Web Speech API over Whisper**

I used the browser's built-in Web Speech API for voice transcription instead of OpenAI's Whisper. The tradeoff is accuracy — Whisper is significantly more precise, especially for non-native English speakers. However, Web Speech API is free, has zero latency overhead, and works without any additional API calls. For a screening tool where fluency is being evaluated (not transcription accuracy), real-time feedback felt more important than perfect accuracy. If I were building this for production, Whisper would be the right call.

**3. No score shown to the candidate**

I deliberately chose not to show candidates their assessment score or verdict after the interview. A raw AI-generated verdict like "61/100 — HOLD" shown immediately after a 10-minute interview — without any human context or explanation — could feel demoralizing and unfair. The challenge document itself says this might be someone's first interaction with Cuemath. Showing a cold rejection from an algorithm is not a welcoming first impression.

Instead, candidates see a warm thank-you screen acknowledging their effort. The full report — scores, evidence quotes, transcript — lives in the admin dashboard for HR review only. This way a human can always contextualize the result before it reaches the candidate.

**4. Node.js backend to protect the API key**

The Claude API key never touches the frontend. All AI calls go through a Node.js/Express backend where the key lives as an environment variable. This is non-negotiable from a security standpoint — exposing an API key in the browser would allow anyone to drain the account. The frontend only ever talks to my own backend, never to Anthropic directly.

**5. AI follows up on vague answers**

The system prompt instructs Claude to probe short or vague answers before moving to the next question. If a candidate says "I would just explain it again," the AI responds with something like "Could you walk me through exactly how you'd explain it differently?" This is what separates the product from a static Q&A form. The intelligence is in the conversation, not just the questions.

**6. Blocking duplicate email submissions**

If a candidate tries to submit with an email that already has a completed interview in the database, they are blocked with a friendly message. This prevents candidates from repeatedly retaking the screener until they get a better score — which would make the assessment meaningless. If their previous attempt has an "in progress" status (browser crash, mic failure), they are allowed to restart cleanly.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Fast development, clean components, utility-first styling |
| Backend | Node.js + Express | Lightweight, easy to deploy, keeps API key off the browser |
| Database | MongoDB Atlas | Flexible schema for storing conversation arrays and nested reports |
| Voice input | Web Speech API | Free, browser-native, real-time interim transcription |
| AI engine | Claude API (claude-sonnet-4-20250514) | Best-in-class instruction following for structured assessment output |
| Frontend deploy | Vercel | Free tier, automatic GitHub deploys |
| Backend deploy | Render | Free tier, supports Node.js with environment variables |

---

## How It Works — Full Flow

1. **Welcome page** — Candidate lands on a warm, professional homepage explaining the process in three steps. An Admin Portal button is visible in the top-right corner for HR access.

2. **Candidate form** — Candidate enters their name, email, and selects their target grade level from five clickable cards (K–2, 3–5, 6–8, 9–10, 11–12). The start button stays disabled until all fields are filled.

3. **Mic check** — Before the interview begins, the candidate tests their microphone. They say a test phrase and see it transcribed. This prevents the worst-case scenario of a candidate completing the full interview with a broken mic.

4. **Interview** — The AI greets the candidate by name and conducts a 4–5 question voice interview. Questions adapt to the selected grade level. After each AI question, a 5-second countdown starts before recording begins automatically — the candidate can also click "Start Recording Now" to begin immediately. The AI follows up on vague or short answers before moving on.

5. **Thank you** — A warm confirmation screen tells the candidate their responses have been submitted and the team will follow up. No scores or verdicts are shown.

6. **Admin dashboard** — HR opens /admin to see all candidates in a table with name, grade, date, score, and verdict. Scores are color-coded (green ≥80, amber 60–79, red <60). Each row has a "View Report" button.

7. **Individual report** — The full report shows: overall score out of 100, verdict badge, animated dimension score bars for all five dimensions (Clarity, Warmth, Simplicity, Patience, Fluency), evidence quotes from the conversation for each dimension, and the full transcript in a collapsible section. A Download Report button triggers print-to-PDF.

---

## Assessment Dimensions

The AI evaluates candidates across exactly five dimensions, each scored 1–5 and converted to a 100-point scale:

| Dimension | What is evaluated |
|---|---|
| Clarity | Are their explanations clear and well-structured? |
| Warmth | Do they show empathy and child-friendliness? |
| Simplicity | Can they break complex topics into simple steps? |
| Patience | How do they handle a struggling or frustrated student? |
| Fluency | Is their English confident and comfortable? |

The overall verdict is determined by the average score: 3.8+ is ADVANCE, 2.5–3.8 is HOLD, below 2.5 is REJECT.

---

## Challenges I Hit and How I Solved Them

**1. Web Speech API cross-browser inconsistency**

The Web Speech API behaves differently across browsers — interim results (live transcription while speaking) work well in Chrome but are unreliable in Safari and Firefox. I solved this by adding a browser detection check at the mic check stage that warns users to use Chrome for the best experience. I also added a fallback that treats the final transcript result as the submission if interim results fail to appear.

**2. Handling duplicate emails while allowing restarts after interruptions**

One of the trickier logic problems was deciding what to do when the same email is submitted more than once. Blocking all duplicates outright would lock out a candidate who had a genuine technical failure — mic stopped working, browser crashed, internet dropped mid-interview. That would be unfair. But allowing unlimited retakes would let candidates game the system by repeatedly attempting until they get a better score.

The solution was to check the candidate's status in MongoDB at the point of form submission. If their status is `completed`, they are blocked with a friendly message explaining they have already finished the screener. If their status is `in_progress` — meaning the interview was never completed — their old record is deleted and a fresh one is created, letting them start over cleanly. This way genuine interruptions are handled gracefully while the integrity of completed assessments is protected.

**3. Two-way voice pipeline — text to speech and speech to text**

Making the interview feel like a real conversation required solving both directions of the voice pipeline simultaneously. For speech to text, the Web Speech API handles live transcription of the candidate's answers during recording. For text to speech, the browser's built-in SpeechSynthesis API reads the AI's questions aloud so candidates hear the question instead of just reading it on screen.

The challenge was synchronizing the two — the recording should not start while the AI is still speaking, and the AI should not respond while the candidate is still talking. Getting the state transitions right so these two systems never overlapped required careful sequencing: SpeechSynthesis fires first, a completion event triggers the countdown, the countdown ends and recording begins, recording stops and the transcript is sent to the backend, and only then does the next AI response come back and trigger SpeechSynthesis again.

---

## What I Would Improve With More Time

**Email notifications to candidates**

After the interview is submitted, candidates should receive an automated confirmation email acknowledging their application. After HR reviews the report, a second email should go out with the outcome. This closes the loop for the candidate and makes the product feel complete. I would use Resend or Nodemailer for this.

**Proper authentication for the admin dashboard**

Currently the admin dashboard is open to anyone with the URL. In a real deployment this needs at minimum a simple password gate, and ideally a proper auth system with HR team accounts so individual reviewers can leave notes on candidates. I would use Clerk or Auth0 for this.

**More questions per grade level**

The current question bank is relatively small. With more time I would build a larger, curated question set per grade level and have Claude select questions dynamically based on the conversation so no two interviews feel identical. I would also add scenario-based questions specific to Cuemath's teaching methodology.

**Better UI and animations**

The waveform animation and score bars work but are relatively simple. With more time I would use Framer Motion for smoother transitions between interview states, a more polished recording indicator, and a better mobile experience — the current layout is functional on mobile but not optimized for it.

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier)
- Anthropic API key ($5 prepaid credit at console.anthropic.com)
- Git

### Environment Variables

**Backend (`/backend/.env`):**
```
CLAUDE_API_KEY=your_anthropic_api_key
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=5000
FRONTEND_URL=http://localhost:5173
```

**Frontend (`/frontend/.env`):**
```
VITE_API_URL=http://localhost:5000
```

### Running Locally

```bash
# Clone the repo
git clone https://github.com/yourusername/cuemath-tutor-screener
cd cuemath-tutor-screener

# Install and run backend
cd backend
npm install
npm run dev

# Install and run frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in Chrome.

### Deployment

**Backend → Render:**
1. Connect your GitHub repo to Render
2. Set build command: `npm install`
3. Set start command: `node server.js`
4. Add environment variables: `CLAUDE_API_KEY`, `MONGODB_URI`, `PORT`, `FRONTEND_URL`

**Frontend → Vercel:**
1. Connect your GitHub repo to Vercel
2. Set framework preset to Vite
3. Add environment variable: `VITE_API_URL` = your Render backend URL

**MongoDB Atlas:**
1. Create a free M0 cluster
2. Add a database user with readWrite access
3. Whitelist all IPs (0.0.0.0/0) for Render compatibility
4. Copy the connection string to Render's `MONGODB_URI` environment variable

> **Note:** Render's free tier spins down after 15 minutes of inactivity. The first request after a cold start may take 30–60 seconds. This is a known Render limitation on the free tier and does not affect functionality.

---

## Security Notes

- The Claude API key and MongoDB URI are stored exclusively as server-side environment variables
- The frontend never calls the Anthropic API directly — all AI calls are proxied through the Express backend
- Neither key appears in the GitHub repository or in any browser-visible network request
- CORS is configured to allow only the Vercel frontend domain in production

---

## Repo Structure

```
cuemath-tutor-screener/
  /frontend
    /src
      /components    — reusable UI components
      /pages         — one file per screen
      /hooks         — useSpeechRecognition, useInterview, useCountdown
      /utils         — score conversion, date formatting
  /backend
    /routes          — candidates.js, chat.js, assess.js
    /models          — Candidate.js (Mongoose schema)
    server.js
```