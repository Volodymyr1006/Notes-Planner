/* ============================================================
   STATE (in-memory only — дані не зберігаються між перезавантаженнями)
   ============================================================ */
const pad = n => String(n).padStart(2,'0');
const todayDate = new Date();
const todayStr = `${todayDate.getFullYear()}-${pad(todayDate.getMonth()+1)}-${pad(todayDate.getDate())}`;
const fmtDate = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
const esc = s => { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; };
const hexAlpha = (hex,a) => { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; };
function mutedColor(hex, s=32, l=27){
  const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  let h=0;
  if(d){
    if(max===r) h=((g-b)/d)%6;
    else if(max===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h*=60; if(h<0) h+=360;
  }
  const c=(1-Math.abs(2*l/100-1))*(s/100), x=c*(1-Math.abs((h/60)%2-1)), m=l/100-c/2;
  const [r2,g2,b2] = h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  const toHex=v=>Math.round((v+m)*255).toString(16).padStart(2,'0');
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

/* плавно "згортає" й прибирає один рядок картки/списку, замість того щоб
   перемальовувати весь список наново (без цього видалення відчувалось як
   перезавантаження сторінки — все зникало і з'являлось заново) */
function collapseAndRemove(row, onDone){
  const h = row.offsetHeight;
  row.style.maxHeight = h + 'px';
  row.style.overflow = 'hidden';
  void row.offsetHeight;
  row.style.transition = 'opacity .22s var(--ease), transform .22s var(--ease), max-height .3s var(--ease), margin .3s var(--ease), padding .3s var(--ease)';
  requestAnimationFrame(()=>{
    row.style.opacity = '0';
    row.style.transform = 'translateX(10px)';
    row.style.maxHeight = '0px';
    row.style.marginTop = '0px'; row.style.marginBottom = '0px';
    row.style.paddingTop = '0px'; row.style.paddingBottom = '0px';
  });
  row.addEventListener('transitionend', function handler(e){
    if(e.propertyName !== 'max-height') return;
    row.removeEventListener('transitionend', handler);
    row.remove();
    if(onDone) onDone();
  });
}

let listIdCounter = 4, itemIdCounter = 100;
let lists = [
  {id:1, name:'Цей тиждень', items:[
    {id:1,text:'Підготувати презентацію',done:true},
    {id:2,text:'Купити продукти',done:false},
    {id:3,text:'Подзвонити батькам',done:false},
    {id:4,text:'Дописати нотатки для проєкту',done:false},
  ]},
  {id:2, name:'Покупки', items:[
    {id:5,text:'Молоко',done:false},{id:6,text:'Кава',done:true},{id:7,text:'Хліб',done:false},
  ]},
  {id:3, name:'Робочі задачі', items:[]},
];
let activeListId = 1;

let events = {};
let eventIdCounter = 1;
function seedEvent(y,m,d,title,time,color){ const key=fmtDate(y,m,d); (events[key]||=[]).push({id:eventIdCounter++,title,time,color}); }
const CY=todayDate.getFullYear(), CM=todayDate.getMonth(), CD=todayDate.getDate();
seedEvent(CY,CM,CD,'Дзвінок з командою','10:00','violet');
seedEvent(CY,CM,CD,'Спортзал','19:00','teal');
seedEvent(CY,CM,CD+1,'Здати звіт','14:00','amber');
seedEvent(CY,CM,CD+3,'День народження Олі','09:00','rose');
seedEvent(CY,CM,CD-2,'Підсумки тижня','17:30','slate');
seedEvent(CY,CM,Math.min(CD+7,27),'Поїздка за місто','08:00','teal');

let calYear=CY, calMonth=CM;
let editingEventKey=null, editingEventId=null;
let profile = {name:'Володимир', email:'volodymyrromanyshyn15@gmail.com', photo:null, joinDate:null};
let prefs = {notif:true, hints:true, compact:false, theme:true, lang:'ua'};

/* ---- glossary (Розширені нотатки) ---- */
const PRIORITY = [
  {id:'low', label:'Низький', color:'#8b93a8'},
  {id:'medium', label:'Середній', color:'#e8b34f'},
  {id:'high', label:'Високий', color:'#ef6b6b'},
];
const PRIORITY_FLAG_COLOR = {low:'#4a4a52', medium:'#5c4a2a', high:'#5c2f2f'};
function priorityInfo(id){ return PRIORITY.find(p=>p.id===id) || PRIORITY[1]; }
function eventTimeRange(e){ return e.time && e.endTime ? `${e.time}–${e.endTime}` : (e.time||''); }
function stripHtml(html){ const d=document.createElement('div'); d.innerHTML=html||''; return d.textContent||''; }

let glossaryIdCounter = 8;
let glossary = [
  {id:1, term:'API', explanationHtml:"<strong>Application Programming Interface</strong> — набір правил, за якими одна програма може звертатись до функцій чи даних іншої.", category:'Розробка', priority:'high', learned:false},
  {id:2, term:'Webhook', explanationHtml:'Спосіб, яким сервіс сам надсилає дані іншому сервісу одразу після певної події, без постійних запитів.', category:'Розробка', priority:'medium', learned:false},
  {id:3, term:'MVP', explanationHtml:'<mark class="term-mark">Minimum Viable Product</mark> — мінімальна робоча версія продукту, щоб перевірити гіпотезу на реальних користувачах.', category:'Продукт', priority:'high', learned:false},
  {id:4, term:'UI/UX', explanationHtml:'UI — як інтерфейс <u>виглядає</u>. UX — як зручно ним користуватись. Разом визначають, наскільки приємно працювати з продуктом.', category:'Продукт', priority:'medium', learned:false},
  {id:5, term:'Інтервальне повторення', explanationHtml:'Техніка запам\'ятовування, коли матеріал повторюють через поступово зростаючі проміжки часу.', category:'Навчання', priority:'low', learned:false},
  {id:6, term:'Активне пригадування', explanationHtml:'Замість перечитування — спроба самостійно відтворити інформацію з пам\'яті. Працює краще за пасивне читання.', category:'Навчання', priority:'medium', learned:false},
];
let glossarySearchQuery = '';
let glossaryFilterCategory = 'all';
let glossarySortOrder = 'default';
let glossaryStatusFilter = 'all';
let glossaryViewMode = 'all';
let editingGlossaryId = null;
let selectedPriority = 'medium';
let savedEditorRange = null;
let glossaryImages = [];

/* ---- кольори категорій: 10 варіантів, користувач може обрати вручну ---- */
const CATEGORY_COLORS = [
  '#8b6bff','#4fd1c5','#e8b34f','#e88ba3','#8b93a8',
  '#ffe100','#8ce99a','#7dd3fc','#f8a1c4','#c4b1ff',
];
let categoryColors = {}; // {назва категорії: обраний колір}
function categoryColor(name){
  if(categoryColors[name]) return categoryColors[name];
  let h = 0;
  for(let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[h % CATEGORY_COLORS.length];
}

/* ---- типи подій календаря: користувач сам вписує назву (як категорії
   глосарія), а популярні типи пропонуються підказкою ---- */
const DEFAULT_EVENT_TYPES = ['Робота','Навчання','Особисте','Спорт','Інше'];
let eventTypeColors = {
  'Робота':'#8b6bff','Особисте':'#4fd1c5','Навчання':'#e8b34f','Спорт':'#e88ba3','Інше':'#8b93a8',
};
function eventTypeColor(name){
  if(eventTypeColors[name]) return eventTypeColors[name];
  let h = 0;
  for(let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[h % CATEGORY_COLORS.length];
}
function eventTypeNames(){
  const used = [...new Set(Object.values(events).flat().map(e=>e.type).filter(Boolean))];
  return [...new Set([...DEFAULT_EVENT_TYPES, ...used])];
}

/* ---- захист від небезпечного HTML у "Поясненні" глосарія ----
   contenteditable дозволяє вставляти форматований текст з буфера
   обміну; без очищення туди міг би потрапити script/onerror/іт.д.
   Тому перед збереженням лишаємо тільки безпечні теги форматування. */
const GLOSSARY_ALLOWED_TAGS = new Set(['STRONG','B','U','EM','MARK','BR']);
const GLOSSARY_HIGHLIGHT_COLORS = new Set(['#ffe100','#8ce99a','#7dd3fc','#f8a1c4','#c4b1ff']);
function sanitizeExplanationHtml(html){
  const container = document.createElement('div');
  container.innerHTML = html || '';

  container.querySelectorAll('script,style,iframe,object,embed,link,meta,img,svg,form,input,button,textarea,select,video,audio,source,base,noscript').forEach(el => el.remove());

  let unwrapTarget;
  while((unwrapTarget = [...container.querySelectorAll('*')].find(el => !GLOSSARY_ALLOWED_TAGS.has(el.tagName)))){
    while(unwrapTarget.firstChild) unwrapTarget.parentNode.insertBefore(unwrapTarget.firstChild, unwrapTarget);
    unwrapTarget.remove();
  }

  container.querySelectorAll('*').forEach(el=>{
    [...el.attributes].forEach(attr=>{
      let keep = false;
      if(el.tagName==='MARK'){
        if(attr.name==='class' && attr.value==='term-mark') keep = true;
        if(attr.name==='data-color' && GLOSSARY_HIGHLIGHT_COLORS.has(attr.value.toLowerCase())) keep = true;
        if(attr.name==='style'){
          const m = /^background:\s*(#[0-9a-f]{6})\s*;?$/i.exec(attr.value.trim());
          if(m && GLOSSARY_HIGHLIGHT_COLORS.has(m[1].toLowerCase())) keep = true;
        }
      }
      if(!keep) el.removeAttribute(attr.name);
    });
  });

  return container.innerHTML;
}

/* ============================================================
   ЗБЕРЕЖЕННЯ В localStorage
   Перший візит — показуємо демо-дані вище. Щойно з'явиться
   збережений стан, він підмінює демо-дані при кожному запуску.
   ============================================================ */
const STORAGE_KEY = 'notaAppState';

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return;
  try{
    const s = JSON.parse(raw);
    lists = s.lists ?? lists;
    listIdCounter = s.listIdCounter ?? listIdCounter;
    itemIdCounter = s.itemIdCounter ?? itemIdCounter;
    activeListId = s.activeListId ?? activeListId;
    events = s.events ?? events;
    eventIdCounter = s.eventIdCounter ?? eventIdCounter;
    profile = s.profile ?? profile;
    prefs = s.prefs ?? prefs;
    glossary = (s.glossary ?? glossary).map(t => ({...t, explanationHtml: sanitizeExplanationHtml(t.explanationHtml)}));
    glossaryIdCounter = s.glossaryIdCounter ?? glossaryIdCounter;
    categoryColors = s.categoryColors ?? categoryColors;
    eventTypeColors = s.eventTypeColors ?? eventTypeColors;
  }catch(e){
    console.warn('Не вдалося прочитати збережені дані, використовую демо-дані.', e);
  }
  if(!lists.find(l=>l.id===activeListId)) activeListId = lists[0]?.id;
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    lists, listIdCounter, itemIdCounter, activeListId,
    events, eventIdCounter, profile, prefs,
    glossary, glossaryIdCounter, categoryColors, eventTypeColors,
  }));
}
loadState();
if(!profile.joinDate){
  profile.joinDate = todayStr;
  saveState();
}

/* ============================================================
   TOAST
   ============================================================ */
const toastEl=document.getElementById('toast'), toastMsg=document.getElementById('toastMsg');
let toastTimer;
function showToast(msg){ toastMsg.textContent=msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2200); }

