const SUPER_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const SUPER_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const SUPER_EDGE = \`\${SUPER_URL}/functions/v1/vote-admin\`;
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
  const region=document.getElementById('toastRegion');if(!region)return;
  const el=document.createElement('div');el.className=\`toast \${type}\`;el.textContent=message;region.appendChild(el);
  setTimeout(()=>el.remove(),4800);
}
async function api(action,payload={}){
  const token=sessionStorage.getItem(SUPER_SESSION)||'';
  const response=await fetch(SUPER_EDGE,{
    method:'POST',
    headers:{'Content-Type':'application/json',apikey:SUPER_KEY,'x-client-info':'axinene-voto-super/2.0'},
    cache:'no-store',
    body:JSON.stringify({action,token,...payload})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data?.ok===false)throw new Error(data?.message||'Operação não concluída.');
  return data;
}
function installStyles(){
  if(document.getElementById('superAbsoluteStyles'))return;
  const s=document.createElement('style');s.id='superAbsoluteStyles';s.textContent=\`
  .super-card{border:1px solid var(--line);background:#fff;margin-bottom:18px;box-shadow:0 10px 28px rgba(15,23,42,.06)}
  .super-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
  .super-head h2{margin:7px 0 4px}.super-head p{max-width:780px}
  .super-badge{display:inline-flex;padding:5px 9px;border-radius:999px;background:#111827;color:#fff;font-size:11px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
  .super-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}
  .super-stat{border:1px solid var(--line);border-radius:12px;padding:12px;background:#fbfdff}.super-stat strong{display:block;font-size:23px}.super-stat span{font-size:11px;color:var(--muted)}
  .super-actions{display:flex;gap:7px;flex-wrap:wrap}.super-create{display:grid;grid-template-columns:minmax(190px,1fr) auto;gap:8px;margin:10px 0}
  .super-own-pin{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;margin-top:10px}.super-own-pin label{display:grid;gap:5px;font-size:11px;font-weight:800;color:var(--muted)}
  .super-section{margin-top:14px}.super-section h3{margin:0 0 8px}.super-table-wrap{overflow:auto}.super-table{width:100%;border-collapse:collapse;min-width:760px}
  .super-table th,.super-table td{padding:9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle;font-size:12px}.super-table th{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}
  .super-code{font:900 14px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.09em}.super-legacy{color:var(--muted);font-size:11px}.super-state{font-weight:800}
  .super-generated{padding:12px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:12px;margin:10px 0}.super-generated code{font-size:21px;font-weight:900;letter-spacing:.13em}
  .super-audit{max-height:460px;overflow:auto}.super-mini{font-size:11px;color:var(--muted)}.super-current{font-weight:900;color:#047857}.super-session-current{background:#ecfdf5}
  @media(max-width:820px){.super-grid{grid-template-columns:1fr 1fr}.super-create,.super-own-pin{grid-template-columns:1fr}.super-create .btn,.super-own-pin .btn{width:100%}}
  @media(max-width:520px){.super-grid{grid-template-columns:1fr}}
  \`;document.head.appendChild(s);
}
let state={super_admins:[],absolute_admins:[],view_codes:[],audit:[],sessions:[],current_session_id:null};

function codeCell(row){
  if(row.full_code)return \`<code class="super-code">\${esc(row.full_code)}</code> <button class="btn btn-ghost" type="button" data-super-copy="\${esc(row.full_code)}">Copiar</button>\`;
  return \`<span class="super-legacy">Protegido ••••\${esc(row.code_hint||'••')}<br>PIN antigo não recuperável</span>\`;
}
function actionButtons(row,type){
  const next=!row.active;
  return \`<div class="super-actions">
    <button class="btn btn-ghost" type="button" data-super-reset="\${esc(row.id)}" data-type="\${type}">Mudar PIN</button>
    <button class="btn btn-ghost" type="button" data-super-toggle="\${esc(row.id)}" data-type="\${type}" data-active="\${next}">\${row.active?'Bloquear':'Desbloquear'}</button>
    <button class="btn btn-ghost" type="button" data-super-delete="\${esc(row.id)}" data-type="\${type}">Apagar</button>
  </div>\`;
}
function actionName(value){
  const names={
    login:'Login',logout:'Logout',login_failed:'Tentativa de login falhada',
    superCreateAbsolute:'Criou Administrador Absoluto',superResetCode:'Mudou PIN',
    superToggleCredential:'Alterou estado de acesso',superDeleteCredential:'Apagou credencial',
    generateViewCode:'Gerou código de visualização',toggleViewCode:'Alterou código de visualização',
    deleteViewCode:'Apagou código de visualização',toggleElection:'Abriu/fechou eleição',
    addPosition:'Adicionou cargo',addCandidate:'Adicionou candidato',deleteCandidate:'Apagou candidato',
    addVoter:'Adicionou eleitor',bulkAddVoters:'Importou eleitores',deleteVoter:'Apagou eleitor',
    saveElection:'Alterou eleição',changePin:'Alterou o próprio PIN',
    revoke_session:'Revogou sessão',revoke_other_sessions:'Revogou outras sessões'
  };
  return names[value]||value||'Ação';
}
function credentialLabel(session){
  const type=session?.credential_type,id=session?.credential_id;
  if(type==='super')return state.super_admins.find(x=>x.id===id)?.label||'Super Absoluto';
  if(type==='absolute')return state.absolute_admins.find(x=>x.id===id)?.label||'Administrador Absoluto';
  if(type==='view'){
    const row=state.view_codes.find(x=>x.id===id);
    return row?.member_name||row?.member_number||'Visualização';
  }
  return type||'Sessão';
}
function render(){
  const card=document.getElementById('superAbsoluteCard');if(!card)return;
  const activeAbs=state.absolute_admins.filter(x=>x.active).length;
  const activeView=state.view_codes.filter(x=>x.active).length;
  const recoverable=[...state.super_admins,...state.absolute_admins,...state.view_codes].filter(x=>x.full_code).length;
  card.querySelector('#superStats').innerHTML=
    \`<div class="super-stat"><strong>\${activeAbs}</strong><span>Absolutos ativos</span></div>
     <div class="super-stat"><strong>\${activeView}</strong><span>Visualizações ativas</span></div>
     <div class="super-stat"><strong>\${state.sessions.length}</strong><span>Sessões ativas</span></div>
     <div class="super-stat"><strong>\${recoverable}</strong><span>PINs completos disponíveis</span></div>\`;

  const me=card.querySelector('#superSelfBody');
  me.innerHTML=state.super_admins.length?state.super_admins.map(r=>\`<tr>
    <td><strong>\${esc(r.label||'Administrador Super Absoluto')}</strong><div class="super-mini">Nível máximo</div></td>
    <td>\${codeCell(r)}</td><td class="super-state">\${r.active?'Ativo':'Bloqueado'}</td><td>\${esc(fmtDate(r.last_used_at))}</td>
  </tr>\`).join(''):'<tr><td colspan="4">Credencial Super não encontrada.</td></tr>';

  const abs=card.querySelector('#superAbsoluteBody');
  abs.innerHTML=state.absolute_admins.length?state.absolute_admins.map(r=>\`<tr>
    <td><strong>\${esc(r.label||'Administrador Absoluto')}</strong></td><td>\${codeCell(r)}</td>
    <td class="super-state">\${r.active?'Ativo':'Bloqueado'}</td><td>\${esc(fmtDate(r.last_used_at))}</td><td>\${actionButtons(r,'absolute')}</td>
  </tr>\`).join(''):'<tr><td colspan="5">Nenhum Administrador Absoluto.</td></tr>';

  const views=card.querySelector('#superViewBody');
  views.innerHTML=state.view_codes.length?state.view_codes.map(r=>\`<tr>
    <td><strong>\${esc(r.member_name||'Membro')}</strong><div class="super-mini">\${esc(r.member_number||'')}</div></td><td>\${codeCell(r)}</td>
    <td class="super-state">\${r.active?'Ativo':'Bloqueado'}</td><td>\${esc(fmtDate(r.last_used_at))}</td><td>\${actionButtons(r,'view')}</td>
  </tr>\`).join(''):'<tr><td colspan="5">Nenhum código de visualização.</td></tr>';

  const sessions=card.querySelector('#superSessionsBody');
  sessions.innerHTML=state.sessions.length?state.sessions.map(s=>{
    const current=s.id===state.current_session_id;
    return \`<tr class="\${current?'super-session-current':''}">
      <td><strong>\${esc(credentialLabel(s))}</strong><div class="super-mini">\${esc(s.credential_type||'')} · \${esc(s.access_level||'')}</div></td>
      <td>\${esc(fmtDate(s.created_at))}</td><td>\${esc(fmtDate(s.last_seen_at))}</td><td>\${esc(fmtDate(s.expires_at))}</td>
      <td>\${current?'<span class="super-current">Sessão atual</span>':\`<button class="btn btn-ghost" type="button" data-super-revoke-session="\${esc(s.id)}">Revogar</button>\`}</td>
    </tr>\`;
  }).join(''):'<tr><td colspan="5">Nenhuma sessão administrativa ativa.</td></tr>';

  const audit=card.querySelector('#superAuditBody');
  audit.innerHTML=state.audit.length?state.audit.map(a=>\`<tr>
    <td>\${esc(fmtDate(a.created_at))}</td>
    <td><strong>\${esc(a.actor_label||a.actor_type||'Sistema')}</strong><div class="super-mini">\${esc(a.actor_type||'')}</div></td>
    <td>\${esc(actionName(a.action))}</td>
    <td>\${esc(a.target_type||'—')} \${a.target_id?'<span class="super-mini">'+esc(a.target_id).slice(0,10)+'…</span>':''}</td>
    <td class="super-mini">\${esc(a.details?JSON.stringify(a.details):'')}</td>
  </tr>\`).join(''):'<tr><td colspan="5">Ainda não há ações registadas.</td></tr>';
}
function ensurePanel(){
  if(!isSuper())return;
  installStyles();
  const host=document.getElementById('adminViewSuper')||document.getElementById('adminViewSettings');
  if(!host||document.getElementById('superAbsoluteCard'))return;
  const card=document.createElement('section');card.id='superAbsoluteCard';card.className='card super-card';
  card.innerHTML=\`
    <div class="super-head"><div><span class="super-badge">Super Absoluto</span><h2>Centro de controlo</h2><p class="form-help">PINs, sessões, histórico e administração dos níveis abaixo. PINs antigos continuam protegidos; PINs criados ou alterados depois da ativação do Super podem ser vistos completos.</p></div><button id="superRefreshBtn" class="btn btn-secondary" type="button">Atualizar dados</button></div>
    <div id="superStats" class="super-grid"></div>

    <div class="super-section" data-super-section="self"><h3>Meu acesso Super Absoluto</h3>
      <div class="super-table-wrap"><table class="super-table"><thead><tr><th>Administrador</th><th>Meu PIN</th><th>Estado</th><th>Último uso</th></tr></thead><tbody id="superSelfBody"></tbody></table></div>
      <div class="super-own-pin"><label>Novo PIN<input id="superOwnPin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="6 dígitos" /></label><label>Confirmar novo PIN<input id="superOwnPinConfirm" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="Repita o PIN" /></label><button id="superOwnPinBtn" class="btn btn-primary" type="button">Mudar meu PIN</button></div>
    </div>

    <div class="super-section" data-super-section="create"><h3>Criar Administrador Absoluto</h3>
      <div class="super-create"><input id="superNewAbsoluteLabel" type="text" placeholder="Nome do Administrador Absoluto" /><button id="superCreateAbsoluteBtn" class="btn btn-primary" type="button">Criar e gerar PIN</button></div><div id="superGeneratedBox" class="super-generated hidden"></div>
    </div>

    <div class="super-section" data-super-section="absolute"><h3>Administradores Absolutos</h3>
      <div class="super-table-wrap"><table class="super-table"><thead><tr><th>Administrador</th><th>PIN</th><th>Estado</th><th>Último uso</th><th>Ações</th></tr></thead><tbody id="superAbsoluteBody"></tbody></table></div>
    </div>

    <div class="super-section" data-super-section="view"><h3>Códigos de visualização</h3>
      <div class="super-table-wrap"><table class="super-table"><thead><tr><th>Membro</th><th>PIN</th><th>Estado</th><th>Último uso</th><th>Ações</th></tr></thead><tbody id="superViewBody"></tbody></table></div>
    </div>

    <div class="super-section" data-super-section="sessions"><h3>Sessões administrativas ativas</h3>
      <div class="super-actions"><button id="superRevokeOthersBtn" class="btn btn-ghost" type="button">Revogar todas as outras sessões</button></div>
      <div class="super-table-wrap"><table class="super-table"><thead><tr><th>Acesso</th><th>Início</th><th>Última atividade</th><th>Expira</th><th>Ação</th></tr></thead><tbody id="superSessionsBody"></tbody></table></div>
    </div>

    <div class="super-section" data-super-section="audit"><h3>Histórico de ações</h3>
      <div class="super-table-wrap super-audit"><table class="super-table"><thead><tr><th>Data</th><th>Quem</th><th>Ação</th><th>Alvo</th><th>Detalhes</th></tr></thead><tbody id="superAuditBody"></tbody></table></div>
    </div>\`;
  host.prepend(card);
  card.querySelector('#superRefreshBtn')?.addEventListener('click',refresh);
  card.querySelector('#superCreateAbsoluteBtn')?.addEventListener('click',createAbsolute);
  card.querySelector('#superOwnPinBtn')?.addEventListener('click',changeOwnPin);
  card.querySelector('#superRevokeOthersBtn')?.addEventListener('click',revokeOtherSessions);
}
function showGenerated(code,label='Novo PIN'){
  const box=document.getElementById('superGeneratedBox');if(!box)return;
  box.innerHTML=\`<strong>\${esc(label)}</strong><div><code>\${esc(code)}</code> <button class="btn btn-ghost" type="button" data-super-copy="\${esc(code)}">Copiar</button></div><div class="super-mini">Este PIN fica disponível ao Super Absoluto porque foi criado depois da ativação deste nível.</div>\`;
  box.classList.remove('hidden');
}
async function refresh(){
  if(!isSuper())return;
  try{const data=await api('superOverview');state={...state,...data};render();document.dispatchEvent(new CustomEvent('axinene:super-refreshed'));}catch(e){toast(e.message||'Falha ao atualizar o centro do Super.','error');}
}
async function createAbsolute(){
  const label=document.getElementById('superNewAbsoluteLabel')?.value?.trim()||'Administrador Absoluto';
  try{const data=await api('superCreateAbsolute',{label});showGenerated(data.code,\`PIN de \${label}\`);document.getElementById('superNewAbsoluteLabel').value='';await refresh();toast('Administrador Absoluto criado.','success');}catch(e){toast(e.message,'error');}
}
async function changeOwnPin(){
  const first=(document.getElementById('superOwnPin')?.value||'').replace(/\D/g,'').slice(0,6);
  const second=(document.getElementById('superOwnPinConfirm')?.value||'').replace(/\D/g,'').slice(0,6);
  if(first.length!==6)return toast('O novo PIN deve ter exatamente 6 dígitos.','error');
  if(first!==second)return toast('Os dois PINs não coincidem.','error');
  try{
    const data=await api('changePin',{new_pin:first});
    document.getElementById('superOwnPin').value='';document.getElementById('superOwnPinConfirm').value='';
    toast(data.message||'PIN do Super alterado.','success');await refresh();
  }catch(e){toast(e.message,'error');}
}
async function revokeOtherSessions(){
  if(!confirm('Revogar todas as outras sessões administrativas? A sua sessão atual continuará aberta.'))return;
  try{const data=await api('superRevokeOtherSessions');await refresh();toast(data.message||'Outras sessões revogadas.','success');}catch(e){toast(e.message,'error');}
}
document.addEventListener('click',async event=>{
  if(!isSuper())return;
  const copy=event.target.closest?.('[data-super-copy]');
  if(copy){try{await navigator.clipboard.writeText(copy.dataset.superCopy||'');toast('PIN copiado.','success');}catch{toast('Não foi possível copiar.','error');}return;}

  const reset=event.target.closest?.('[data-super-reset]');
  if(reset){
    const typed=prompt('Digite o novo PIN de 6 dígitos. Deixe vazio para gerar automaticamente.','');
    if(typed===null)return;
    const raw=String(typed).trim();
    const pin=raw.replace(/\D/g,'').slice(0,6);
    if(raw&&pin.length!==6)return toast('O PIN deve ter exatamente 6 dígitos.','error');
    if(!confirm(raw?'Confirmar a troca para o PIN informado? O PIN anterior deixará de funcionar.':'Gerar um novo PIN automático? O PIN anterior deixará de funcionar.'))return;
    try{const data=await api('superResetCode',{target_type:reset.dataset.type,target_id:reset.dataset.superReset,new_pin:pin});showGenerated(data.code,'Novo PIN');await refresh();toast('PIN alterado.','success');}catch(e){toast(e.message,'error');}
    return;
  }
  const toggle=event.target.closest?.('[data-super-toggle]');
  if(toggle){try{await api('superToggleCredential',{target_type:toggle.dataset.type,target_id:toggle.dataset.superToggle,active:toggle.dataset.active==='true'});await refresh();toast('Estado atualizado.','success');}catch(e){toast(e.message,'error');}return;}

  const del=event.target.closest?.('[data-super-delete]');
  if(del){if(!confirm('Apagar definitivamente esta credencial?'))return;try{await api('superDeleteCredential',{target_type:del.dataset.type,target_id:del.dataset.superDelete});await refresh();toast('Credencial apagada.','success');}catch(e){toast(e.message,'error');}return;}

  const revoke=event.target.closest?.('[data-super-revoke-session]');
  if(revoke){if(!confirm('Revogar esta sessão administrativa agora?'))return;try{await api('superRevokeSession',{session_id:revoke.dataset.superRevokeSession});await refresh();toast('Sessão revogada.','success');}catch(e){toast(e.message,'error');}return;}
},true);

ensurePanel();
refresh();
document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-admin-view="super"]'))setTimeout(()=>{ensurePanel();refresh();},50);
},true);
