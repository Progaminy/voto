const MEMBERS_SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const MEMBERS_SUPABASE_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const MEMBERS_EDGE_URL = `${MEMBERS_SUPABASE_URL}/functions/v1/vote-members`;
const MEMBERS_ADMIN_SESSION_KEY = 'axinene_admin_pin_session';
const MEMBERS_ADMIN_ACCESS_KEY = 'axinene_admin_access_level';

const memberEscape = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const memberTextKey = (value = '') => String(value).trim().replace(/\s+/g, ' ').toLowerCase();
const memberNumberValue = (value = '') => {
  const match = String(value || '').match(/AX-(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};
const memberAccess = () => sessionStorage.getItem(MEMBERS_ADMIN_ACCESS_KEY) || '';
const currentElectionId = () => document.getElementById('adminElectionSelect')?.value || '';

let memberRows = [];
let memberLastElection = '';
let memberSyncBusy = false;

function memberToast(message, type = 'info', timeout = 4800) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}

async function membersApi(action, payload = {}) {
  const token = sessionStorage.getItem(MEMBERS_ADMIN_SESSION_KEY);
  const electionId = currentElectionId();
  if (!token) throw new Error('Sessão administrativa não encontrada.');
  if (!electionId) throw new Error('Selecione uma eleição.');

  const response = await fetch(MEMBERS_EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': MEMBERS_SUPABASE_KEY,
      'x-client-info': 'axinene-voto-members/1.0'
    },
    cache: 'no-store',
    body: JSON.stringify({ action, token, election_id: electionId, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) throw new Error(data?.message || 'Não foi possível concluir a operação.');
  return data;
}

function installMemberStyles() {
  if (document.getElementById('memberManagementStyles')) return;
  const style = document.createElement('style');
  style.id = 'memberManagementStyles';
  style.textContent = `
    .member-toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:10px; }
    .member-toolbar select, .member-toolbar input { min-height:42px; }
    .member-toolbar .search-input { flex:1 1 210px; min-width:170px; }
    .member-filter { min-width:150px; max-width:220px; }
    .member-print-btn { white-space:nowrap; }
    .member-group-row td { background:#eef5ff !important; color:#0b4d91; font-weight:850; font-size:12px; letter-spacing:.02em; border-top:2px solid #c9dff7; }
    .member-zone-row td { background:#f6fbf7 !important; color:#176b3a; font-weight:800; font-size:11px; }
    .member-action-cell { white-space:nowrap; display:flex; gap:6px; align-items:center; }
    .member-edit-btn, .member-delete-btn { min-height:34px; padding:6px 9px; border-radius:9px; font-size:11px; }
    .member-edit-btn { border:1px solid #b9cce3; background:#fff; color:#154f88; font-weight:800; }
    .member-delete-btn { border:1px solid #efc4c4; background:#fff8f8; color:#a52a2a; font-weight:800; }
    .member-meta { display:block; margin-top:3px; font-size:10px; color:#718096; }
    .member-dialog { width:min(620px, calc(100vw - 24px)); border:0; border-radius:18px; padding:0; box-shadow:0 24px 70px rgba(0,0,0,.22); }
    .member-dialog::backdrop { background:rgba(5,24,45,.55); }
    .member-dialog-card { padding:22px; }
    .member-dialog-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:16px; }
    .member-dialog-head h2 { margin:0; }
    .member-dialog-close { width:36px; height:36px; border-radius:50%; border:1px solid #d8e0ea; background:#fff; font-size:22px; }
    .member-dialog-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
    .member-readonly-note { margin:10px 0 0; padding:10px 12px; border-radius:10px; background:#fff4cc; color:#714f00; font-size:12px; font-weight:700; }
    @media (max-width: 760px) {
      #voterTableBody td:nth-child(3), #voterTableBody td:nth-child(5), #voterTableHead th:nth-child(3), #voterTableHead th:nth-child(5) { display:none; }
      .member-toolbar { align-items:stretch; }
      .member-toolbar > * { flex:1 1 145px; }
      .member-toolbar .search-input { flex-basis:100%; }
      .member-action-cell { flex-direction:column; align-items:stretch; }
    }
  `;
  document.head.appendChild(style);
}

function ensureMemberUI() {
  installMemberStyles();
  const voterForm = document.getElementById('voterForm');
  if (voterForm && !document.getElementById('voterDelegation')) {
    const submit = voterForm.querySelector('button[type="submit"]');
    const delegation = document.createElement('label');
    delegation.innerHTML = 'Delegação <span class="optional">opcional</span><input id="voterDelegation" type="text" placeholder="Ex.: Nampula Cidade" />';
    const zone = document.createElement('label');
    zone.innerHTML = 'Zona <span class="optional">opcional</span><input id="voterZone" type="text" placeholder="Ex.: Mutauanha" />';
    voterForm.insertBefore(delegation, submit);
    voterForm.insertBefore(zone, submit);
    const memberInput = document.getElementById('voterMember');
    if (memberInput) memberInput.placeholder = 'AX-79';
  }

  const bulkForm = document.getElementById('bulkVoterForm');
  if (bulkForm) {
    const help = bulkForm.closest('.form-card')?.querySelector('.form-help');
    if (help) help.innerHTML = 'Uma pessoa por linha: <strong>Nome; Número; Telefone; Delegação; Zona</strong>. Se o número ficar vazio, o sistema cria o próximo AX automaticamente. Registos duplicados são ignorados e o registo existente é mantido.';
    const area = document.getElementById('bulkVoters');
    if (area) area.placeholder = 'Ana Manuel; AX-79; 840000001; Nampula Cidade; Mutauanha\nJoão Alberto; ; 840000002; Nacala-Porto;';
  }

  const toolbar = document.querySelector('#adminViewVoters .list-toolbar');
  if (toolbar && !document.getElementById('memberToolbarControls')) {
    const search = document.getElementById('voterSearch');
    if (search) search.remove();
    const controls = document.createElement('div');
    controls.id = 'memberToolbarControls';
    controls.className = 'member-toolbar';
    controls.innerHTML = `
      <input id="voterSearch" class="search-input" type="search" placeholder="Pesquisar nome, número, telefone…" />
      <select id="memberDelegationFilter" class="member-filter" aria-label="Filtrar por delegação"><option value="">Todas as delegações</option></select>
      <select id="memberZoneFilter" class="member-filter" aria-label="Filtrar por zona"><option value="">Todas as zonas</option></select>
      <button id="printMembersBtn" class="btn btn-ghost member-print-btn" type="button">Imprimir lista de membros</button>`;
    toolbar.appendChild(controls);
  }

  const table = document.querySelector('#adminViewVoters table');
  const header = table?.querySelector('thead tr');
  if (header && header.id !== 'voterTableHead') {
    header.id = 'voterTableHead';
    header.innerHTML = '<th>Nome</th><th>N.º membro</th><th>Telefone</th><th>Delegação</th><th>Zona</th><th>Estado</th><th>Ações</th>';
  }

  if (!document.getElementById('memberEditDialog')) {
    const dialog = document.createElement('dialog');
    dialog.id = 'memberEditDialog';
    dialog.className = 'member-dialog';
    dialog.innerHTML = `
      <div class="member-dialog-card">
        <div class="member-dialog-head"><div><span class="eyebrow">Membro</span><h2>Editar registo</h2></div><button class="member-dialog-close" type="button" aria-label="Fechar">×</button></div>
        <form id="memberEditForm" class="stack-form">
          <input id="memberEditId" type="hidden" />
          <label>Nome completo<input id="memberEditName" type="text" required /></label>
          <label>N.º de membro<input id="memberEditNumber" type="text" placeholder="AX-51" /></label>
          <label>Telefone<input id="memberEditPhone" type="tel" /></label>
          <label>Delegação<input id="memberEditDelegation" type="text" /></label>
          <label>Zona<input id="memberEditZone" type="text" /></label>
          <label>Estado<select id="memberEditActive"><option value="true">Autorizado</option><option value="false">Inativo</option></select></label>
          <div class="member-dialog-actions"><button class="btn btn-ghost member-cancel-edit" type="button">Cancelar</button><button class="btn btn-primary" type="submit">Guardar alterações</button></div>
        </form>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('.member-dialog-close')?.addEventListener('click', () => dialog.close());
    dialog.querySelector('.member-cancel-edit')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.querySelector('#memberEditForm')?.addEventListener('submit', saveMemberEdit);
  }

  const printBtn = document.getElementById('printMembersBtn');
  if (printBtn && !printBtn.dataset.bound) {
    printBtn.dataset.bound = '1';
    printBtn.addEventListener('click', printMembers);
  }
  ['memberDelegationFilter', 'memberZoneFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.bound) {
      el.dataset.bound = '1';
      el.addEventListener('change', () => {
        if (id === 'memberDelegationFilter') refreshZoneOptions();
        renderMembers();
      });
    }
  });
  applyMemberAccessMode();
}

function applyMemberAccessMode() {
  const full = memberAccess() === 'full';
  document.getElementById('printMembersBtn')?.classList.toggle('readonly-hidden', !full);
  const editForm = document.getElementById('memberEditForm');
  if (editForm) editForm.querySelector('button[type="submit"]')?.classList.toggle('readonly-hidden', !full);
}

function getFilteredMembers() {
  const needle = memberTextKey(document.getElementById('voterSearch')?.value || '');
  const delegation = document.getElementById('memberDelegationFilter')?.value || '';
  const zone = document.getElementById('memberZoneFilter')?.value || '';
  return memberRows.filter(v => {
    if (delegation && (v.delegation || '') !== delegation) return false;
    if (zone && (v.zone || '') !== zone) return false;
    if (!needle) return true;
    return memberTextKey(`${v.full_name} ${v.member_number || ''} ${v.phone || ''} ${v.delegation || ''} ${v.zone || ''}`).includes(needle);
  });
}

function sortedMembers(rows) {
  return [...rows].sort((a, b) => {
    const d = String(a.delegation || '').localeCompare(String(b.delegation || ''), 'pt', { sensitivity: 'base' });
    if (d) return d;
    const z = String(a.zone || '').localeCompare(String(b.zone || ''), 'pt', { sensitivity: 'base' });
    if (z) return z;
    const n = memberNumberValue(a.member_number) - memberNumberValue(b.member_number);
    if (n) return n;
    return String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt', { sensitivity: 'base' });
  });
}

function refreshFilterOptions() {
  const delegationSelect = document.getElementById('memberDelegationFilter');
  if (!delegationSelect) return;
  const current = delegationSelect.value;
  const values = [...new Set(memberRows.map(v => v.delegation).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  delegationSelect.innerHTML = '<option value="">Todas as delegações</option>' + values.map(v => `<option value="${memberEscape(v)}">${memberEscape(v)}</option>`).join('');
  if (values.includes(current)) delegationSelect.value = current;
  refreshZoneOptions();
}

function refreshZoneOptions() {
  const zoneSelect = document.getElementById('memberZoneFilter');
  if (!zoneSelect) return;
  const delegation = document.getElementById('memberDelegationFilter')?.value || '';
  const current = zoneSelect.value;
  const values = [...new Set(memberRows.filter(v => !delegation || v.delegation === delegation).map(v => v.zone).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  zoneSelect.innerHTML = '<option value="">Todas as zonas</option>' + values.map(v => `<option value="${memberEscape(v)}">${memberEscape(v)}</option>`).join('');
  if (values.includes(current)) zoneSelect.value = current;
}

function renderMembers() {
  ensureMemberUI();
  const body = document.getElementById('voterTableBody');
  if (!body) return;
  const rows = sortedMembers(getFilteredMembers());
  const countLabel = document.getElementById('voterCountLabel');
  const delegationCount = new Set(memberRows.map(v => v.delegation).filter(Boolean)).size;
  if (countLabel) countLabel.textContent = `${memberRows.length} membro${memberRows.length === 1 ? '' : 's'} · ${delegationCount} delegaç${delegationCount === 1 ? 'ão' : 'ões'}`;
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7">Nenhum membro encontrado.</td></tr>';
    return;
  }

  let lastDelegation = null;
  let lastZone = null;
  const html = [];
  for (const v of rows) {
    const delegation = v.delegation || 'Sem delegação';
    const zone = v.zone || 'Sem zona indicada';
    if (delegation !== lastDelegation) {
      html.push(`<tr class="member-group-row"><td colspan="7">Delegação: ${memberEscape(delegation)}</td></tr>`);
      lastDelegation = delegation;
      lastZone = null;
    }
    if (zone !== lastZone) {
      html.push(`<tr class="member-zone-row"><td colspan="7">Zona: ${memberEscape(zone)}</td></tr>`);
      lastZone = zone;
    }
    const actions = memberAccess() === 'full'
      ? `<div class="member-action-cell"><button class="member-edit-btn" type="button" data-member-edit="${v.id}">Editar</button><button class="member-delete-btn" type="button" data-member-delete="${v.id}">Apagar</button></div>`
      : '<span class="member-meta">Somente leitura</span>';
    html.push(`<tr>
      <td><strong>${memberEscape(v.full_name)}</strong></td>
      <td>${memberEscape(v.member_number || '—')}</td>
      <td>${memberEscape(v.phone || '—')}</td>
      <td>${memberEscape(v.delegation || '—')}</td>
      <td>${memberEscape(v.zone || '—')}</td>
      <td><span class="state-chip ${v.active ? 'done' : ''}">${v.active ? 'Autorizado' : 'Inativo'}</span></td>
      <td>${actions}</td>
    </tr>`);
  }
  body.innerHTML = html.join('');
}

async function syncMembers(force = false) {
  ensureMemberUI();
  const electionId = currentElectionId();
  const token = sessionStorage.getItem(MEMBERS_ADMIN_SESSION_KEY);
  if (!electionId || !token || memberSyncBusy) return;
  if (!force && electionId === memberLastElection && memberRows.length) {
    renderMembers();
    return;
  }
  memberSyncBusy = true;
  try {
    const data = await membersApi('list');
    memberRows = data.voters || [];
    memberLastElection = electionId;
    refreshFilterOptions();
    renderMembers();
  } catch (error) {
    memberToast(error.message || 'Não foi possível carregar os membros.', 'error');
  } finally {
    memberSyncBusy = false;
  }
}

async function submitSingleMember(form) {
  if (memberAccess() !== 'full') return memberToast('Este acesso é somente para visualização.', 'error');
  const button = form.querySelector('button[type="submit"]');
  const old = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'A adicionar…'; }
  try {
    const data = await membersApi('add', {
      full_name: document.getElementById('voterName')?.value.trim() || '',
      member_number: document.getElementById('voterMember')?.value.trim() || '',
      phone: document.getElementById('voterPhone')?.value.trim() || '',
      delegation: document.getElementById('voterDelegation')?.value.trim() || '',
      zone: document.getElementById('voterZone')?.value.trim() || ''
    });
    memberToast(data.message || 'Membro adicionado.', data.duplicate ? 'info' : 'success', 5200);
    if (!data.duplicate) form.reset();
    await syncMembers(true);
  } catch (error) {
    memberToast(error.message || 'Não foi possível adicionar o membro.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = old || 'Adicionar à lista'; }
  }
}

function parseBulkMembers(raw) {
  return String(raw || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const [full_name = '', member_number = '', phone = '', delegation = '', zone = ''] = line.split(';').map(v => v.trim());
    return { full_name, member_number, phone, delegation, zone };
  }).filter(row => row.full_name);
}

async function submitBulkMembers(form) {
  if (memberAccess() !== 'full') return memberToast('Este acesso é somente para visualização.', 'error');
  const rows = parseBulkMembers(document.getElementById('bulkVoters')?.value || '');
  if (!rows.length) return memberToast('Cole pelo menos um membro válido.', 'error');
  const button = form.querySelector('button[type="submit"]');
  const old = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'A verificar duplicados…'; }
  try {
    const data = await membersApi('bulk', { rows });
    memberToast(data.message || 'Importação concluída.', 'success', 6500);
    form.reset();
    await syncMembers(true);
  } catch (error) {
    memberToast(error.message || 'A importação falhou.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = old || 'Importar lista'; }
  }
}

function openMemberEdit(id) {
  if (memberAccess() !== 'full') return memberToast('Este acesso é somente para visualização.', 'error');
  const v = memberRows.find(row => row.id === id);
  const dialog = document.getElementById('memberEditDialog');
  if (!v || !dialog) return;
  document.getElementById('memberEditId').value = v.id;
  document.getElementById('memberEditName').value = v.full_name || '';
  document.getElementById('memberEditNumber').value = v.member_number || '';
  document.getElementById('memberEditPhone').value = v.phone || '';
  document.getElementById('memberEditDelegation').value = v.delegation || '';
  document.getElementById('memberEditZone').value = v.zone || '';
  document.getElementById('memberEditActive').value = v.active ? 'true' : 'false';
  dialog.showModal();
}

async function saveMemberEdit(event) {
  event.preventDefault();
  if (memberAccess() !== 'full') return memberToast('Este acesso é somente para visualização.', 'error');
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const old = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'A guardar…'; }
  try {
    const data = await membersApi('edit', {
      voter_id: document.getElementById('memberEditId').value,
      full_name: document.getElementById('memberEditName').value.trim(),
      member_number: document.getElementById('memberEditNumber').value.trim(),
      phone: document.getElementById('memberEditPhone').value.trim(),
      delegation: document.getElementById('memberEditDelegation').value.trim(),
      zone: document.getElementById('memberEditZone').value.trim(),
      active: document.getElementById('memberEditActive').value === 'true'
    });
    memberToast(data.message || 'Dados atualizados.', 'success');
    document.getElementById('memberEditDialog')?.close();
    await syncMembers(true);
  } catch (error) {
    memberToast(error.message || 'Não foi possível editar o membro.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = old || 'Guardar alterações'; }
  }
}

async function deleteMember(id) {
  if (memberAccess() !== 'full') return memberToast('Este acesso é somente para visualização.', 'error');
  const v = memberRows.find(row => row.id === id);
  if (!v) return;
  if (!window.confirm(`Apagar ${v.full_name}?\n\nSe já tiver votado, os votos associados também serão apagados. Esta ação não pode ser desfeita.`)) return;
  const entered = window.prompt('Confirme o PIN principal para apagar este membro:');
  if (entered === null) return;
  const pin = String(entered).replace(/\D/g, '').slice(0, 6);
  if (pin.length !== 6) return memberToast('O PIN de confirmação deve ter 6 dígitos.', 'error');
  try {
    const data = await membersApi('delete', { voter_id: id, confirmation_pin: pin });
    memberToast(data.message || 'Membro apagado.', 'success');
    await syncMembers(true);
  } catch (error) {
    memberToast(error.message || 'Não foi possível apagar o membro.', 'error');
  }
}

function printMembers() {
  if (memberAccess() !== 'full') return memberToast('Este acesso não tem permissão para imprimir.', 'error');
  const rows = sortedMembers(getFilteredMembers());
  if (!rows.length) return memberToast('Não há membros para imprimir com estes filtros.', 'error');
  const election = document.getElementById('adminElectionSelect')?.selectedOptions?.[0]?.textContent?.trim() || 'Comissão Eleitoral Interna — AXINENE';
  const delegationFilter = document.getElementById('memberDelegationFilter')?.value || 'Todas';
  const zoneFilter = document.getElementById('memberZoneFilter')?.value || 'Todas';
  const printedAt = new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  let lastDelegation = null;
  let lastZone = null;
  const body = [];
  for (const v of rows) {
    const delegation = v.delegation || 'Sem delegação';
    const zone = v.zone || 'Sem zona indicada';
    if (delegation !== lastDelegation) {
      body.push(`<tr class="delegation"><td colspan="6">Delegação: ${memberEscape(delegation)}</td></tr>`);
      lastDelegation = delegation;
      lastZone = null;
    }
    if (zone !== lastZone) {
      body.push(`<tr class="zone"><td colspan="6">Zona: ${memberEscape(zone)}</td></tr>`);
      lastZone = zone;
    }
    body.push(`<tr><td>${memberEscape(v.member_number || '—')}</td><td>${memberEscape(v.full_name)}</td><td>${memberEscape(v.phone || '—')}</td><td>${memberEscape(v.delegation || '—')}</td><td>${memberEscape(v.zone || '—')}</td><td>${v.active ? 'Autorizado' : 'Inativo'}</td></tr>`);
  }
  const popup = window.open('', '_blank', 'width=1000,height=760');
  if (!popup) return memberToast('O navegador bloqueou a janela de impressão.', 'error');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Lista de membros AXINENE</title><style>
    @page{size:A4 landscape;margin:12mm}body{font:12px/1.35 Arial,sans-serif;color:#111}h1{margin:0 0 4px;font-size:21px;color:#154f88}p{margin:3px 0}.meta{margin:0 0 16px;color:#444}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aeb8c5;padding:6px 7px;text-align:left;vertical-align:top}th{background:#154f88;color:#fff}.delegation td{background:#dbeaff;color:#0b4d91;font-weight:800;font-size:13px}.zone td{background:#eaf6ed;color:#176b3a;font-weight:800}.footer{margin-top:12px;font-size:10px;color:#666}</style></head><body>
    <h1>ASSOCIAÇÃO AXINENE — Lista de membros</h1><p><strong>${memberEscape(election)}</strong></p><div class="meta">${rows.length} membro(s) · Delegação: ${memberEscape(delegationFilter)} · Zona: ${memberEscape(zoneFilter)} · Impresso em ${memberEscape(printedAt)}</div>
    <table><thead><tr><th>N.º membro</th><th>Nome completo</th><th>Telefone</th><th>Delegação</th><th>Zona</th><th>Estado</th></tr></thead><tbody>${body.join('')}</tbody></table><div class="footer">Gerado pela plataforma de votação da Associação AXINENE.</div>
    <script>window.onload=()=>{window.print();};<\/script></body></html>`);
  popup.document.close();
}

// Interceta apenas os formulários de membros para aplicar as novas regras de
// numeração, delegação/zona e deteção de duplicados antes dos handlers antigos.
document.addEventListener('submit', event => {
  if (event.target?.id === 'voterForm') {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitSingleMember(event.target);
    return;
  }
  if (event.target?.id === 'bulkVoterForm') {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitBulkMembers(event.target);
  }
}, true);

document.addEventListener('input', event => {
  if (event.target?.id !== 'voterSearch') return;
  event.stopImmediatePropagation();
  renderMembers();
}, true);

document.addEventListener('click', event => {
  const edit = event.target.closest?.('[data-member-edit]');
  if (edit) {
    event.preventDefault();
    openMemberEdit(edit.dataset.memberEdit);
    return;
  }
  const del = event.target.closest?.('[data-member-delete]');
  if (del) {
    event.preventDefault();
    deleteMember(del.dataset.memberDelete);
    return;
  }
  const voterTab = event.target.closest?.('[data-admin-view="voters"]');
  if (voterTab) setTimeout(() => syncMembers(true), 60);
});

document.getElementById('adminElectionSelect')?.addEventListener('change', () => {
  memberRows = [];
  memberLastElection = '';
  setTimeout(() => syncMembers(true), 450);
});

const memberObserver = new MutationObserver(() => {
  ensureMemberUI();
  applyMemberAccessMode();
});
memberObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

ensureMemberUI();
if (location.hash === '#admin' && !document.getElementById('adminViewVoters')?.classList.contains('hidden')) {
  setTimeout(() => syncMembers(true), 200);
}
