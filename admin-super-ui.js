const SUPER_UI_LEVEL_KEY='axinene_admin_access_level';
const superUiIsActive=()=>sessionStorage.getItem(SUPER_UI_LEVEL_KEY)==='super';

function installSuperUiStyles(){
  if(document.getElementById('superCleanUiStyles'))return;
  const style=document.createElement('style');
  style.id='superCleanUiStyles';
  style.textContent=`
    body.admin-super #superAbsoluteCard{border:1px solid var(--line)!important;background:#fff!important;box-shadow:0 10px 28px rgba(8,31,54,.06)!important}
    body.admin-super #superAbsoluteCard .super-badge{background:#111827!important;color:#fff!important}
    .super-clean-toolbar{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0 4px}
    .super-foldable{margin-top:9px!important;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff}
    .super-fold-button{width:100%;border:0;background:#fff;padding:13px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;cursor:pointer;font-weight:900}
    .super-fold-button:hover{background:#f8fafc}
    .super-fold-button small{display:block;margin-top:2px;color:var(--muted);font-size:11px;font-weight:500}
    .super-fold-button .super-fold-arrow{font-size:20px;color:var(--muted);transition:transform .18s ease}
    .super-foldable.super-fold-closed>.super-fold-button .super-fold-arrow{transform:rotate(-90deg)}
    .super-foldable.super-fold-closed>:not(.super-fold-button){display:none!important}
    .super-foldable>:not(.super-fold-button){margin-left:13px;margin-right:13px}
    .super-foldable>:last-child{margin-bottom:13px}
    .super-rebuild-card{padding:12px;border:1px dashed #cbd5e1;border-radius:12px;background:#fbfcfe}
    .super-rebuild-card p{margin:0 0 10px;color:var(--muted);font-size:12px}
    @media(max-width:700px){.super-clean-toolbar{display:grid;grid-template-columns:1fr 1fr}.super-clean-toolbar .btn:last-child{grid-column:1/-1}}
  `;
  document.head.appendChild(style);
}

function foldDescription(title){
  const map={
    'Criar Administrador Absoluto':'Criar um novo administrador com acesso total.',
    'Administradores Absolutos':'Consultar, mudar código, bloquear ou apagar.',
    'Códigos de visualização':'Gerir os acessos somente para consulta.',
    'Histórico de ações':'Acompanhar quem fez cada operação.',
    'Segurança — Administrador Absoluto':'Mudar o PIN do próprio Super Absoluto.',
    'Meu PIN — Super Absoluto':'Mudar o PIN do próprio Super Absoluto.',
    'Reconstituição da página':'Recarregar a estrutura original da interface sem apagar dados.'
  };
  return map[title]||'Expandir ou recolher esta área.';
}

function makeFoldable(section,open=false){
  if(!section||section.dataset.superFoldReady==='1')return;
  const heading=section.querySelector(':scope > h2, :scope > h3');
  if(!heading)return;
  const title=heading.textContent.trim();
  const button=document.createElement('button');
  button.type='button';
  button.className='super-fold-button';
  button.innerHTML='<span>'+title+'<small>'+foldDescription(title)+'</small></span><span class="super-fold-arrow">⌄</span>';
  heading.replaceWith(button);
  section.classList.add('super-foldable');
  if(!open)section.classList.add('super-fold-closed');
  button.addEventListener('click',()=>section.classList.toggle('super-fold-closed'));
  section.dataset.superFoldReady='1';
}

function prepareOwnPin(superCard){
  const form=document.getElementById('changePinForm');
  if(!form||document.getElementById('superOwnPinPanel'))return;
  const source=form.closest('.settings-card,.form-card');
  if(!source)return;
  const wrapper=document.createElement('div');
  wrapper.id='superOwnPinPanel';
  wrapper.className='super-section';
  const heading=source.querySelector('h2');
  if(heading)heading.textContent='Meu PIN — Super Absoluto';
  wrapper.appendChild(source);
  const stats=superCard.querySelector('#superStats');
  stats?.insertAdjacentElement('afterend',wrapper);
}

function prepareRebuild(superCard){
  if(document.getElementById('superRebuildPanel'))return;
  const panel=document.createElement('div');
  panel.id='superRebuildPanel';
  panel.className='super-section';
  panel.innerHTML='<h3>Reconstituição da página</h3><div class="super-rebuild-card"><p>Recarrega a página administrativa a partir da estrutura publicada e limpa o estado visual temporário. Não altera eleição, membros, candidatos, votos, resultados nem PINs.</p><button id="superRebuildInterfaceBtn" class="btn btn-secondary" type="button">Reconstituir página</button></div>';
  superCard.appendChild(panel);
  document.getElementById('superRebuildInterfaceBtn')?.addEventListener('click',()=>{
    if(!confirm('Reconstituir a interface administrativa agora? Os dados guardados não serão apagados.'))return;
    const clean=location.origin+location.pathname+'?super_rebuild='+Date.now()+'#admin';
    location.replace(clean);
  });
}

function prepareToolbar(superCard){
  if(document.getElementById('superCleanToolbar'))return;
  const toolbar=document.createElement('div');
  toolbar.id='superCleanToolbar';
  toolbar.className='super-clean-toolbar';
  toolbar.innerHTML='<button id="superUiExpandAll" class="btn btn-ghost" type="button">Expandir tudo</button><button id="superUiCollapseAll" class="btn btn-ghost" type="button">Recolher tudo</button><button id="superUiRefreshPage" class="btn btn-secondary" type="button">Recarregar</button>';
  const stats=superCard.querySelector('#superStats');
  stats?.insertAdjacentElement('beforebegin',toolbar);
  document.getElementById('superUiExpandAll')?.addEventListener('click',()=>document.querySelectorAll('#superAbsoluteCard .super-foldable').forEach(x=>x.classList.remove('super-fold-closed')));
  document.getElementById('superUiCollapseAll')?.addEventListener('click',()=>document.querySelectorAll('#superAbsoluteCard .super-foldable').forEach(x=>x.classList.add('super-fold-closed')));
  document.getElementById('superUiRefreshPage')?.addEventListener('click',()=>location.reload());
}

function relabelPinActions(superCard){
  superCard.querySelectorAll('[data-super-reset]').forEach(btn=>{btn.textContent='Mudar PIN';});
}

function applySuperCleanUi(){
  if(!superUiIsActive())return;
  const superCard=document.getElementById('superAbsoluteCard');
  if(!superCard)return;
  installSuperUiStyles();
  prepareOwnPin(superCard);
  prepareRebuild(superCard);
  prepareToolbar(superCard);
  relabelPinActions(superCard);
  const sections=[...superCard.querySelectorAll('.super-section')];
  sections.forEach((section,index)=>makeFoldable(section,index===0));
}

const observer=new MutationObserver(()=>applySuperCleanUi());
observer.observe(document.documentElement,{childList:true,subtree:true});
applySuperCleanUi();
document.addEventListener('click',event=>{if(event.target.closest?.('[data-admin-view="settings"]'))setTimeout(applySuperCleanUi,80);},true);
