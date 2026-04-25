const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate');

// POST /api/candidates — Create a new candidate
router.post('/', async (req, res, next) => {
  try {
    const { name, email, gradeLevel } = req.body;

    // Validate required fields
    if (!name || !email || !gradeLevel) {
      return res.status(400).json({
        error: 'Missing required fields: name, email, and gradeLevel are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Sanitize inputs
    const sanitizedName = String(name).trim().slice(0, 100);
    const sanitizedEmail = String(email).trim().toLowerCase().slice(0, 254);
    const sanitizedGrade = String(gradeLevel).trim();

    // Check for existing candidate with same email
    const existing = await Candidate.findOne({ email: sanitizedEmail });
    if (existing) {
      if (existing.status === 'completed') {
        return res.status(409).json({
          status: 'completed',
          message: 'already_completed'
        });
      }
      existing.conversation = [];
      existing.startedAt = new Date();
      await existing.save();

      return res.status(200).json({
        status: 'in_progress',
        message: 'existing_session',
        candidateId: existing._id
      });
    }

    const candidate = new Candidate({
      name: sanitizedName,
      email: sanitizedEmail,
      gradeLevel: sanitizedGrade,
      status: 'in_progress',
      startedAt: new Date(),
      conversation: []
    });

    const saved = await candidate.save();
    res.status(201).json({ candidateId: saved._id });
  } catch (err) {
    next(err);
  }
});

// GET /api/candidates — List all candidates
router.get('/', async (req, res, next) => {
  try {
    const candidates = await Candidate.find({})
      .select('_id name email gradeLevel status startedAt report.verdict report.overallScore')
      .sort({ startedAt: -1 })
      .lean();

    res.json(candidates);
  } catch (err) {
    next(err);
  }
});

// GET /api/candidates/:id — Get full candidate document
router.get('/:id', async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id).lean();

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json(candidate);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
