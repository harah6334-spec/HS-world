import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT as string) || 3000;

  app.use(cors());
  app.use(express.json());

  // Contact API Endpoint
  app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email credentials not configured');
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'singhharsh68536@gmail.com',
        subject: `New Message from ${name}`,
        text: `You have received a new contact submission:\n\nName: ${name}\nEmail: ${email}\nMessage:\n${message}`,
      };

      await transporter.sendMail(mailOptions);
      
      console.log(`Email successfully sent from ${name} (${email})`);
      res.json({ success: true, message: 'Message sent successfully! We will get back to you soon.' });
    } catch (error) {
      console.error('Nodemailer error:', error);
      res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }
  });

  // Transactions API Endpoint
  app.get('/api/transactions', (req, res) => {
    // Mock recent transactions
    const transactions = [
      { id: '1', date: '2023-11-20', amount: 500.0, description: 'Website Redesign Advance', status: 'completed' },
      { id: '2', date: '2023-11-15', amount: 200.0, description: 'Consultation Fee', status: 'completed' },
      { id: '3', date: '2023-11-10', amount: 1500.0, description: 'E-commerce App Final Payment', status: 'completed' },
      { id: '4', date: '2023-11-05', amount: 300.0, description: 'Monthly Maintenance', status: 'completed' },
    ];
    res.json(transactions);
  });

  // In-memory users array
  const users: any[] = [];

  // Helper to send email notification
  const sendEmailNotification = async (subject: string, name: string, email: string, req: express.Request) => {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email credentials not configured');
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const ipAddress = req.headers['x-forwarded-for'] || req.ip || 'Unknown';
      const userAgent = req.headers['user-agent'] || 'Unknown';

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'singhharsh68536@gmail.com',
        subject: subject,
        text: `Visitor Name: ${name}\nVisitor Email: ${email}\nTime (IST): ${loginTime}\nIP Address: ${ipAddress}\nDevice/Browser: ${userAgent}`,
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send notification email:', error);
    }
  };

  // Register API Endpoint
  app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists.' });
    }
    
    users.push({ name, email, password });
    
    // Send email notification (non-blocking)
    sendEmailNotification('🆕 New Registration - HS Studio', name, email, req);
    
    res.json({ success: true, user: { name, email } });
  });

  // Login API Endpoint
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    
    // Send email notification (non-blocking)
    sendEmailNotification('🔔 New Login Alert - HS Studio', user.name, email, req);
    
    res.json({ success: true, user: { name: user.name, email } });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