/* ============================================================
   MODAL HELPERS
   ============================================================ */
function openModal(el){ el.classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(el){ el.classList.remove('open'); document.body.style.overflow=''; if(typeof hideSelectionToolbar==='function') hideSelectionToolbar(); if(typeof resetGlossaryDeleteConfirm==='function') resetGlossaryDeleteConfirm(); }
document.querySelectorAll('.modal-overlay').forEach(m=>{
  m.addEventListener('click',(e)=>{ if(e.target===m) closeModal(m); });
});
document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') document.querySelectorAll('.modal-overlay.open').forEach(closeModal); });

/* ============================================================
   NAV / VIEW SWITCHING
   ============================================================ */
const navItems = document.querySelectorAll('.nav-item');
const navIndicator = document.getElementById('navIndicator');
const views = document.querySelectorAll('.view');
const topbarTitle = document.getElementById('topbarTitle');
const topbarSub = document.getElementById('topbarSub');
const topbarAdd = document.getElementById('topbarAdd');
const topbarAddLabel = document.getElementById('topbarAddLabel');

const VIEW_META = {
  overview:{title:'Огляд', sub:'Швидкий погляд на твій день', addLabel:'Список', add:()=>openListModal()},
  notes:{title:'Нотатки', sub:'', addLabel:'Список', add:()=>openListModal()},
  glossary:{title:'Глосарій', sub:'Терміни, які варто пам\'ятати', addLabel:'Термін', add:()=>openGlossaryModal()},
  calendar:{title:'Календар', sub:'Плануй свої дні наперед', addLabel:'Подія', add:()=>openEventModal(todayStr)},
  profile:{title:'Профіль', sub:'Керуй акаунтом і налаштуваннями', addLabel:'Список', add:()=>openListModal()},
};

function positionNavIndicator(el){
  navIndicator.style.transform = `translateY(${el.offsetTop}px)`;
}
function setActiveView(name, opts={}){
  navItems.forEach(n=>{
    const isActive = n.dataset.view===name;
    n.classList.toggle('active', isActive);
    if(isActive) positionNavIndicator(n);
  });
  views.forEach(v=>v.classList.toggle('active', v.id===`view-${name}`));
  const meta = VIEW_META[name];
  topbarTitle.textContent = name==='notes' ? (lists.find(l=>l.id===activeListId)?.name || 'Нотатки') : meta.title;
  topbarSub.textContent = meta.sub;
  topbarAddLabel.textContent = meta.addLabel;
  topbarAdd.onclick = meta.add;
  closeSidebarMobile();
  if(name==='overview') renderOverview();
  if(name==='notes') renderNotes();
  if(name==='glossary'){ renderGlossary(); moveGlossaryViewIndicator(document.querySelector('#glossaryViewToggle button.active')); }
  if(name==='calendar') renderCalendar();
  if(name==='profile') moveLangIndicator(document.querySelector('.lang-seg-btn.active'));
}
navItems.forEach(n=>n.addEventListener('click', ()=>setActiveView(n.dataset.view)));
document.querySelectorAll('[data-goto]').forEach(el=>{
  el.addEventListener('click',(e)=>{ e.preventDefault(); setActiveView(el.dataset.goto); });
});
window.addEventListener('resize', ()=>{
  const active = document.querySelector('.nav-item.active');
  if(active) positionNavIndicator(active);
});

/* ============================================================
   SIDEBAR (mobile drawer)
   ============================================================ */
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
function openSidebarMobile(){ sidebar.classList.add('open'); sidebarOverlay.classList.add('show'); }
function closeSidebarMobile(){ sidebar.classList.remove('open'); sidebarOverlay.classList.remove('show'); }
document.getElementById('menuBurger').addEventListener('click', openSidebarMobile);
document.getElementById('sidebarClose').addEventListener('click', closeSidebarMobile);
sidebarOverlay.addEventListener('click', closeSidebarMobile);

/* ============================================================
   LISTS SIDEBAR RENDER
   ============================================================ */
const listsScroll = document.getElementById('listsScroll');
const notesBadge = document.getElementById('notesBadge');

function totalActiveItems(){ return lists.reduce((s,l)=>s+l.items.filter(i=>!i.done).length,0); }
function totalDoneItems(){ return lists.reduce((s,l)=>s+l.items.filter(i=>i.done).length,0); }

function renderListsSidebar(){
  if(lists.length===0){
    listsScroll.innerHTML = `<div class="sidebar-lists-empty">Немає списків.<br>Створи перший кнопкою вище.</div>`;
  } else {
    listsScroll.innerHTML = lists.map(l=>{
      const done = l.items.filter(i=>i.done).length;
      return `<div class="list-item ${l.id===activeListId?'active':''}" data-list="${l.id}">
        <span class="list-dot"></span>
        <span class="name">${esc(l.name)}</span>
        <span class="count">${done}/${l.items.length}</span>
        <button type="button" class="list-del" data-del-list="${l.id}" title="Видалити список">
          <svg class="icon" style="width:14px;height:14px" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg>
        </button>
      </div>`;
    }).join('');
  }
  listsScroll.querySelectorAll('.list-item').forEach(el=>{
    el.addEventListener('click', ()=>{
      activeListId = Number(el.dataset.list);
      setActiveView('notes');
    });
  });
  listsScroll.querySelectorAll('.list-del').forEach(el=>{
    el.addEventListener('click', (e)=>{
      e.stopPropagation();
      deleteList(Number(el.dataset.delList));
    });
  });
  notesBadge.textContent = totalActiveItems();
}
function deleteList(id){
  if(lists.length<=1){ showToast('Це єдиний список'); return; }
  lists = lists.filter(l=>l.id!==id);
  if(activeListId===id) activeListId = lists[0].id;
  saveState();
  renderListsSidebar();
  if(document.getElementById('view-notes').classList.contains('active')) renderNotes();
  if(document.getElementById('view-overview').classList.contains('active')) renderOverview();
  showToast('Список видалено');
}

/* ============================================================
   NEW LIST MODAL
   ============================================================ */
const listModal = document.getElementById('listModal');
const listNameInput = document.getElementById('listNameInput');
function openListModal(){ listNameInput.value=''; openModal(listModal); setTimeout(()=>listNameInput.focus(),300); }
document.getElementById('newListBtn').addEventListener('click', openListModal);
document.getElementById('listModalClose').addEventListener('click', ()=>closeModal(listModal));
function createList(){
  const name = listNameInput.value.trim();
  if(!name){ listNameInput.focus(); return; }
  const l = {id:listIdCounter++, name, items:[]};
  lists.push(l);
  activeListId = l.id;
  saveState();
  closeModal(listModal);
  renderListsSidebar();
  setActiveView('notes');
  showToast('Список створено');
}
document.getElementById('listCreateBtn').addEventListener('click', createList);
listNameInput.addEventListener('keydown', e=>{ if(e.key==='Enter') createList(); });

/* ============================================================
   NOTES VIEW (checklist)
   ============================================================ */
const notesListName = document.getElementById('notesListName');
const notesListSub = document.getElementById('notesListSub');
const notesProgressFill = document.getElementById('notesProgressFill');
const checkList = document.getElementById('checkList');
const notesEmptyWrap = document.getElementById('notesEmptyWrap');
const notesFooterRow = document.getElementById('notesFooterRow');
const notesCountText = document.getElementById('notesCountText');
const quickAddInput = document.getElementById('quickAddInput');

function activeList(){ return lists.find(l=>l.id===activeListId) || lists[0]; }

function renderNotes(){
  checkList.classList.toggle('compact', !!prefs.compact);
  const list = activeList();
  if(!list){
    notesListName.textContent = 'Немає списків';
    notesListSub.textContent = 'Створи перший список, щоб почати';
    notesProgressFill.style.width='0%';
    checkList.innerHTML=''; notesFooterRow.style.display='none';
    notesEmptyWrap.innerHTML = emptyStateHtml('Списків ще немає', 'Натисни «Новий список» ліворуч, щоб почати.');
    return;
  }
  activeListId = list.id;
  const total = list.items.length;
  const done = list.items.filter(i=>i.done).length;
  notesListName.textContent = list.name;
  notesListSub.textContent = `${done} з ${total} виконано`;
  notesProgressFill.style.width = total ? `${Math.round(done/total*100)}%` : '0%';
  topbarTitle.textContent = list.name;

  if(total===0){
    checkList.innerHTML='';
    notesEmptyWrap.innerHTML = emptyStateHtml('Список порожній', 'Додай першу нотатку у полі вище, щоб почати');
    notesFooterRow.style.display='none';
  } else {
    notesEmptyWrap.innerHTML='';
    checkList.innerHTML = list.items.map(checkItemHtml).join('');
    checkList.querySelectorAll('.check-item').forEach(wireCheckItemRow);
    notesFooterRow.style.display = 'flex';
    notesCountText.textContent = `${total} пункт${total===1?'':total<5?'и':'ів'}`;
    document.getElementById('clearDoneBtn').style.visibility = done>0 ? 'visible' : 'hidden';
  }
  renderListsSidebar();
}
function checkItemHtml(i){
  return `<div class="check-item ${i.done?'done':''}" data-item="${i.id}">
    <span class="check-box" data-toggle="${i.id}"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>
    <span class="txt" data-toggle="${i.id}">${esc(i.text)}</span>
    <button class="del" data-del="${i.id}"><svg class="icon" style="width:15px;height:15px" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg></button>
  </div>`;
}
function wireCheckItemRow(row){
  row.querySelectorAll('[data-toggle]').forEach(el=>{
    el.addEventListener('click', ()=>toggleItem(Number(el.dataset.toggle)));
  });
  row.querySelectorAll('[data-del]').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); deleteItem(Number(el.dataset.del)); });
  });
}
function updateNotesAggregates(list){
  const total = list.items.length;
  const done = list.items.filter(i=>i.done).length;
  notesListSub.textContent = `${done} з ${total} виконано`;
  notesProgressFill.style.width = total ? `${Math.round(done/total*100)}%` : '0%';
  notesCountText.textContent = `${total} пункт${total===1?'':total<5?'и':'ів'}`;
  document.getElementById('clearDoneBtn').style.visibility = done>0 ? 'visible' : 'hidden';
  const sideCount = listsScroll.querySelector(`.list-item[data-list="${list.id}"] .count`);
  if(sideCount) sideCount.textContent = `${done}/${total}`;
}
function emptyStateHtml(title, sub){
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v5h5"/></svg>
    <span>${esc(title)}</span>${prefs.hints ? `<p>${esc(sub)}</p>` : ''}</div>`;
}
function toggleItem(id){
  const list = activeList(); if(!list) return;
  const item = list.items.find(i=>i.id===id); if(!item) return;
  item.done = !item.done;
  saveState();
  const row = checkList.querySelector(`.check-item[data-item="${id}"]`);
  if(row) row.classList.toggle('done', item.done);
  updateNotesAggregates(list);
}
function deleteItem(id){
  const list = activeList(); if(!list) return;
  const row = checkList.querySelector(`.check-item[data-item="${id}"]`);
  list.items = list.items.filter(i=>i.id!==id);
  saveState();
  showToast('Пункт видалено');
  if(row && list.items.length>0){
    collapseAndRemove(row, ()=>updateNotesAggregates(list));
  } else {
    renderNotes();
  }
}
function addItem(text){
  const list = activeList(); if(!list) return;
  text = text.trim(); if(!text) return;
  const wasEmpty = list.items.length===0;
  const item = {id:itemIdCounter++, text, done:false};
  list.items.push(item);
  quickAddInput.value='';
  saveState();
  if(wasEmpty){
    renderNotes();
    return;
  }
  checkList.insertAdjacentHTML('beforeend', checkItemHtml(item));
  wireCheckItemRow(checkList.lastElementChild);
  updateNotesAggregates(list);
}
document.getElementById('quickAddBtn').addEventListener('click', ()=>{
  if(quickAddInput.value.trim()) addItem(quickAddInput.value);
  else quickAddInput.focus();
});
quickAddInput.addEventListener('keydown', e=>{ if(e.key==='Enter') addItem(quickAddInput.value); });
document.getElementById('clearDoneBtn').addEventListener('click', ()=>{
  const list = activeList(); if(!list) return;
  list.items = list.items.filter(i=>!i.done);
  saveState();
  renderNotes();
  showToast('Виконані пункти прибрано');
});
document.getElementById('deleteListBtn').addEventListener('click', ()=>{
  if(lists.length<=1){ showToast('Це єдиний список'); return; }
  lists = lists.filter(l=>l.id!==activeListId);
  activeListId = lists[0].id;
  saveState();
  renderNotes();
  showToast('Список видалено');
});

/* ============================================================
   GLOSSARY (Розширені нотатки)
   ============================================================ */
const glossaryListEl = document.getElementById('glossaryList');
const glossaryEmptyWrap = document.getElementById('glossaryEmptyWrap');
const glossaryFilters = document.getElementById('glossaryFilters');
const glossaryBadge = document.getElementById('glossaryBadge');
const glossarySearchInput = document.getElementById('glossarySearch');

function glossaryCategories(){ return [...new Set(glossary.map(t=>t.category).filter(Boolean))].sort(); }

function filteredGlossary(){
  const result = glossary.filter(t=>{
    if(glossaryFilterCategory!=='all' && t.category!==glossaryFilterCategory) return false;
    if(glossaryStatusFilter==='unlearned' && t.learned) return false;
    if(glossarySearchQuery){
      const q = glossarySearchQuery;
      const plain = (t.term + ' ' + stripHtml(t.explanationHtml)).toLowerCase();
      if(!plain.includes(q)) return false;
    }
    return true;
  });
  if(glossarySortOrder==='az') result.sort((a,b)=>a.term.localeCompare(b.term,'uk'));
  else if(glossarySortOrder==='za') result.sort((a,b)=>b.term.localeCompare(a.term,'uk'));
  return result;
}

function renderGlossaryFilters(){
  const cats = glossaryCategories();
  const chips = [{id:'all', label:'Всі категорії'}, ...cats.map(c=>({id:c, label:c, color:categoryColor(c)}))];
  glossaryFilters.innerHTML = `
    <button class="chip" data-filter="all">Всі категорії</button>
    <button class="chip" id="unlearnedFilterChip">Тільки невивчені</button>` +
    chips.slice(1).map(c=>`
    <button class="chip" data-filter="${esc(c.id)}">
      ${c.color?`<span class="swatch" style="background:${c.color}"></span>`:''}${esc(c.label)}
    </button>`).join('');
  glossaryFilters.querySelectorAll('.chip[data-filter]').forEach(ch=>{
    ch.classList.toggle('active', glossaryFilterCategory===ch.dataset.filter);
    ch.addEventListener('click', ()=>{ glossaryFilterCategory = ch.dataset.filter; renderGlossary(); });
  });
  const unlearnedChip = document.getElementById('unlearnedFilterChip');
  unlearnedChip.classList.toggle('active', glossaryStatusFilter==='unlearned');
  unlearnedChip.addEventListener('click', ()=>{
    glossaryStatusFilter = glossaryStatusFilter==='unlearned' ? 'all' : 'unlearned';
    renderGlossary();
  });
}

function termRowHtml(t, i=0){
  const col = categoryColor(t.category || 'Без категорії');
  const pr = priorityInfo(t.priority);
  const delay = Math.min(i, 10) * 35;
  return `<div class="term-row ${t.learned?'learned':''}" data-term="${t.id}" style="animation-delay:${delay}ms">
    <span class="priority-flag" style="background:${PRIORITY_FLAG_COLOR[pr.id]}" title="Пріоритет: ${pr.label}"></span>
    <span class="t-term">${esc(t.term)}</span>
    <span class="t-expl">${t.explanationHtml || ''}</span>
    <span class="t-cat">
      <span class="category-pill"><span class="dot" style="background:${col}"></span>${esc(t.category || 'Без категорії')}</span>
      <span class="category-pill"><span class="dot" style="background:${pr.color}"></span>${pr.label}</span>
      ${t.images && t.images.length ? `<span class="img-count-badge" title="Зображень: ${t.images.length}"><svg class="icon" style="width:11px;height:11px" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="15" rx="2.5"/><circle cx="9" cy="10.5" r="1.6"/><path d="m4 17 5-5 3.5 3.5L17 11l3.5 3.5"/></svg>${t.images.length}</span>` : ''}
      <button type="button" class="term-learn-toggle ${t.learned?'learned':''}" data-learn-toggle="${t.id}" title="${t.learned?'Позначити невивченим':'Позначити вивченим'}">
        <svg class="icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
      </button>
    </span>
  </div>`;
}

function toggleTermLearned(id){
  const t = glossary.find(g=>g.id===id);
  if(!t) return;
  t.learned = !t.learned;
  saveState();
  renderGlossaryProgress();

  const row = glossaryListEl.querySelector(`.term-row[data-term="${id}"]`);
  const btn = row ? row.querySelector('[data-learn-toggle]') : null;
  const shouldHide = glossaryStatusFilter==='unlearned' && t.learned;

  if(row && shouldHide){
    const group = row.closest('.glossary-group');
    collapseAndRemove(row, ()=>{
      if(group && !group.querySelector('.term-row')) group.remove();
      if(!glossaryListEl.querySelector('.term-row')) renderGlossary();
    });
  } else if(row && btn){
    row.classList.toggle('learned', t.learned);
    btn.classList.toggle('learned', t.learned);
    btn.title = t.learned ? 'Позначити невивченим' : 'Позначити вивченим';
  } else {
    renderGlossary();
  }
}

function renderGlossaryProgress(){
  const scoped = glossaryFilterCategory==='all' ? glossary : glossary.filter(t=>t.category===glossaryFilterCategory);
  const total = scoped.length;
  const learned = scoped.filter(t=>t.learned).length;
  const scopeLabel = glossaryFilterCategory==='all' ? '' : ` у категорії «${glossaryFilterCategory}»`;
  document.getElementById('glossaryProgressLabel').textContent = `${learned} з ${total} вивчено${scopeLabel}`;
  document.getElementById('glossaryProgressFill').style.width = total ? `${Math.round(learned/total*100)}%` : '0%';
}

function renderGlossary(){
  renderGlossaryFilters();
  renderGlossaryProgress();
  const items = filteredGlossary();
  glossaryBadge.textContent = glossary.length;

  if(glossary.length===0){
    glossaryListEl.innerHTML='';
    glossaryEmptyWrap.innerHTML = emptyStateHtml('Глосарій порожній', 'Додай перший термін кнопкою «Термін» вгорі, щоб почати поповнювати свій словник.');
    return;
  }
  if(items.length===0){
    glossaryListEl.innerHTML='';
    glossaryEmptyWrap.innerHTML = emptyStateHtml('Нічого не знайдено', 'Спробуй інший запит або скинь фільтр категорії.');
    return;
  }
  glossaryEmptyWrap.innerHTML='';

  if(glossaryViewMode==='grouped'){
    const groups = {};
    items.forEach(t=>{ const c=t.category||'Без категорії'; (groups[c]||=[]).push(t); });
    let idx = 0;
    glossaryListEl.innerHTML = Object.keys(groups).sort().map(cat=>{
      const col = categoryColor(cat);
      const rows = groups[cat].map(t=>termRowHtml(t, idx++)).join('');
      return `<div class="glossary-group">
        <div class="glossary-group-head"><span class="dot" style="background:${col}"></span><h4>${esc(cat)}</h4><span class="n">${groups[cat].length}</span></div>
        <div class="glossary-list">${rows}</div>
      </div>`;
    }).join('');
  } else {
    glossaryListEl.innerHTML = items.map((t,i)=>termRowHtml(t,i)).join('');
  }

  glossaryListEl.querySelectorAll('.term-row').forEach(row=>{
    row.addEventListener('click', ()=>openGlossaryModal(Number(row.dataset.term)));
  });
  glossaryListEl.querySelectorAll('[data-learn-toggle]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      toggleTermLearned(Number(btn.dataset.learnToggle));
    });
  });
}

const glossaryViewIndicator = document.getElementById('glossaryViewIndicator');
function moveGlossaryViewIndicator(btn){
  glossaryViewIndicator.style.width = btn.offsetWidth + 'px';
  glossaryViewIndicator.style.left = btn.offsetLeft + 'px';
}
document.getElementById('glossaryViewToggle').addEventListener('click',(e)=>{
  const btn = e.target.closest('button[data-mode]');
  if(!btn) return;
  glossaryViewMode = btn.dataset.mode;
  document.querySelectorAll('#glossaryViewToggle button').forEach(b=>b.classList.toggle('active', b===btn));
  moveGlossaryViewIndicator(btn);
  renderGlossary();
});
moveGlossaryViewIndicator(document.querySelector('#glossaryViewToggle button.active'));
glossarySearchInput.addEventListener('input',(e)=>{ glossarySearchQuery = e.target.value.trim().toLowerCase(); renderGlossary(); });

/* ---- власний випадаючий список сортування (той самий підхід, що й categoryCombo) ---- */
const sortCombo = document.getElementById('sortCombo');
const sortComboToggle = document.getElementById('sortComboToggle');
const sortComboLabel = document.getElementById('sortComboLabel');
const sortSuggestList = document.getElementById('sortSuggestList');

function openSortCombo(){ sortCombo.classList.add('open'); }
function closeSortCombo(){ sortCombo.classList.remove('open'); }
sortComboToggle.addEventListener('click', ()=>{
  sortCombo.classList.contains('open') ? closeSortCombo() : openSortCombo();
});
sortSuggestList.querySelectorAll('li[data-value]').forEach(li=>{
  li.addEventListener('click', ()=>{
    glossarySortOrder = li.dataset.value;
    sortComboLabel.textContent = li.textContent;
    sortSuggestList.querySelectorAll('li').forEach(x=>x.classList.toggle('active', x===li));
    closeSortCombo();
    renderGlossary();
  });
});

/* ---- glossary term modal (roomy, with priority + rich text) ---- */
const glossaryModal = document.getElementById('glossaryModal');
const glossaryTermInput = document.getElementById('glossaryTermInput');
const glossaryExplInput = document.getElementById('glossaryExplInput');
const glossaryCategoryInput = document.getElementById('glossaryCategoryInput');
const categoryCombo = document.getElementById('categoryCombo');
const categoryComboToggle = document.getElementById('categoryComboToggle');
const categorySuggestList = document.getElementById('categorySuggestList');
const glossaryDeleteBtn = document.getElementById('glossaryDeleteBtn');
const priorityPicker = document.getElementById('priorityPicker');

function renderPriorityPicker(){
  priorityPicker.innerHTML = PRIORITY.map(p=>`
    <button type="button" class="priority-btn ${selectedPriority===p.id?'selected':''}" data-p="${p.id}" style="--pr-color:${p.color};--pr-color-soft:${hexAlpha(p.color,.16)}">
      <span class="dot"></span>${p.label}
    </button>`).join('');
  priorityPicker.querySelectorAll('.priority-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      selectedPriority = b.dataset.p;
      // перемикаємо клас на вже наявних кнопках замість перебудови DOM —
      // тільки так CSS-перехід (transition) встигає плавно анімуватись
      priorityPicker.querySelectorAll('.priority-btn').forEach(btn=>{
        btn.classList.toggle('selected', btn.dataset.p===selectedPriority);
      });
    });
  });
}

/* ---- колір категорії: користувач може обрати вручну зі свотчів (сховані за іконкою-палітрою) ---- */
const categoryColorSwatches = document.getElementById('categoryColorSwatches');
const categoryColorDot = document.getElementById('categoryColorDot');
const categoryColorSwatchesWrap = document.getElementById('categoryColorSwatchesWrap');
let selectedCategoryColor = CATEGORY_COLORS[0];
function renderCategoryColorSwatches(){
  categoryColorSwatches.innerHTML = CATEGORY_COLORS.map(c=>`
    <button type="button" class="swatch-btn ${selectedCategoryColor===c?'selected':''}" data-c="${c}" style="background:${c}"></button>`).join('');
  categoryColorSwatches.querySelectorAll('.swatch-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      selectedCategoryColor = b.dataset.c;
      renderCategoryColorSwatches();
      setTimeout(closeCategorySwatches, 150);
    });
  });
  categoryColorDot.style.setProperty('--dot-color', selectedCategoryColor);
}
function closeCategorySwatches(){
  categoryColorDot.classList.remove('open');
  categoryColorSwatchesWrap.classList.remove('open');
}
categoryColorDot.addEventListener('click', ()=>{
  const isOpen = categoryColorSwatchesWrap.classList.toggle('open');
  categoryColorDot.classList.toggle('open', isOpen);
});
function syncCategoryColorToInput(){
  // міняємо колір автоматично тільки якщо введена назва точно збігається
  // з уже існуючою категорією — інакше колір "стрибав" би на кожну літеру
  const cat = glossaryCategoryInput.value.trim();
  if(cat && glossaryCategories().includes(cat)){
    selectedCategoryColor = categoryColor(cat);
    renderCategoryColorSwatches();
  }
}
glossaryCategoryInput.addEventListener('input', syncCategoryColorToInput);

/* ---- власний випадаючий список категорій (замість нативного datalist,
   якого не можна ані перефарбувати, ані плавно анімувати, ані змусити
   коректно закриватись при кліку повз нього) ---- */
function openCategoryCombo(){ categoryCombo.classList.add('open'); renderCategorySuggestions(); }
function closeCategoryCombo(){ categoryCombo.classList.remove('open'); }
function renderCategorySuggestions(){
  const q = glossaryCategoryInput.value.trim().toLowerCase();
  const matches = glossaryCategories().filter(c => c.toLowerCase().includes(q));
  categorySuggestList.innerHTML = matches.length
    ? matches.map(c => {
        const col = categoryColor(c);
        return `<li data-cat="${esc(c)}"><span class="category-pill"><span class="dot" style="background:${col}"></span>${esc(c)}</span></li>`;
      }).join('')
    : `<li class="empty">Немає збережених категорій</li>`;
  categorySuggestList.querySelectorAll('li[data-cat]').forEach(li=>{
    li.addEventListener('click', ()=>{
      glossaryCategoryInput.value = li.dataset.cat;
      syncCategoryColorToInput();
      closeCategoryCombo();
    });
  });
}
categoryComboToggle.addEventListener('click', ()=>{
  categoryCombo.classList.contains('open') ? closeCategoryCombo() : openCategoryCombo();
});
glossaryCategoryInput.addEventListener('focus', openCategoryCombo);
glossaryCategoryInput.addEventListener('input', renderCategorySuggestions);
document.addEventListener('click', (e)=>{
  if(!categoryCombo.contains(e.target)) closeCategoryCombo();
  if(!sortCombo.contains(e.target)) closeSortCombo();
  if(!eventTypeCombo.contains(e.target)) closeEventTypeCombo();
  if(!eventTypeColorDot.contains(e.target) && !eventTypeSwatchesWrap.contains(e.target)) closeEventTypeSwatches();
  if(!categoryColorDot.contains(e.target) && !categoryColorSwatchesWrap.contains(e.target)) closeCategorySwatches();
});
document.addEventListener('keydown', (e)=>{
  if(e.key==='Escape'){ closeCategoryCombo(); closeSortCombo(); closeEventTypeCombo(); closeEventTypeSwatches(); closeCategorySwatches(); }
});

function openGlossaryModal(id=null){
  editingGlossaryId = id;
  const t = id ? glossary.find(g=>g.id===id) : null;
  document.getElementById('glossaryModalTitle').textContent = t ? 'Редагувати термін' : 'Новий термін';
  glossaryTermInput.value = t?.term || '';
  glossaryExplInput.innerHTML = t?.explanationHtml || '';
  updateExplPlaceholder();
  glossaryImages = (t?.images || []).map(im=>({...im}));
  renderImgGallery();
  glossaryCategoryInput.value = t?.category || '';
  closeCategoryCombo();
  closeCategorySwatches();
  selectedCategoryColor = t?.category ? categoryColor(t.category) : CATEGORY_COLORS[0];
  renderCategoryColorSwatches();
  selectedPriority = t?.priority || 'medium';
  renderPriorityPicker();
  glossaryDeleteBtn.style.display = t ? 'block' : 'none';
  resetGlossaryDeleteConfirm();
  savedEditorRange = null;
  openModal(glossaryModal);
  setTimeout(()=>glossaryTermInput.focus(),300);
}
document.getElementById('glossaryModalClose').addEventListener('click', ()=>{ closeModal(glossaryModal); hideSelectionToolbar(); resetGlossaryDeleteConfirm(); });
document.getElementById('glossarySaveBtn').addEventListener('click', ()=>{
  const term = glossaryTermInput.value.trim();
  if(!term){ glossaryTermInput.focus(); return; }
  const explanationHtml = sanitizeExplanationHtml(glossaryExplInput.innerHTML.trim());
  const category = glossaryCategoryInput.value.trim() || 'Без категорії';
  categoryColors[category] = selectedCategoryColor;
  const images = glossaryImages.map(im=>({...im}));
  if(editingGlossaryId){
    const t = glossary.find(g=>g.id===editingGlossaryId);
    t.term=term; t.explanationHtml=explanationHtml; t.category=category; t.priority=selectedPriority; t.images=images;
  } else {
    glossary.unshift({id:glossaryIdCounter++, term, explanationHtml, category, priority:selectedPriority, images, learned:false});
  }
  saveState();
  closeModal(glossaryModal);
  hideSelectionToolbar();
  renderGlossary();
  if(document.getElementById('view-overview').classList.contains('active')) renderOverview();
  showToast('Термін збережено');
});
const glossaryDeleteBtnLabel = glossaryDeleteBtn.textContent;
let glossaryDeleteConfirmTimeout = null;
function resetGlossaryDeleteConfirm(){
  clearTimeout(glossaryDeleteConfirmTimeout);
  glossaryDeleteConfirmTimeout = null;
  glossaryDeleteBtn.classList.remove('confirm');
  glossaryDeleteBtn.textContent = glossaryDeleteBtnLabel;
}
glossaryDeleteBtn.addEventListener('click', ()=>{
  if(!glossaryDeleteBtn.classList.contains('confirm')){
    glossaryDeleteBtn.classList.add('confirm');
    glossaryDeleteBtn.textContent = 'Точно видалити?';
    glossaryDeleteConfirmTimeout = setTimeout(resetGlossaryDeleteConfirm, 5000);
    return;
  }
  resetGlossaryDeleteConfirm();
  glossary = glossary.filter(g=>g.id!==editingGlossaryId);
  saveState();
  closeModal(glossaryModal);
  hideSelectionToolbar();
  renderGlossary();
  showToast('Термін видалено');
});

/* ---- floating selection formatting toolbar ---- */
const selectionToolbar = document.getElementById('selectionToolbar');

function getEditorSelectionRange(){
  const sel = window.getSelection();
  if(!sel || sel.rangeCount===0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if(!glossaryExplInput.contains(range.commonAncestorContainer)) return null;
  return range;
}
function showSelectionToolbar(range){
  const rect = range.getBoundingClientRect();
  if(rect.width===0 && rect.height===0) { hideSelectionToolbar(); return; }
  // не даємо панелі вилізти за лівий/правий край екрана (важливо на вузьких мобільних)
  const margin = 8;
  const toolbarWidth = selectionToolbar.offsetWidth || 200;
  const minLeft = toolbarWidth / 2 + margin;
  const maxLeft = window.innerWidth - toolbarWidth / 2 - margin;
  const left = Math.min(Math.max(rect.left + rect.width / 2, minLeft), maxLeft);
  selectionToolbar.style.left = left + 'px';
  selectionToolbar.style.top = (rect.top - 10) + 'px';
  selectionToolbar.classList.add('show');
}
function hideSelectionToolbar(){ selectionToolbar.classList.remove('show','colors-open'); }

document.addEventListener('selectionchange', ()=>{
  if(!glossaryModal.classList.contains('open')){ hideSelectionToolbar(); return; }
  const sel = window.getSelection();
  if(sel && sel.rangeCount>0){
    const r = sel.getRangeAt(0);
    if(glossaryExplInput.contains(r.commonAncestorContainer)) savedEditorRange = r.cloneRange();
  }
  const range = getEditorSelectionRange();
  if(range) showSelectionToolbar(range); else hideSelectionToolbar();
});

/* ---- images gallery: a separate block under the explanation text (not inline) ---- */
const glossaryImgBtn = document.getElementById('glossaryImgBtn');
const glossaryImgInput = document.getElementById('glossaryImgInput');
const glossaryImgGallery = document.getElementById('glossaryImgGallery');

function bindGalleryItem(wrap, imgId){
  const handle = wrap.querySelector('.img-resize-handle');
  const removeBtn = wrap.querySelector('.img-remove-btn');
  const sizeTag = wrap.querySelector('.img-size-tag');
  handle.addEventListener('pointerdown', (e)=>{
    e.preventDefault(); e.stopPropagation();
    handle.setPointerCapture(e.pointerId);
    wrap.classList.add('resizing');
    const startX = e.clientX;
    const startWidth = wrap.getBoundingClientRect().width;
    const maxW = glossaryImgGallery.clientWidth || 600;
    const onMove = (ev)=>{
      const dx = ev.clientX - startX;
      const w = Math.max(90, Math.min(maxW, Math.round(startWidth + dx)));
      wrap.style.width = w + 'px';
      if(sizeTag) sizeTag.textContent = w + ' px';
    };
    const onUp = ()=>{
      wrap.classList.remove('resizing');
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      const rec = glossaryImages.find(im=>im.id===imgId);
      if(rec) rec.width = parseInt(wrap.style.width, 10);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  });
  removeBtn.addEventListener('click', (e)=>{
    e.preventDefault(); e.stopPropagation();
    glossaryImages = glossaryImages.filter(im=>im.id!==imgId);
    renderImgGallery();
  });
}

function renderImgGallery(){
  const hasItems = glossaryImages.length > 0;
  glossaryImgGallery.classList.toggle('has-items', hasItems);
  if(!hasItems){
    glossaryImgGallery.innerHTML = '<span class="img-gallery-placeholder">Тут з\'являться додані фото — перетягни файл, встав з буфера (Ctrl+V) або натисни «Зображення»</span>';
    return;
  }
  glossaryImgGallery.innerHTML = glossaryImages.map(im=>`
    <div class="img-wrap" style="width:${im.width || 220}px">
      <img src="${im.src}" alt="зображення">
      <span class="img-size-tag"></span>
      <button type="button" class="img-remove-btn" title="Видалити зображення">
        <svg class="icon" style="width:13px;height:13px" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      <span class="img-resize-handle"></span>
    </div>`).join('');
  glossaryImgGallery.querySelectorAll('.img-wrap').forEach((wrap, i)=> bindGalleryItem(wrap, glossaryImages[i].id));
}

function addImageToGallery(dataUrl, naturalWidth){
  const width = Math.max(140, Math.min(naturalWidth || 220, 320));
  glossaryImages.push({id: 'img'+Math.random().toString(36).slice(2)+glossaryImages.length, src:dataUrl, width});
  renderImgGallery();
}
function handleImageFile(file){
  if(!file || !file.type || !file.type.startsWith('image/')) return;
  readAndResizeImage(file, 900).then(dataUrl=>{
    const probe = new Image();
    probe.onload = ()=> addImageToGallery(dataUrl, probe.naturalWidth);
    probe.onerror = ()=> addImageToGallery(dataUrl);
    probe.src = dataUrl;
  }).catch(()=> showToast('Не вдалося завантажити зображення'));
}
glossaryImgBtn.addEventListener('click', ()=> glossaryImgInput.click());
glossaryImgInput.addEventListener('change', (e)=>{
  Array.from(e.target.files || []).forEach(handleImageFile);
  glossaryImgInput.value = '';
});
// плейсхолдер керується класом, а не CSS :empty — після стирання тексту
// в contenteditable часто лишається порожній <br>, і :empty перестає спрацьовувати
function updateExplPlaceholder(){
  glossaryExplInput.classList.toggle('is-empty', glossaryExplInput.textContent.trim()==='');
}
glossaryExplInput.addEventListener('input', updateExplPlaceholder);
// паста скріншота під час набору тексту — потрапляє в галерею знизу, а не в середину речення
glossaryExplInput.addEventListener('paste', (e)=>{
  const items = (e.clipboardData && e.clipboardData.items) || [];
  for(const item of items){
    if(item.type && item.type.startsWith('image/')){
      e.preventDefault();
      handleImageFile(item.getAsFile());
      return;
    }
  }
});
[glossaryExplInput, glossaryImgGallery].forEach(zone=>{
  zone.addEventListener('dragover', (e)=>{ e.preventDefault(); glossaryImgGallery.classList.add('drag-over'); });
  zone.addEventListener('dragleave', ()=> glossaryImgGallery.classList.remove('drag-over'));
  zone.addEventListener('drop', (e)=>{
    glossaryImgGallery.classList.remove('drag-over');
    const files = e.dataTransfer && e.dataTransfer.files;
    if(files && files.length){
      e.preventDefault();
      Array.from(files).forEach(handleImageFile);
    }
  });
});

/* ---- text formatting: bold / underline / highlight (with color picker) / clear ---- */
function applyFormat(cmd, range, color){
  if(cmd==='clear'){
    const frag = range.extractContents();
    const plain = document.createTextNode(frag.textContent);
    range.insertNode(plain);
    return;
  }
  if(cmd==='highlight'){
    const container = range.commonAncestorContainer;
    const parentEl = container.nodeType===3 ? container.parentElement : container;
    if(parentEl && parentEl.tagName && parentEl.tagName.toLowerCase()==='mark' && parentEl.classList.contains('term-mark') && glossaryExplInput.contains(parentEl)){
      if(parentEl.dataset.color === color){
        const frag = document.createDocumentFragment();
        while(parentEl.firstChild) frag.appendChild(parentEl.firstChild);
        parentEl.replaceWith(frag);
      } else {
        parentEl.dataset.color = color;
        parentEl.style.background = color;
      }
      return;
    }
    const mark = document.createElement('mark');
    mark.className = 'term-mark';
    mark.dataset.color = color;
    mark.style.background = color;
    try{ range.surroundContents(mark); }
    catch(err){ const frag = range.extractContents(); mark.appendChild(frag); range.insertNode(mark); }
    return;
  }

  const tag = cmd==='bold' ? 'strong' : cmd==='underline' ? 'u' : null;
  if(!tag) return;

  // перемкнути вимкнено: виділення вже всередині елемента того ж тега — розгортаємо, а не вкладаємо
  const container = range.commonAncestorContainer;
  const parentEl = container.nodeType===3 ? container.parentElement : container;
  if(parentEl && parentEl.tagName && parentEl.tagName.toLowerCase()===tag && glossaryExplInput.contains(parentEl)){
    const frag = document.createDocumentFragment();
    while(parentEl.firstChild) frag.appendChild(parentEl.firstChild);
    parentEl.replaceWith(frag);
    return;
  }

  const el = document.createElement(tag);
  try{
    range.surroundContents(el);
  } catch(err){
    const frag = range.extractContents();
    el.appendChild(frag);
    range.insertNode(el);
  }
}
selectionToolbar.addEventListener('mousedown', (e)=>{
  e.preventDefault();
  const btn = e.target.closest('button[data-cmd]');
  if(!btn) return;
  if(btn.dataset.cmd === 'highlight'){
    const range = getEditorSelectionRange();
    if(!range) return;
    applyFormat('highlight', range, '#514d2a');
    window.getSelection().removeAllRanges();
    hideSelectionToolbar();
    return;
  }
  if(btn.dataset.cmd === 'copy'){
    const range = getEditorSelectionRange();
    if(!range) return;
    const text = range.toString();
    navigator.clipboard.writeText(text)
      .then(()=>showToast('Текст скопійовано'))
      .catch(()=>showToast('Не вдалося скопіювати'));
    window.getSelection().removeAllRanges();
    hideSelectionToolbar();
    return;
  }
  const range = getEditorSelectionRange();
  if(!range) return;
  applyFormat(btn.dataset.cmd, range);
  window.getSelection().removeAllRanges();
  hideSelectionToolbar();
});

/* ---- review (flashcards) ---- */
const reviewModal = document.getElementById('reviewModal');
const reviewBody = document.getElementById('reviewBody');
const reviewEmptyWrap = document.getElementById('reviewEmptyWrap');
const flipCard = document.getElementById('flipCard');
const flipCardViewport = document.getElementById('flipCardViewport');
let reviewItems = [];
let reviewIndex = 0;

function shuffleArray(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function openReview(){
  reviewItems = filteredGlossary();
  reviewIndex = 0;
  if(reviewItems.length===0){
    reviewBody.style.display='none';
    reviewEmptyWrap.style.display='block';
    reviewEmptyWrap.innerHTML = `<div class="review-empty">Немає термінів для повторення за поточним фільтром. Додай терміни або скинь фільтр.</div>`;
  } else {
    reviewBody.style.display='block';
    reviewEmptyWrap.style.display='none';
    renderReviewCard();
  }
  openModal(reviewModal);
}
function renderReviewCard(){
  const t = reviewItems[reviewIndex];
  flipCard.classList.remove('flipped');
  document.getElementById('reviewProgress').textContent = `${reviewIndex+1} / ${reviewItems.length}`;
  document.getElementById('reviewTermText').textContent = t.term;
  const galleryHtml = (t.images && t.images.length) ? `<div class="review-gallery">${t.images.map(im=>`<img src="${im.src}" style="width:${Math.min(im.width||160,180)}px" alt="">`).join('')}</div>` : '';
  document.getElementById('reviewExplText').innerHTML = (t.explanationHtml || 'Пояснення ще не додане.') + galleryHtml;
  const col = categoryColor(t.category || 'Без категорії');
  const pr = priorityInfo(t.priority);
  const badgesHtml = `
    <span class="category-pill"><span class="dot" style="background:${col}"></span>${esc(t.category||'Без категорії')}</span>
    <span class="category-pill"><span class="dot" style="background:${pr.color}"></span>${pr.label}</span>`;
  document.getElementById('reviewBadgesFront').innerHTML = badgesHtml;
  document.getElementById('reviewBadgesBack').innerHTML = badgesHtml;
}
flipCard.addEventListener('click', ()=>flipCard.classList.toggle('flipped'));

let reviewAnimating = false;
function animateReviewCard(step){
  if(reviewAnimating || !reviewItems.length) return;
  reviewAnimating = true;

  // клон "заморожує" вигляд поточної картки — саме він поїде геть,
  // а оригінал (#flipCard) одразу оновлюється новим текстом і заїжджає з протилежного боку
  const clone = flipCard.cloneNode(true);
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  clone.classList.add('flip-card-clone');
  flipCardViewport.appendChild(clone);

  reviewIndex = (reviewIndex + step + reviewItems.length) % reviewItems.length;
  renderReviewCard();
  flipCard.classList.add('no-anim');
  flipCard.classList.remove('pos-left','pos-right');
  flipCard.classList.add(step > 0 ? 'pos-right' : 'pos-left');
  void flipCard.offsetWidth; // форсуємо reflow, щоб стартова позиція не анімувалась
  flipCard.classList.remove('no-anim');

  setTimeout(()=>{
    clone.classList.add(step > 0 ? 'pos-left' : 'pos-right'); // клон їде геть
    flipCard.classList.remove('pos-left','pos-right'); // оригінал заїжджає в центр
  }, 20);

  setTimeout(()=>{
    clone.remove();
    reviewAnimating = false;
  }, 380);
}
function markReviewCard(learned){
  const t = reviewItems[reviewIndex];
  if(!t) return;
  t.learned = learned;
  saveState();
  renderGlossary();

  if(learned && glossaryStatusFilter==='unlearned'){
    reviewItems.splice(reviewIndex, 1);
    if(reviewItems.length===0){
      reviewBody.style.display='none';
      reviewEmptyWrap.style.display='block';
      reviewEmptyWrap.innerHTML = `<div class="review-empty">🎉 Усе вивчено за поточним фільтром!</div>`;
      return;
    }
    if(reviewIndex >= reviewItems.length) reviewIndex = 0;
    renderReviewCard();
  } else {
    animateReviewCard(1);
  }
}
document.getElementById('reviewMarkLearned').addEventListener('click', ()=>markReviewCard(true));
document.getElementById('reviewMarkUnlearned').addEventListener('click', ()=>markReviewCard(false));
document.getElementById('reviewPrev').addEventListener('click', ()=>animateReviewCard(-1));
document.getElementById('reviewNext').addEventListener('click', ()=>animateReviewCard(1));
document.getElementById('reviewShuffle').addEventListener('click', ()=>{
  if(!reviewItems.length) return;
  reviewItems = shuffleArray(reviewItems);
  reviewIndex = 0;
  renderReviewCard();
  showToast('Перемішано');
});
document.getElementById('reviewBtn').addEventListener('click', openReview);
document.getElementById('reviewModalClose').addEventListener('click', ()=>closeModal(reviewModal));
document.addEventListener('keydown', (e)=>{
  if(!reviewModal.classList.contains('open')) return;
  if(e.key === 'ArrowLeft'){ e.preventDefault(); animateReviewCard(-1); }
  else if(e.key === 'ArrowRight'){ e.preventDefault(); animateReviewCard(1); }
  else if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); flipCard.classList.toggle('flipped'); }
});

/* ============================================================
   OVERVIEW VIEW
   ============================================================ */
function renderOverview(){
  const h = new Date().getHours();
  const salut = h<6?'Доброї ночі':h<12?'Доброго ранку':h<18?'Доброго дня':'Доброго вечора';
  document.getElementById('greetingText').textContent = `${salut}, ${profile.name}! 👋`;
  document.getElementById('greetingDate').textContent = new Intl.DateTimeFormat('uk-UA',{weekday:'long',day:'numeric',month:'long'}).format(new Date());

  document.getElementById('statLists').textContent = lists.length;
  document.getElementById('statDone').textContent = totalDoneItems();
  document.getElementById('statActive').textContent = totalActiveItems();
  document.getElementById('statEvents').textContent = (events[todayStr]||[]).length;

  const agendaMini = document.getElementById('agendaMini');
  const todays = events[todayStr]||[];
  agendaMini.innerHTML = todays.length ? todays.slice().sort((a,b)=>(a.time||'').localeCompare(b.time||'')).map(e=>{
    const col = eventTypeColor(e.type||'Інше');
    return `<div class="agenda-mini-row" style="--pill-line:${mutedColor(col)}"><span class="t">${eventTimeRange(e)||'—'}</span><span class="n">${esc(e.title)}</span></div>`;
  }).join('') : `<div class="dash-empty">На сьогодні планів немає. Загляни в календар, щоб додати.</div>`;

  const listsProgress = document.getElementById('listsProgress');
  listsProgress.innerHTML = lists.length ? lists.map(l=>{
    const total=l.items.length, done=l.items.filter(i=>i.done).length;
    const pct = total? Math.round(done/total*100):0;
    return `<div class="lp-row" data-list="${l.id}">
      <div class="lp-top"><span class="lname">${esc(l.name)}</span><span class="lcount">${done}/${total}</span></div>
      <div class="lp-track"><div class="lp-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('') : `<div class="dash-empty">Списків ще немає.</div>`;
  listsProgress.querySelectorAll('.lp-row').forEach(el=>{
    el.addEventListener('click', ()=>{ activeListId=Number(el.dataset.list); setActiveView('notes'); });
  });
}

