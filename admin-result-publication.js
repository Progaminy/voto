const RESULT_ADMIN_SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const RESULT_ADMIN_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const RESULT_ADMIN_URL = `${RESULT_ADMIN_SUPABASE_URL}/functions/v1/vote-results-admin`;
const RESULT_ADMIN_SESSION_KEY = 'axinene_admin_pin_session';
const RESULT_ADMIN_LEVEL_KEY = 'axinene_admin_access_level';

let resultAdminConfig = null;
let resultAdminLoading = false;

function resultAdminToast(message, type = 'info', timeout = 4800) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}

function resultAdminIsAbsolute() {
  return sessionStorage.getItem(RESULT_ADMIN_LEVEL_KEY) === 'full';
}

function resultAdminElectionId() {
  return document.getElementById('adminElectionSelect')?.value || '';
}

async function resultAdminApi(action, payload = {}) {
  const token = sessionStorage.getItem(RESULT_ADMIN_SESSION_KEY) || '';
  const election_id = resultAdminElectionId();
  if (!token) throw new Error('Sessão administrativa não encontrada.');
  if (!election_id) throw new Error('Selecione uma eleição.');
  const response = await fetch(RESULT_ADMIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: RESULT_ADMIN_KEY,
      'x-client-info': 'axinene-voto-result-admin/1.0'
    },
    cache: 'no-store',
    body: JSON.stringify({ action, token, election_id, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) throw new Error(data?.message || 'Não foi possível concluir a operação.');
  return data;
}

function installResultAdminStyles() {
  if (document.getElementById('resultAdminStyles')) return;
  const style = document.createElement('style');
  style.id = 'resultAdminStyles';
  style.textContent = `
    .announce-result-wrap{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:auto}
    .result-publication-status{font-size:11px;color:var(--muted);font-weight:750}
    .result-rule-card{margin-bottom:18px}
    .result-rule-card h2{margin:0 0 5px}
    .result-rule-intro{margin:0 0 14px;color:var(--muted);font-size:12px}
    .result-rule-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .result-rule-grid label{display:grid;gap:6px;font-size:12px;font-weight:800;color:var(--blue-950)}
    .result-role-list{display:grid;gap:8px;margin-top:12px}
    .result-role-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--surface-soft)}
    .result-role-row input[type="text"]{min-height:40px}
    .result-role-row label{display:flex;gap:6px;align-items:center;font-size:11px;font-weight:800;white-space:nowrap}
    .result-rule-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:14px}
    .result-rule-help{margin:10px 0 0;color:var(--muted);font-size:11px}
    body.admin-readonly #announceResultsBtn, body.admin-readonly #resultRuleCard{display:none!important}
    @media(max-width:700px){.result-rule-grid{grid-template-columns:1fr}.result-role-row{grid-template-columns:1fr}.announce-result-wrap{width:100%;margin-left:0}.announce-result-wrap .btn{width:100%}}
  `;
  document.head.appendChild(style);
}

function ensureResultAdminUI() {
  if (!resultAdminIsAbsolute()) return;
  installResultAdminStyles();

  const resultHeader = document.querySelector('#adminViewResults .view-header');
  if (resultHeader && !document.getElementById('announceResultsBtn')) {
    const wrap = document.createElement('div');
    wrap.className = 'announce-result-wrap';
    wrap.innerHTML = `
      <span id="resultPublicationStatus" class="result-publication-status">Resultado ainda não anunciado</span>
      <button id="announceResultsBtn" class="btn btn-primary" type="button">Anunciar resultado</button>`;
    resultHeader.appendChild(wrap);
    document.getElementById('announceResultsBtn')?.addEventListener('click', announceResults);
  }

  const settings = document.getElementById('adminViewSettings');
  if (settings && !document.getElementById('resultRuleCard')) {
    const card = document.createElement('section');
    card.id = 'resultRuleCard';
    card.className = 'card result-rule-card';
    card.innerHTML = `
      <h2>Regra de distribuição por ordem de votos</h2>
      <p class="result-rule-intro">Ative esta regra quando os candidatos concorram numa única lista do Conselho Fiscal e os cargos forem atribuídos pela ordem decrescente de votos.</p>
      <label style="display:flex;gap:8px;align-items:center;font-weight:850;margin-bottom:12px"><input id="fiscalRuleEnabled" type="checkbox" /> Ativar distribuição automática do Conselho Fiscal</label>
      <div class="result-rule-grid">
        <label>Vaga que contém os candidatos
          <select id="fiscalSourcePosition"></select>
        </label>
        <label>Quando todos os cargos já estiverem ocupados
          <select id="fiscalAllFilledPolicy">
            <option value="supplements">Passar os votados para lista de suplentes</option>
            <option value="void">A eleição fica sem efeito para esses cargos</option>
          </select>
        </label>
      </div>
      <div id="fiscalRoleList" class="result-role-list"></div>
      <div class="result-rule-actions">
        <button id="saveFiscalRuleBtn" class="btn btn-secondary" type="button">Guardar regra</button>
        <span id="fiscalRuleStatus" class="result-publication-status"></span>
      </div>
      <p class="result-rule-help">A ordem padrão é: 1.º Presidente do Conselho Fiscal, 2.º Vogal, 3.º Relator. Marque um cargo como já ocupado para o sistema saltá-lo. Se um cargo tiver candidaturas próprias, ele também é automaticamente excluído desta distribuição.</p>`;
    settings.prepend(card);
    document.getElementById('saveFiscalRuleBtn')?.addEventListener('click', saveFiscalRule);
    document.getElementById('fiscalRuleEnabled')?.addEventListener('change', updateRuleDisabledState);
  }
}

function renderRoleRows(roles = [], occupied = []) {
  const root = document.getElementById('fiscalRoleList');
  if (!root) return;
  const normalizedOccupied = new Set(occupied.map(v => String(v).trim().toLowerCase()));
  const safeRoles = roles.length ? roles : ['Presidente do Conselho Fiscal', 'Vogal', 'Relator'];
  root.innerHTML = safeRoles.slice(0, 3).map((role, index) => `
    <div class="result-role-row">
      <input class="fiscal-role-input" data-role-index="${index}" type="text" value="${String(role).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')}" />
      <label><input class="fiscal-role-occupied" data-role-index="${index}" type="checkbox" ${normalizedOccupied.has(String(role).trim().toLowerCase()) ? 'checked' : ''}/> Cargo já ocupado</label>
    </div>`).join('');
}

function updateRuleDisabledState() {
  const enabled = document.getElementById('fiscalRuleEnabled')?.checked;
  document.getElementById('fiscalSourcePosition')?.toggleAttribute('disabled', !enabled);
  document.getElementById('fiscalAllFilledPolicy')?.toggleAttribute('disabled', !enabled);
  document.querySelectorAll('.fiscal-role-input,.fiscal-role-occupied').forEach(el => el.toggleAttribute('disabled', !enabled));
}

function renderResultAdminConfig(data) {
  resultAdminConfig = data;
  ensureResultAdminUI();
  const rule = data.rule || {};
  const positions = data.positions || [];
  const publication = data.publication || null;
  const election = data.election || {};

  const source = document.getElementById('fiscalSourcePosition');
  if (source) {
    source.innerHTML = '<option value="">Selecione a vaga</option>' + positions.map(p => `<option value="${p.id}">${p.title} (${Number(p.candidate_count || 0)} candidato(s))</option>`).join('');
    source.value = rule.source_position_id || '';
  }
  const enabled = document.getElementById('fiscalRuleEnabled');
  if (enabled) enabled.checked = Boolean(rule.fiscal_distribution_enabled);
  const policy = document.getElementById('fiscalAllFilledPolicy');
  if (policy) policy.value = rule.all_filled_policy === 'void' ? 'void' : 'supplements';
  renderRoleRows(Array.isArray(rule.role_order) ? rule.role_order : [], Array.isArray(rule.occupied_roles) ? rule.occupied_roles : []);
  updateRuleDisabledState();

  const status = document.getElementById('resultPublicationStatus');
  const button = document.getElementById('announceResultsBtn');
  if (publication?.published_at) {
    const when = new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(publication.published_at));
    if (status) status.textContent = `Anunciado em ${when}`;
    if (button) button.textContent = 'Atualizar resultado anunciado';
  } else {
    if (status) status.textContent = 'Resultado ainda não anunciado';
    if (button) button.textContent = 'Anunciar resultado';
  }
  if (button) {
    const closed = election.status === 'closed';
    button.disabled = !closed;
    button.title = closed ? 'Publicar os resultados para todos os visitantes' : 'Encerre a votação antes de anunciar o resultado';
  }
}

