const form = document.querySelector('form');
const input = document.querySelector('#email-input');
const error = document.querySelector('.error-text');
const codeWrap = document.querySelector('#code-wrap');
const clearBtn = document.querySelector('.clear-email');
const codeInput = document.querySelector('#code-input');
const codeError = document.querySelector('#code-error');

const resendBtn = document.querySelector('#resend-btn');
let secondsLeft = 30;
let countdownTimer = null;

function startCountdown() {
 secondsLeft = 30;
 resendBtn.disabled = true;
 resendBtn.textContent = 'Надіслати повторно ('+ secondsLeft + 'с)';

 countdownTimer = setInterval (function () {
  secondsLeft = secondsLeft - 1;
  resendBtn.textContent = 'Надіслати повторно (' + secondsLeft + 'с)';

  if (secondsLeft <= 0) {
    clearInterval(countdownTimer);
    resendBtn.disabled = false;
    resendBtn.textContent = 'Надіслати код підтвердження повторно';
  }
 } , 1000);
}

resendBtn.addEventListener('click', function () {
  fetch('/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.value })
  });
  startCountdown();
});


form.addEventListener('submit', function (onSubmit) {
  onSubmit.preventDefault();

  if (!codeWrap.classList.contains('show')) {
    if (input.value.trim() === '') {
      error.textContent = 'Будь ласка, введіть вашу email адресу';
      error.classList.add('show');
      input.classList.add('error');
    } else if (!input.checkValidity()) {
      error.textContent = 'Введіть коректну email адресу, наприклад name@example.com';
      error.classList.add('show');
      input.classList.add('error');
    } else {
      error.classList.remove('show');
      input.classList.remove('error');
      codeWrap.classList.add('show');
      input.readOnly = true;
      clearBtn.classList.add('show');
      setTimeout(function () {
       codeInput.focus();
       startCountdown();
      }, 100);

      
      fetch('/request-code', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email: input.value })
      });
    }
  } else {
    fetch('/verify-code', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email: input.value, code: codeInput.value.trim() })
    })
   .then(function (response) {
    return response.json();
    })
   .then(function (data) {
     if (data.success) {
       codeError.classList.remove('show');
       alert('Код правильний! (далі тут буде перехід у кабінет)');
     } else {
        codeError.classList.add('show');
      }
    });
  }
});

codeInput.addEventListener('input', function () {
  codeError.classList.remove('show');
});

clearBtn.addEventListener('click', function () {
  input.readOnly = false;
  clearBtn.classList.remove('show');
  codeWrap.classList.remove('show');
  input.focus();
});

input.addEventListener('input', function () {
  error.classList.remove('show');
  input.classList.remove('error');
});

const langToggle = document.querySelector('.lang-toggle');
const langMenu = document.querySelector('.lang-menu');

langToggle.addEventListener('click', function () {
  const isOpen = langToggle.classList.toggle('active');
  langMenu.classList.toggle('show');
  langToggle.setAttribute('aria-expanded', isOpen);
});
