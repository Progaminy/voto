const RESULT_ADMIN_SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const RESULT_ADMIN_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const RESULT_ADMIN_URL = `${RESULT_ADMIN_SUPABASE_URL}/functions/v1/vote-results-admin`;
const RESULT_ADMIN_SESSION_KEY = 'axinene_admin_pin_session';
const RESULT_ADMIN_LEVEL_KEY = 'axinene_admin_access_level';

let resultAdminConfig = null;
let resultAdminLoading = false;

function resultAdminToast(message, type = 'info', timeout = 4800) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}
function resultAdminIsAbsolute(){ return sessionStorage.getItem(RESULT_ADMIN_LEVEL_KEY) === 'full'; }
function resultAdminElectionId(){ return document.getElementById('adminElectionSelect')?.value || ''; }
async function resultAdminApi(action,payload={}){
  const token=sessionStorage.getItem(RESULT_ADMIN_SESSION_KEY)||'';
  const election_id=resultAdminElectionId();
  if(!token) throw new Error('Sessão administrativa não encontrada.');
  if(!election_id) throw new Error('Selecione uma eleição.');
  const response=await fetch(RESULT_ADMIN_URL,{method:'POST',headers:{'Content-Type':'application/json',apikey:RESULT_ADMIN_KEY,'x-client-info':'axinene-voto-result-admin/2.0'},cache:'no-store',body:JSON.stringify({action,token,election_id,...payload})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data?.ok===false){const e=new Error(data?.message||'Não foi possível concluir a operação.'); e.status=response.status; throw e;}
  return data;
}
function resultEsc(value=''){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function installResultAdminStyles(){if(document.getElementById('resultAdminStyles'))return;const style=document.createElement('style');style.id='resultAdminStyles';style.textContent=`
.announce-result-wrap{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:auto}.result-publication-status{font-size:11px;color:var(--muted);font-weight:750}.result-rule-card{margin-bottom:18px}.result-rule-card h2{margin:0 0 5px}.result-rule-intro{margin:0 0 14px;color:var(--muted);font-size:12px}.result-rule-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.result-rule-grid label{display:grid;gap:6px;font-size:12px;font-weight:800;color:var(--blue-950)}.result-role-list,.manual-role-list{display:grid;gap:8px;margin-top:12px}.result-role-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--surface-soft)}.result-role-row input[type="text"]{min-height:40px}.result-role-row label{display:flex;gap:6px;align-items:center;font-size:11px;font-weight:800;white-space:nowrap}.manual-title{margin:16px 0 5px;font-size:13px}.manual-help{margin:0;color:var(--muted);font-size:11px}.manual-role-row{display:grid;grid-template-columns:minmax(180px,.8fr) minmax(0,1.2fr);gap:9px;align-items:center}.manual-role-row strong{font-size:11px}.manual-role-row select{min-height:40px}.result-rule-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:14px}.result-rule-help{margin:10px 0 0;color:var(--muted);font-size:11px}body.admin-readonly #announceResultsBtn,body.admin-readonly #resultRuleCard{display:none!important}@media(max-width:700px){.result-rule-grid,.manual-role-row{grid-template-columns:1fr}.result-role-row{grid-template-columns:1fr}.announce-result-wrap{width:100%;margin-left:0}.announce-result-wrap .btn{width:100%}}
`;document.head.appendChild(style);}
function ensureResultAdminUI(){
  if(!resultAdminIsAbsolute())return;installResultAdminStyles();
  const resultHeader=document.querySelector('#adminViewResults .view-header');
  if(resultHeader&&!document.getElementById('announceResultsBtn')){const wrap=document.createElement('div');wrap.className='announce-result-wrap';wrap.innerHTML='<span id="resultPublicationStatus" class="result-publication-status">Resultado ainda não anunciado</span><button id="announceResultsBtn" class="btn btn-primary" type="button">Anunciar resultado</button>';resultHeader.appendChild(wrap);document.getElementById('announceResultsBtn')?.addEventListener('click',announceResults);}
  const settings=document.getElementById('adminViewSettings');
  if(settings&&!document.getElementById('resultRuleCard')){const card=document.createElement('section');card.id='resultRuleCard';card.className='card result-rule-card';card.innerHTML=`
<h2>Regra de distribuição por ordem de votos</h2><p class="result-rule-intro">A regra só interfere no anúncio quando estiver marcada. Desmarcada, o resultado é anunciado normalmente mesmo se houver empate.</p>
<label style="display:flex;gap:8px;align-items:center;font-weight:850;margin-bottom:12px"><input id="fiscalRuleEnabled" type="checkbox" /> Ativar distribuição automática do Conselho Fiscal</label>
<div class="result-rule-grid"><label>Vaga que contém os candidatos<select id="fiscalSourcePosition"></select></label><label>Quando todos os cargos já estiverem ocupados<select id="fiscalAllFilledPolicy"><option value="supplements">Passar os votados para lista de suplentes</option><option value="void">A eleição fica sem efeito para esses cargos</option></select></label></div>
<div id="fiscalRoleList" class="result-role-list"></div>
<h3 class="manual-title">Ajuste manual em caso de empate</h3><p class="manual-help">Só é usado se a regra estiver ativa e a votação empatar. Escolha manualmente quem assume cada cargo; sem empate, o sistema continua automático.</p><div id="fiscalManualAssignments" class="manual-role-list"></div>
<div class="result-rule-actions"><button id="saveFiscalRuleBtn" class="btn btn-secondary" type="button">Guardar regra</button><span id="fiscalRuleStatus" class="result-publication-status"></span></div>
<p class="result-rule-help">Ordem padrão: 1.º Presidente do Conselho Fiscal, 2.º Vogal, 3.º Relator. Cargos marcados como ocupados ou com candidatura própria são saltados.</p>`;settings.prepend(card);document.getElementById('saveFiscalRuleBtn')?.addEventListener('click',()=>saveFiscalRule(true));document.getElementById('fiscalRuleEnabled')?.addEventListener('change',updateRuleDisabledState);document.getElementById('fiscalSourcePosition')?.addEventListener('change',renderManualAssignments);document.getElementById('fiscalRoleList')?.addEventListener('input',renderManualAssignments);}
}
function renderRoleRows(roles=[],occupied=[]){const root=document.getElementById('fiscalRoleList');if(!root)return;const occ=new Set(occupied.map(v=>String(v).trim().toLowerCase()));const safe=roles.length?roles:['Presidente do Conselho Fiscal','Vogal','Relator'];root.innerHTML=safe.slice(0,3).map((role,i)=>`<div class="result-role-row"><input class="fiscal-role-input" data-role-index="${i}" type="text" value="${resultEsc(role)}"/><label><input class="fiscal-role-occupied" data-role-index="${i}" type="checkbox" ${occ.has(String(role).trim().toLowerCase())?'checked':''}/> Cargo já ocupado</label></div>`).join('');}
function collectFiscalRoles(){return[...document.querySelectorAll('.fiscal-role-input')].map(i=>i.value.trim()).filter(Boolean).slice(0,3);}
function collectOccupiedRoles(roles){return[...document.querySelectorAll('.fiscal-role-occupied')].filter(i=>i.checked).map(i=>roles[Number(i.dataset.roleIndex||0)]||'').filter(Boolean);}
function renderManualAssignments(){
  const root=document.getElementById('fiscalManualAssignments');if(!root)return;
  const roles=collectFiscalRoles();const sourceId=document.getElementById('fiscalSourcePosition')?.value||'';
  const candidates=(resultAdminConfig?.candidates||[]).filter(c=>c.position_id===sourceId);
  const saved=new Map((resultAdminConfig?.rule?.manual_assignments||[]).map(x=>[String(x.role||'').trim().toLowerCase(),String(x.candidate_id||'')]));
  root.innerHTML=roles.map((role,i)=>`<div class="manual-role-row"><strong>${resultEsc(role)}</strong><select class="fiscal-manual-candidate" data-role-index="${i}"><option value="">Automático / sem ajuste</option>${candidates.map(c=>`<option value="${c.id}" ${saved.get(role.toLowerCase())===c.id?'selected':''}>${resultEsc(c.name)}</option>`).join('')}</select></div>`).join('');updateRuleDisabledState();
}
function collectManualAssignments(roles){return[...document.querySelectorAll('.fiscal-manual-candidate')].map(s=>({role:roles[Number(s.dataset.roleIndex||0)]||'',candidate_id:s.value||''})).filter(x=>x.role&&x.candidate_id);}
function updateRuleDisabledState(){const enabled=document.getElementById('fiscalRuleEnabled')?.checked;document.getElementById('fiscalSourcePosition')?.toggleAttribute('disabled',!enabled);document.getElementById('fiscalAllFilledPolicy')?.toggleAttribute('disabled',!enabled);document.querySelectorAll('.fiscal-role-input,.fiscal-role-occupied,.fiscal-manual-candidate').forEach(el=>el.toggleAttribute('disabled',!enabled));}
function renderResultAdminConfig(data){resultAdminConfig=data;ensureResultAdminUI();const rule=data.rule||{},positions=data.positions||[],publication=data.publication||null,election=data.election||{};const source=document.getElementById('fiscalSourcePosition');if(source){source.innerHTML='<option value="">Selecione a vaga</option>'+positions.map(p=>`<option value="${p.id}">${resultEsc(p.title)} (${Number(p.candidate_count||0)} candidato(s))</option>`).join('');source.value=rule.source_position_id||'';}const enabled=document.getElementById('fiscalRuleEnabled');if(enabled)enabled.checked=Boolean(rule.fiscal_distribution_enabled);const policy=document.getElementById('fiscalAllFilledPolicy');if(policy)policy.value=rule.all_filled_policy==='void'?'void':'supplements';renderRoleRows(Array.isArray(rule.role_order)?rule.role_order:[],Array.isArray(rule.occupied_roles)?rule.occupied_roles:[]);renderManualAssignments();updateRuleDisabledState();const status=document.getElementById('resultPublicationStatus'),button=document.getElementById('announceResultsBtn');if(publication?.published_at){const when=new Intl.DateTimeFormat('pt-MZ',{dateStyle:'short',timeStyle:'short'}).format(new Date(publication.published_at));if(status)status.textContent=`Anunciado em ${when}`;if(button)button.textContent='Atualizar resultado anunciado';}else{if(status)status.textContent='Resultado ainda não anunciado';if(button)button.textContent='Anunciar resultado';}if(button){const closed=election.status==='closed';button.disabled=!closed;button.title=closed?'Publicar os resultados para todos os visitantes':'Encerre a votação antes de anunciar o resultado';}}
async function loadResultAdminConfig(force=false){if(!resultAdminIsAbsolute()||resultAdminLoading||!resultAdminElectionId())return;if(!force&&resultAdminConfig?.election?.id===resultAdminElectionId())return;resultAdminLoading=true;try{renderResultAdminConfig(await resultAdminApi('get'));}catch(e){resultAdminToast(e.message||'Não foi possível carregar a configuração dos resultados.','error');}finally{resultAdminLoading=false;}}
function collectRulePayload(){const roles=collectFiscalRoles();return{fiscal_distribution_enabled:Boolean(document.getElementById('fiscalRuleEnabled')?.checked),source_position_id:document.getElementById('fiscalSourcePosition')?.value||null,role_order:roles,occupied_roles:collectOccupiedRoles(roles),all_filled_policy:document.getElementById('fiscalAllFilledPolicy')?.value==='void'?'void':'supplements',manual_assignments:collectManualAssignments(roles)};}
async function saveFiscalRule(showToast=true){if(!resultAdminIsAbsolute())return false;const payload=collectRulePayload();if(payload.role_order.length!==3){if(showToast)resultAdminToast('Informe os três cargos da hierarquia.','error');return false;}const button=document.getElementById('saveFiscalRuleBtn'),old=button?.textContent;if(button){button.disabled=true;button.textContent='A guardar…';}try{const data=await resultAdminApi('saveRule',payload);if(showToast){const status=document.getElementById('fiscalRuleStatus');if(status)status.textContent='Regra guardada.';resultAdminToast(data.message||'Regra guardada.','success');}resultAdminConfig={...(resultAdminConfig||{}),rule:data.rule};return true;}catch(e){if(showToast)resultAdminToast(e.message||'Não foi possível guardar a regra.','error');return false;}finally{if(button){button.disabled=false;button.textContent=old||'Guardar regra';}}}
async function announceResults(){if(!resultAdminIsAbsolute())return;const already=Boolean(resultAdminConfig?.publication?.published_at);const message=already?'Atualizar o resultado público com a contagem atual?':'Anunciar estes resultados publicamente? Depois disso, qualquer visitante poderá ver os resultados.';if(!confirm(message))return;const button=document.getElementById('announceResultsBtn'),old=button?.textContent;if(button){button.disabled=true;button.textContent='A anunciar…';}try{
    // O estado visível da caixa é sempre guardado antes do anúncio. Assim,
    // desmarcar a regra significa realmente anunciar sem aplicar a distribuição.
    const saved=await saveFiscalRule(false);if(!saved)throw new Error('Não foi possível guardar a configuração atual da regra.');
    const data=await resultAdminApi('announce');resultAdminToast(data.message||'Resultados anunciados.','success',5600);resultAdminConfig=null;await loadResultAdminConfig(true);window.axineneRefreshPublicResults?.();
  }catch(e){resultAdminToast(e.message||'Não foi possível anunciar os resultados.','error',7000);}finally{if(button){button.disabled=false;button.textContent=old||'Anunciar resultado';}}}

ensureResultAdminUI();
document.addEventListener('click',e=>{if(e.target.closest?.('[data-admin-view="results"], [data-admin-view="settings"]'))setTimeout(()=>loadResultAdminConfig(true),80);});
document.getElementById('adminElectionSelect')?.addEventListener('change',()=>{resultAdminConfig=null;setTimeout(()=>loadResultAdminConfig(true),220);});
window.addEventListener('hashchange',()=>{if(location.hash==='#admin')setTimeout(()=>loadResultAdminConfig(true),300);});
setTimeout(()=>loadResultAdminConfig(true),450);
import('./admin-voter-codes.js?v=20260902-0100');
