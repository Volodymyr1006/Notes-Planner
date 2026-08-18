/* ============================================================
   STATE (in-memory only — дані не зберігаються між перезавантаженнями)
   ============================================================ */
const COLORS = [
  {id:'violet', v:'#8b6bff'}, {id:'teal', v:'#4fd1c5'}, {id:'amber', v:'#e8b34f'},
  {id:'rose', v:'#e88ba3'}, {id:'slate', v:'#8b93a8'},
];
const pad = n => String(n).padStart(2,'0');
const todayDate = new Date();
const todayStr = `${todayDate.getFullYear()}-${pad(todayDate.getMonth()+1)}-${pad(todayDate.getDate())}`;
const fmtDate = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
const esc = s => { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; };
const hexAlpha = (hex,a) => { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; };

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
  }catch(e){
    console.warn('Не вдалося прочитати збережені дані, використовую демо-дані.', e);
  }
  if(!lists.find(l=>l.id===activeListId)) activeListId = lists[0]?.id;
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    lists, listIdCounter, itemIdCounter, activeListId,
    events, eventIdCounter, profile, prefs,
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
function closeModal(el){ el.classList.remove('open'); document.body.style.overflow=''; }
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
  if(name==='calendar') renderCalendar();
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
    checkList.innerHTML = list.items.map(i=>`
      <div class="check-item ${i.done?'done':''}" data-item="${i.id}">
        <span class="check-box" data-toggle="${i.id}"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>
        <span class="txt" data-toggle="${i.id}">${esc(i.text)}</span>
        <button class="del" data-del="${i.id}"><svg class="icon" style="width:15px;height:15px" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg></button>
      </div>`).join('');
    checkList.querySelectorAll('[data-toggle]').forEach(el=>{
      el.addEventListener('click', ()=>toggleItem(Number(el.dataset.toggle)));
    });
    checkList.querySelectorAll('[data-del]').forEach(el=>{
      el.addEventListener('click', (e)=>{ e.stopPropagation(); deleteItem(Number(el.dataset.del)); });
    });
    notesFooterRow.style.display = 'flex';
    notesCountText.textContent = `${total} пункт${total===1?'':total<5?'и':'ів'}`;
    document.getElementById('clearDoneBtn').style.visibility = done>0 ? 'visible' : 'hidden';
  }
  renderListsSidebar();
}
function emptyStateHtml(title, sub){
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v5h5"/></svg>
    <span>${esc(title)}</span><p>${esc(sub)}</p></div>`;
}
function toggleItem(id){
  const list = activeList(); if(!list) return;
  const item = list.items.find(i=>i.id===id); if(!item) return;
  item.done = !item.done;
  saveState();
  renderNotes();
}
function deleteItem(id){
  const list = activeList(); if(!list) return;
  list.items = list.items.filter(i=>i.id!==id);
  saveState();
  renderNotes();
  showToast('Пункт видалено');
}
function addItem(text){
  const list = activeList(); if(!list) return;
  text = text.trim(); if(!text) return;
  list.items.push({id:itemIdCounter++, text, done:false});
  quickAddInput.value='';
  saveState();
  renderNotes();
}
document.getElementById('quickAddBtn').addEventListener('click', ()=>addItem(quickAddInput.value));
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
    const col = COLORS.find(c=>c.id===e.color)?.v || COLORS[0].v;
    return `<div class="agenda-mini-row" style="--pill-line:${col}"><span class="t">${e.time||'—'}</span><span class="n">${esc(e.title)}</span></div>`;
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
const calendarAgenda = document.getElementById('calendarAgenda');
const calTitle = document.getElementById('calTitle');

function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function firstWeekdayMon(y,m){ let d=new Date(y,m,1).getDay(); return d===0?6:d-1; }

function renderCalendar(){
  calTitle.textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;
  const total = daysInMonth(calYear, calMonth);
  const startOffset = firstWeekdayMon(calYear, calMonth);
  const prevTotal = daysInMonth(calMonth===0?calYear-1:calYear, calMonth===0?11:calMonth-1);
  const cells = [];
  for(let i=startOffset-1;i>=0;i--) cells.push({d:prevTotal-i, other:true, m:calMonth-1});
  for(let d=1; d<=total; d++) cells.push({d, other:false, m:calMonth});
  let nextDay = 1;
  while(cells.length < 42) cells.push({d:nextDay++, other:true, m:calMonth+1});

  calendarGrid.innerHTML = cells.map(c=>{
    let y=calYear, m=calMonth;
    if(c.other){ if(c.m<0){m=11;y=calYear-1;} else if(c.m>11){m=0;y=calYear+1;} else m=c.m; }
    const key = fmtDate(y,m,c.d);
    const evs = events[key]||[];
    const isToday = key===todayStr;
    const shown = evs.slice(0,3);
    const more = evs.length-shown.length;
    return `<div class="day-cell ${c.other?'other-month':''} ${isToday?'is-today':''}" data-key="${key}">
      <span class="day-num">${c.d}</span>
      <div class="day-events">
        ${shown.map(e=>{
          const col = COLORS.find(cc=>cc.id===e.color)?.v || COLORS[0].v;
          return `<div class="ev-pill" data-pill-of="${key}" style="--pill-color:${hexAlpha(col,.18)};--pill-line:${col}">${e.time?e.time+' ':''}${esc(e.title)}</div>`;
        }).join('')}
        ${more>0?`<div class="ev-more">+${more} ще</div>`:''}
      </div>
    </div>`;
  }).join('');

  calendarGrid.querySelectorAll('.day-cell').forEach(cell=>{
    cell.addEventListener('click', (e)=>{
      if(e.target.closest('.ev-pill')) return;
      openEventModal(cell.dataset.key);
    });
  });
  bindPillClicks(calendarGrid);

  renderAgenda();
}
function bindPillClicks(root){
  root.querySelectorAll('[data-key], [data-key].agenda-row').forEach(cell=>{
    const key = cell.dataset.key;
    cell.querySelectorAll('.ev-pill').forEach((pill, idx)=>{
      pill.addEventListener('click',(e)=>{
        e.stopPropagation();
        const ev = (events[key]||[])[idx];
        if(ev) openEventModal(key, ev.id);
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
          const col = COLORS.find(cc=>cc.id===e.color)?.v || COLORS[0].v;
          return `<div class="ev-pill" style="--pill-color:${hexAlpha(col,.18)};--pill-line:${col}">${e.time?e.time+' ':''}${esc(e.title)}</div>`;
        }).join('') : '<span class="agenda-empty">Немає планів</span>'}
      </div>
      <div class="agenda-add"><svg class="icon" style="width:14px;height:14px" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></div>
    </div>`;
  }
  calendarAgenda.innerHTML = html;
  calendarAgenda.querySelectorAll('.agenda-row').forEach(row=>{
    row.addEventListener('click',(e)=>{
      if(e.target.closest('.ev-pill')) return;
      openEventModal(row.dataset.key);
    });
  });
  bindPillClicks(calendarAgenda);
}
document.getElementById('calPrev').addEventListener('click', ()=>{ calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); });
document.getElementById('calNext').addEventListener('click', ()=>{ calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); });
document.getElementById('calToday').addEventListener('click', ()=>{ calYear=CY; calMonth=CM; renderCalendar(); showToast('Перейшли до сьогодні'); });