/* ============================================================
   CALENDAR
   ============================================================ */
const MONTH_NAMES = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
const WEEKDAY_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
const calendarGrid = document.getElementById('calendarGrid');
const calendarGridTrack = document.getElementById('calendarGridTrack');
const calendarAgenda = document.getElementById('calendarAgenda');
const calTitle = document.getElementById('calTitle');

function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function firstWeekdayMon(y,m){ let d=new Date(y,m,1).getDay(); return d===0?6:d-1; }

function renderCalendar(){
  calTitle.textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;
  const total = daysInMonth(calYear, calMonth);
  const startOffset = firstWeekdayMon(calYear, calMonth);
  // клітинки сусідніх місяців лишаємо порожніми (null) — їхні числа належать
  // власним календарям, тут вони тільки заповнювали б тиждень
  const cells = [];
  for(let i=0;i<startOffset;i++) cells.push(null);
  for(let d=1; d<=total; d++) cells.push({d, m:calMonth, y:calYear});
  while(cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for(let i=0;i<cells.length;i+=7) weeks.push(cells.slice(i,i+7));

  calendarGridTrack.innerHTML = weeks.map(week=>{
    const hasEv = week.map(c => c ? ((events[fmtDate(c.y,c.m,c.d)]||[]).length>0) : false);
    return `<div class="cal-row">${week.map((c,i)=>{
      if(!c) return `<div class="day-cell day-cell-empty"></div>`;
      const key = fmtDate(c.y,c.m,c.d);
      const evs = events[key]||[];
      const isToday = key===todayStr;
      const shown = evs.slice(0,3);
      const more = evs.length-shown.length;

      // "живіша" сітка: клітинка з подіями підростає, якщо сусід(и) в
      // тому самому тижні порожні; порожня клітинка відповідно трохи
      // звужується, звільняючи місце — але лишається повністю клікабельною
      let growClass = '';
      if(hasEv[i]){
        const hasEmptyNeighbor = (i>0 && !hasEv[i-1]) || (i<6 && !hasEv[i+1]);
        growClass = hasEmptyNeighbor ? 'grow-1' : '';
      } else {
        const hasFullNeighbor = (i>0 && hasEv[i-1]) || (i<6 && hasEv[i+1]);
        growClass = hasFullNeighbor ? 'shrink-1' : '';
      }

      return `<div class="day-cell ${isToday?'is-today':''} ${growClass}" data-key="${key}">
        <span class="day-num">${c.d}</span>
        ${more>0?`<span class="day-count-badge">${evs.length}+</span>`:''}
        <div class="day-events">
          ${shown.map(e=>{
            const col = eventTypeColor(e.type||'Інше');
            const range = eventTimeRange(e);
            return `<div class="ev-pill" data-pill-of="${key}" style="--pill-line:${mutedColor(col)}"><span class="ev-pill-text">${range?`<span class="ev-pill-time">${range}</span> `:''}${esc(e.title)}</span></div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')}</div>`;
  }).join('');

  calendarGrid.querySelectorAll('.day-cell:not(.day-cell-empty)').forEach(cell=>{
    cell.addEventListener('click', (e)=>{
      if(e.target.closest('.ev-pill')) return;
      openDayModal(cell.dataset.key);
    });
  });
  bindPillClicks(calendarGrid);
  markOverflowingPills(calendarGrid);

  renderAgenda();
}
function markOverflowingPills(root){
  root.querySelectorAll('.day-events .ev-pill').forEach(pill=>{
    const text = pill.querySelector('.ev-pill-text');
    if(!text) return;
    const overflow = text.offsetWidth - pill.clientWidth + 16;
    if(overflow > 0){
      pill.classList.add('is-overflow');
      pill.style.setProperty('--marquee-dist', `-${overflow + 4}px`);
    }
  });
}
function bindPillClicks(root){
  root.querySelectorAll('[data-key], [data-key].agenda-row').forEach(cell=>{
    const key = cell.dataset.key;
    cell.querySelectorAll('.ev-pill').forEach((pill, idx)=>{
      pill.addEventListener('click',(e)=>{
        e.stopPropagation();
        const ev = (events[key]||[])[idx];
        if(ev) openEventViewModal(key, ev.id);
      });
    });
  });
}
function renderAgenda(){
  const total = daysInMonth(calYear, calMonth);
  let html='';
  for(let d=1; d<=total; d++){
    const key = fmtDate(calYear, calMonth, d);
    const evs = events[key]||[];
    const isToday = key===todayStr;
    const wd = WEEKDAY_SHORT[(new Date(calYear,calMonth,d).getDay()+6)%7];
    html += `<div class="agenda-row ${isToday?'is-today':''}" data-key="${key}">
      <div class="agenda-date"><div class="d">${d}</div><div class="w">${wd}</div></div>
      <div class="agenda-events">
        ${evs.length? evs.map(e=>{
          const col = eventTypeColor(e.type||'Інше');
          const range = eventTimeRange(e);
          return `<div class="ev-pill agenda-ev" style="--pill-line:${mutedColor(col)}">
            <div class="ev-pill-main">${range?`<span class="ev-pill-time">${range}</span>`:''}<span class="ev-pill-title">${esc(e.title)}</span></div>
            ${e.location?`<div class="ev-pill-loc"><svg class="icon" viewBox="0 0 24 24"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/></svg>${esc(e.location)}</div>`:''}
          </div>`;
        }).join('') : '<span class="agenda-empty">Немає планів</span>'}
      </div>
      <div class="agenda-add"><svg class="icon" style="width:14px;height:14px" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></div>
    </div>`;
  }
  calendarAgenda.innerHTML = html;
  calendarAgenda.querySelectorAll('.agenda-row').forEach(row=>{
    row.addEventListener('click',(e)=>{
      if(e.target.closest('.ev-pill')) return;
      openDayModal(row.dataset.key);
    });
  });
  bindPillClicks(calendarAgenda);
}

/* ---- модалка дня: список уже створених подій + кнопка додати нову ---- */
const dayModal = document.getElementById('dayModal');
const dayModalList = document.getElementById('dayModalList');
const dayModalEmptyWrap = document.getElementById('dayModalEmptyWrap');
let dayModalKey = null;
function openDayModal(key){
  dayModalKey = key;
  const d = new Date(key+'T00:00:00');
  document.getElementById('dayModalTitle').textContent = new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long'}).format(d);
  renderDayModalList();
  openModal(dayModal);
}
function renderDayModalList(){
  const evs = (events[dayModalKey]||[]).slice().sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  if(evs.length===0){
    dayModalList.innerHTML='';
    dayModalEmptyWrap.innerHTML = emptyStateHtml('На цей день ще нічого не заплановано', 'Натисни «Нова подія» нижче, щоб додати перший план.');
  } else {
    dayModalEmptyWrap.innerHTML='';
    dayModalList.innerHTML = evs.map(e=>{
      const col = eventTypeColor(e.type||'Інше');
      const range = eventTimeRange(e);
      return `<div class="day-modal-ev" data-id="${e.id}" style="--pill-line:${mutedColor(col)}">
        <div class="dme-time">${range||'—'}</div>
        <div class="dme-main">
          <div class="dme-title">${esc(e.title)}</div>
          ${e.location?`<div class="dme-loc"><svg class="icon" viewBox="0 0 24 24"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/></svg>${esc(e.location)}</div>`:''}
        </div>
      </div>`;
    }).join('');
    dayModalList.querySelectorAll('.day-modal-ev').forEach(row=>{
      row.addEventListener('click', ()=>{
        closeModal(dayModal);
        openEventViewModal(dayModalKey, Number(row.dataset.id));
      });
    });
  }
}
document.getElementById('dayModalAddBtn').addEventListener('click', ()=>{
  closeModal(dayModal);
  openEventModal(dayModalKey);
});
document.getElementById('dayModalClose').addEventListener('click', ()=>closeModal(dayModal));
let calAnimating = false;
function navigateMonth(dir){
  if(calAnimating) return;
  calAnimating = true;

  const enterSide = dir>0 ? 'cal-off-right' : 'cal-off-left';
  const exitSide = dir>0 ? 'cal-off-left' : 'cal-off-right';

  const oldHeight = calendarGrid.offsetHeight;
  const ghost = document.createElement('div');
  ghost.className = 'cal-ghost';
  ghost.innerHTML = calendarGridTrack.innerHTML;
  calendarGrid.style.height = oldHeight+'px';
  calendarGrid.appendChild(ghost);

  calMonth += dir;
  if(calMonth<0){ calMonth=11; calYear--; }
  if(calMonth>11){ calMonth=0; calYear++; }
  renderCalendar();

  calendarGridTrack.classList.add('cal-no-anim', enterSide);
  void calendarGridTrack.offsetWidth;
  calendarGridTrack.classList.remove('cal-no-anim');
  const newHeight = calendarGridTrack.scrollHeight;

  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    calendarGridTrack.classList.remove(enterSide);
    ghost.classList.add(exitSide);
    calendarGrid.style.height = newHeight+'px';
  }));

  const safetyTimer = setTimeout(finishNavigate, 600);
  function finishNavigate(){
    if(!calAnimating) return;
    clearTimeout(safetyTimer);
    ghost.remove();
    calendarGrid.style.height = '';
    calAnimating = false;
    calendarGridTrack.removeEventListener('transitionend', onTrackTransitionEnd);
  }
  function onTrackTransitionEnd(e){
    if(e.target!==calendarGridTrack || e.propertyName!=='transform') return;
    finishNavigate();
  }
  calendarGridTrack.addEventListener('transitionend', onTrackTransitionEnd);
}
document.getElementById('calPrev').addEventListener('click', ()=>navigateMonth(-1));
document.getElementById('calNext').addEventListener('click', ()=>navigateMonth(1));
document.getElementById('calToday').addEventListener('click', ()=>{ calYear=CY; calMonth=CM; renderCalendar(); showToast('Перейшли до сьогодні'); });

const eventModal = document.getElementById('eventModal');
const eventTitleInput = document.getElementById('eventTitleInput');
const eventDateInput = document.getElementById('eventDateInput');
const eventTimeInput = document.getElementById('eventTimeInput');
const eventEndTimeInput = document.getElementById('eventEndTimeInput');
const eventLocationInput = document.getElementById('eventLocationInput');
const eventNoteInput = document.getElementById('eventNoteInput');
const eventReminderInput = document.getElementById('eventReminderInput');
const eventTypeInput = document.getElementById('eventTypeInput');
const eventTypeCombo = document.getElementById('eventTypeCombo');
const eventTypeComboToggle = document.getElementById('eventTypeComboToggle');
const eventTypeSuggestList = document.getElementById('eventTypeSuggestList');
const eventTypeColorSwatches = document.getElementById('eventTypeColorSwatches');
const eventTypeColorDot = document.getElementById('eventTypeColorDot');
const eventTypeSwatchesWrap = document.getElementById('eventTypeSwatchesWrap');
const eventDeleteBtn = document.getElementById('eventDeleteBtn');
let selectedEventTypeColor = CATEGORY_COLORS[0];

/* ---- степер часу: стрілки ±5 хв, або можна вписати точний час вручну ---- */
function parseTimeInput(raw){
  const s = raw.trim();
  if(!s) return null;
  let h, m;
  if(s.includes(':')){
    const [hs, ms] = s.split(':');
    h = parseInt(hs,10); m = parseInt(ms,10);
  } else if(/^\d{3,4}$/.test(s)){
    const digits = s.padStart(4,'0');
    h = parseInt(digits.slice(0,2),10); m = parseInt(digits.slice(2),10);
  } else if(/^\d{1,2}$/.test(s)){
    h = parseInt(s,10); m = 0;
  } else return null;
  if(isNaN(h)||isNaN(m)||h<0||h>23||m<0||m>59) return null;
  return h*60+m;
}
function formatMinutes(total){
  total = ((total%1440)+1440)%1440;
  const h = Math.floor(total/60), m = total%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function wireTimeStepper(input){
  const wrap = input.closest('.time-stepper');
  wrap.querySelectorAll('.time-stepper-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const dir = Number(btn.dataset.dir);
      const current = parseTimeInput(input.value);
      input.value = formatMinutes((current===null ? -dir*5 : current) + dir*5);
    });
  });
  input.addEventListener('blur', ()=>{
    const mins = parseTimeInput(input.value);
    input.value = mins===null ? '' : formatMinutes(mins);
  });
  input.addEventListener('keydown', (e)=>{
    if(e.key==='Enter') input.blur();
  });
}
wireTimeStepper(eventTimeInput);
wireTimeStepper(eventEndTimeInput);

