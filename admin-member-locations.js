const MEMBER_LOCATIONS_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co/functions/v1/vote-member-locations';
const MEMBER_LOCATIONS_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const MEMBER_LOCATIONS_SESSION_KEY = 'axinene_admin_pin_session';
const MEMBER_LOCATIONS_LEVEL_KEY = 'axinene_admin_access_level';
let locationCatalog = [];

const mlEscape = (value='') => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const mlKey = (value='') => String(value).trim().replace(/\s+/g,' ').toLowerCase();
const mlAbsolute = () => sessionStorage.getItem(MEMBER_LOCATIONS_LEVEL_KEY) === 'full';
function mlToast(message,type='info',timeout=4200){const r=document.getElementById('toastRegion');if(!r)return;const e=document.createElement('div');e.className=`toast ${type}`;e.textContent=message;r.appendChild(e);setTimeout(()=>e.remove(),timeout);}
async function mlApi(action,payload={}){
  const token=sessionStorage.getItem(MEMBER_LOCATIONS_SESSION_KEY)||'';
  if(!token) throw new Error('Sessão administrativa não encontrada.');
  const res=await fetch(MEMBER_LOCATIONS_URL,{method:'POST',headers:{'Content-Type':'application/json',apikey:MEMBER_LOCATIONS_KEY,'x-client-info':'axinene-member-locations/1.1'},cache:'no-store',body:JSON.stringify({action,token,...payload})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data?.ok===false) throw new Error(data?.message||'Não foi possível gerir Coordenações e Zonas.');
  return data;
}
function installMlStyles(){if(document.getElementById('memberLocationStyles'))return;const s=document.createElement('style');s.id='memberLocationStyles';s.textContent=`
.member-location-card{margin-bottom:18px}.member-location-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px}.member-location-head h2{margin:0 0 5px}.member-location-head p{margin:0;color:var(--muted);font-size:12px}.member-location-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.member-location-form{border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--surface-soft)}.member-location-form h3{margin:0 0 9px;font-size:14px}.member-location-form .stack-form{gap:9px}.member-location-list{display:grid;gap:8px;margin-top:14px}.member-location-row{border:1px solid var(--line);border-radius:12px;padding:10px}.member-location-row strong{display:block;color:var(--blue-950)}.member-location-zones{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.member-location-zones span{padding:5px 8px;border-radius:999px;background:#eef5ff;color:#154f88;font-size:10px;font-weight:800}.member-location-special{border-color:#bedfc9;background:#f7fff9}.member-location-select{width:100%}@media(max-width:760px){.member-location-grid{grid-template-columns:1fr}}
`;document.head.appendChild(s);}
function coordinationOptions(selected=''){
  return locationCatalog.map(c=>`<option value="${mlEscape(c.name)}" ${mlKey(c.name)===mlKey(selected)?'selected':''}>${mlEscape(c.name)}</option>`).join('');
}
function zoneOptions(coordName,selected=''){
  const coord=locationCatalog.find(c=>mlKey(c.name)===mlKey(coordName));
  const zones=coord?.zones||[];
  return '<option value="">Sem zona / não definida</option>'+zones.map(z=>`<option value="${mlEscape(z.name)}" ${mlKey(z.name)===mlKey(selected)?'selected':''}>${mlEscape(z.name)}</option>`).join('');
}
function replaceInputWithSelect(id,type){
  const current=document.getElementById(id);if(!current)return null;
  const previous=current.value||'';
  if(current.tagName==='SELECT'){
    if(type==='coordination') current.innerHTML=coordinationOptions(previous||'Direção Nacional');
    else current.innerHTML=zoneOptions(document.getElementById(id.includes('Edit')?'memberEditDelegation':'voterDelegation')?.value||'Direção Nacional',previous);
    return current;
  }
  const select=document.createElement('select');select.id=id;select.className='member-location-select';
  if(type==='coordination') select.innerHTML=coordinationOptions(previous||'Direção Nacional');
  else select.innerHTML=zoneOptions(document.getElementById(id.includes('Edit')?'memberEditDelegation':'voterDelegation')?.value||'Direção Nacional',previous);
  current.replaceWith(select);return select;
}
function refreshMemberFormSelects(){
  if(!mlAbsolute())return;
  const addCoord=replaceInputWithSelect('voterDelegation','coordination');
  const addZone=replaceInputWithSelect('voterZone','zone');
  const editCoord=replaceInputWithSelect('memberEditDelegation','coordination');
  const editZone=replaceInputWithSelect('memberEditZone','zone');
  const setCoordLabel=(id)=>{const el=document.getElementById(id);const label=el?.closest('label');if(label&&label.childNodes[0])label.childNodes[0].textContent='Coordenação ';};
  setCoordLabel('voterDelegation');setCoordLabel('memberEditDelegation');
  if(addCoord&&!addCoord.dataset.locationBound){addCoord.dataset.locationBound='1';addCoord.addEventListener('change',()=>{if(addZone)addZone.innerHTML=zoneOptions(addCoord.value,'');});}
  if(editCoord&&!editCoord.dataset.locationBound){editCoord.dataset.locationBound='1';editCoord.addEventListener('change',()=>{if(editZone)editZone.innerHTML=zoneOptions(editCoord.value,'');});}
}
function renderCatalog(){
  refreshMemberFormSelects();
  const root=document.getElementById('memberLocationCatalogList');if(!root)return;
  root.innerHTML=locationCatalog.map(c=>`<article class="member-location-row ${c.is_special?'member-location-special':''}"><strong>${mlEscape(c.name)}</strong><div class="member-location-zones">${(c.zones||[]).length?(c.zones||[]).map(z=>`<span>${mlEscape(z.name)}</span>`).join(''):'<span>Sem zonas cadastradas</span>'}</div></article>`).join('');
  const zoneCoord=document.getElementById('newZoneCoordination');if(zoneCoord){const old=zoneCoord.value;zoneCoord.innerHTML=coordinationOptions(old);}
}
function ensureMlCard(){
  if(!mlAbsolute())return null;installMlStyles();
  let card=document.getElementById('memberLocationCard');if(card)return card;
  const view=document.getElementById('adminViewVoters');if(!view)return null;
  card=document.createElement('section');card.id='memberLocationCard';card.className='card member-location-card';
  card.innerHTML=`<div class="member-location-head"><div><h2>Coordenações e Zonas</h2><p>A adição e edição de membros usa apenas estas opções. Somente Administradores Absolutos podem gerir esta lista.</p></div></div><div class="member-location-grid"><div class="member-location-form"><h3>Adicionar Coordenação</h3><form id="addCoordinationForm" class="stack-form"><label>Nome da Coordenação<input id="newCoordinationName" type="text" maxlength="120" placeholder="Ex.: Ilha de Moçambique" required></label><button class="btn btn-secondary" type="submit">Adicionar Coordenação</button></form></div><div class="member-location-form"><h3>Adicionar Zona</h3><form id="addZoneForm" class="stack-form"><label>Coordenação<select id="newZoneCoordination" required></select></label><label>Nome da Zona<input id="newZoneName" type="text" maxlength="120" placeholder="Ex.: Zona Central" required></label><button class="btn btn-secondary" type="submit">Adicionar Zona</button></form></div></div><div id="memberLocationCatalogList" class="member-location-list"></div>`;
  view.prepend(card);
  document.getElementById('addCoordinationForm')?.addEventListener('submit',addCoordination);
  document.getElementById('addZoneForm')?.addEventListener('submit',addZone);
  return card;
}
async function loadLocations(){if(!mlAbsolute())return;try{ensureMlCard();const data=await mlApi('list');locationCatalog=data.coordinations||[];renderCatalog();}catch(e){mlToast(e.message,'error');}}
async function addCoordination(event){event.preventDefault();const input=document.getElementById('newCoordinationName');const name=input?.value.trim();if(!name)return;try{const data=await mlApi('addCoordination',{name});locationCatalog=data.coordinations||[];if(input)input.value='';renderCatalog();mlToast(data.message||'Coordenação adicionada.','success');}catch(e){mlToast(e.message,'error');}}
async function addZone(event){event.preventDefault();const coordId=locationCatalog.find(c=>mlKey(c.name)===mlKey(document.getElementById('newZoneCoordination')?.value||''))?.id||'';const input=document.getElementById('newZoneName');const name=input?.value.trim();if(!coordId||!name)return;try{const data=await mlApi('addZone',{coordination_id:coordId,name});locationCatalog=data.coordinations||[];if(input)input.value='';renderCatalog();mlToast(data.message||'Zona adicionada.','success');}catch(e){mlToast(e.message,'error');}}

document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-admin-view="voters"]'))setTimeout(()=>{ensureMlCard();loadLocations();refreshMemberFormSelects();},120);
  if(event.target.closest?.('.member-edit-btn'))setTimeout(()=>{
    const coord=document.getElementById('memberEditDelegation'),zone=document.getElementById('memberEditZone');
    if(coord){const match=locationCatalog.find(c=>mlKey(c.name)===mlKey(coord.value));if(match)coord.value=match.name;}
    if(zone&&coord)zone.innerHTML=zoneOptions(coord.value,zone.value);
  },40);
});
ensureMlCard();setTimeout(loadLocations,350);