const eventModal = document.getElementById('eventModal');
const eventTitleInput = document.getElementById('eventTitleInput');
const eventDateInput = document.getElementById('eventDateInput');
const eventTimeInput = document.getElementById('eventTimeInput');
const eventSwatches = document.getElementById('eventSwatches');
const eventDeleteBtn = document.getElementById('eventDeleteBtn');
let selectedEventColor='violet';
eventSwatches.innerHTML = COLORS.map(c=>`<button type="button" class="swatch-btn" data-c="${c.id}" style="background:${c.v}"></button>`).join('');
eventSwatches.querySelectorAll('.swatch-btn').forEach(b=>b.addEventListener('click', ()=>{ selectedEventColor=b.dataset.c; updateEventSwatchUI(); }));
function updateEventSwatchUI(){ eventSwatches.querySelectorAll('.swatch-btn').forEach(b=>b.classList.toggle('selected', b.dataset.c===selectedEventColor)); }

function openEventModal(key, eventId=null){
  editingEventKey=key; editingEventId=eventId;
  const list = events[key]||[];
  const ev = eventId ? list.find(e=>e.id===eventId) : null;
  document.getElementById('eventModalTitle').textContent = ev?'Редагувати план':'Новий план';
  eventTitleInput.value = ev?.title||'';
  eventDateInput.value = key;
  eventTimeInput.value = ev?.time||'';
  selectedEventColor = ev?.color||'violet';
  updateEventSwatchUI();
  eventDeleteBtn.style.display = ev?'block':'none';
  openModal(eventModal);
  setTimeout(()=>eventTitleInput.focus(),300);
}
document.getElementById('eventSaveBtn').addEventListener('click', ()=>{
  const title = eventTitleInput.value.trim();
  if(!title){ eventTitleInput.focus(); return; }
  const key = eventDateInput.value || editingEventKey;
  if(editingEventId){
    const list = events[editingEventKey]||[];
    const ev = list.find(e=>e.id===editingEventId);
    if(key!==editingEventKey){
      events[editingEventKey] = list.filter(e=>e.id!==editingEventId);
      ev.title=title; ev.time=eventTimeInput.value; ev.color=selectedEventColor;
      (events[key]||=[]).push(ev);
    } else { ev.title=title; ev.time=eventTimeInput.value; ev.color=selectedEventColor; }
  } else {
    (events[key]||=[]).push({id:eventIdCounter++, title, time:eventTimeInput.value, color:selectedEventColor});
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
  t.addEventListener('click', ()=>{
    const key = t.dataset.pref;
    prefs[key] = !prefs[key];
    t.classList.toggle('on', prefs[key]);
    saveState();
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
renderCalendar();
renderProfile();
setTimeout(()=>{ const active=document.querySelector('.nav-item.active'); if(active) positionNavIndicator(active); },50);
