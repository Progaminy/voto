const VOTER_CODES_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co/functions/v1/vote-voter-codes';
const VOTER_CODES_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const VOTER_CODES_SESSION_KEY = 'axinene_admin_pin_session';
const VOTER_CODES_LEVEL_KEY = 'axinene_admin_access_level';
let voterCodeMembers = [];

const vcEscape = (value='') => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
function vcAbsolute(){ return sessionStorage.getItem(VOTER_CODES_LEVEL_KEY) === 'full'; }
function vcElection(){ return document.getElementById('adminElectionSelect')?.value || ''; }
function vcToast(message,type='info',timeout=4200){ const r=document.getElementById('toastRegion'); if(!r)return; const e=document.createElement('div'); e.className=`toast ${type}`; e.textContent=message; r.appendChild(e); setTimeout(()=>e.remove(),timeout); }
async function vcApi(action,payload={}){
  const token=sessionStorage.getItem(VOTER_CODES_SESSION_KEY)||'';
  const election_id=vcElection();
  if(!token||!election_id) throw new Error('Sessão ou eleição não encontrada.');
  const res=await fetch(VOTER_CODES_URL,{method:'POST',headers:{'Content-Type':'application/json',apikey:VOTER_CODES_KEY,'x-client-info':'axinene-voter-codes/1.0'},cache:'no-store',body:JSON.stringify({action,token,election_id,...payload})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data?.ok===false) throw new Error(data?.message||'Não foi possível gerir os códigos de votação.');
  return data;
}
function installVcStyles(){ if(document.getElementById('voterCodeStyles'))return; const s=document.createElement('style'); s.id='voterCodeStyles'; s.textContent=`
  .voter-code-card{margin-bottom:18px}.voter-code-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px}.voter-code-head h2{margin:0 0 4px}.voter-code-head p{margin:0;color:var(--muted);font-size:12px}.voter-code-actions{display:flex;gap:8px;flex-wrap:wrap}.voter-code-table code{font-weight:900;letter-spacing:.12em}.voter-code-table td:last-child{white-space:nowrap}.voter-code-table .btn{padding:7px 9px;font-size:11px}.voter-code-status{font-size:11px;font-weight:800;color:var(--muted)}
  @media(max-width:700px){.voter-code-actions{width:100%}.voter-code-actions .btn{flex:1}.voter-code-table th:nth-child(3),.voter-code-table td:nth-child(3){display:none}}
`; document.head.appendChild(s); }
function ensureVcCard(){
  if(!vcAbsolute()) return null;
  installVcStyles();
  let card=document.getElementById('voterCodeCard');
  if(card) return card;
  const view=document.getElementById('adminViewVoters');
  if(!view) return null;
  card=document.createElement('section'); card.id='voterCodeCard'; card.className='card voter-code-card';
  card.innerHTML=`<div class="voter-code-head"><div><h2>Códigos de votação</h2><p>Um código exclusivo por membro. Estes códigos servem apenas para confirmar o direito de voto e nunca dão acesso administrativo.</p></div><div class="voter-code-actions"><button id="generateAllVoterCodesBtn" class="btn btn-primary" type="button">Gerar códigos em falta</button><button id="copyAllVoterCodesBtn" class="btn btn-ghost" type="button">Copiar lista</button></div></div><div id="voterCodeStatus" class="voter-code-status"></div><div class="table-wrap"><table class="voter-code-table"><thead><tr><th>N.º membro</th><th>Nome</th><th>Telefone</th><th>Código</th><th>Estado</th><th>Ações</th></tr></thead><tbody id="voterCodeTableBody"></tbody></table></div>`;
  view.prepend(card);
  document.getElementById('generateAllVoterCodesBtn')?.addEventListener('click',generateAllVoterCodes);
  document.getElementById('copyAllVoterCodesBtn')?.addEventListener('click',copyAllVoterCodes);
  return card;
}
function renderVc(){
  ensureVcCard(); const body=document.getElementById('voterCodeTableBody'); if(!body)return;
  const withCode=voterCodeMembers.filter(m=>m.voting_code).length;
  const active=voterCodeMembers.filter(m=>m.active).length;
  const status=document.getElementById('voterCodeStatus'); if(status) status.textContent=`${withCode} de ${active} membro(s) ativo(s) com código de votação.`;
  body.innerHTML=voterCodeMembers.map(m=>{
    const c=m.voting_code; const code=c?`••••${vcEscape(c.code_hint||'')}`:'—'; const state=!m.active?'Membro inativo':c?(c.active?'Ativo':'Bloqueado'):'Sem código';
    const actions=c?`<button class="btn btn-ghost" type="button" data-vc-copy="${c.id}">Copiar</button><button class="btn btn-ghost" type="button" data-vc-regenerate="${c.id}">Regenerar</button><button class="btn btn-ghost" type="button" data-vc-toggle="${c.id}" data-next="${c.active?'0':'1'}">${c.active?'Bloquear':'Ativar'}</button>`:(m.active?`<button class="btn btn-ghost" type="button" data-vc-generate="${m.id}">Gerar</button>`:'');
    return `<tr><td><strong>${vcEscape(m.member_number||'—')}</strong></td><td>${vcEscape(m.full_name||'')}</td><td>${vcEscape(m.phone||'—')}</td><td><code>${code}</code></td><td>${vcEscape(state)}</td><td>${actions}</td></tr>`;
  }).join('')||'<tr><td colspan="6">Nenhum membro encontrado.</td></tr>';
}
async function loadVoterCodes(){ if(!vcAbsolute()||!vcElection())return; try{ const data=await vcApi('list'); voterCodeMembers=data.members||[]; renderVc(); }catch(e){vcToast(e.message,'error');} }
async function generateAllVoterCodes(){ const b=document.getElementById('generateAllVoterCodesBtn'); if(b){b.disabled=true;b.textContent='Gerando…';} try{const d=await vcApi('generateAll'); vcToast(d.message||'Códigos gerados.','success'); await loadVoterCodes();}catch(e){vcToast(e.message,'error');}finally{if(b){b.disabled=false;b.textContent='Gerar códigos em falta';}} }
async function copyOne(id){ try{const d=await vcApi('reveal',{code_id:id}); await navigator.clipboard.writeText(d.code); vcToast(`Código de ${d.member?.member_number||'membro'} copiado.`,'success');}catch(e){vcToast(e.message,'error');} }
async function copyAllVoterCodes(){ try{const d=await vcApi('revealAll'); const lines=(d.codes||[]).filter(x=>x.active).map(x=>`${x.member_number||'—'} | ${x.full_name} | ${x.code}`); if(!lines.length)return vcToast('Ainda não existem códigos ativos para copiar.','error'); await navigator.clipboard.writeText(lines.join('\n')); vcToast(`${lines.length} código(s) copiado(s) para a área de transferência.`,'success');}catch(e){vcToast(e.message,'error');} }
async function generateOne(voterId){ try{const d=await vcApi('generateOne',{voter_id:voterId}); await navigator.clipboard.writeText(d.code); vcToast(`Código gerado e copiado para ${d.member?.member_number||'o membro'}.`,'success'); await loadVoterCodes();}catch(e){vcToast(e.message,'error');} }
async function regenerate(id){ if(!confirm('Gerar um novo código? O código anterior deixará de funcionar e as sessões de votação desse membro serão encerradas.'))return; try{const d=await vcApi('regenerate',{code_id:id}); await navigator.clipboard.writeText(d.code); vcToast('Novo código gerado e copiado.','success'); await loadVoterCodes();}catch(e){vcToast(e.message,'error');} }
async function toggleCode(id,active){ try{const d=await vcApi('toggle',{code_id:id,active}); vcToast(d.message||'Estado atualizado.','success'); await loadVoterCodes();}catch(e){vcToast(e.message,'error');} }

document.addEventListener('click',e=>{
  const copy=e.target.closest?.('[data-vc-copy]'); if(copy){copyOne(copy.dataset.vcCopy);return;}
  const gen=e.target.closest?.('[data-vc-generate]'); if(gen){generateOne(gen.dataset.vcGenerate);return;}
  const reg=e.target.closest?.('[data-vc-regenerate]'); if(reg){regenerate(reg.dataset.vcRegenerate);return;}
  const tog=e.target.closest?.('[data-vc-toggle]'); if(tog){toggleCode(tog.dataset.vcToggle,tog.dataset.next==='1');return;}
  if(e.target.closest?.('[data-admin-view="voters"]')) setTimeout(loadVoterCodes,120);
});
document.getElementById('adminElectionSelect')?.addEventListener('change',()=>setTimeout(loadVoterCodes,220));
ensureVcCard(); setTimeout(loadVoterCodes,500);
