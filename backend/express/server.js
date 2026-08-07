const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
    origin: '*', // Allow all origins for local development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Payload parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve django media assets statically (avatars, attachments, notes)
app.use('/media', express.static(path.join(__dirname, '..', 'django', 'media')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Express backend is running and verified' });
});

// Import Router Modules
const authRouter = require('./routes/auth');
const coursesRouter = require('./routes/courses');
const attendanceRouter = require('./routes/attendance');
const examsRouter = require('./routes/exams');
const coreRouter = require('./routes/notes_events_assignments');
const mlRouter = require('./routes/ml');

// Mount API Routes
app.use('/accounts/api', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/exams', examsRouter);
app.use('/api/ml', mlRouter);
app.use('/api', coreRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start Express server
app.listen(PORT, () => {
    console.log(`Express server listening on http://localhost:${PORT}`);
});
