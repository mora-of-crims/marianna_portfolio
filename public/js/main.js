/* ============================================
   CURSOR
   ============================================ */
const cursor = document.getElementById('cursor');
const follower = document.getElementById('cursorFollower');

let mouseX = 0, mouseY = 0;
let followerX = 0, followerY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursor.style.left = mouseX + 'px';
  cursor.style.top = mouseY + 'px';
});

function animateFollower() {
  followerX += (mouseX - followerX) * 0.12;
  followerY += (mouseY - followerY) * 0.12;
  follower.style.left = followerX + 'px';
  follower.style.top = followerY + 'px';
  requestAnimationFrame(animateFollower);
}
animateFollower();

/* ============================================
   NAV SCROLL
   ============================================ */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

/* ============================================
   BURGER MENU
   ============================================ */
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
let menuOpen = false;

burger.addEventListener('click', () => {
  menuOpen = !menuOpen;
  mobileMenu.classList.toggle('open', menuOpen);
  burger.querySelector('span:nth-child(1)').style.transform = menuOpen ? 'rotate(45deg) translate(5px, 5px)' : '';
  burger.querySelector('span:nth-child(2)').style.opacity = menuOpen ? '0' : '1';
  burger.querySelector('span:nth-child(3)').style.transform = menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : '';
});

document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    menuOpen = false;
    mobileMenu.classList.remove('open');
    burger.querySelectorAll('span').forEach(s => {
      s.style.transform = '';
      s.style.opacity = '1';
    });
  });
});

/* ============================================
   INTERSECTION OBSERVER (fade-up)
   ============================================ */
const observerOpts = { threshold: 0.12, rootMargin: '0px 0px -40px 0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOpts);

document.querySelectorAll('.stack-block, .how__card, .case-card, .contact-item, .ai-block').forEach((el, i) => {
  el.classList.add('fade-up');
  el.style.transitionDelay = (i % 4) * 0.1 + 's';
  observer.observe(el);
});

/* ============================================
   FORM VALIDATION & SUBMIT
   ============================================ */
const form = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
const formStatus = document.getElementById('formStatus');

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  const field = document.getElementById(id.replace('Error', ''));
  el.textContent = msg;
  if (field) field.classList.add('error');
}

function clearFieldError(id) {
  const el = document.getElementById(id);
  const field = document.getElementById(id.replace('Error', ''));
  if (el) el.textContent = '';
  if (field) field.classList.remove('error');
}

['name', 'phone', 'email', 'message'].forEach(field => {
  const el = document.getElementById(field);
  if (el) el.addEventListener('input', () => clearFieldError(field + 'Error'));
});

function validateForm(data) {
  let valid = true;
  ['nameError', 'phoneError', 'emailError'].forEach(id => clearFieldError(id));

  if (!data.name || data.name.trim().length < 2) {
    showFieldError('nameError', 'Введите имя (минимум 2 символа)');
    valid = false;
  }

  const phoneRe = /^[\+]?[\d\s\-\(\)]{7,18}$/;
  if (!data.phone || !phoneRe.test(data.phone.trim())) {
    showFieldError('phoneError', 'Введите корректный номер телефона');
    valid = false;
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRe.test(data.email.trim())) {
    showFieldError('emailError', 'Введите корректный email');
    valid = false;
  }

  return valid;
}

function setLoading(loading) {
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoader = submitBtn.querySelector('.btn-loader');
  submitBtn.disabled = loading;
  if (loading) {
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
  } else {
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    message: document.getElementById('message').value,
  };

  if (!validateForm(data)) return;

  setLoading(true);
  formStatus.className = 'form-status';
  formStatus.style.display = 'none';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (res.ok && result.success) {
      formStatus.textContent = '✓ Сообщение отправлено! Копия отправлена на ваш email.';
      formStatus.className = 'form-status success';
      form.reset();
    } else {
      throw new Error(result.message || 'Ошибка отправки');
    }
  } catch (err) {
    formStatus.textContent = '✕ Ошибка: ' + (err.message || 'Попробуйте снова или напишите напрямую на email.');
    formStatus.className = 'form-status error';
  } finally {
    setLoading(false);
  }
});