async function loadResultAdminConfig(force = false) {
  if (!resultAdminIsAbsolute() || resultAdminLoading || !resultAdminElectionId()) return;
  if (!force && resultAdminConfig?.election?.id === resultAdminElectionId()) return;
  resultAdminLoading = true;
  try {
    const data = await resultAdminApi('get');
    renderResultAdminConfig(data);
  } catch (error) {
    resultAdminToast(error.message || 'Não foi possível carregar a configuração dos resultados.', 'error');
  } finally {
    resultAdminLoading = false;
  }
}

function collectFiscalRoles() {
  return [...document.querySelectorAll('.fiscal-role-input')].map(input => input.value.trim()).filter(Boolean).slice(0, 3);
}

function collectOccupiedRoles(roles) {
  return [...document.querySelectorAll('.fiscal-role-occupied')].filter(input => input.checked).map(input => {
    const index = Number(input.dataset.roleIndex || 0);
    return roles[index] || '';
  }).filter(Boolean);
}

async function saveFiscalRule() {
  if (!resultAdminIsAbsolute()) return;
  const roles = collectFiscalRoles();
  if (roles.length !== 3) return resultAdminToast('Informe os três cargos da hierarquia.', 'error');
  const button = document.getElementById('saveFiscalRuleBtn');
  const old = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'A guardar…'; }
  try {
    const data = await resultAdminApi('saveRule', {
      fiscal_distribution_enabled: Boolean(document.getElementById('fiscalRuleEnabled')?.checked),
      source_position_id: document.getElementById('fiscalSourcePosition')?.value || null,
      role_order: roles,
      occupied_roles: collectOccupiedRoles(roles),
      all_filled_policy: document.getElementById('fiscalAllFilledPolicy')?.value === 'void' ? 'void' : 'supplements'
    });
    const status = document.getElementById('fiscalRuleStatus');
    if (status) status.textContent = 'Regra guardada.';
    resultAdminToast(data.message || 'Regra guardada.', 'success');
    resultAdminConfig = null;
    await loadResultAdminConfig(true);
  } catch (error) {
    resultAdminToast(error.message || 'Não foi possível guardar a regra.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = old || 'Guardar regra'; }
  }
}

