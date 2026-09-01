// Terminologia pública/administrativa dos membros.
// O banco mantém internamente `delegation` e `zone` por compatibilidade.
// Na interface usamos sempre Coordenação e Bairro.
// O observador abaixo é restrito apenas ao corpo da tabela de membros.

const COORD_ACCESS_KEY = 'axinene_admin_access_level';
let terminologyObserver = null;
let terminologyObserverTarget = null;

function setLabelText(inputId, text) {
  const input = document.getElementById(inputId);
  const label = input?.closest('label');
  if (!label) return;
  const textNode = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  if (textNode) textNode.textContent = `${text} `;
}

function useNationalDirectionWhenEmpty(inputId) {
  const input = document.getElementById(inputId);
  if (input && !input.value.trim()) input.value = 'Direção Nacional';
}

function replaceMemberTerminology(text = '') {
  return String(text)
    .replaceAll('Todas as delegações', 'Todas as coordenações')
    .replaceAll('todas as delegações', 'todas as coordenações')
    .replaceAll('Delegações', 'Coordenações')
    .replaceAll('delegações', 'coordenações')
    .replaceAll('Delegação', 'Coordenação')
    .replaceAll('delegação', 'coordenação')
    .replaceAll('Todas as zonas', 'Todos os bairros')
    .replaceAll('todas as zonas', 'todos os bairros')
    .replaceAll('Zonas', 'Bairros')
    .replaceAll('zonas', 'bairros')
    .replaceAll('Zona', 'Bairro')
    .replaceAll('zona', 'bairro')
    .replaceAll('Sem coordenação', 'Direção Nacional')
    .replaceAll('Sem bairro indicada', 'Bairro não definido')
    .replaceAll('Sem bairro indicado', 'Bairro não definido')
    .replaceAll('Bairro não definida', 'Bairro não definido');
}

function applyCoordinationTerminology() {
  setLabelText('voterDelegation', 'Coordenação');
  setLabelText('memberEditDelegation', 'Coordenação');
  setLabelText('voterZone', 'Bairro');
  setLabelText('memberEditZone', 'Bairro');
  useNationalDirectionWhenEmpty('voterDelegation');
  useNationalDirectionWhenEmpty('memberEditDelegation');

  const bulkHelp = document.querySelector('#bulkVoterForm')?.closest('.form-card')?.querySelector('.form-help');
  if (bulkHelp) bulkHelp.innerHTML = replaceMemberTerminology(bulkHelp.innerHTML);

  const delegationFilter = document.getElementById('memberDelegationFilter');
  if (delegationFilter) {
    delegationFilter.setAttribute('aria-label', 'Filtrar por coordenação');
    if (delegationFilter.options?.[0]) delegationFilter.options[0].textContent = 'Todas as coordenações';
  }

  const zoneFilter = document.getElementById('memberZoneFilter');
  if (zoneFilter) {
    zoneFilter.setAttribute('aria-label', 'Filtrar por bairro');
    if (zoneFilter.options?.[0]) zoneFilter.options[0].textContent = 'Todos os bairros';
  }

  const header = document.getElementById('voterTableHead');
  if (header?.children?.[3]) header.children[3].textContent = 'Coordenação';
  if (header?.children?.[4]) header.children[4].textContent = 'Bairro';

  document.querySelectorAll('.member-group-row td, .member-zone-row td').forEach(cell => {
    const corrected = replaceMemberTerminology(cell.textContent)
      .replace(/^Coordenação:\s*/i, 'Coordenação: ')
      .replace(/^Bairro:\s*/i, 'Bairro: ');
    if (cell.textContent !== corrected) cell.textContent = corrected;
  });

  document.querySelectorAll('#voterTableBody tr:not(.member-group-row):not(.member-zone-row)').forEach(row => {
    if (row.children?.[3]?.textContent.trim() === '—') row.children[3].textContent = 'Direção Nacional';
  });

  const count = document.getElementById('voterCountLabel');
  if (count) {
    const corrected = replaceMemberTerminology(count.textContent);
    if (count.textContent !== corrected) count.textContent = corrected;
  }

  document.querySelectorAll('#memberDelegationFilter option, #memberZoneFilter option').forEach(option => {
    const corrected = replaceMemberTerminology(option.textContent);
    if (option.textContent !== corrected) option.textContent = corrected;
  });
}

