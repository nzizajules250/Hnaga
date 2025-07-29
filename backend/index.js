// server.js
import express from 'express';
import routes from './routes.js';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './db.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:9002',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'HANGA-HUB Backend is running!',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
      console.log(`📱 Frontend should be running on http://localhost:9002`);
      console.log(`🗄️  Database connected to MongoDB`);
      console.log(`📋 Available routes:`);
      console.log(`   POST /api/register - User registration`);
      console.log(`   POST /api/login - User login`);
      console.log(`   GET  /api/dashboard - User dashboard`);
      console.log(`   GET  /api/profile - User profile`);
      console.log(`   CRUD /api/projects - Project management`);
      console.log(`   CRUD /api/tasks - Task management`);
      console.log(`   CRUD /api/groups - Group management`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();