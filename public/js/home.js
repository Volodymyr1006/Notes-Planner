const langToggle = document.querySelector('.lang-toggle');
const langMenu = document.querySelector('.lang-menu');

langToggle.addEventListener('click', function () {
  const isOpen = langToggle.classList.toggle('active');
  langMenu.classList.toggle('show');
  langToggle.setAttribute('aria-expanded', isOpen);
});