async function announceResults() {
  if (!resultAdminIsAbsolute()) return;
  const already = Boolean(resultAdminConfig?.publication?.published_at);
  const message = already
    ? 'Atualizar o resultado público com a contagem atual? O anúncio anterior será substituído.'
    : 'Anunciar estes resultados publicamente? Depois disso, qualquer visitante poderá ver votos, percentuais, participantes, data e duração da eleição.';
  if (!window.confirm(message)) return;
  const button = document.getElementById('announceResultsBtn');
  const old = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'A anunciar…'; }
  try {
    const data = await resultAdminApi('announce');
    resultAdminToast(data.message || 'Resultados anunciados.', 'success', 5600);
    resultAdminConfig = null;
    await loadResultAdminConfig(true);
    window.axineneRefreshPublicResults?.();
  } catch (error) {
    resultAdminToast(error.message || 'Não foi possível anunciar os resultados.', 'error', 6500);
  } finally {
    if (button) { button.disabled = false; button.textContent = old || 'Anunciar resultado'; }
  }
}

ensureResultAdminUI();

document.addEventListener('click', event => {
  if (event.target.closest?.('[data-admin-view="results"], [data-admin-view="settings"]')) setTimeout(() => loadResultAdminConfig(true), 80);
});
document.getElementById('adminElectionSelect')?.addEventListener('change', () => {
  resultAdminConfig = null;
  setTimeout(() => loadResultAdminConfig(true), 220);
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#admin') setTimeout(() => loadResultAdminConfig(true), 300);
});
setTimeout(() => loadResultAdminConfig(true), 450);