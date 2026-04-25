const mongoose = require('mongoose');

const conversationMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['assistant', 'user'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const dimensionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Clarity', 'Warmth', 'Simplicity', 'Patience', 'Fluency']
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  evidence: {
    type: String,
    default: ''
  }
}, { _id: false });

const reportSchema = new mongoose.Schema({
  verdict: {
    type: String,
    enum: ['ADVANCE', 'HOLD', 'REJECT'],
    required: true
  },
  overallScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  dimensions: [dimensionSchema],
  summary: {
    type: String,
    default: ''
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
  },
  gradeLevel: {
    type: String,
    required: [true, 'Grade level is required'],
    enum: {
      values: ['K-2', '3-5', '6-8', '9-10', '11-12'],
      message: '{VALUE} is not a valid grade level'
    }
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed'],
    default: 'in_progress'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  conversation: [conversationMessageSchema],
  report: reportSchema
}, {
  timestamps: false,
  versionKey: false
});

// Index for common queries
candidateSchema.index({ startedAt: -1 });
candidateSchema.index({ status: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
