const SUPABASE_PUBLIC_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const ADMIN_EDGE_URL = `${SUPABASE_URL}/functions/v1/vote-admin`;
const ADMIN_SESSION_KEY = 'axinene_admin_pin_session';
const ADMIN_ACCESS_KEY = 'axinene_admin_access_level';
const originalFetch = window.fetch.bind(window);

if (!sessionStorage.getItem(ADMIN_SESSION_KEY)) {
  sessionStorage.removeItem(ADMIN_ACCESS_KEY);
}

const accessPolicyStyles = document.createElement('style');
accessPolicyStyles.id = 'adminAccessPolicyStyles';
accessPolicyStyles.textContent = `
  .readonly-hidden { display:none !important; }

  body.admin-readonly #adminViewCandidates .form-card,
  body.admin-readonly #adminViewVoters .voter-admin-grid,
  body.admin-readonly [data-admin-view="settings"],
  body.admin-readonly #adminViewSettings,
  body.admin-readonly #toggleElectionBtn,
  body.admin-readonly #printMembersBtn,
  body.admin-readonly #printResultsBtn,
  body.admin-readonly #adminAccessCodesCard,
  body.admin-readonly #announceResultsBtn,
  body.admin-readonly #resultRuleCard,
  body.admin-readonly .member-edit-btn,
  body.admin-readonly .member-delete-btn,
  body.admin-readonly .member-view-code-btn,
  body.admin-readonly .delete-candidate,
  body.admin-readonly .delete-voter,
  body.admin-readonly .position-edit-btn,
  body.admin-readonly [data-member-view-code],
  body.admin-readonly [data-access-toggle],
  body.admin-readonly [data-access-delete],
  body.admin-readonly [data-access-copy] { display:none !important; }

  @media print {
    body.admin-readonly #adminApp { display:none !important; }
    body.admin-readonly::after {
      content:'Impressão não autorizada para este acesso.';
      display:block;
      padding:40px;
      font:700 18px/1.4 Arial,sans-serif;
      color:#111;
    }
    body.admin-direct-print-blocked #adminApp,
    body.admin-direct-print-blocked #publicApp,
    body.admin-direct-print-blocked .site-header,
    body.admin-direct-print-blocked .site-footer { display:none !important; }
    body.admin-direct-print-blocked::after {
      content:'No painel administrativo, use apenas os botões “Imprimir lista de membros” ou “Imprimir resultados”.';
      display:block;
      padding:40px;
      font:700 18px/1.4 Arial,sans-serif;
      color:#111;
    }
  }
`;
document.head.appendChild(accessPolicyStyles);

function getRequestAction(init = {}) {
  try {
    if (typeof init.body === 'string') return JSON.parse(init.body)?.action || '';
  } catch {}
  return '';
}

function currentAccessLevel() {
  return sessionStorage.getItem(ADMIN_ACCESS_KEY) || '';
}

function isReadonlyAccess() {
  return currentAccessLevel() === 'readonly';
}

