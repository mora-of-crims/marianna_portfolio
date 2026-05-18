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

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ABOUT_ME = `
Ты AI-ассистент Марианны Зуевой — разработчика.
Имя: Зуева Марианна Сергеевна
Контакты: email moraofcrims@gmail.com, telegram @TEXHOSTAR, телефон +7 777 211 8701
Стек: Python, Node.js, JavaScript, HTML/CSS/SCSS, SQL/MySQL, n8n, REST API, Webhooks.
AI и боты: чат-боты, голосовые боты, LLM/AI-агенты, OpenAI API, Claude API.
Коммуникации: IP-телефония, омниканальность, SMS, мессенджеры.
Кейсы: AI-чат-бот для клиентского сервиса, автоматизация в n8n, голосовой бот, REST API + Frontend.
Подход: сначала бизнес-задача, потом код. AI как ассистент. Всегда обработка ошибок.
Отвечай кратко (2-4 предложения), по делу, на русском языке. Будь дружелюбным.
`;

function validateContact(body) {
  const { name, phone, email } = body;
  if (!name || name.trim().length < 2) return 'Имя слишком короткое';
  const phoneRe = /^[\+]?[\d\s\-\(\)]{7,18}$/;
  if (!phone || !phoneRe.test(phone.trim())) return 'Некорректный номер телефона';
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRe.test(email.trim())) return 'Некорректный email';
  return null;
}

app.post('/api/contact', async (req, res) => {
  const { name, phone, email, message } = req.body;
  const validationError = validateContact(req.body);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const ownerEmail = process.env.OWNER_EMAIL || 'moraofcrims@gmail.com';
  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' });

  const ownerHtml = `<div style="font-family:Arial,sans-serif;background:#080C14;color:#F0F4FF;padding:32px;border-radius:12px"><h2 style="color:#E63946">📨 Новое сообщение с сайта</h2><p><b>Имя:</b> ${name}</p><p><b>Телефон:</b> ${phone}</p><p><b>Email:</b> ${email}</p><p><b>Сообщение:</b> ${message || 'не указано'}</p><p style="color:#4A5878">${now}</p></div>`;
  const userHtml = `<div style="font-family:Arial,sans-serif;background:#080C14;color:#F0F4FF;padding:32px;border-radius:12px"><h2 style="color:#2563EB">Спасибо, ${name}!</h2><p style="color:#8898B4">Ваше сообщение получено. Отвечу в ближайшее время.</p><p style="color:#4A5878">— Марианна Зуева · moraofcrims@gmail.com · @TEXHOSTAR</p></div>`;

  try {
    await Promise.all([
      transporter.sendMail({ from: `"Portfolio" <${process.env.SMTP_USER}>`, to: ownerEmail, subject: `[Portfolio] Сообщение от ${name}`, html: ownerHtml }),
      transporter.sendMail({ from: `"Марианна Зуева" <${process.env.SMTP_USER}>`, to: email, subject: 'Ваше сообщение получено', html: userHtml }),
    ]);
    return res.json({ success: true, message: 'Сообщение отправлено' });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ success: false, message: 'Ошибка отправки письма.' });
  }
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));