function renderEventTypeColorSwatches(){
  eventTypeColorSwatches.innerHTML = CATEGORY_COLORS.map(c=>`
    <button type="button" class="swatch-btn ${selectedEventTypeColor===c?'selected':''}" data-c="${c}" style="background:${c}"></button>`).join('');
  eventTypeColorSwatches.querySelectorAll('.swatch-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      selectedEventTypeColor = b.dataset.c;
      renderEventTypeColorSwatches();
      setTimeout(closeEventTypeSwatches, 150);
    });
  });
  eventTypeColorDot.style.setProperty('--dot-color', selectedEventTypeColor);
}
function closeEventTypeSwatches(){
  eventTypeColorDot.classList.remove('open');
  eventTypeSwatchesWrap.classList.remove('open');
}
eventTypeColorDot.addEventListener('click', ()=>{
  const isOpen = eventTypeSwatchesWrap.classList.toggle('open');
  eventTypeColorDot.classList.toggle('open', isOpen);
});
function syncEventTypeColorToInput(){
  // міняємо колір автоматично тільки якщо введена назва точно збігається
  // з уже існуючим типом — інакше колір "стрибав" би на кожну літеру
  const t = eventTypeInput.value.trim();
  if(t && eventTypeNames().includes(t)){
    selectedEventTypeColor = eventTypeColor(t);
    renderEventTypeColorSwatches();
  }
}
eventTypeInput.addEventListener('input', syncEventTypeColorToInput);

