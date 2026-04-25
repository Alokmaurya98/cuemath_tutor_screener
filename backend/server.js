require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const configureCors = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');

const candidatesRouter = require('./routes/candidates');
const chatRouter = require('./routes/chat');
const assessRouter = require('./routes/assess');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
configureCors(app);
app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/candidates', candidatesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/assess', assessRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
