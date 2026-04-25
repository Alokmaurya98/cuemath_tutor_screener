const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk').default;
const Candidate = require('../models/Candidate');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const ASSESSMENT_SYSTEM_PROMPT = `You are a senior hiring evaluator at Cuemath. Below is the full transcript of a tutor screener interview. Evaluate the candidate objectively and fairly across exactly 5 dimensions.

The 5 dimensions are:
1. Clarity — Are their explanations clear and well-structured?
2. Warmth — Do they show genuine empathy and child-friendliness?
3. Simplicity — Can they break complex concepts into digestible steps?
4. Patience — How do they handle a struggling or frustrated student?
5. Fluency — Is their English confident and comfortable?

You MUST return ONLY a raw valid JSON object. No markdown, no explanation, no text before or after. Use this exact structure:

{
  "verdict": "ADVANCE" or "HOLD" or "REJECT",
  "overallScore": [number 1.0–5.0, one decimal],
  "dimensions": [
    { "name": "Clarity",    "score": [1–5], "evidence": "[exact quote from transcript]" },
    { "name": "Warmth",     "score": [1–5], "evidence": "[exact quote from transcript]" },
    { "name": "Simplicity", "score": [1–5], "evidence": "[exact quote from transcript]" },
    { "name": "Patience",   "score": [1–5], "evidence": "[exact quote from transcript]" },
    { "name": "Fluency",    "score": [1–5], "evidence": "[exact quote from transcript]" }
  ],
  "summary": "[3 sentences. Be specific. Reference actual things the candidate said. Write for a hiring manager who has not read the transcript.]"
}

Scoring rubric:
5 = Exceptional — strong hire, no hesitation
4 = Good — recommend to advance
3 = Average — borderline, further review needed
2 = Below expectations — significant gaps
1 = Poor — not suitable for this role

Verdict logic:
- ADVANCE if overallScore >= 3.8
- HOLD if overallScore >= 2.5 and < 3.8
- REJECT if overallScore < 2.5

Evidence quotes must be verbatim from the transcript. If a candidate did not demonstrate a dimension at all, note that in the evidence field.`;

// POST /api/assess — Generate assessment report
router.post('/', async (req, res, next) => {
  try {
    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({ error: 'candidateId is required' });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Build transcript string from conversation
    const transcript = candidate.conversation
      .map(msg => {
        const label = msg.role === 'assistant' ? 'Interviewer' : 'Candidate';
        return `${label}: ${msg.content}`;
      })
      .join('\n\n');

    if (!transcript || transcript.length < 50) {
      return res.status(400).json({ error: 'Insufficient conversation data for assessment' });
    }

    // Call Claude for assessment
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: ASSESSMENT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is the full interview transcript:\n\n${transcript}`
        }
      ]
    });

    const rawText = response.content[0].text;

    // Strip markdown code fences if present
    let jsonText = rawText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('Failed to parse assessment JSON:', jsonText);
      return res.status(500).json({
        error: 'Report generation failed — could not parse AI response',
        raw: jsonText
      });
    }

    // Convert 5-point scores to 100-point scale
    const overallScore = Math.round(parsed.overallScore * 20);
    const dimensions = parsed.dimensions.map(d => ({
      name: d.name,
      score: Math.round(d.score * 20),
      evidence: d.evidence || ''
    }));

    // Save report to candidate
    candidate.report = {
      verdict: parsed.verdict,
      overallScore,
      dimensions,
      summary: parsed.summary,
      generatedAt: new Date()
    };
    candidate.status = 'completed';
    candidate.completedAt = new Date();
    await candidate.save();

    res.json(candidate.report);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
