const SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const ADMIN_EDGE_URL = `${SUPABASE_URL}/functions/v1/vote-admin`;
const ADMIN_SESSION_KEY = 'axinene_admin_pin_session';
const ADMIN_ACCESS_KEY = 'axinene_admin_access_level';

let loginFixBusy = false;

function loginToast(message, type = 'error') {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// Hotfix: intercepta o formulário antes do handler antigo.
// Depois de autenticar, guarda a sessão e recarrega o #admin;
// no novo carregamento o painel abre diretamente com o nível correto.
document.addEventListener('submit', async event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'adminLoginForm') return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (loginFixBusy) return;

  const input = document.getElementById('adminPin');
  const button = document.getElementById('adminLoginBtn');
  const pin = String(input?.value || '').trim();

  if (!/^\d{6}$/.test(pin)) {
    loginToast('Introduza um PIN de 6 dígitos.');
    return;
  }

  loginFixBusy = true;
  const oldLabel = button?.textContent || 'Entrar';
  if (button) {
    button.disabled = true;
    button.textContent = 'A entrar…';
  }

  try {
    const response = await fetch(ADMIN_EDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ action: 'login', pin })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false || !data?.token) {
      throw new Error(data?.message || 'Não foi possível entrar.');
    }

    sessionStorage.setItem(ADMIN_SESSION_KEY, data.token);
    if (data.access_level === 'readonly' || data.access_level === 'full') {
      sessionStorage.setItem(ADMIN_ACCESS_KEY, data.access_level);
    } else {
      sessionStorage.removeItem(ADMIN_ACCESS_KEY);
    }

    if (location.hash !== '#admin') location.hash = '#admin';
    location.reload();
  } catch (error) {
    loginFixBusy = false;
    if (button) {
      button.disabled = false;
      button.textContent = oldLabel;
    }
    if (input) {
      input.value = '';
      input.focus();
    }
    loginToast(error?.message || 'PIN incorreto.');
  }
}, true);

await import('./admin-position-edit-core.js?v=20260825-2345');
