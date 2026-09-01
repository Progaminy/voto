const ACCESS_CODES_SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const ACCESS_CODES_SUPABASE_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const ACCESS_CODES_EDGE_URL = `${ACCESS_CODES_SUPABASE_URL}/functions/v1/vote-admin`;
const ACCESS_CODES_SESSION_KEY = 'axinene_admin_pin_session';
const ACCESS_CODES_LEVEL_KEY = 'axinene_admin_access_level';

const accessEscape = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

let accessCodes = [];
let accessMembers = [];
let accessBusy = false;

function accessToast(message, type = 'info', timeout = 4600) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}

function accessIsAbsolute() {
  return sessionStorage.getItem(ACCESS_CODES_LEVEL_KEY) === 'full';
}

function accessElectionId() {
  return document.getElementById('adminElectionSelect')?.value || '';
}

async function accessApi(action, payload = {}) {
  const token = sessionStorage.getItem(ACCESS_CODES_SESSION_KEY) || '';
  if (!token) throw new Error('Sessão administrativa não encontrada.');
  const response = await fetch(ACCESS_CODES_EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ACCESS_CODES_SUPABASE_KEY,
      'x-client-info': 'axinene-voto-access-codes/1.0'
    },
    cache: 'no-store',
    body: JSON.stringify({ action, token, election_id: accessElectionId(), ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) throw new Error(data?.message || 'Não foi possível concluir a operação.');
  return data;
}

function installAccessCodeStyles() {
  if (document.getElementById('adminAccessCodeStyles')) return;
  const style = document.createElement('style');
  style.id = 'adminAccessCodeStyles';
  style.textContent = `
    .access-codes-card { margin-bottom:18px; }
    .access-codes-card h2 { margin:0 0 5px; }
    .access-codes-intro { margin:0 0 15px; color:var(--muted); font-size:13px; }
    .access-code-create { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:end; }
    .access-code-create label { display:grid; gap:6px; font-size:12px; font-weight:800; }
    .access-code-stats { margin:11px 0 0; color:var(--muted); font-size:11px; }
    .generated-code-box { margin-top:14px; padding:14px; border:1px solid #bfe3ca; border-radius:14px; background:#f3fff7; }
    .generated-code-box strong { display:block; margin-bottom:7px; }
    .generated-code-value { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .generated-code-value code { padding:8px 12px; border-radius:10px; background:#fff; border:1px solid #c9d8e6; font-size:22px; font-weight:900; letter-spacing:.12em; }
    .access-code-table-wrap { overflow:auto; margin-top:16px; }
    .access-code-table { width:100%; border-collapse:collapse; min-width:760px; }
    .access-code-table th, .access-code-table td { border-bottom:1px solid var(--line); padding:10px 9px; text-align:left; vertical-align:middle; font-size:12px; }
    .access-code-table th { color:var(--muted); font-size:10px; text-transform:uppercase; letter-spacing:.06em; }
    .access-code-state { display:inline-flex; padding:5px 8px; border-radius:999px; background:var(--green-100); color:var(--green-700); font-size:10px; font-weight:850; }
    .access-code-state.blocked { background:var(--danger-soft); color:var(--danger); }
    .access-code-actions { display:flex; gap:6px; flex-wrap:wrap; }
    .access-code-actions button { min-height:34px; padding:6px 9px; border-radius:9px; font-size:11px; font-weight:800; }
    .access-block-btn { border:1px solid #c9d8e6; background:#fff; color:var(--blue-700); }
    .access-delete-btn { border:1px solid #efc4c4; background:#fff8f8; color:#a52a2a; }
    .access-empty { padding:16px; color:var(--muted); text-align:center; }
    body.admin-readonly #adminAccessCodesCard { display:none !important; }
    @media(max-width:680px){ .access-code-create{grid-template-columns:1fr}.access-code-create .btn{width:100%} }
  `;
  document.head.appendChild(style);
}

function ensureAccessCodeUI() {
  installAccessCodeStyles();
  const settings = document.getElementById('adminViewSettings');
  if (!settings || document.getElementById('adminAccessCodesCard')) return;

  const card = document.createElement('section');
  card.id = 'adminAccessCodesCard';
  card.className = 'card access-codes-card';
  card.innerHTML = `
    <h2>Acessos de visualização</h2>
    <p class="access-codes-intro">Os Administradores Absolutos podem gerar códigos de 6 dígitos ligados a um membro. Esses códigos permitem apenas visualizar. Não permitem editar, apagar, imprimir nem administrar outros acessos.</p>
    <div class="access-code-create">
      <label>Membro que receberá o código
        <select id="accessCodeMemberSelect"><option value="">Carregando membros…</option></select>
      </label>
      <button id="generateViewCodeBtn" class="btn btn-primary" type="button">Gerar código de visualização</button>
    </div>
    <p id="accessCodeStats" class="access-code-stats"></p>
    <div id="generatedViewCodeBox" class="generated-code-box hidden">
      <strong>Novo código gerado — copie agora</strong>
      <div class="generated-code-value"><code id="generatedViewCodeValue">——</code><button id="copyGeneratedViewCode" class="btn btn-ghost" type="button">Copiar código</button></div>
      <p class="access-codes-intro" style="margin:8px 0 0">Por segurança, o código completo é mostrado apenas neste momento. Depois, a lista mostra apenas os dois últimos dígitos.</p>
    </div>
    <div class="access-code-table-wrap">
      <table class="access-code-table">
        <thead><tr><th>Membro</th><th>N.º membro</th><th>Código</th><th>Estado</th><th>Último uso</th><th>Criado</th><th>Ações</th></tr></thead>
        <tbody id="accessCodesTableBody"><tr><td colspan="7" class="access-empty">Nenhum código carregado.</td></tr></tbody>
      </table>
    </div>`;

  settings.prepend(card);

  document.getElementById('generateViewCodeBtn')?.addEventListener('click', generateViewCode);
  document.getElementById('copyGeneratedViewCode')?.addEventListener('click', async () => {
    const value = document.getElementById('generatedViewCodeValue')?.textContent?.trim() || '';
    if (!/^\d{6}$/.test(value)) return;
    try {
      await navigator.clipboard.writeText(value);
      accessToast('Código copiado.', 'success');
    } catch {
      accessToast('Não foi possível copiar automaticamente. Selecione o código e copie manualmente.', 'error');
    }
  });
}

function formatAccessDate(value) {
  if (!value) return 'Nunca';
  try {
    return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function renderAccessMembers() {
  const select = document.getElementById('accessCodeMemberSelect');
  if (!select) return;
  const active = accessMembers.filter(m => m.active !== false);
  select.innerHTML = '<option value="">Selecione um membro</option>' + active.map(member => {
    const label = `${member.member_number || 'Sem número'} — ${member.full_name}`;
    return `<option value="${accessEscape(member.id)}">${accessEscape(label)}</option>`;
  }).join('');
}

function renderAccessCodes(absoluteCount = 0) {
  const body = document.getElementById('accessCodesTableBody');
  const stats = document.getElementById('accessCodeStats');
  if (stats) {
    const active = accessCodes.filter(code => code.active).length;
    const blocked = accessCodes.length - active;
    stats.textContent = `${absoluteCount} Administrador(es) Absoluto(s) ativo(s) · ${active} código(s) de visualização ativo(s) · ${blocked} bloqueado(s)`;
  }
  if (!body) return;
  if (!accessCodes.length) {
    body.innerHTML = '<tr><td colspan="7" class="access-empty">Ainda não existem códigos de visualização gerados.</td></tr>';
    return;
  }

  body.innerHTML = accessCodes.map(code => `
    <tr>
      <td><strong>${accessEscape(code.member_name || 'Membro')}</strong>${code.member_phone ? `<small style="display:block;color:var(--muted)">${accessEscape(code.member_phone)}</small>` : ''}</td>
      <td>${accessEscape(code.member_number || '—')}</td>
      <td><code>••••${accessEscape(code.code_hint || '••')}</code></td>
      <td><span class="access-code-state ${code.active ? '' : 'blocked'}">${code.active ? 'Ativo' : 'Bloqueado'}</span></td>
      <td>${accessEscape(formatAccessDate(code.last_used_at))}</td>
      <td>${accessEscape(formatAccessDate(code.created_at))}</td>
      <td><div class="access-code-actions">
        <button class="access-block-btn" type="button" data-access-toggle="${accessEscape(code.id)}" data-next-active="${code.active ? 'false' : 'true'}">${code.active ? 'Bloquear' : 'Desbloquear'}</button>
        <button class="access-delete-btn" type="button" data-access-delete="${accessEscape(code.id)}">Apagar</button>
      </div></td>
    </tr>`).join('');

  body.querySelectorAll('[data-access-toggle]').forEach(button => {
    button.addEventListener('click', () => toggleViewCode(button.dataset.accessToggle, button.dataset.nextActive === 'true'));
  });
  body.querySelectorAll('[data-access-delete]').forEach(button => {
    button.addEventListener('click', () => deleteViewCode(button.dataset.accessDelete));
  });
}

async function refreshAccessCodes() {
  ensureAccessCodeUI();
  if (!accessIsAbsolute() || accessBusy || !accessElectionId()) return;
  accessBusy = true;
  try {
    const data = await accessApi('listAccessCodes');
    accessCodes = data.view_codes || [];
    accessMembers = data.members || [];
    renderAccessMembers();
    renderAccessCodes((data.absolute_admins || []).length);
  } catch (error) {
    accessToast(error.message || 'Não foi possível carregar os acessos.', 'error');
  } finally {
    accessBusy = false;
  }
}

async function generateViewCode() {
  if (!accessIsAbsolute()) return accessToast('Apenas Administradores Absolutos podem gerar códigos.', 'error');
  const select = document.getElementById('accessCodeMemberSelect');
  const voterId = select?.value || '';
  if (!voterId) return accessToast('Selecione um membro.', 'error');
  const button = document.getElementById('generateViewCodeBtn');
  const old = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'Gerando…'; }
  try {
    const data = await accessApi('generateViewCode', { voter_id: voterId });
    const box = document.getElementById('generatedViewCodeBox');
    const value = document.getElementById('generatedViewCodeValue');
    if (value) value.textContent = data.code || '——';
    box?.classList.remove('hidden');
    accessToast(data.message || 'Código gerado.', 'success', 5500);
    await refreshAccessCodes();
  } catch (error) {
    accessToast(error.message || 'Não foi possível gerar o código.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = old || 'Gerar código de visualização'; }
  }
}

async function toggleViewCode(id, active) {
  if (!accessIsAbsolute()) return;
  const verb = active ? 'desbloquear' : 'bloquear';
  if (!window.confirm(`Deseja ${verb} este código de visualização?${active ? '' : '\n\nAo bloquear, qualquer sessão aberta com ele será encerrada.'}`)) return;
  try {
    const data = await accessApi('toggleViewCode', { code_id: id, active });
    accessToast(data.message || 'Estado atualizado.', 'success');
    await refreshAccessCodes();
  } catch (error) {
    accessToast(error.message || 'Não foi possível alterar o estado do código.', 'error');
  }
}

async function deleteViewCode(id) {
  if (!accessIsAbsolute()) return;
  const item = accessCodes.find(code => code.id === id);
  const who = item ? `${item.member_name}${item.member_number ? ` (${item.member_number})` : ''}` : 'este membro';
  if (!window.confirm(`Apagar definitivamente o código de visualização de ${who}?\n\nA sessão correspondente será encerrada e o código deixará de funcionar.`)) return;
  try {
    const data = await accessApi('deleteViewCode', { code_id: id });
    accessToast(data.message || 'Código eliminado.', 'success');
    await refreshAccessCodes();
  } catch (error) {
    accessToast(error.message || 'Não foi possível apagar o código.', 'error');
  }
}

ensureAccessCodeUI();

document.addEventListener('click', event => {
  if (event.target.closest?.('[data-admin-view="settings"]')) setTimeout(refreshAccessCodes, 60);
});

document.getElementById('adminElectionSelect')?.addEventListener('change', () => setTimeout(refreshAccessCodes, 80));
window.addEventListener('hashchange', () => {
  if (location.hash === '#admin') setTimeout(refreshAccessCodes, 180);
});

setTimeout(refreshAccessCodes, 350);