/* ---- власний випадаючий список типів подій (той самий підхід, що й categoryCombo) ---- */
function openEventTypeCombo(){ eventTypeCombo.classList.add('open'); renderEventTypeSuggestions(); }
function closeEventTypeCombo(){ eventTypeCombo.classList.remove('open'); }
function renderEventTypeSuggestions(){
  const q = eventTypeInput.value.trim().toLowerCase();
  const matches = eventTypeNames().filter(t => t.toLowerCase().includes(q));
  eventTypeSuggestList.innerHTML = matches.length
    ? matches.map(t => {
        const col = eventTypeColor(t);
        return `<li data-type="${esc(t)}"><span class="category-pill"><span class="dot" style="background:${col}"></span>${esc(t)}</span></li>`;
      }).join('')
    : `<li class="empty">Немає збережених типів</li>`;
  eventTypeSuggestList.querySelectorAll('li[data-type]').forEach(li=>{
    li.addEventListener('click', ()=>{
      eventTypeInput.value = li.dataset.type;
      syncEventTypeColorToInput();
      closeEventTypeCombo();
    });
  });
}
eventTypeComboToggle.addEventListener('click', ()=>{
  eventTypeCombo.classList.contains('open') ? closeEventTypeCombo() : openEventTypeCombo();
});
eventTypeInput.addEventListener('focus', openEventTypeCombo);
eventTypeInput.addEventListener('input', renderEventTypeSuggestions);

