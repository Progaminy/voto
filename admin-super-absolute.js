const SUPER_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const SUPER_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const SUPER_EDGE = `${SUPER_URL}/functions/v1/vote-admin`;
const SUPER_SESSION = 'axinene_admin_pin_session';
const SUPER_LEVEL = 'axinene_admin_access_level';

const esc = (v='') => String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
const isSuper = () => sessionStorage.getItem(SUPER_LEVEL) === 'super';
const fmtDate = value => {
  if (!value) return 'Nunca';
  try { return new Intl.DateTimeFormat('pt-MZ',{dateStyle:'short',timeStyle:'medium'}).format(new Date(value)); }
  catch { return String(value); }
};
function toast(message,type='info'){
  const region=document.getElementById('toastRegion'); if(!region)return;
  const el=document.createElement('div'); el.className=`toast ${type}`; el.textContent=message; region.appendChild(el);
  setTimeout(()=>el.remove(),4800);
}
async function api(action,payload={}){
  const token=sessionStorage.getItem(SUPER_SESSION)||'';
  const response=await fetch(SUPER_EDGE,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPER_KEY,'x-client-info':'axinene-voto-super/1.0'},cache:'no-store',body:JSON.stringify({action,token,...payload})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data?.ok===false)throw new Error(data?.message||'Operação não concluída.');
  return data;
}
function installStyles(){
  if(document.getElementById('superAbsoluteStyles'))return;
  const s=document.createElement('style');s.id='superAbsoluteStyles';s.textContent=`
  .super-card{border:2px solid #7c3aed;background:linear-gradient(180deg,#faf7ff,#fff);margin-bottom:18px}
  .super-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
  .super-badge{display:inline-flex;padding:5px 9px;border-radius:999px;background:#ede9fe;color:#5b21b6;font-size:11px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
  .super-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}
  .super-stat{border:1px solid var(--line);border-radius:12px;padding:11px;background:#fff}.super-stat strong{display:block;font-size:23px}.super-stat span{font-size:11px;color:var(--muted)}
  .super-actions{display:flex;gap:8px;flex-wrap:wrap}.super-create{display:grid;grid-template-columns:minmax(180px,1fr) auto;gap:8px;margin:12px 0}
  .super-section{margin-top:18px}.super-section h3{margin:0 0 8px}.super-table-wrap{overflow:auto}.super-table{width:100%;border-collapse:collapse;min-width:820px}
  .super-table th,.super-table td{padding:9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle;font-size:12px}.super-table th{font-size:10px;color:var(--muted);text-transform:uppercase}
  .super-code{font:900 15px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.super-legacy{color:var(--muted);font-size:11px}.super-state{font-weight:800}
  .super-generated{padding:12px;border:1px solid #c4b5fd;background:#f5f3ff;border-radius:12px;margin:10px 0}.super-generated code{font-size:23px;font-weight:900;letter-spacing:.14em}
  .super-audit{max-height:420px;overflow:auto}.super-mini{font-size:11px;color:var(--muted)}
  @media(max-width:720px){.super-grid{grid-template-columns:1fr}.super-create{grid-template-columns:1fr}.super-create .btn{width:100%}}
  `;document.head.appendChild(s);
}
let state={absolute_admins:[],view_codes:[],audit:[],super_admins:[]};
function codeCell(row){
  if(row.full_code)return `<code class="super-code">${esc(row.full_code)}</code> <button class="btn btn-ghost" type="button" data-super-copy="${esc(row.full_code)}">Copiar</button>`;
  return `<span class="super-legacy">Legado protegido ••••${esc(row.code_hint||'••')}<br>não revelado ao Super</span>`;
}
function actionButtons(row,type){
  const next=!row.active;
  return `<div class="super-actions">
    <button class="btn btn-ghost" type="button" data-super-reset="${esc(row.id)}" data-type="${type}">Trocar código</button>
    <button class="btn btn-ghost" type="button" data-super-toggle="${esc(row.id)}" data-type="${type}" data-active="${next}">${row.active?'Bloquear':'Desbloquear'}</button>
    <button class="btn btn-ghost" type="button" data-super-delete="${esc(row.id)}" data-type="${type}">Apagar</button>
  </div>`;
}
function actionName(value){
  const names={login:'Login',logout:'Logout',login_failed:'Tentativa de login falhada',superCreateAbsolute:'Criou Administrador Absoluto',superResetCode:'Trocou código',superToggleCredential:'Alterou estado de acesso',superDeleteCredential:'Apagou credencial',generateViewCode:'Gerou código de visualização',toggleViewCode:'Alterou código de visualização',deleteViewCode:'Apagou código de visualização',toggleElection:'Abriu/fechou eleição',addPosition:'Adicionou cargo',addCandidate:'Adicionou candidato',deleteCandidate:'Apagou candidato',addVoter:'Adicionou eleitor',bulkAddVoters:'Importou eleitores',deleteVoter:'Apagou eleitor',saveElection:'Alterou eleição',changePin:'Alterou o próprio código'};
  return names[value]||value||'Ação';
}
function render(){
  const card=document.getElementById('superAbsoluteCard');if(!card)return;
  const activeAbs=state.absolute_admins.filter(x=>x.active).length,activeView=state.view_codes.filter(x=>x.active).length;
  card.querySelector('#superStats').innerHTML=`<div class="super-stat"><strong>${activeAbs}</strong><span>Absolutos ativos</span></div><div class="super-stat"><strong>${activeView}</strong><span>Visualizações ativas</span></div><div class="super-stat"><strong>${state.audit.length}</strong><span>Ações recentes</span></div>`;
  const abs=card.querySelector('#superAbsoluteBody');
  abs.innerHTML=state.absolute_admins.length?state.absolute_admins.map(r=>`<tr><td><strong>${esc(r.label||'Administrador Absoluto')}</strong></td><td>${codeCell(r)}</td><td class="super-state">${r.active?'Ativo':'Bloqueado'}</td><td>${esc(fmtDate(r.last_used_at))}</td><td>${actionButtons(r,'absolute')}</td></tr>`).join(''):'<tr><td colspan="5">Nenhum Administrador Absoluto.</td></tr>';
  const views=card.querySelector('#superViewBody');
  views.innerHTML=state.view_codes.length?state.view_codes.map(r=>`<tr><td><strong>${esc(r.member_name||'Membro')}</strong><div class="super-mini">${esc(r.member_number||'')}</div></td><td>${codeCell(r)}</td><td class="super-state">${r.active?'Ativo':'Bloqueado'}</td><td>${esc(fmtDate(r.last_used_at))}</td><td>${actionButtons(r,'view')}</td></tr>`).join(''):'<tr><td colspan="5">Nenhum código de visualização.</td></tr>';
  const audit=card.querySelector('#superAuditBody');
  audit.innerHTML=state.audit.length?state.audit.map(a=>`<tr><td>${esc(fmtDate(a.created_at))}</td><td><strong>${esc(a.actor_label||a.actor_type||'Sistema')}</strong><div class="super-mini">${esc(a.actor_type||'')}</div></td><td>${esc(actionName(a.action))}</td><td>${esc(a.target_type||'—')} ${a.target_id?'<span class="super-mini">'+esc(a.target_id).slice(0,10)+'…</span>':''}</td></tr>`).join(''):'<tr><td colspan="4">Ainda não há ações registadas.</td></tr>';
}
function ensurePanel(){
  if(!isSuper())return;
  installStyles();
  const settings=document.getElementById('adminViewSettings');if(!settings||document.getElementById('superAbsoluteCard'))return;
  const card=document.createElement('section');card.id='superAbsoluteCard';card.className='card super-card';
  card.innerHTML=`
    <div class="super-head"><div><span class="super-badge">Nível máximo</span><h2>Administrador Super Absoluto</h2><p class="form-help">Controla os níveis abaixo, consulta códigos novos completos e acompanha o histórico administrativo. PINs antigos permanecem intocados e não são revelados.</p></div><button id="superRefreshBtn" class="btn btn-secondary" type="button">Atualizar</button></div>
    <div id="superStats" class="super-grid"></div>
    <div class="super-section"><h3>Criar Administrador Absoluto</h3><div class="super-create"><input id="superNewAbsoluteLabel" type="text" placeholder="Nome do Administrador Absoluto" /><button id="superCreateAbsoluteBtn" class="btn btn-primary" type="button">Criar e gerar código</button></div><div id="superGeneratedBox" class="super-generated hidden"></div></div>
    <div class="super-section"><h3>Administradores Absolutos</h3><div class="super-table-wrap"><table class="super-table"><thead><tr><th>Administrador</th><th>Código</th><th>Estado</th><th>Último uso</th><th>Ações</th></tr></thead><tbody id="superAbsoluteBody"></tbody></table></div></div>
    <div class="super-section"><h3>Códigos de visualização</h3><div class="super-table-wrap"><table class="super-table"><thead><tr><th>Membro</th><th>Código</th><th>Estado</th><th>Último uso</th><th>Ações</th></tr></thead><tbody id="superViewBody"></tbody></table></div></div>
    <div class="super-section"><h3>Histórico de ações</h3><div class="super-table-wrap super-audit"><table class="super-table"><thead><tr><th>Data</th><th>Quem</th><th>Ação</th><th>Alvo</th></tr></thead><tbody id="superAuditBody"></tbody></table></div></div>`;
  settings.prepend(card);
  card.querySelector('#superRefreshBtn')?.addEventListener('click',refresh);
  card.querySelector('#superCreateAbsoluteBtn')?.addEventListener('click',createAbsolute);
}
function showGenerated(code,label='Novo código'){
  const box=document.getElementById('superGeneratedBox');if(!box)return;
  box.innerHTML=`<strong>${esc(label)}</strong><div><code>${esc(code)}</code> <button class="btn btn-ghost" type="button" data-super-copy="${esc(code)}">Copiar</button></div><div class="super-mini">Este código ficará disponível ao Super Absoluto porque foi criado depois da ativação deste nível.</div>`;
  box.classList.remove('hidden');
}
async function refresh(){
  if(!isSuper())return;
  try{const data=await api('superOverview');state=data;render();}catch(e){toast(e.message||'Falha ao atualizar.','error');}
}
async function createAbsolute(){
  const label=document.getElementById('superNewAbsoluteLabel')?.value?.trim()||'Administrador Absoluto';
  try{const data=await api('superCreateAbsolute',{label});showGenerated(data.code,`Código de ${label}`);document.getElementById('superNewAbsoluteLabel').value='';await refresh();toast('Administrador Absoluto criado.','success');}catch(e){toast(e.message,'error');}
}
document.addEventListener('click',async event=>{
  if(!isSuper())return;
  const copy=event.target.closest?.('[data-super-copy]');if(copy){try{await navigator.clipboard.writeText(copy.dataset.superCopy||'');toast('Código copiado.','success');}catch{toast('Não foi possível copiar.','error');}return;}
  const reset=event.target.closest?.('[data-super-reset]');if(reset){if(!confirm('Trocar este código? O código anterior deixará de funcionar e as sessões serão encerradas.'))return;try{const d=await api('superResetCode',{target_type:reset.dataset.type,target_id:reset.dataset.superReset});showGenerated(d.code,'Novo código gerado');await refresh();toast('Código trocado.','success');}catch(e){toast(e.message,'error');}return;}
  const toggle=event.target.closest?.('[data-super-toggle]');if(toggle){try{await api('superToggleCredential',{target_type:toggle.dataset.type,target_id:toggle.dataset.superToggle,active:toggle.dataset.active==='true'});await refresh();toast('Estado atualizado.','success');}catch(e){toast(e.message,'error');}return;}
  const del=event.target.closest?.('[data-super-delete]');if(del){if(!confirm('Apagar definitivamente esta credencial?'))return;try{await api('superDeleteCredential',{target_type:del.dataset.type,target_id:del.dataset.superDelete});await refresh();toast('Credencial apagada.','success');}catch(e){toast(e.message,'error');}return;}
},true);

ensurePanel();
refresh();
document.addEventListener('click',event=>{if(event.target.closest?.('[data-admin-view="settings"]'))setTimeout(()=>{ensurePanel();refresh();},80);},true);
