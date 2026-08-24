const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email-input');
const codeInput = document.getElementById('code-input');
const codeWrap = document.getElementById('code-wrap');
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
    const email = emailInput.value.trim();
    if (!email) {
      setError(emailInput, true, 'Будь ласка, введіть вашу email адресу');
      return;
    }
    if (!isValidEmail(email)) {
      setError(emailInput, true, 'Введіть коректну email адресу, наприклад name@example.com');
      return;
    }
    setError(emailInput, false);

    requestCode(email);
    codeWrap.classList.add('show');
    step = 'code';
    submitBtn.textContent = 'Увійти';
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
          setTimeout(function () { window.location.href = '/dashboard'; }, 700);
        } else {
          setError(codeInput, true);
        }
      });
  }
});

clearEmailBtn.addEventListener('click', function () {
  emailInput.value = '';
  emailInput.focus();
  if (step === 'code') {
    codeWrap.classList.remove('show');
    step = 'email';
    submitBtn.textContent = 'Продовжити';
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

const langSwitch = document.getElementById('langSwitch');
const langToggle = document.getElementById('langToggle');
langToggle.addEventListener('click', function (e) {
  e.stopPropagation();
  const open = langSwitch.classList.toggle('open');
  langToggle.setAttribute('aria-expanded', open);
});
document.querySelectorAll('.lang-menu li').forEach(function (li) {
  li.addEventListener('click', function () {
    document.querySelectorAll('.lang-menu li').forEach(function (x) { x.classList.remove('active'); });
    li.classList.add('active');
    const lang = li.dataset.lang;
    langToggle.innerHTML = (lang === 'en' ? '🌐 EN' : '🌐 UA') + ' <span class="chevron">▾</span>';
    langSwitch.classList.remove('open');
  });
});
document.addEventListener('click', function (e) {
  if (!langSwitch.contains(e.target)) langSwitch.classList.remove('open');
});