const eventViewModal = document.getElementById('eventViewModal');
const eventViewTitle = document.getElementById('eventViewTitle');
const eventViewBody = document.getElementById('eventViewBody');
let viewingEventKey = null, viewingEventId = null;
function openEventViewModal(key, eventId){
  const ev = (events[key]||[]).find(e=>e.id===eventId);
  if(!ev) return;
  viewingEventKey = key; viewingEventId = eventId;
  eventViewTitle.textContent = ev.title;
  const col = eventTypeColor(ev.type||'Інше');
  const range = eventTimeRange(ev);
  const rows = [];
  if(range) rows.push(`<div class="ev-view-row"><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>${esc(range)}</div>`);
  if(ev.type) rows.push(`<div class="ev-view-row"><span class="category-pill"><span class="dot" style="background:${col}"></span>${esc(ev.type)}</span></div>`);
  if(ev.location) rows.push(`<div class="ev-view-row"><svg class="icon" viewBox="0 0 24 24"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/></svg>${esc(ev.location)}</div>`);
  eventViewBody.innerHTML = rows.join('') + (ev.note ? `<div class="ev-view-note">${esc(ev.note)}</div>` : '');
  openModal(eventViewModal);
}
document.getElementById('eventViewEditBtn').addEventListener('click', ()=>{
  closeModal(eventViewModal);
  openEventModal(viewingEventKey, viewingEventId);
});
document.getElementById('eventViewClose').addEventListener('click', ()=>closeModal(eventViewModal));
document.getElementById('eventViewDeleteBtn').addEventListener('click', ()=>{
  events[viewingEventKey] = (events[viewingEventKey]||[]).filter(e=>e.id!==viewingEventId);
  saveState();
  closeModal(eventViewModal); renderCalendar(); showToast('План видалено');
});

