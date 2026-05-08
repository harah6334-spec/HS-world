import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as admin from 'firebase-admin';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
  }
} else {
  console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Firebase Auth will fail.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000');
  const NODE_ENV = process.env.NODE_ENV || 'development';

  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for Vite development
  }));
  app.use(cors());
  app.use(express.json());

  // Contact API Endpoint
  app.post('/api/contact', async (req: Request, res: Response) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email credentials not configured in environment variables');
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Send email to admin
      const adminMailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.CONTACT_EMAIL || process.env.EMAIL_USER,
        subject: `New Contact Form Submission from ${name}`,
        text: `New contact submission:\n\nName: ${name}\nEmail: ${email}\nMessage:\n${message}`,
      };

      await transporter.sendMail(adminMailOptions);

      // Send confirmation email to user
      const userMailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'We received your message - HS Studio',
        text: `Hi ${name},\n\nThank you for contacting us. We have received your message and will get back to you soon.\n\nBest regards,\nHS Studio Team`,
      };

      await transporter.sendMail(userMailOptions);

      console.log(`Email sent from ${name} (${email})`);
      res.json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
      console.error('Nodemailer error:', error);
      res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }
  });

  // Transactions API Endpoint
  app.get('/api/transactions', (req: Request, res: Response) => {
    const transactions = [
      { id: '1', date: '2023-11-20', amount: 500.0, description: 'Website Redesign Advance', status: 'completed' },
      { id: '2', date: '2023-11-15', amount: 200.0, description: 'Consultation Fee', status: 'completed' },
      { id: '3', date: '2023-11-10', amount: 1500.0, description: 'E-commerce App Final Payment', status: 'completed' },
      { id: '4', date: '2023-11-05', amount: 300.0, description: 'Monthly Maintenance', status: 'completed' },
    ];
    res.json(transactions);
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per window
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Helper to send email notification for login/register
  const sendEmailNotification = async (subject: string, name: string, email: string, req: Request) => {
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
        to: process.env.CONTACT_EMAIL || process.env.EMAIL_USER,
        subject: subject,
        text: `Activity Alert:\n\nUser Name: ${name}\nUser Email: ${email}\nTime (IST): ${loginTime}\nIP Address: ${ipAddress}\nDevice/Browser: ${userAgent}`,
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send notification email:', error);
    }
  };

  // Register API
  app.post('/api/register', authLimiter, async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email,
        password, // Firebase also hashes passwords internally, but we store our hash in Firestore too
        displayName: name
      });

      // Store extra user metadata + our custom encrypted password in Firestore
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        name,
        email,
        password: hashedPassword,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const token = await admin.auth().createCustomToken(userRecord.uid);
      
      // Send email notification (non-blocking)
      sendEmailNotification('🆕 New Registration - HS Studio', name, email, req);

      res.json({ success: true, user: { name, email, uid: userRecord.uid }, token });
    } catch (error: any) {
      console.error('Registration Error:', error);
      res.status(400).json({ error: error.message || 'Registration failed.' });
    }
  });

  // Login API
  app.post('/api/login', authLimiter, async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
      // Get user from Firebase Auth
      const userRecord = await admin.auth().getUserByEmail(email);

      // Verify custom password hash from Firestore
      const userDoc = await admin.firestore().collection('users').doc(userRecord.uid).get();
      if (!userDoc.exists) {
        return res.status(401).json({ error: 'User data not found.' });
      }

      const userData = userDoc.data();
      const passwordMatch = await bcrypt.compare(password, userData?.password || '');
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = await admin.auth().createCustomToken(userRecord.uid);

      // Send email notification (non-blocking)
      sendEmailNotification('🔔 New Login Alert - HS Studio', userRecord.displayName || email, email, req);

      res.json({ success: true, user: { name: userRecord.displayName, email, uid: userRecord.uid }, token });
    } catch (error: any) {
      console.error('Login Error:', error);
      res.status(401).json({ error: 'Invalid email or password.' });
    }
  });

  // Vite middleware for development
  if (NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} (${NODE_ENV})`);
  });
}

startServer().catch(console.error);
