document.getElementById('logoLink').addEventListener('click', (e)=>{
  e.preventDefault();
  window.scrollTo({top:0, behavior:'smooth'});
});

const langSegIndicator = document.getElementById('langSegIndicator');
function moveLangIndicator(btn){
  if(!btn) return;
  langSegIndicator.style.width = btn.offsetWidth + 'px';
  langSegIndicator.style.left = btn.offsetLeft + 'px';
}
function setLang(lang, save){
  document.querySelectorAll('.lang-seg-btn').forEach(b=>{
    const active = b.dataset.lang === lang;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
    if(active) moveLangIndicator(b);
  });
  document.querySelectorAll('.lang-compact-menu li').forEach(li=>{
    li.classList.toggle('active', li.dataset.lang === lang);
  });
  if(save) localStorage.setItem('notaLang', lang);
}
document.querySelectorAll('.lang-seg-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> setLang(btn.dataset.lang, true));
});
document.querySelectorAll('.lang-compact-menu li').forEach(li=>{
  li.addEventListener('click', ()=>{
    setLang(li.dataset.lang, true);
    langCompactMenu.classList.remove('show');
    langCompactBtn.setAttribute('aria-expanded', 'false');
  });
});
setLang(localStorage.getItem('notaLang') || 'ua');
window.addEventListener('load', ()=>moveLangIndicator(document.querySelector('.lang-seg-btn.active')));
if(document.fonts && document.fonts.ready){
  document.fonts.ready.then(()=>moveLangIndicator(document.querySelector('.lang-seg-btn.active')));
}

const langCompactBtn = document.getElementById('langCompactBtn');
const langCompactMenu = document.getElementById('langCompactMenu');
langCompactBtn.addEventListener('click', (e)=>{
  e.stopPropagation();
  const isOpen = langCompactMenu.classList.toggle('show');
  langCompactBtn.setAttribute('aria-expanded', String(isOpen));
});
document.addEventListener('click', (e)=>{
  if(!e.target.closest('.lang-compact')){
    langCompactMenu.classList.remove('show');
    langCompactBtn.setAttribute('aria-expanded', 'false');
  }
});

function setFaqOpen(item, isOpen){
  item.classList.toggle('open', isOpen);
  item.querySelector('.faq-summary').setAttribute('aria-expanded', String(isOpen));
}
document.querySelectorAll('.faq-item').forEach(item=>{
  item.querySelector('.faq-summary').addEventListener('click', (e)=>{
    e.stopPropagation();
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i=>setFaqOpen(i, false));
    if(!wasOpen) setFaqOpen(item, true);
  });
});
document.addEventListener('click', (e)=>{
  if(!e.target.closest('.faq-item')){
    document.querySelectorAll('.faq-item.open').forEach(i=>setFaqOpen(i, false));
  }
});

const revealEls = document.querySelectorAll('.reveal');
if(revealEls.length){
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));
}
