const RESULT_HOME_SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const RESULT_HOME_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const RESULT_HOME_ADMIN_URL = `${RESULT_HOME_SUPABASE_URL}/functions/v1/vote-result-homepage-admin`;
const RESULT_HOME_SESSION_KEY = 'axinene_admin_pin_session';
const RESULT_HOME_LEVEL_KEY = 'axinene_admin_access_level';

let resultHomepageState = null;
let resultHomepageBusy = false;

function resultHomepageIsAbsolute() {
  return sessionStorage.getItem(RESULT_HOME_LEVEL_KEY) === 'full';
}
function resultHomepageElectionId() {
  return document.getElementById('adminElectionSelect')?.value || '';
}
function resultHomepageToast(message, type = 'info', timeout = 4500) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}
async function resultHomepageApi(action, payload = {}) {
  const token = sessionStorage.getItem(RESULT_HOME_SESSION_KEY) || '';
  const election_id = resultHomepageElectionId();
  if (!token) throw new Error('Sessão administrativa não encontrada.');
  if (!election_id) throw new Error('Selecione uma eleição.');
  const response = await fetch(RESULT_HOME_ADMIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: RESULT_HOME_KEY,
      'x-client-info': 'axinene-result-homepage-admin/1.0'
    },
    cache: 'no-store',
    body: JSON.stringify({ action, token, election_id, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) throw new Error(data?.message || 'Não foi possível alterar a página principal.');
  return data;
}
function ensureResultHomepageButton() {
  if (!resultHomepageIsAbsolute()) return null;
  let button = document.getElementById('resultHomepageToggleBtn');
  if (button) return button;
  const wrap = document.querySelector('#adminViewResults .announce-result-wrap');
  if (!wrap) return null;
  button = document.createElement('button');
  button.id = 'resultHomepageToggleBtn';
  button.className = 'btn btn-ghost';
  button.type = 'button';
  button.hidden = true;
  button.addEventListener('click', toggleResultHomepage);
  wrap.appendChild(button);
  return button;
}
function renderResultHomepageState(publication) {
  resultHomepageState = publication || null;
  const button = ensureResultHomepageButton();
  if (!button) return;
  if (!publication) {
    button.hidden = true;
    return;
  }
  const visible = publication.show_on_homepage !== false;
  button.hidden = false;
  button.textContent = visible ? 'Retirar da página principal' : 'Mostrar na página principal';
  button.title = visible
    ? 'Retira a manchete da página principal sem apagar o resultado do histórico.'
    : 'Volta a mostrar este resultado como última votação na página principal.';
}
async function loadResultHomepageState() {
  if (!resultHomepageIsAbsolute() || resultHomepageBusy || !resultHomepageElectionId()) return;
  resultHomepageBusy = true;
  try {
    ensureResultHomepageButton();
    const data = await resultHomepageApi('get');
    renderResultHomepageState(data.publication || null);
  } catch (error) {
    console.error(error);
  } finally {
    resultHomepageBusy = false;
  }
}
async function toggleResultHomepage() {
  if (!resultHomepageIsAbsolute() || !resultHomepageState) return;
  const currentlyVisible = resultHomepageState.show_on_homepage !== false;
  const nextVisible = !currentlyVisible;
  const question = currentlyVisible
    ? 'Retirar este resultado da página principal? Ele continuará guardado no Histórico de Votações.'
    : 'Mostrar novamente este resultado na página principal?';
  if (!confirm(question)) return;

  const button = document.getElementById('resultHomepageToggleBtn');
  const oldText = button?.textContent || '';
  if (button) {
    button.disabled = true;
    button.textContent = nextVisible ? 'A mostrar…' : 'A retirar…';
  }
  try {
    const data = await resultHomepageApi('set', { show_on_homepage: nextVisible });
    renderResultHomepageState(data.publication || null);
    resultHomepageToast(data.message || 'Apresentação atualizada.', 'success', 5200);
    await window.axineneRefreshPublicResults?.();
  } catch (error) {
    resultHomepageToast(error.message || 'Não foi possível alterar a página principal.', 'error', 6000);
    if (button) button.textContent = oldText;
  } finally {
    if (button) button.disabled = false;
  }
}

document.addEventListener('click', event => {
  if (event.target.closest?.('[data-admin-view="results"]')) setTimeout(loadResultHomepageState, 120);
  if (event.target.closest?.('#announceResultsBtn')) {
    setTimeout(loadResultHomepageState, 900);
    setTimeout(loadResultHomepageState, 2400);
  }
});
document.getElementById('adminElectionSelect')?.addEventListener('change', () => {
  resultHomepageState = null;
  setTimeout(loadResultHomepageState, 180);
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#admin') setTimeout(loadResultHomepageState, 300);
});

setTimeout(loadResultHomepageState, 550);
