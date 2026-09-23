const SUPER_UI_LEVEL_KEY='axinene_admin_access_level';
const SUPER_UI_SESSION_KEY='axinene_admin_pin_session';
const SUPER_UI_URL='https://uvypcuixxrjikjaduvyo.supabase.co';
const SUPER_UI_KEY='sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const SUPER_UI_BRANDING_EDGE=`${SUPER_UI_URL}/functions/v1/vote-branding`;
const superUiIsActive=()=>sessionStorage.getItem(SUPER_UI_LEVEL_KEY)==='super';

function installSuperUiStyles(){
  if(document.getElementById('superCleanUiStyles'))return;
  const style=document.createElement('style');
  style.id='superCleanUiStyles';
  style.textContent=`
    body.admin-super .admin-tabs{gap:6px}
    body.admin-super .admin-tab[data-admin-view="super"]{font-weight:900;border-color:#111827;background:#111827;color:#fff}
    #adminViewSuper{display:block}
    #adminViewSuper.hidden{display:none!important}
    #adminViewSuper .super-shell{display:grid;gap:14px}
    #adminViewSuper #superAbsoluteCard{margin:0}
    .super-ui-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .super-ui-toolbar .btn{min-height:38px}
    .super-foldable{margin-top:10px!important;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff}
    .super-foldable>.super-fold-button{width:100%;border:0;background:#fff;padding:13px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px;text-align:left;cursor:pointer;font-weight:900}
    .super-foldable>.super-fold-button:hover{background:#f8fafc}
    .super-foldable>.super-fold-button small{display:block;margin-top:3px;color:var(--muted);font-size:11px;font-weight:500}
    .super-fold-arrow{font-size:21px;color:var(--muted);transition:transform .18s ease}
    .super-foldable.super-fold-closed>.super-fold-button .super-fold-arrow{transform:rotate(-90deg)}
    .super-foldable.super-fold-closed>:not(.super-fold-button){display:none!important}
    .super-foldable>:not(.super-fold-button){margin-left:13px;margin-right:13px}.super-foldable>:last-child{margin-bottom:13px}
    .super-system-card{border:1px solid var(--line);box-shadow:0 8px 24px rgba(15,23,42,.05)}
    .super-system-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .super-system-box{border:1px solid var(--line);border-radius:12px;padding:13px;background:#fbfdff}
    .super-system-box h3{margin:0 0 5px}.super-system-box p{margin:0 0 11px;color:var(--muted);font-size:12px}
    body.admin-super #adminViewSettings #changePinForm{display:none!important}
    body.admin-super #adminViewSettings #changePinForm+*{display:none!important}
    @media(max-width:760px){
      .super-ui-toolbar{display:grid;grid-template-columns:1fr 1fr}.super-ui-toolbar .btn{width:100%}
      .super-system-grid{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(style);
}
function superSectionDescription(key,title){
  const map={
    self:'Ver o meu PIN atual, estado e mudar o meu próprio PIN.',
    create:'Criar novos Administradores Absolutos.',
    absolute:'Ver PINs disponíveis, mudar PIN, bloquear, desbloquear ou apagar.',
    view:'Ver e administrar códigos de visualização.',
    sessions:'Ver quem está ligado agora e revogar sessões.',
    audit:'Consultar o histórico completo das ações administrativas.'
  };
  return map[key]||title||'Abrir esta área.';
}
function makeFoldable(section,open=false){
  if(!section||section.dataset.superFoldReady==='1')return;
  const heading=section.querySelector(':scope > h3');
  if(!heading)return;
  const title=heading.textContent.trim();
  const key=section.dataset.superSection||'';
  const button=document.createElement('button');
  button.type='button';button.className='super-fold-button';
  button.innerHTML='<span>'+title+'<small>'+superSectionDescription(key,title)+'</small></span><span class="super-fold-arrow">⌄</span>';
  heading.replaceWith(button);
  section.classList.add('super-foldable');
  if(!open)section.classList.add('super-fold-closed');
  button.addEventListener('click',()=>section.classList.toggle('super-fold-closed'));
  section.dataset.superFoldReady='1';
}
function showSuperView(){
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.toggle('active',t.dataset.adminView==='super'));
  document.querySelectorAll('.admin-view').forEach(v=>v.classList.add('hidden'));
  document.getElementById('adminViewSuper')?.classList.remove('hidden');
}
function ensureSuperTab(){
  if(!superUiIsActive())return null;
  const nav=document.querySelector('.admin-tabs');
  const dashboard=document.getElementById('adminDashboard');
  if(!nav||!dashboard)return null;
  let tab=nav.querySelector('[data-admin-view="super"]');
  if(!tab){
    tab=document.createElement('button');
    tab.className='admin-tab';tab.type='button';tab.dataset.adminView='super';tab.textContent='SUPER';
    nav.appendChild(tab);
    tab.addEventListener('click',()=>{showSuperView();setTimeout(applySuperCleanUi,20);});
  }
  let view=document.getElementById('adminViewSuper');
  if(!view){
    view=document.createElement('section');view.id='adminViewSuper';view.className='admin-view hidden';
    view.innerHTML='<div class="super-shell"></div>';
    dashboard.appendChild(view);
  }
  return view.querySelector('.super-shell');
}
function prepareToolbar(card){
  if(card.querySelector('#superUiToolbar'))return;
  const bar=document.createElement('div');bar.id='superUiToolbar';bar.className='super-ui-toolbar';
  bar.innerHTML='<button id="superUiExpandAll" class="btn btn-ghost" type="button">Expandir tudo</button><button id="superUiCollapseAll" class="btn btn-ghost" type="button">Recolher tudo</button><button id="superUiOpenAudit" class="btn btn-ghost" type="button">Abrir histórico</button><button id="superUiRefresh" class="btn btn-secondary" type="button">Atualizar painel</button>';
  card.querySelector('.super-head')?.insertAdjacentElement('afterend',bar);
  bar.querySelector('#superUiExpandAll')?.addEventListener('click',()=>card.querySelectorAll('.super-foldable').forEach(x=>x.classList.remove('super-fold-closed')));
  bar.querySelector('#superUiCollapseAll')?.addEventListener('click',()=>card.querySelectorAll('.super-foldable').forEach(x=>x.classList.add('super-fold-closed')));
  bar.querySelector('#superUiOpenAudit')?.addEventListener('click',()=>{
    const audit=card.querySelector('[data-super-section="audit"]');
    audit?.classList.remove('super-fold-closed');audit?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  bar.querySelector('#superUiRefresh')?.addEventListener('click',()=>card.querySelector('#superRefreshBtn')?.click());
}
function hideOldSecurityCard(){
  const form=document.getElementById('changePinForm');
  const card=form?.closest('.settings-card,.form-card');
  if(card)card.style.display='none';
}
async function brandingCall(action){
  const token=sessionStorage.getItem(SUPER_UI_SESSION_KEY)||'';
  const electionId=document.getElementById('adminElectionSelect')?.value||'';
  if(!token)throw new Error('Sessão Super não encontrada.');
  if(!electionId)throw new Error('Selecione uma eleição.');
  const response=await fetch(SUPER_UI_BRANDING_EDGE,{
    method:'POST',
    headers:{'Content-Type':'application/json',apikey:SUPER_UI_KEY,'x-client-info':'axinene-voto-super-reconstruct/2.0'},
    cache:'no-store',
    body:JSON.stringify({action,token,election_id:electionId})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data?.ok===false)throw new Error(data?.message||'Não foi possível reconstituir a página.');
  return data;
}
function uiToast(message,type='info'){
  const region=document.getElementById('toastRegion');if(!region)return;
  const el=document.createElement('div');el.className='toast '+type;el.textContent=message;region.appendChild(el);setTimeout(()=>el.remove(),4500);
}
function ensureSystemCard(shell){
  if(document.getElementById('superSystemCard'))return;
  const card=document.createElement('section');card.id='superSystemCard';card.className='card super-system-card';
  card.innerHTML='<div class="view-header compact-view"><div><h2>Sistema e reconstituição</h2><p>Ferramentas exclusivas do Super Absoluto para recuperar a interface e o visual da página.</p></div></div><div class="super-system-grid"><div class="super-system-box"><h3>Reconstituir interface administrativa</h3><p>Recarrega todos os módulos do painel a partir da versão publicada. Não altera dados, votos nem PINs.</p><button id="superRebuildInterfaceBtn" class="btn btn-secondary" type="button">Reconstituir interface</button></div><div class="super-system-box"><h3>Restaurar visual público padrão</h3><p>Restaura textos, cores e símbolo padrão da página pública. Eleição, candidatos, membros, votos, resultados e PINs permanecem intactos.</p><button id="superResetPublicVisualBtn" class="btn btn-ghost" type="button">Restaurar visual padrão</button></div></div>';
  shell.appendChild(card);
  card.querySelector('#superRebuildInterfaceBtn')?.addEventListener('click',()=>{
    if(!confirm('Reconstituir a interface administrativa agora? Nenhum dado será apagado.'))return;
    const url=location.origin+location.pathname+'?rebuild='+Date.now()+'#admin';
    location.replace(url);
  });
  card.querySelector('#superResetPublicVisualBtn')?.addEventListener('click',async()=>{
    if(!confirm('Restaurar o visual público padrão? Isto altera apenas textos, cores e símbolo visual.'))return;
    const btn=card.querySelector('#superResetPublicVisualBtn');const old=btn.textContent;btn.disabled=true;btn.textContent='A restaurar…';
    try{
      await brandingCall('resetDesign');await brandingCall('clearSymbol');
      uiToast('Visual público padrão restaurado.','success');
    }catch(e){uiToast(e.message||'Falha ao restaurar o visual.','error');}
    finally{btn.disabled=false;btn.textContent=old;}
  });
}
function applySuperCleanUi(){
  if(!superUiIsActive())return;
  installSuperUiStyles();
  const shell=ensureSuperTab();if(!shell)return;
  const card=document.getElementById('superAbsoluteCard');
  if(card&&card.parentElement!==shell)shell.prepend(card);
  if(card){
    prepareToolbar(card);
    card.querySelectorAll('.super-section').forEach((section,index)=>makeFoldable(section,index===0));
  }
  hideOldSecurityCard();
  ensureSystemCard(shell);
}
const observer=new MutationObserver(()=>applySuperCleanUi());
observer.observe(document.documentElement,{childList:true,subtree:true});
applySuperCleanUi();
document.addEventListener('axinene:super-refreshed',applySuperCleanUi);
document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-admin-view="settings"]'))setTimeout(applySuperCleanUi,40);
},true);
