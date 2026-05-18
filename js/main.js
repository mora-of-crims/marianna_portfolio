import express from 'express';
import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ============================================
   EMAIL TRANSPORTER
   ============================================ */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* ============================================
   VALIDATION HELPERS
   ============================================ */
function validateContact(body) {
  const { name, phone, email, message } = body;
  if (!name || name.trim().length < 2) return 'Имя слишком короткое';
  const phoneRe = /^[\+]?[\d\s\-\(\)]{7,18}$/;
  if (!phone || !phoneRe.test(phone.trim())) return 'Некорректный номер телефона';
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRe.test(email.trim())) return 'Некорректный email';
  return null;
}

/* ============================================
   ROUTE: POST /api/contact
   ============================================ */
app.post('/api/contact', async (req, res) => {
  const { name, phone, email, message } = req.body;

  const validationError = validateContact(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const ownerEmail = process.env.OWNER_EMAIL || 'moraofcrims@gmail.com';
  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' });

  const ownerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #080C14; color: #F0F4FF; padding: 32px; border-radius: 12px;">
      <h2 style="color: #E63946; margin: 0 0 24px; font-size: 22px;">📨 Новое сообщение с сайта</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 10px 0; color: #8898B4; width: 100px;">Имя</td><td style="padding: 10px 0; font-weight: bold;">${name}</td></tr>
        <tr><td style="padding: 10px 0; color: #8898B4;">Телефон</td><td style="padding: 10px 0;"><a href="tel:${phone}" style="color: #60A5FA;">${phone}</a></td></tr>
        <tr><td style="padding: 10px 0; color: #8898B4;">Email</td><td style="padding: 10px 0;"><a href="mailto:${email}" style="color: #60A5FA;">${email}</a></td></tr>
        <tr><td style="padding: 10px 0; color: #8898B4; vertical-align: top;">Сообщение</td><td style="padding: 10px 0;">${message || '<em style="color:#4A5878">не указано</em>'}</td></tr>
        <tr><td style="padding: 10px 0; color: #8898B4;">Время</td><td style="padding: 10px 0; color: #4A5878;">${now}</td></tr>
      </table>
    </div>
  `;

  const userHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #080C14; color: #F0F4FF; padding: 32px; border-radius: 12px;">
      <h2 style="color: #2563EB; margin: 0 0 8px;">Спасибо, ${name}!</h2>
      <p style="color: #8898B4; margin: 0 0 24px;">Ваше сообщение получено. Отвечу в ближайшее время.</p>
      <div style="background: #0F1928; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #4A5878; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.1em;">Ваше сообщение:</p>
        <p style="color: #F0F4FF; margin: 0;">${message || '(без комментария)'}</p>
      </div>
      <p style="color: #4A5878; font-size: 13px; margin: 0;">— Марианна Зуева<br/>
        <a href="mailto:moraofcrims@gmail.com" style="color: #60A5FA;">moraofcrims@gmail.com</a> ·
        <a href="https://t.me/TEXHOSTAR" style="color: #60A5FA;">@TEXHOSTAR</a>
      </p>
    </div>
  `;

  try {
    await Promise.all([
      transporter.sendMail({
        from: `"Portfolio Contact" <${process.env.SMTP_USER}>`,
        to: ownerEmail,
        subject: `[Portfolio] Новое сообщение от ${name}`,
        html: ownerHtml,
      }),
      transporter.sendMail({
        from: `"Марианна Зуева" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Ваше сообщение получено',
        html: userHtml,
      }),
    ]);

    return res.json({ success: true, message: 'Сообщение отправлено' });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ success: false, message: 'Ошибка отправки письма. Попробуйте позже.' });
  }
});

/* ============================================
   ROUTE: POST /api/ai-chat
   ============================================ */
app.post('/api/ai-chat', async (req, res) => {
  const { question } = req.body;

  if (!question || question.trim().length < 2) {
    return res.status(400).json({ success: false, answer: 'Задайте вопрос.' });
  }

  if (question.trim().length > 500) {
    return res.status(400).json({ success: false, answer: 'Вопрос слишком длинный.' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: ABOUT_ME,
    });

    const result = await model.generateContent(question.trim());
    const answer = result.response.text();

    return res.json({ success: true, answer });
  } catch (err) {
    console.error('AI error:', err);
    return res.status(500).json({ success: false, answer: 'AI временно недоступен. Напишите мне напрямую.' });
  }
});

/* ============================================
   HEALTH CHECK
   ============================================ */
app.get('/api/health', (_, res) => res.json({ ok: true }));

/* ============================================
   SPA FALLBACK
   ============================================ */
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
