const form = document.querySelector('form');
const input = document.querySelector('#email-input');
const error = document.querySelector('.error-text');

form.addEventListener('submit', function (onSubmit) {
  if (input.value.trim() === '') {
    onSubmit.preventDefault();
    error.textContent = 'Будь ласка, введіть вашу email адресу';
    error.classList.add('show');
    input.classList.add('error');
  } else if (!input.checkValidity()) {
    onSubmit.preventDefault();
    error.textContent = 'Введіть коректну email адресу, наприклад name@example.com';
    error.classList.add('show');
    input.classList.add('error');
  }
});

input.addEventListener('input', function () {
  error.classList.remove('show');
  input.classList.remove('error');
});

const langToggle = document.querySelector('.lang-toggle');
const langMenu = document.querySelector('.lang-menu');

langToggle.addEventListener('click', function () {
  langToggle.classList.toggle('active');
  langMenu.classList.toggle('show');
});