function accessDeniedResponse(message = 'Este código permite apenas consultar informações.') {
  return Promise.resolve(new Response(JSON.stringify({ ok: false, message, access_level: 'readonly' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  }));
}

function showReadonlyDenied() {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'toast error';
  el.textContent = 'Este código é apenas para consulta. Nenhuma alteração é permitida.';
  region.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function applyAccessLevel(level = currentAccessLevel()) {
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
  document.querySelectorAll('.delete-candidate, .delete-voter, .position-edit-btn, .member-edit-btn, .member-delete-btn, .member-view-code-btn, [data-member-view-code], #printMembersBtn, #printResultsBtn, #adminAccessCodesCard, #announceResultsBtn, #resultRuleCard').forEach(el => el.classList.toggle('readonly-hidden', readonly));
}

window.axineneSetAdminAccessLevel = level => {
  if (level === 'readonly' || level === 'full') sessionStorage.setItem(ADMIN_ACCESS_KEY, level);
  else sessionStorage.removeItem(ADMIN_ACCESS_KEY);
  applyAccessLevel(level || '');
};

const READONLY_VOTE_ADMIN_ACTIONS = new Set(['login', 'logout', 'dashboard']);
const READONLY_MEMBER_ACTIONS = new Set(['list']);

window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  const action = getRequestAction(init);
  const isAdminCall = url.includes('/functions/v1/vote-admin');
  const isMembersCall = url.includes('/functions/v1/vote-members');
  const isBrandingCall = url.includes('/functions/v1/vote-branding');
  const isResultsAdminCall = url.includes('/functions/v1/vote-results-admin');
  const isCodeAdminCall = url.includes('/functions/v1/vote-view-code-admin');
  const isRestCall = url.includes('/rest/v1/');
  const isStorageCall = url.includes('/storage/v1/');

  if (isAdminCall && action === 'login') {
    sessionStorage.removeItem(ADMIN_ACCESS_KEY);
    applyAccessLevel('');
  }

  if (isReadonlyAccess() && location.hash === '#admin') {
    if (isAdminCall && !READONLY_VOTE_ADMIN_ACTIONS.has(action)) {
      showReadonlyDenied();
      return accessDeniedResponse();
    }
    if (isMembersCall && !READONLY_MEMBER_ACTIONS.has(action)) {
      showReadonlyDenied();
      return accessDeniedResponse();
    }
    if (isBrandingCall || isResultsAdminCall || isCodeAdminCall) {
      showReadonlyDenied();
      return accessDeniedResponse();
    }
    const method = String(init.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
    if ((isRestCall || isStorageCall) && !['GET', 'HEAD'].includes(method)) {
      showReadonlyDenied();
      return accessDeniedResponse();
    }
  }

  let requestInit = init;
  if (isAdminCall) {
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('apikey', SUPABASE_PUBLIC_KEY);
    headers.set('x-client-info', 'axinene-voto/stable-20260901-readonly-lockdown');
    requestInit = { ...init, headers };
  }

  const response = await originalFetch(input, requestInit);

  if (isAdminCall) {
    try {
      const payload = await response.clone().json();
      if (payload?.access_level === 'readonly' || payload?.access_level === 'full') {
        sessionStorage.setItem(ADMIN_ACCESS_KEY, payload.access_level);
        applyAccessLevel(payload.access_level);
        if (payload.access_level === 'full') setTimeout(() => loadAdminExtras(), 0);
      }
      if ((action === 'logout' && response.ok) || (response.status === 401 && action !== 'login')) {
        sessionStorage.removeItem(ADMIN_ACCESS_KEY);
        applyAccessLevel('');
      }
    } catch {}
  }

  return response;
};

// Defesa adicional no navegador: um acesso readonly não consegue acionar
// os handlers antigos de formulários ou botões de alteração.
document.addEventListener('submit', event => {
  if (!isReadonlyAccess() || !event.target.closest?.('#adminApp')) return;
  if (event.target.id === 'adminLoginForm') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  showReadonlyDenied();
}, true);

document.addEventListener('click', event => {
  if (!isReadonlyAccess() || !event.target.closest?.('#adminApp')) return;
  const mutation = event.target.closest?.(
    '#toggleElectionBtn, #announceResultsBtn, #saveFiscalRuleBtn, #generateViewCodeBtn, #printMembersBtn, #printResultsBtn, ' +
    '.member-edit-btn, .member-delete-btn, .member-view-code-btn, [data-member-view-code], .delete-candidate, .delete-voter, ' +
    '.position-edit-btn, [data-access-toggle], [data-access-delete], [data-access-copy]'
  );
  if (!mutation) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  showReadonlyDenied();
}, true);

window.addEventListener('beforeprint', () => {
  if (location.hash === '#admin') document.body.classList.add('admin-direct-print-blocked');
});
window.addEventListener('afterprint', () => document.body.classList.remove('admin-direct-print-blocked'));

await import('./app-core.js?v=20260901-2400');
await import('./member-only-verification.js?v=20260901-2400');
await import('./public-candidate-catalog.js?v=20260901-2400');
await import('./public-position-tabs.js?v=20260901-2600');
await import('./page-customization.js?v=20260901-2600');
await import('./page-card-theme.js?v=20260901-2600');
await import('./public-results.js?v=20260901-3000');
await import('./public-results-print.js?v=20260901-3100');

let adminExtrasLoaded = false;
async function loadAdminExtras() {
  if (adminExtrasLoaded || location.hash !== '#admin' || currentAccessLevel() !== 'full') return;
  adminExtrasLoaded = true;
  await import('./admin-position-edit-core.js?v=20260901-2400');
  await import('./admin-sensitive-confirm.js?v=20260901-2700');
  await import('./admin-access-codes.js?v=20260901-2900');
  await import('./admin-access-code-copy.js?v=20260901-3200');
  await import('./admin-result-publication.js?v=20260901-3000');
  await import('./admin-print-results.js?v=20260901-3100');
  applyAccessLevel();
}

let memberManagementLoaded = false;
async function loadMemberManagement() {
  if (memberManagementLoaded || location.hash !== '#admin') return;
  memberManagementLoaded = true;

  const NativeMutationObserver = window.MutationObserver;
  class StableMutationObserver extends NativeMutationObserver {
    observe(target, options = {}) {
      if (target === document.body) return;
      return super.observe(target, options);
    }
  }

  window.MutationObserver = StableMutationObserver;
  try {
    await import('./member-management.js?v=20260901-2900');
  } finally {
    window.MutationObserver = NativeMutationObserver;
  }

  await import('./member-coordination-labels.js?v=20260901-2600');
  applyAccessLevel();
}

window.addEventListener('hashchange', () => {
  loadAdminExtras();
  applyAccessLevel();
});

document.addEventListener('click', event => {
  if (event.target.closest?.('[data-admin-view="voters"]')) {
    setTimeout(() => loadMemberManagement(), 0);
  }
}, true);

await loadAdminExtras();
applyAccessLevel();
