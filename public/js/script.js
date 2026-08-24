const form = document.getElementById('loginForm');
const nameInput = document.getElementById('name-input');
const emailInput = document.getElementById('email-input');
const codeInput = document.getElementById('code-input');
const codeWrap = document.getElementById('code-wrap');
const clearNameBtn = document.getElementById('clear-name');
const clearEmailBtn = document.getElementById('clear-email');
const resendBtn = document.getElementById('resend-btn');
const submitBtn = document.getElementById('submitBtn');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

let step = 'email';
let resendTimer = null;

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function setError(input, on, message) {
  const wrap = input.closest('.input-wrap');
  wrap.classList.toggle('error', on);
  if (on && message) wrap.querySelector('.error-text').textContent = message;
}

function startResendTimer(seconds) {
  let s = seconds;
  resendBtn.disabled = true;
  resendBtn.textContent = 'Надіслати повторно (' + s + 'с)';
  clearInterval(resendTimer);
  resendTimer = setInterval(function () {
    s--;
    if (s <= 0) {
      clearInterval(resendTimer);
      resendBtn.disabled = false;
      resendBtn.textContent = 'Надіслати повторно';
    } else {
      resendBtn.textContent = 'Надіслати повторно (' + s + 'с)';
    }
  }, 1000);
}

function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function () { toast.classList.remove('show'); }, 2600);
}

function saveProfileToDashboard(name, email) {
  const STORAGE_KEY = 'notaAppState';
  let state = {};
  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    state = {};
  }
  state.profile = Object.assign({}, state.profile, { name: name, email: email });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function requestCode(email) {
  return fetch('/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  });
}

form.addEventListener('submit', function (e) {
  e.preventDefault();

  if (step === 'email') {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    let ok = true;

    if (!name) { setError(nameInput, true); ok = false; } else setError(nameInput, false);

    if (!email) {
      setError(emailInput, true, 'Будь ласка, введіть вашу email адресу');
      ok = false;
    } else if (!isValidEmail(email)) {
      setError(emailInput, true, 'Введіть коректну email адресу, наприклад name@example.com');
      ok = false;
    } else {
      setError(emailInput, false);
    }

    if (!ok) return;

    requestCode(email);
    codeWrap.classList.add('show');
    step = 'code';
    startResendTimer(30);
    showToast('Код надіслано на пошту');
    setTimeout(function () { codeInput.focus(); }, 400);
  } else {
    const code = codeInput.value.trim();
    if (!code) {
      setError(codeInput, true);
      return;
    }

    fetch('/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.value.trim(), code: code })
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.success) {
          setError(codeInput, false);
          submitBtn.textContent = 'Готово ✓';
          showToast('Вхід виконано!');
          saveProfileToDashboard(nameInput.value.trim(), emailInput.value.trim());
          setTimeout(function () { window.location.href = '/dashboard'; }, 700);
        } else {
          setError(codeInput, true);
        }
      });
  }
});

clearNameBtn.addEventListener('click', function () {
  nameInput.value = '';
  nameInput.focus();
});

nameInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    emailInput.focus();
  }
});

clearEmailBtn.addEventListener('click', function () {
  emailInput.value = '';
  emailInput.focus();
  if (step === 'code') {
    codeWrap.classList.remove('show');
    step = 'email';
    clearInterval(resendTimer);
  }
});

resendBtn.addEventListener('click', function () {
  if (resendBtn.disabled) return;
  requestCode(emailInput.value.trim());
  startResendTimer(30);
  showToast('Код надіслано повторно');
});

codeInput.addEventListener('input', function () { setError(codeInput, false); });
emailInput.addEventListener('input', function () { setError(emailInput, false); });
nameInput.addEventListener('input', function () { setError(nameInput, false); });

const langSegIndicator = document.getElementById('langSegIndicator');
function moveLangIndicator(btn) {
  langSegIndicator.style.width = btn.offsetWidth + 'px';
  langSegIndicator.style.left = btn.offsetLeft + 'px';
}
function setLang(lang) {
  document.querySelectorAll('.lang-seg-btn').forEach(function (b) {
    const active = b.dataset.lang === lang;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', active);
    if (active) moveLangIndicator(b);
  });
  localStorage.setItem('notaLang', lang);
}
document.querySelectorAll('.lang-seg-btn').forEach(function (btn) {
  btn.addEventListener('click', function () { setLang(btn.dataset.lang); });
});
setLang(localStorage.getItem('notaLang') || 'ua');
window.addEventListener('load', function () {
  moveLangIndicator(document.querySelector('.lang-seg-btn.active'));
});
if (document.fonts) {
  document.fonts.ready.then(function () {
    moveLangIndicator(document.querySelector('.lang-seg-btn.active'));
  });
}