function openEventModal(key, eventId=null){
  editingEventKey=key; editingEventId=eventId;
  const list = events[key]||[];
  const ev = eventId ? list.find(e=>e.id===eventId) : null;
  document.getElementById('eventModalTitle').textContent = ev?'Редагувати план':'Новий план';
  eventTitleInput.value = ev?.title||'';
  eventDateInput.value = key;
  eventTimeInput.value = ev?.time||'';
  eventEndTimeInput.value = ev?.endTime||'';
  eventLocationInput.value = ev?.location||'';
  eventNoteInput.value = ev?.note||'';
  eventReminderInput.value = ev?.reminderAt||'';
  eventTypeInput.value = ev?.type || '';
  closeEventTypeCombo();
  closeEventTypeSwatches();
  selectedEventTypeColor = eventTypeColor(eventTypeInput.value || 'Інше');
  renderEventTypeColorSwatches();
  eventDeleteBtn.style.display = ev?'block':'none';
  openModal(eventModal);
  setTimeout(()=>eventTitleInput.focus(),300);
}
document.getElementById('eventSaveBtn').addEventListener('click', ()=>{
  const title = eventTitleInput.value.trim();
  if(!title){ eventTitleInput.focus(); return; }
  const key = eventDateInput.value || editingEventKey;
  const type = eventTypeInput.value.trim() || 'Інше';
  eventTypeColors[type] = selectedEventTypeColor;
  const fields = {
    title,
    time: eventTimeInput.value,
    endTime: eventEndTimeInput.value,
    type,
    location: eventLocationInput.value.trim(),
    note: eventNoteInput.value.trim(),
    reminderAt: eventReminderInput.value,
  };
  if(editingEventId){
    const list = events[editingEventKey]||[];
    const ev = list.find(e=>e.id===editingEventId);
    if(key!==editingEventKey){
      events[editingEventKey] = list.filter(e=>e.id!==editingEventId);
      Object.assign(ev, fields);
      (events[key]||=[]).push(ev);
    } else { Object.assign(ev, fields); }
  } else {
    (events[key]||=[]).push({id:eventIdCounter++, ...fields});
  }
  saveState();
  closeModal(eventModal); renderCalendar(); if(document.getElementById('view-overview').classList.contains('active')) renderOverview(); showToast('План збережено');
});
eventDeleteBtn.addEventListener('click', ()=>{
  events[editingEventKey] = (events[editingEventKey]||[]).filter(e=>e.id!==editingEventId);
  saveState();
  closeModal(eventModal); renderCalendar(); showToast('План видалено');
});
document.getElementById('eventModalClose').addEventListener('click', ()=>closeModal(eventModal));

