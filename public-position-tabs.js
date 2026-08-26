const tabStyles = document.createElement('style');
tabStyles.textContent = `
  .position-tabs-wrap {
    margin: 0 0 14px;
    padding: 10px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--surface);
    box-shadow: 0 8px 24px rgba(14,54,98,.06);
  }
  .position-tabs-help {
    margin: 0 0 9px;
    color: var(--muted);
    font-size: 12px;
  }
  .position-tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: thin;
    padding-bottom: 2px;
  }
  .position-tab {
    min-width: max-content;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface-soft);
    color: var(--blue-900);
    padding: 9px 12px;
    font-weight: 800;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .position-tab.active {
    background: var(--blue-700);
    border-color: var(--blue-700);
    color: #fff;
  }
  .position-tab-status {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 3px 7px;
    background: rgba(255,255,255,.18);
    font-size: 9px;
    font-weight: 900;
  }
  .position-tab:not(.active) .position-tab-status.done {
    background: var(--green-100);
    color: var(--green-700);
  }
  .position-tab:not(.active) .position-tab-status.pending {
    background: var(--blue-100);
    color: var(--blue-700);
  }
  .position-block.tab-hidden { display: none !important; }
  @media (max-width: 640px) {
    .position-tabs-wrap { margin-inline: -2px; padding: 9px; }
    .position-tab { padding: 9px 10px; font-size: 11px; }
  }
`;
document.head.appendChild(tabStyles);

let activeTitle = '';
let rebuildQueued = false;

function ensureTabsWrap(root) {
  let wrap = document.getElementById('positionTabsWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'positionTabsWrap';
    wrap.className = 'position-tabs-wrap';
    wrap.innerHTML = `
      <p class="position-tabs-help">Cada aba corresponde a uma vaga. O eleitor pode escolher apenas um candidato em cada vaga.</p>
      <div id="positionTabs" class="position-tabs" role="tablist" aria-label="Vagas da eleição"></div>`;
    root.insertAdjacentElement('beforebegin', wrap);
  }
  return wrap;
}

function activateTab(index) {
  const blocks = [...document.querySelectorAll('#positionsList .position-block')];
  const tabs = [...document.querySelectorAll('#positionTabs .position-tab')];
  if (!blocks.length) return;
  const safeIndex = Math.max(0, Math.min(index, blocks.length - 1));
  blocks.forEach((block, i) => block.classList.toggle('tab-hidden', i !== safeIndex));
  tabs.forEach((tab, i) => {
    const active = i === safeIndex;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
    tab.tabIndex = active ? 0 : -1;
  });
  activeTitle = blocks[safeIndex]?.querySelector('.position-head h3')?.textContent?.trim() || '';
}

function rebuildTabs() {
  const root = document.getElementById('positionsList');
  if (!root) return;
  const blocks = [...root.querySelectorAll(':scope > .position-block')];
  const existing = document.getElementById('positionTabsWrap');

  if (!blocks.length) {
    existing?.remove();
    return;
  }

  const wrap = ensureTabsWrap(root);
  const tabsRoot = wrap.querySelector('#positionTabs');
  const previousTitle = activeTitle;
  tabsRoot.replaceChildren();

  blocks.forEach((block, index) => {
    const title = block.querySelector('.position-head h3')?.textContent?.trim() || `Vaga ${index + 1}`;
    const done = Boolean(block.querySelector('.position-state.done'));
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'position-tab';
    tab.setAttribute('role', 'tab');
    tab.innerHTML = `<span>${index + 1}. ${title.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</span><span class="position-tab-status ${done ? 'done' : 'pending'}">${done ? 'Concluído' : 'Por votar'}</span>`;
    tab.addEventListener('click', () => activateTab(index));
    tabsRoot.appendChild(tab);
  });

  let desired = blocks.findIndex(block => block.querySelector('.position-head h3')?.textContent?.trim() === previousTitle);
  if (desired < 0) desired = blocks.findIndex(block => !block.querySelector('.position-state.done'));
  if (desired < 0) desired = 0;
  activateTab(desired);
}

function queueRebuild() {
  if (rebuildQueued) return;
  rebuildQueued = true;
  requestAnimationFrame(() => {
    rebuildQueued = false;
    rebuildTabs();
  });
}

const rootObserver = new MutationObserver(queueRebuild);
const positionsRoot = document.getElementById('positionsList');
if (positionsRoot) rootObserver.observe(positionsRoot, { childList: true, subtree: true });

queueRebuild();
