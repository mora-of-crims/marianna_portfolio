import express from 'express';
import { Resend } from 'resend';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
  }
}));

const resend = new Resend(process.env.RESEND_API_KEY);

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

  try {
    await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>',
      to: ownerEmail,
      subject: `[Portfolio] Сообщение от ${name}`,
      html: ownerHtml,
    });
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