function bindTerminologyObserver() {
  const body = document.getElementById('voterTableBody');
  if (!body || body === terminologyObserverTarget) return;
  terminologyObserver?.disconnect();
  terminologyObserverTarget = body;
  terminologyObserver = new MutationObserver(() => applyCoordinationTerminology());
  terminologyObserver.observe(body, { childList: true, subtree: true });
}

function scheduleCoordinationTerminology() {
  setTimeout(() => { bindTerminologyObserver(); applyCoordinationTerminology(); }, 0);
  setTimeout(() => { bindTerminologyObserver(); applyCoordinationTerminology(); }, 180);
  setTimeout(() => { bindTerminologyObserver(); applyCoordinationTerminology(); }, 700);
}

function printCoordinationList() {
  if (sessionStorage.getItem(COORD_ACCESS_KEY) !== 'full') return;
  applyCoordinationTerminology();
  const source = document.querySelector('#adminViewVoters table');
  if (!source) return;

  const table = source.cloneNode(true);
  const header = table.querySelector('thead tr');
  header?.lastElementChild?.remove();
  table.querySelectorAll('tbody tr').forEach(row => {
    if (row.classList.contains('member-group-row') || row.classList.contains('member-zone-row')) {
      row.firstElementChild?.setAttribute('colspan', '6');
    } else {
      row.lastElementChild?.remove();
    }
  });
  table.querySelectorAll('th,td').forEach(cell => {
    cell.textContent = replaceMemberTerminology(cell.textContent);
  });

  const election = document.getElementById('adminElectionSelect')?.selectedOptions?.[0]?.textContent?.trim() || 'Comissão Eleitoral Interna — AXINENE';
  const coordination = document.getElementById('memberDelegationFilter')?.selectedOptions?.[0]?.textContent || 'Todas as coordenações';
  const neighborhood = document.getElementById('memberZoneFilter')?.selectedOptions?.[0]?.textContent || 'Todos os bairros';
  const printedAt = new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  const popup = window.open('', '_blank', 'width=1000,height=760');
  if (!popup) return;

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Lista de membros AXINENE</title><style>
    @page{size:A4 landscape;margin:12mm}body{font:12px/1.35 Arial,sans-serif;color:#111}h1{margin:0 0 4px;font-size:21px;color:#154f88}p{margin:3px 0}.meta{margin:0 0 16px;color:#444}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aeb8c5;padding:6px 7px;text-align:left;vertical-align:top}th{background:#154f88;color:#fff}.member-group-row td{background:#dbeaff;color:#0b4d91;font-weight:800;font-size:13px}.member-zone-row td{background:#eaf6ed;color:#176b3a;font-weight:800}.state-chip{font-weight:700}.footer{margin-top:12px;font-size:10px;color:#666}</style></head><body>
    <h1>ASSOCIAÇÃO AXINENE — Lista de membros</h1><p><strong>${election}</strong></p><div class="meta">${coordination} · Bairro: ${neighborhood} · Impresso em ${printedAt}</div>
    ${table.outerHTML}<div class="footer">Gerado pela plataforma de votação da Associação AXINENE.</div>
    <script>window.onload=()=>window.print();<\/script></body></html>`);
  popup.document.close();
}

document.addEventListener('click', event => {
  if (event.target.closest?.('#printMembersBtn')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    printCoordinationList();
    return;
  }
  if (event.target.closest?.('[data-admin-view="voters"], .member-edit-btn, .member-delete-btn, #bulkVoterForm button, #voterForm button')) {
    scheduleCoordinationTerminology();
  }
}, true);

document.addEventListener('input', event => {
  if (event.target?.id === 'voterSearch') scheduleCoordinationTerminology();
}, true);

document.addEventListener('change', event => {
  if (['memberDelegationFilter', 'memberZoneFilter', 'adminElectionSelect'].includes(event.target?.id)) scheduleCoordinationTerminology();
}, true);

window.addEventListener('hashchange', scheduleCoordinationTerminology);

scheduleCoordinationTerminology();
