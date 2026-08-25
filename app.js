const SUPABASE_PUBLIC_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const ADMIN_EDGE_URL = `${SUPABASE_URL}/functions/v1/vote-admin`;
const ADMIN_SESSION_KEY = 'axinene_admin_pin_session';
const ADMIN_ACCESS_KEY = 'axinene_admin_access_level';
const originalFetch = window.fetch.bind(window);

function getRequestAction(init = {}) {
  try {
    if (typeof init.body === 'string') return JSON.parse(init.body)?.action || '';
  } catch {}
  return '';
}

function applyAdminAccessMode(level = sessionStorage.getItem(ADMIN_ACCESS_KEY) || '') {
  const readonly = level === 'readonly';
  const full = level === 'full';
  document.body.classList.toggle('admin-readonly', readonly);
  document.body.classList.toggle('admin-full', full);

  let badge = document.getElementById('adminAccessBadge');
  const topbarTitle = document.querySelector('.admin-topbar .eyebrow.light');
  if (!badge && topbarTitle) {
    badge = document.createElement('span');
    badge.id = 'adminAccessBadge';
    badge.className = 'admin-access-badge';
    topbarTitle.insertAdjacentElement('afterend', badge);
  }
  if (badge) {
    badge.textContent = readonly ? 'Somente visualização' : full ? 'Acesso total' : '';
    badge.classList.toggle('readonly', readonly);
    badge.hidden = !readonly && !full;
  }

  // O código de consulta nunca deve mostrar controlos que alterem dados.
  const readonlyCards = [
    '#positionForm',
    '#candidateForm',
    '#voterForm',
    '#bulkVoterForm'
  ];
  readonlyCards.forEach(selector => {
    document.querySelector(selector)?.closest('.form-card')?.classList.toggle('readonly-hidden', readonly);
  });

  document.querySelector('[data-admin-view="settings"]')?.classList.toggle('readonly-hidden', readonly);
  document.querySelector('#adminViewSettings')?.classList.toggle('readonly-hidden', readonly);
  document.querySelector('#toggleElectionBtn')?.classList.toggle('readonly-hidden', readonly);
  document.querySelector('#changePinForm')?.closest('.settings-card')?.classList.toggle('readonly-hidden', readonly);

  document.querySelectorAll('.delete-candidate, .delete-voter, .position-edit-btn').forEach(el => {
    el.classList.toggle('readonly-hidden', readonly);
  });

  const positionHelp = document.querySelector('.position-editor-help');
  if (positionHelp && readonly) positionHelp.textContent = 'Consulta das vagas registadas. Este acesso não permite alterações.';

  // Se a sessão de consulta estiver numa área de edição, regressa aos resultados.
  if (readonly && document.querySelector('#adminViewSettings')?.classList.contains('active')) {
    document.querySelector('[data-admin-view="results"]')?.click();
  }
}

window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  const isAdminCall = url.includes('/functions/v1/vote-admin');
  const action = isAdminCall ? getRequestAction(init) : '';
  let requestInit = init;

  if (isAdminCall) {
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('apikey', SUPABASE_PUBLIC_KEY);
    headers.set('x-client-info', 'axinene-voto/1.3');
    requestInit = { ...init, headers };
  }

  const response = await originalFetch(input, requestInit);

  if (isAdminCall) {
    try {
      const payload = await response.clone().json();
      if (payload?.access_level === 'readonly' || payload?.access_level === 'full') {
        sessionStorage.setItem(ADMIN_ACCESS_KEY, payload.access_level);
        applyAdminAccessMode(payload.access_level);
      }
      if (action === 'logout' && response.ok) {
        sessionStorage.removeItem(ADMIN_ACCESS_KEY);
        applyAdminAccessMode('');
      }
      if (response.status === 401 && action !== 'login') {
        sessionStorage.removeItem(ADMIN_ACCESS_KEY);
        applyAdminAccessMode('');
      }
    } catch {}
  }

  return response;
};

const runtimeStyles = document.createElement('style');
runtimeStyles.textContent = `
  body {
    padding-bottom: calc(58px + env(safe-area-inset-bottom, 0px));
  }
  .site-footer {
    position: fixed !important;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    z-index: 80;
    min-height: 58px;
    background: rgba(255,255,255,.97);
    backdrop-filter: blur(12px);
    box-shadow: 0 -6px 24px rgba(6,46,99,.08);
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }
  .admin-access-badge {
    display: inline-flex;
    margin-top: 7px;
    padding: 5px 9px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: .04em;
    color: #0c6c34;
    background: rgba(255,255,255,.9);
  }
  .admin-access-badge.readonly { color: #714f00; background: #fff4cc; }
  .readonly-hidden { display: none !important; }
  body.admin-readonly #toggleElectionBtn,
  body.admin-readonly .delete-candidate,
  body.admin-readonly .delete-voter,
  body.admin-readonly .position-edit-btn,
  body.admin-readonly #positionForm,
  body.admin-readonly #candidateForm,
  body.admin-readonly #voterForm,
  body.admin-readonly #bulkVoterForm,
  body.admin-readonly #changePinForm,
  body.admin-readonly #electionForm,
  body.admin-readonly [data-admin-view="settings"],
  body.admin-readonly #adminViewSettings {
    display: none !important;
  }
  .print-result-btn { white-space: nowrap; }
  .print-only { display: none; }

  @media print {
    @page { margin: 12mm; }
    body { padding: 0 !important; background: #fff !important; }
    .site-header,
    .site-footer,
    .admin-topbar,
    .admin-election-bar,
    .stats-grid,
    .admin-tabs,
    .participation-card,
    #printResultsBtn,
    #publicApp,
    #adminLoginView,
    .toast-region { display: none !important; }
    #adminApp,
    #adminDashboard,
    .admin-content,
    #adminViewResults {
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      max-width: none !important;
    }
    #adminViewResults > .view-header { display: none !important; }
    .print-only { display: block !important; }
    .print-report-header {
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 2px solid #111;
    }
    .print-report-header h1 { margin: 0 0 4px; font-size: 22px; }
    .print-report-header p { margin: 2px 0; font-size: 11px; color: #444; }
    .result-position {
      break-inside: avoid;
      box-shadow: none !important;
      border: 1px solid #bbb !important;
      margin-bottom: 12px !important;
    }
    .result-bar { border: 1px solid #aaa; }
  }
`;
document.head.appendChild(runtimeStyles);

