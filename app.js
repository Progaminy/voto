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

function applyAccessLevel(level = sessionStorage.getItem(ADMIN_ACCESS_KEY) || '') {
  if (!document.body) return;
  document.body.classList.toggle('admin-readonly', level === 'readonly');
  document.body.classList.toggle('admin-full', level === 'full');

  const readonly = level === 'readonly';
  document.querySelectorAll('#positionForm, #candidateForm, #voterForm, #bulkVoterForm, #electionForm, #changePinForm').forEach(form => {
    form.closest('.form-card, .settings-card')?.classList.toggle('readonly-hidden', readonly);
  });
  document.querySelector('[data-admin-view="settings"]')?.classList.toggle('readonly-hidden', readonly);
  document.getElementById('adminViewSettings')?.classList.toggle('readonly-hidden', readonly);
  document.getElementById('toggleElectionBtn')?.classList.toggle('readonly-hidden', readonly);
  document.querySelectorAll('.delete-candidate, .delete-voter, .position-edit-btn').forEach(el => el.classList.toggle('readonly-hidden', readonly));
}

window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  const isAdminCall = url.includes('/functions/v1/vote-admin');
  const action = isAdminCall ? getRequestAction(init) : '';
  let requestInit = init;

  if (isAdminCall) {
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('apikey', SUPABASE_PUBLIC_KEY);
    headers.set('x-client-info', 'axinene-voto/stable-20260901');
    requestInit = { ...init, headers };
  }

  const response = await originalFetch(input, requestInit);

  if (isAdminCall) {
    try {
      const payload = await response.clone().json();
      if (payload?.access_level === 'readonly' || payload?.access_level === 'full') {
        sessionStorage.setItem(ADMIN_ACCESS_KEY, payload.access_level);
        setTimeout(() => applyAccessLevel(payload.access_level), 0);
      }
      if ((action === 'logout' && response.ok) || (response.status === 401 && action !== 'login')) {
        sessionStorage.removeItem(ADMIN_ACCESS_KEY);
        setTimeout(() => applyAccessLevel(''), 0);
      }
    } catch {}
  }

  return response;
};

// Núcleo da aplicação. Sem MutationObserver global: a página deve permanecer responsiva.
await import('./app-core.js?v=20260901-2400');

// Regra pública: só número de membro AX pode liberar a votação.
await import('./member-only-verification.js?v=20260901-2400');

// Consulta pública das candidaturas quando a eleição ainda não está aberta.
await import('./public-candidate-catalog.js?v=20260901-2400');

// Vagas como categorias navegáveis por abas, com recolher/expandir detalhes.
await import('./public-position-tabs.js?v=20260901-2500');

let adminExtrasLoaded = false;
async function loadAdminExtras() {
  if (adminExtrasLoaded || location.hash !== '#admin') return;
  adminExtrasLoaded = true;
  await import('./admin-position-edit-core.js?v=20260901-2400');
  await import('./admin-sensitive-confirm.js?v=20260901-2400');
  await import('./print-report-table.js?v=20260901-2400');
  applyAccessLevel();
}

let memberManagementLoaded = false;
async function loadMemberManagement() {
  if (memberManagementLoaded || location.hash !== '#admin') return;
  memberManagementLoaded = true;

  // A versão antiga deste módulo instalava um observer no body. Para estabilidade,
  // impedimos apenas esse observer durante a inicialização; os eventos normais continuam ativos.
  const NativeMutationObserver = window.MutationObserver;
  class StableMutationObserver extends NativeMutationObserver {
    observe(target, options = {}) {
      if (target === document.body) return;
      return super.observe(target, options);
    }
  }

  window.MutationObserver = StableMutationObserver;
  try {
    await import('./member-management.js?v=20260901-2400');
  } finally {
    window.MutationObserver = NativeMutationObserver;
  }
  applyAccessLevel();
}

window.addEventListener('hashchange', () => {
  loadAdminExtras();
});

document.addEventListener('click', event => {
  if (event.target.closest?.('[data-admin-view="voters"]')) {
    setTimeout(() => loadMemberManagement(), 0);
  }
}, true);

await loadAdminExtras();
applyAccessLevel();
