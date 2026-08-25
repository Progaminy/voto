const SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const ADMIN_SESSION_KEY = 'axinene_admin_pin_session';

let positions = [];
let positionEdited = false;
let loading = false;

function adminToken() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) || '';
}

async function rpc(name, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLIC_KEY,
      'Content-Type': 'application/json'
    },
    cache: 'no-store',
    body: JSON.stringify(body)
  });
  let data = null;
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const message = data?.message || data?.error_description || 'Não foi possível concluir a operação.';
    throw new Error(message);
  }
  return data;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function installStyles() {
  if (document.getElementById('positionEditStyles')) return;
  const style = document.createElement('style');
  style.id = 'positionEditStyles';
  style.textContent = `
    .position-editor-panel { margin-top: 18px; border-top: 1px solid var(--line); padding-top: 18px; }
    .position-editor-panel h3 { margin: 0 0 4px; font-size: 16px; }
    .position-editor-help { margin: 0 0 12px; color: var(--muted); font-size: 12px; }
    .position-editor-list { display: grid; gap: 10px; }
    .position-editor-item { border: 1px solid var(--line); border-radius: 14px; padding: 13px; background: var(--surface-soft); }
    .position-editor-item-head { display: flex; gap: 10px; align-items: flex-start; justify-content: space-between; }
    .position-editor-item strong { display: block; color: var(--blue-900); line-height: 1.2; }
    .position-editor-item p { margin: 7px 0 0; color: var(--muted); font-size: 12px; white-space: pre-line; max-height: 84px; overflow: hidden; }
    .position-edit-btn { border: 0; border-radius: 9px; padding: 7px 10px; background: var(--blue-100); color: var(--blue-700); font-weight: 800; font-size: 12px; flex: 0 0 auto; }
    .position-editor-status { min-height: 18px; margin-top: 10px; font-size: 12px; color: var(--muted); }
    .position-editor-status.ok { color: var(--green-700); }
    .position-editor-status.error { color: var(--danger); }
    .position-edit-dialog { width: min(620px, calc(100% - 28px)); border: 0; border-radius: 22px; padding: 26px; box-shadow: 0 28px 90px rgba(6,34,69,.30); }
    .position-edit-dialog::backdrop { background: rgba(2,16,32,.62); backdrop-filter: blur(3px); }
    .position-edit-dialog h2 { margin: 0 0 5px; }
    .position-edit-dialog .position-edit-sub { margin: 0 0 18px; color: var(--muted); font-size: 13px; }
    .position-edit-dialog label { display: grid; gap: 6px; margin-bottom: 14px; font-size: 12px; font-weight: 800; color: var(--blue-950); }
    .position-edit-dialog textarea { min-height: 190px; }
    .position-edit-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
    @media (max-width: 560px) { .position-edit-actions { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

function ensureDialog() {
  let dialog = document.getElementById('positionEditDialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'positionEditDialog';
  dialog.className = 'position-edit-dialog';
  dialog.innerHTML = `
    <form id="positionEditForm">
      <h2>Editar vaga</h2>
      <p class="position-edit-sub">Altere o nome e a descrição que os eleitores verão.</p>
      <input id="positionEditId" type="hidden" />
      <label>Nome da vaga
        <input id="positionEditTitle" type="text" required />
      </label>
      <label>Descrição
        <textarea id="positionEditDescription" placeholder="Descreva as responsabilidades e o âmbito da vaga..."></textarea>
      </label>
      <div id="positionEditError" class="position-editor-status"></div>
      <div class="position-edit-actions">
        <button id="positionEditCancel" class="btn btn-ghost" type="button">Cancelar</button>
        <button id="positionEditSave" class="btn btn-primary" type="submit">Guardar alterações</button>
      </div>
    </form>`;
  document.body.appendChild(dialog);
  document.getElementById('positionEditCancel').addEventListener('click', () => dialog.close());
  document.getElementById('positionEditForm').addEventListener('submit', savePosition);
  return dialog;
}

function ensurePanel() {
  const form = document.getElementById('positionForm');
  const card = form?.closest('.form-card');
  if (!card) return null;
  let panel = document.getElementById('positionEditorPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'positionEditorPanel';
    panel.className = 'position-editor-panel';
    panel.innerHTML = `
      <h3>Vagas registadas</h3>
      <p class="position-editor-help">Clique em <strong>Editar</strong> para corrigir o nome ou a descrição de uma vaga já criada.</p>
      <div id="positionEditorList" class="position-editor-list"></div>
      <div id="positionEditorStatus" class="position-editor-status"></div>`;
    card.appendChild(panel);
  }
  return panel;
}

function setStatus(message = '', type = '') {
  const el = document.getElementById('positionEditorStatus');
  if (!el) return;
  el.textContent = message;
  el.className = `position-editor-status ${type}`.trim();
}

function renderPositions() {
  const list = document.getElementById('positionEditorList');
  if (!list) return;
  if (!positions.length) {
    list.innerHTML = '<div class="position-editor-item"><strong>Nenhuma vaga registada.</strong></div>';
    return;
  }
  list.innerHTML = positions.map(position => `
    <div class="position-editor-item">
      <div class="position-editor-item-head">
        <div>
          <strong>${escapeHtml(position.title)}</strong>
          <p>${escapeHtml(position.description || 'Sem descrição.')}</p>
        </div>
        <button class="position-edit-btn" type="button" data-position-id="${position.id}">Editar</button>
      </div>
    </div>`).join('');
  list.querySelectorAll('.position-edit-btn').forEach(button => {
    button.addEventListener('click', () => openEditor(button.dataset.positionId));
  });
}

async function loadPositions() {
  if (loading) return;
  const view = document.getElementById('adminViewCandidates');
  const select = document.getElementById('adminElectionSelect');
  if (!view || view.classList.contains('hidden') || !select?.value || !adminToken()) return;
  ensurePanel();
  loading = true;
  setStatus('A carregar vagas…');
  try {
    positions = await rpc('vote_admin_list_positions', {
      p_token: adminToken(),
      p_election_id: select.value
    }) || [];
    renderPositions();
    setStatus(`${positions.length} vaga${positions.length === 1 ? '' : 's'} disponível${positions.length === 1 ? '' : 'is'} para edição.`);
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    loading = false;
  }
}

function openEditor(positionId) {
  const position = positions.find(item => item.id === positionId);
  if (!position) return;
  const dialog = ensureDialog();
  document.getElementById('positionEditId').value = position.id;
  document.getElementById('positionEditTitle').value = position.title || '';
  document.getElementById('positionEditDescription').value = position.description || '';
  const error = document.getElementById('positionEditError');
  error.textContent = '';
  error.className = 'position-editor-status';
  dialog.showModal();
}

async function savePosition(event) {
  event.preventDefault();
  const id = document.getElementById('positionEditId').value;
  const title = document.getElementById('positionEditTitle').value.trim();
  const description = document.getElementById('positionEditDescription').value.trim();
  const button = document.getElementById('positionEditSave');
  const error = document.getElementById('positionEditError');
  if (!title) return;
  button.disabled = true;
  button.textContent = 'A guardar…';
  error.textContent = '';
  try {
    const updated = await rpc('vote_admin_update_position', {
      p_token: adminToken(),
      p_position_id: id,
      p_title: title,
      p_description: description
    });
    const row = Array.isArray(updated) ? updated[0] : updated;
    const index = positions.findIndex(item => item.id === id);
    if (index >= 0) positions[index] = row || { ...positions[index], title, description };
    renderPositions();
    const option = document.querySelector(`#candidatePosition option[value="${CSS.escape(id)}"]`);
    if (option) option.textContent = title;
    positionEdited = true;
    ensureDialog().close();
    setStatus('Vaga atualizada com sucesso.', 'ok');
  } catch (err) {
    error.textContent = err.message;
    error.className = 'position-editor-status error';
  } finally {
    button.disabled = false;
    button.textContent = 'Guardar alterações';
  }
}

installStyles();
ensureDialog();

const candidatesView = document.getElementById('adminViewCandidates');
if (candidatesView) {
  new MutationObserver(() => {
    if (!candidatesView.classList.contains('hidden')) setTimeout(loadPositions, 40);
  }).observe(candidatesView, { attributes: true, attributeFilter: ['class'] });
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-admin-view="candidates"]')) setTimeout(loadPositions, 70);
  if (positionEdited && event.target.closest('#publicPreviewBtn')) {
    setTimeout(() => location.reload(), 80);
  }
});

document.getElementById('adminElectionSelect')?.addEventListener('change', () => setTimeout(loadPositions, 80));
document.getElementById('positionForm')?.addEventListener('submit', () => setTimeout(loadPositions, 850));

setTimeout(loadPositions, 250);