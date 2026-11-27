import {partners, officers, publicOfficersUrl, sampleEvents, previewOfficers, previewPartners} from './public-content.js';
const $ = (s) => document.querySelector(s);
const root = document.documentElement;
const previewParam=new URLSearchParams(location.search).get('preview');
let preview=previewParam==='1';try{if(previewParam==='1'||previewParam==='0')sessionStorage.setItem('awssbg-preview',previewParam);preview=sessionStorage.getItem('awssbg-preview')==='1'}catch{}
if(preview){document.querySelectorAll('#previewNotice,#previewToggle').forEach(n=>n.hidden=false);$('#previewToggle')?.setAttribute('href','/?preview=0');}
const API_URL = 'https://xxbmakdu4d.execute-api.us-east-1.amazonaws.com/prod/events';
const el = (tag, cls, text) => {const node=document.createElement(tag); if(cls) node.className=cls; if(text!==undefined) node.textContent=text; return node;};
const year=$('#currentYear'); if(year) year.textContent=new Date().getFullYear();
const themeToggle=$('#themeToggle');
function applyTheme(theme){const dark=theme==='dark';root.dataset.theme=theme;themeToggle?.setAttribute('aria-pressed',String(dark));themeToggle?.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');$('meta[name=theme-color]')?.setAttribute('content',dark?'#101e2d':'#e6f0f5');}
applyTheme(root.dataset.theme==='dark'?'dark':'light');
let transitioning=false;
themeToggle?.addEventListener('click',()=>{
 if(transitioning)return;
 const next=root.dataset.theme==='dark'?'light':'dark';
 const change=()=>{applyTheme(next);try{localStorage.setItem('awssbg-theme',next)}catch{}};
 if(root.dataset.motion==='paused'||!document.startViewTransition||!CSS.supports('mask-image','radial-gradient(circle at 0 0, black, transparent)')||matchMedia('(prefers-reduced-motion: reduce)').matches){change();return;}
 transitioning=true;root.classList.add('theme-changing');
 try{const transition=document.startViewTransition(change);transition.finished.catch(()=>{}).finally(()=>{transitioning=false;root.classList.remove('theme-changing')});}catch{change();transitioning=false;root.classList.remove('theme-changing');}
});
const menu=$('#menuToggle'), nav=$('#navMenu');
function setMenu(open){nav?.classList.toggle('is-open',open);menu?.setAttribute('aria-expanded',String(open));menu?.setAttribute('aria-label',open?'Close navigation':'Open navigation');}
menu?.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))setMenu(false)});
matchMedia('(min-width: 1001px)').addEventListener('change',()=>setMenu(false));
if(nav){const current=location.pathname;nav.querySelectorAll('a').forEach(a=>{if(current!=='/'&&a.getAttribute('href')===current)a.setAttribute('aria-current','page')});}
function safeImage(value){if(!value||typeof value!=='string')return null;try{const url=new URL(value,location.origin);return (url.protocol==='https:'||url.origin===location.origin&&url.protocol==='http:')?url.href:null;}catch{return null;}}
// Keep both the sections and navigation links hidden until real content exists.
function reveal(kind, sectionId){document.querySelectorAll(`[data-requires="${kind}"]`).forEach(node=>node.hidden=false);const section=document.getElementById(sectionId);if(section)section.hidden=false;}
function renderPartners(){
 const valid=(partners.length?partners:preview?previewPartners:[]).filter(p=>p&&typeof p.name==='string'&&p.name.trim()&&safeImage(p.logo));
 if(!valid.length)return;
 const grid=$('#partnerGalaxy');
 Promise.all(valid.map(p=>new Promise(resolve=>{const img=el('img');img.alt=p.name;img.onload=()=>resolve({p,img});img.onerror=()=>resolve(null);img.src=safeImage(p.logo);}))).then(results=>{
 const loaded=results.filter(Boolean);if(!loaded.length)return;
 if(grid){grid.replaceChildren();for(const {p,img} of loaded){const node=el('figure','partner-node');const bubble=el('div','partner-logo');bubble.append(img);node.append(bubble,el('figcaption','partner-name',p.name));grid.append(node);}}
 reveal('partners','partners');});
}
function cleanOfficers(records,fromApi=false){return records.filter(o=>o&&!o.sample&&(!fromApi||o.status==='published')&&[o.name,o.office,o.position].every(v=>typeof v==='string'&&v.trim())).map(({name,office,position,image})=>({name,office,position,image}));}
async function renderOfficers(){
 let roster=cleanOfficers(officers);
 if(publicOfficersUrl){try{const url=new URL(publicOfficersUrl,location.origin);if(url.protocol!=='https:'&&url.origin!==location.origin)throw Error('Unsafe URL');const res=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(5000)});if(!res.ok)throw Error('Unavailable');const data=await res.json();const rows=Array.isArray(data)?data:data.officers;if(!Array.isArray(rows))throw Error('Invalid roster');roster=cleanOfficers(rows,true);}catch{/* Keep only explicitly approved local roster, if any. */}}
 if(!roster.length&&preview)roster=previewOfficers;
 if(!roster.length){const empty=$('#peopleUnavailable');if(empty)empty.hidden=false;return;}
 reveal('officers','officers');const list=$('#officerList');if(!list)return;const groups=new Map();roster.forEach(o=>{if(!groups.has(o.office))groups.set(o.office,[]);groups.get(o.office).push(o);});
 for(const [office,people] of groups){const section=el('section','office');const heading=el('div','office-heading');heading.append(el('h3','',office));const grid=el('div','officer-grid');people.forEach(o=>{const card=el('article','officer-card');const image=el('img');image.src=safeImage(o.image)||'/assets/public-design/portrait-1.svg';image.alt=`Portrait of ${o.name}`;image.loading='lazy';image.width=400;image.height=400;card.append(image,el('h4','',o.name),el('p','',o.position));grid.append(card);});section.append(heading,grid);list.append(section);}
}
const dateFormat=new Intl.DateTimeFormat('en-PH',{dateStyle:'long',timeZone:'Asia/Manila'});
function eventDay(value){if(!value)return null;const raw=String(value);const match=/^\d{4}-\d{2}-\d{2}$/.test(raw);const d=new Date(match?raw+'T12:00:00+08:00':raw);return Number.isNaN(d.getTime())?null:d;}
function dateLabel(value){const d=eventDay(value);return d?dateFormat.format(d):'Date to be announced';}
function dateKey(d){return new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Manila'}).format(d);}
function eventState(event){const d=eventDay(event.date);return !d?'undated':dateKey(d)<dateKey(new Date())?'past':'upcoming';}
const escapeXML=s=>String(s).replace(/[<>&"']/g,ch=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[ch]));
// Original editorial poster art: generated per event, not a missing-image box.
function poster(event){const colors=['#54788c','#627d91','#6a8995','#536e87'];const c=colors[(event.theme??0)%4];const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="${c}"/><circle cx="1500" cy="230" r="128" fill="#e1f1f5" opacity=".7"/><path d="M0 790 420 360 680 620 1060 240 1560 710 1920 420V1080H0Z" fill="#b5cedb"/><path d="M0 840 400 570 860 860 1300 480 1920 830V1080H0Z" fill="#6c8ea2"/><path d="M0 910Q460 750 920 945T1920 840V1080H0Z" fill="#d6e7ef"/></svg>`;return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}
function cover(event){const img=el('img','event-cover');img.alt=`Cover artwork for ${event.title||'Community event'}`;img.width=1920;img.height=1080;img.loading='lazy';const source=safeImage(event.coverImageUrl||event.imageUrl||event.coverImage||event.image);img.src=source||poster(event);if(source)img.addEventListener('error',()=>{img.src=poster(event)},{once:true});return img;}
const icons={date:'M4 6h16v14H4zM8 3v6m8-6v6M4 10h16',location:'M12 22s7-7 7-13a7 7 0 1 0-14 0c0 6 7 13 7 13zm0-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6',time:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2'};
function meta(kind,value){const p=el('p','event-meta');const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',icons[kind]);svg.append(path);p.append(svg,document.createTextNode(value));return p;}
function metadata(e){return [meta('date',dateLabel(e.date)),meta('location',e.location||'Venue to be announced'),...(typeof e.time==='string'&&e.time.trim()?[meta('time',e.time)]:[])];}
function showDetails(e){const dialog=$('#eventDialog'), detail=$('#eventDetail');if(!dialog||!detail)return;const title=el('h2','',e.title||'Community event');title.id='eventDialogTitle';detail.replaceChildren(cover(e),title,...metadata(e));if(e.description)detail.append(el('p','',String(e.description)));if(e.sample)detail.append(el('p','data-note','Illustrative event only. This is not a confirmed activity.'));dialog.showModal();}
$('#eventDialog form button')?.addEventListener('click',e=>{e.preventDefault();$('#eventDialog').close();});
let events=[],activeFilter='all',statusMessage='';
function renderEvents(){const list=$('#eventList'),status=$('#eventStatus');if(!list||!status)return;const visible=events.filter(e=>activeFilter==='all'||eventState(e)===activeFilter);list.replaceChildren();status.textContent=[statusMessage,visible.length?`${visible.length} ${visible.length===1?'event':'events'} shown.`:'No matching events.'].filter(Boolean).join(' ');for(const e of visible){const card=el('article','event-card');const body=el('div','event-body');const state=eventState(e);const label=(e.sample?'Sample · ':'')+({upcoming:'Upcoming',past:'Past event',undated:'Date pending'}[state]);const more=el('button','event-more');more.type='button';more.setAttribute('aria-label',`View details: ${e.title||'Community event'}`);more.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';more.addEventListener('click',()=>showDetails(e));body.classList.add('with-more');const metaRow=el('div','event-meta-row');metaRow.append(meta('location',e.location||'Venue to be announced'),meta('date',dateLabel(e.date)),...(typeof e.time==='string'&&e.time.trim()?[meta('time',e.time)]:[]));body.append(el('h3','',e.title||'Community event'),metaRow);const badge=el('span','event-label',label);badge.dataset.state=state;card.append(cover(e),badge,body,more);list.append(card);}}
async function loadEvents(){if(!$('#eventList'))return;try{const res=await fetch(API_URL,{signal:AbortSignal.timeout(8500)});if(!res.ok)throw Error(`HTTP ${res.status}`);const data=await res.json();if(!Array.isArray(data.events))throw Error('Unexpected events data');events=data.events.filter(e=>e&&e.status==='published');events.sort((a,b)=>{const ap=eventState(a)==='past',bp=eventState(b)==='past';if(ap!==bp)return ap?1:-1;const ad=eventDay(a.date)?.getTime()??Infinity,bd=eventDay(b.date)?.getTime()??Infinity;return ap?bd-ad:ad-bd;});if(!events.length){statusMessage=preview?'No published events yet. Showing illustrative events.':'No published events yet.';events=preview?sampleEvents:[];}}catch{statusMessage=preview?'Live events unavailable. Showing illustrative events.':'Live events are temporarily unavailable.';events=preview?sampleEvents:[];}renderEvents();}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderEvents();}));
renderPartners();renderOfficers();loadEvents();
// Non-blocking scroll reveals: never hide content when reduced motion is enabled.
if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll('body[data-page="home"] main > .section,body[data-page="home"] main > .partner-section').forEach(e=>{e.classList.add('reveal-on-scroll');observer.observe(e)});}