/* ============================================================
   PROFILE
   ============================================================ */
function renderProfile(){
  document.getElementById('profStatLists').textContent = lists.length;
  document.getElementById('profStatDone').textContent = totalDoneItems();
}
function applyProfileToUI(){
  const initial = profile.name.trim().charAt(0).toUpperCase() || 'В';
  const avatarSm = document.getElementById('avatarSm');
  const avatarLg = document.getElementById('avatarLg');
  if(profile.photo){
    avatarSm.innerHTML = `<img src="${profile.photo}" alt="">`;
    avatarLg.innerHTML = `<img src="${profile.photo}" alt="">`;
  } else {
    avatarSm.textContent = initial;
    avatarLg.textContent = initial;
  }
  document.getElementById('avatarUploadWrap').classList.toggle('has-photo', !!profile.photo);
  document.getElementById('sidebarName').textContent = profile.name;
  document.getElementById('sidebarEmail').textContent = profile.email;
  document.getElementById('profileName').textContent = profile.name;
  document.getElementById('profileEmailDisplay').textContent = profile.email;
  const [jy,jm,jd] = profile.joinDate.split('-').map(Number);
  document.getElementById('profJoinDate').textContent = new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'short',year:'numeric'}).format(new Date(jy,jm-1,jd));
}
document.getElementById('profileNameInput').addEventListener('input', (e)=>{ profile.name=e.target.value||'Користувач'; applyProfileToUI(); saveState(); });
document.getElementById('profileEmailInput').addEventListener('input', (e)=>{ profile.email=e.target.value; applyProfileToUI(); saveState(); });

function readAndResizeImage(file, maxSize=256){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Не вдалося прочитати зображення'));
      img.onload = () => {
        let {width, height} = img;
        if(width > height){ if(width > maxSize){ height = Math.round(height*maxSize/width); width = maxSize; } }
        else { if(height > maxSize){ width = Math.round(width*maxSize/height); height = maxSize; } }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', .85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
document.getElementById('avatarEditBtn').addEventListener('click', ()=>{
  document.getElementById('avatarFileInput').click();
});
document.getElementById('avatarFileInput').addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  e.target.value = '';
  if(!file) return;
  if(!file.type.startsWith('image/')){ showToast('Обери файл зображення'); return; }
  try{
    profile.photo = await readAndResizeImage(file);
    applyProfileToUI();
    saveState();
    showToast('Фото оновлено');
  }catch(err){
    showToast('Не вдалося завантажити фото');
  }
});
document.getElementById('avatarRemoveBtn').addEventListener('click', ()=>{
  profile.photo = null;
  applyProfileToUI();
  saveState();
  showToast('Фото видалено');
});
document.querySelectorAll('.toggle[data-pref]').forEach(t=>{
  t.classList.toggle('on', !!prefs[t.dataset.pref]);
  t.addEventListener('click', ()=>{
    const key = t.dataset.pref;
    prefs[key] = !prefs[key];
    t.classList.toggle('on', prefs[key]);
    saveState();
    if(key==='compact') renderNotes();
    if(key==='hints'){ renderNotes(); renderGlossary(); }
  });
});
document.getElementById('profileMini').addEventListener('click', ()=>setActiveView('profile'));

const langSegIndicator = document.getElementById('langSegIndicator');
function moveLangIndicator(btn){
  langSegIndicator.style.width = btn.offsetWidth + 'px';
  langSegIndicator.style.left = btn.offsetLeft + 'px';
}
document.querySelectorAll('.lang-seg-btn').forEach(btn=>{
  if(btn.dataset.lang === prefs.lang) btn.classList.add('active'); else btn.classList.remove('active');
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.lang-seg-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    moveLangIndicator(btn);
    prefs.lang = btn.dataset.lang;
    saveState();
  });
});
moveLangIndicator(document.querySelector('.lang-seg-btn.active'));

/* ============================================================
   INIT
   ============================================================ */
applyProfileToUI();
renderListsSidebar();
renderOverview();
renderNotes();
renderGlossary();
renderCalendar();
renderProfile();
setTimeout(()=>{ const active=document.querySelector('.nav-item.active'); if(active) positionNavIndicator(active); },50);
