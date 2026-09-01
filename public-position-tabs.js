// Navegação pública por vagas/categorias.
// O observador fica restrito apenas aos filhos diretos de #positionsList.
// Não observa atributos nem o body, evitando ciclos de renderização.

const root = document.getElementById('positionsList');
const ballotSection = document.getElementById('ballotSection');

if (root) {
  const styles = document.createElement('style');
  styles.id = 'publicPositionTabsStyles';
  styles.textContent = `
    .vacancy-navigation {
      margin: 0 0 18px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--surface);
      box-shadow: 0 8px 24px rgba(7, 48, 92, .06);
    }
    .vacancy-navigation-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    .vacancy-navigation-head strong {
      display: block;
      color: var(--ink);
      font-size: 14px;
    }
    .vacancy-navigation-head span {
      display: block;
      margin-top: 2px;
      color: var(--muted);
      font-size: 11px;
    }
    .vacancy-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      scrollbar-width: thin;
      padding: 2px 1px 5px;
    }
    .vacancy-tab {
      flex: 0 0 auto;
      min-height: 42px;
      max-width: min(300px, 78vw);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 9px 14px;
      background: var(--surface-soft, #f4f8fc);
      color: var(--ink);
      font: inherit;
      font-size: 12px;
      font-weight: 850;
      text-align: left;
      white-space: nowrap;
      cursor: pointer;
      transition: transform .15s ease, border-color .15s ease, background .15s ease;
    }
    .vacancy-tab:hover { transform: translateY(-1px); }
    .vacancy-tab[aria-selected="true"] {
      border-color: var(--blue-700);
      background: var(--blue-700);
      color: #fff;
      box-shadow: 0 6px 16px rgba(7, 87, 182, .18);
    }
    .vacancy-tab-state {
      margin-left: 7px;
      opacity: .78;
      font-size: 10px;
      font-weight: 750;
    }
    .position-block.vacancy-tab-panel[hidden] { display: none !important; }
    .vacancy-position-description {
      white-space: pre-line;
      line-height: 1.62;
    }
    .vacancy-detail-toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;
      width: 100%;
      margin-top: 10px;
    }
    .vacancy-detail-count {
      margin-right: auto;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
    }
    .vacancy-detail-toggle {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 7px 11px;
      background: var(--surface);
      color: var(--blue-700);
      font: inherit;
      font-size: 11px;
      font-weight: 850;
      cursor: pointer;
    }
    .position-block.vacancy-info-collapsed .vacancy-position-description { display: none !important; }
    .vacancy-info-collapsed-note {
      display: none;
      margin: 10px 0 0;
      padding: 10px 12px;
      border-radius: 12px;
      background: var(--surface-soft, #f4f8fc);
      color: var(--muted);
      font-size: 12px;
    }
    .position-block.vacancy-info-collapsed .vacancy-info-collapsed-note { display: block; }

    @media (max-width: 680px) {
      .vacancy-navigation {
        margin-left: -2px;
        margin-right: -2px;
        padding: 11px;
        border-radius: 14px;
      }
      .vacancy-navigation-head { align-items: flex-start; }
      .vacancy-tab { min-height: 40px; padding: 8px 12px; }
      .position-head { align-items: flex-start; }
      .vacancy-detail-toolbar { justify-content: stretch; }
      .vacancy-detail-count { flex: 1 1 100%; }
      .vacancy-detail-toggle { width: 100%; text-align: center; }
    }
  `;
  document.head.appendChild(styles);

  let activeTitle = '';
  let lastSignature = '';
  let scheduled = false;

  const cleanTitle = value => String(value || '').trim().replace(/\s+/g, ' ');

  function getBlocks() {
    return [...root.children].filter(el => el.classList?.contains('position-block'));
  }

  function getBlockTitle(block, index) {
    return cleanTitle(block.querySelector('.position-head h3')?.textContent) || `Vaga ${index + 1}`;
  }

  function ensureNavigation() {
    let nav = document.getElementById('vacancyNavigation');
    if (nav) return nav;

    nav = document.createElement('nav');
    nav.id = 'vacancyNavigation';
    nav.className = 'vacancy-navigation';
    nav.setAttribute('aria-label', 'Categorias de vagas');
    nav.innerHTML = `
      <div class="vacancy-navigation-head">
        <div>
          <strong>Vagas por categoria</strong>
          <span>Escolha uma aba para consultar a função e os respetivos candidatos.</span>
        </div>
      </div>
      <div id="vacancyTabs" class="vacancy-tabs" role="tablist" aria-label="Vagas disponíveis"></div>`;
    root.insertAdjacentElement('beforebegin', nav);
    return nav;
  }

  function addInformationControl(block, title) {
    const head = block.querySelector('.position-head');
    if (!head || head.querySelector('.vacancy-detail-toolbar')) return;

    const description = head.querySelector('div > p');
    if (description) description.classList.add('vacancy-position-description');

    const candidateCount = block.querySelectorAll('.candidate-card').length;
    const toolbar = document.createElement('div');
    toolbar.className = 'vacancy-detail-toolbar';
    toolbar.innerHTML = `
      <span class="vacancy-detail-count">${candidateCount} candidato${candidateCount === 1 ? '' : 's'} nesta categoria</span>
      <button class="vacancy-detail-toggle" type="button" aria-expanded="true">Recolher informação da vaga</button>`;
    head.appendChild(toolbar);

    const collapsedNote = document.createElement('div');
    collapsedNote.className = 'vacancy-info-collapsed-note';
    collapsedNote.textContent = `Informação sobre ${title} recolhida. As candidaturas continuam visíveis abaixo.`;
    head.insertAdjacentElement('afterend', collapsedNote);

    toolbar.querySelector('.vacancy-detail-toggle')?.addEventListener('click', event => {
      const collapsed = block.classList.toggle('vacancy-info-collapsed');
      event.currentTarget.textContent = collapsed ? 'Expandir informação da vaga' : 'Recolher informação da vaga';
      event.currentTarget.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
  }

  function activate(title) {
    const blocks = getBlocks();
    if (!blocks.length) return;

    const titles = blocks.map(getBlockTitle);
    const next = titles.includes(title) ? title : titles[0];
    activeTitle = next;

    blocks.forEach((block, index) => {
      const selected = titles[index] === next;
      block.classList.add('vacancy-tab-panel');
      block.hidden = !selected;
      block.setAttribute('role', 'tabpanel');
      block.setAttribute('aria-hidden', selected ? 'false' : 'true');
    });

    document.querySelectorAll('#vacancyTabs .vacancy-tab').forEach(button => {
      const selected = button.dataset.title === next;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
    });
  }

  function rebuildTabs(blocks, titles) {
    const nav = ensureNavigation();
    const tabs = nav.querySelector('#vacancyTabs');
    if (!tabs) return;

    tabs.replaceChildren();
    blocks.forEach((block, index) => {
      const title = titles[index];
      const state = cleanTitle(block.querySelector('.position-state')?.textContent);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vacancy-tab';
      button.setAttribute('role', 'tab');
      button.dataset.title = title;
      button.innerHTML = `<span></span>${state ? '<small class="vacancy-tab-state"></small>' : ''}`;
      button.querySelector('span').textContent = title;
      if (state) button.querySelector('small').textContent = state;
      button.addEventListener('click', () => activate(title));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const all = [...tabs.querySelectorAll('.vacancy-tab')];
        const current = all.indexOf(button);
        let nextIndex = current;
        if (event.key === 'ArrowRight') nextIndex = (current + 1) % all.length;
        if (event.key === 'ArrowLeft') nextIndex = (current - 1 + all.length) % all.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = all.length - 1;
        const next = all[nextIndex];
        activate(next.dataset.title);
        next.focus();
      });
      tabs.appendChild(button);
      addInformationControl(block, title);
    });
  }

  function sync() {
    scheduled = false;
    const blocks = getBlocks();
    if (!blocks.length) {
      document.getElementById('vacancyNavigation')?.remove();
      lastSignature = '';
      activeTitle = '';
      return;
    }

    const titles = blocks.map(getBlockTitle);
    const signature = titles.join('\u241f');
    if (signature !== lastSignature) {
      rebuildTabs(blocks, titles);
      lastSignature = signature;
    } else {
      blocks.forEach((block, index) => addInformationControl(block, titles[index]));
    }
    activate(activeTitle || titles[0]);
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }

  // O núcleo substitui os filhos diretos quando muda o estado da votação.
  // Observar somente childList deste elemento não cria ciclos de classes/atributos.
  const observer = new MutationObserver(scheduleSync);
  observer.observe(root, { childList: true });

  window.addEventListener('hashchange', () => {
    if (location.hash !== '#admin') setTimeout(scheduleSync, 80);
  });

  ballotSection?.addEventListener('click', event => {
    if (event.target.closest?.('.manifesto-btn, .vote-choice')) setTimeout(scheduleSync, 80);
  });

  sync();
}