applyAdminAccessMode();

await import('./app-core.js?v=20260825-2335');
await import('./admin-position-edit.js?v=20260825-2335');

function showRuntimeToast(message, type = 'info') {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 4800);
}

function ensurePrintButton() {
  const header = document.querySelector('#adminViewResults > .view-header');
  if (!header || document.getElementById('printResultsBtn')) return;

  const button = document.createElement('button');
  button.id = 'printResultsBtn';
  button.type = 'button';
  button.className = 'btn btn-ghost print-result-btn';
  button.textContent = 'Imprimir resultado';
  header.appendChild(button);

  let reportHeader = document.getElementById('printReportHeader');
  if (!reportHeader) {
    reportHeader = document.createElement('div');
    reportHeader.id = 'printReportHeader';
    reportHeader.className = 'print-only print-report-header';
    document.getElementById('adminResults')?.insertAdjacentElement('beforebegin', reportHeader);
  }

  button.addEventListener('click', () => {
    const electionText = document.getElementById('adminElectionSelect')?.selectedOptions?.[0]?.textContent?.trim() || 'Comissão Eleitoral Interna — AXINENE';
    const printedAt = new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
    reportHeader.innerHTML = `<h1>Resultado da votação</h1><p>${electionText}</p><p>Impresso em ${printedAt}</p>`;
    window.print();
  });
}

async function forceDeleteVoter(button) {
  const access = sessionStorage.getItem(ADMIN_ACCESS_KEY);
  if (access !== 'full') return;
  const voterId = button.dataset.id;
  if (!voterId) return;
  const name = button.closest('tr')?.querySelector('strong')?.textContent?.trim() || 'este eleitor';
  const confirmed = window.confirm(`Apagar ${name}?\n\nSe esta pessoa já tiver votado, os votos associados também serão apagados e os resultados serão recalculados. Esta ação não pode ser desfeita.`);
  if (!confirmed) return;

  button.disabled = true;
  button.textContent = 'A apagar…';
  try {
    const response = await fetch(ADMIN_EDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        action: 'deleteVoter',
        token: sessionStorage.getItem(ADMIN_SESSION_KEY),
        voter_id: voterId
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) throw new Error(data?.message || 'Não foi possível apagar o eleitor.');
    showRuntimeToast(data.message || 'Eleitor e votos associados apagados.', 'success');
    setTimeout(() => location.reload(), 650);
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Remover';
    showRuntimeToast(error.message || 'Não foi possível apagar o eleitor.', 'error');
  }
}

function readonlyBlocksElement(target) {
  if (sessionStorage.getItem(ADMIN_ACCESS_KEY) !== 'readonly') return false;
  return Boolean(target.closest?.(
    '#toggleElectionBtn, .delete-candidate, .delete-voter, .position-edit-btn, #positionForm, #candidateForm, #voterForm, #bulkVoterForm, #changePinForm, #electionForm, [data-admin-view="settings"]'
  ));
}

// Segunda barreira no navegador: o acesso 299792 é exclusivamente visual.
document.addEventListener('click', event => {
  if (readonlyBlocksElement(event.target)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showRuntimeToast('Este acesso é somente para visualização.', 'error');
    return;
  }

  const deleteButton = event.target.closest?.('.delete-voter');
  if (deleteButton && sessionStorage.getItem(ADMIN_ACCESS_KEY) === 'full') {
    event.preventDefault();
    event.stopImmediatePropagation();
    forceDeleteVoter(deleteButton);
  }
}, true);

document.addEventListener('submit', event => {
  if (sessionStorage.getItem(ADMIN_ACCESS_KEY) !== 'readonly') return;
  if (event.target.matches?.('#positionForm, #candidateForm, #voterForm, #bulkVoterForm, #changePinForm, #electionForm, #positionEditForm')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showRuntimeToast('Este acesso é somente para visualização.', 'error');
  }
}, true);

const observer = new MutationObserver(() => {
  applyAdminAccessMode();
  ensurePrintButton();
});
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

ensurePrintButton();
applyAdminAccessMode();