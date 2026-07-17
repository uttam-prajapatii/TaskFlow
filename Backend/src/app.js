import express from 'express';
import cors from 'cors';

const app = express();

// Enable CORS and JSON parsing middlewares
app.use(cors());
app.use(express.json());

// Minimal check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'TaskFlow API is running...' });
});

export default app;
