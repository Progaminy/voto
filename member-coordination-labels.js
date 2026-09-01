// Ajuste apenas de terminologia da interface de membros.
// O banco continua a usar a coluna interna `delegation` para manter compatibilidade.
// Não usa MutationObserver.

const COORD_ACCESS_KEY = 'axinene_admin_access_level';

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

function applyCoordinationTerminology() {
  setLabelText('voterDelegation', 'Coordenação');
  setLabelText('memberEditDelegation', 'Coordenação');
  useNationalDirectionWhenEmpty('voterDelegation');
  useNationalDirectionWhenEmpty('voterZone');
  useNationalDirectionWhenEmpty('memberEditDelegation');
  useNationalDirectionWhenEmpty('memberEditZone');

  const bulkHelp = document.querySelector('#bulkVoterForm')?.closest('.form-card')?.querySelector('.form-help');
  if (bulkHelp) {
    bulkHelp.innerHTML = bulkHelp.innerHTML
      .replaceAll('Delegação', 'Coordenação')
      .replaceAll('delegação', 'coordenação');
  }

  const delegationFilter = document.getElementById('memberDelegationFilter');
  if (delegationFilter) {
    delegationFilter.setAttribute('aria-label', 'Filtrar por coordenação');
    if (delegationFilter.options?.[0]) delegationFilter.options[0].textContent = 'Todas as coordenações';
  }

  const header = document.getElementById('voterTableHead');
  if (header?.children?.[3]) header.children[3].textContent = 'Coordenação';

  document.querySelectorAll('.member-group-row td').forEach(cell => {
    cell.textContent = cell.textContent
      .replace(/^Delegação:/, 'Coordenação:')
      .replaceAll('Sem delegação', 'Direção Nacional');
  });
  document.querySelectorAll('.member-zone-row td').forEach(cell => {
    cell.textContent = cell.textContent.replaceAll('Sem zona indicada', 'Direção Nacional');
  });

  document.querySelectorAll('#voterTableBody tr:not(.member-group-row):not(.member-zone-row)').forEach(row => {
    if (row.children?.[3]?.textContent.trim() === '—') row.children[3].textContent = 'Direção Nacional';
    if (row.children?.[4]?.textContent.trim() === '—') row.children[4].textContent = 'Direção Nacional';
  });

  const count = document.getElementById('voterCountLabel');
  if (count) {
    count.textContent = count.textContent
      .replace(/delegaç(ão|ões)/gi, match => match.toLowerCase().endsWith('ões') ? 'coordenações' : 'coordenação');
  }

  const toolbarOption = document.querySelector('#memberDelegationFilter option[value=""]');
  if (toolbarOption) toolbarOption.textContent = 'Todas as coordenações';
}

function scheduleCoordinationTerminology() {
  setTimeout(applyCoordinationTerminology, 0);
  setTimeout(applyCoordinationTerminology, 180);
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
    cell.textContent = cell.textContent
      .replaceAll('Delegação', 'Coordenação')
      .replaceAll('delegação', 'coordenação')
      .replaceAll('Sem delegação', 'Direção Nacional')
      .replaceAll('Sem zona indicada', 'Direção Nacional');
  });

  const election = document.getElementById('adminElectionSelect')?.selectedOptions?.[0]?.textContent?.trim() || 'Comissão Eleitoral Interna — AXINENE';
  const coordination = document.getElementById('memberDelegationFilter')?.selectedOptions?.[0]?.textContent || 'Todas as coordenações';
  const zone = document.getElementById('memberZoneFilter')?.selectedOptions?.[0]?.textContent || 'Todas as zonas';
  const printedAt = new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  const popup = window.open('', '_blank', 'width=1000,height=760');
  if (!popup) return;

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Lista de membros AXINENE</title><style>
    @page{size:A4 landscape;margin:12mm}body{font:12px/1.35 Arial,sans-serif;color:#111}h1{margin:0 0 4px;font-size:21px;color:#154f88}p{margin:3px 0}.meta{margin:0 0 16px;color:#444}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aeb8c5;padding:6px 7px;text-align:left;vertical-align:top}th{background:#154f88;color:#fff}.member-group-row td{background:#dbeaff;color:#0b4d91;font-weight:800;font-size:13px}.member-zone-row td{background:#eaf6ed;color:#176b3a;font-weight:800}.state-chip{font-weight:700}.footer{margin-top:12px;font-size:10px;color:#666}</style></head><body>
    <h1>ASSOCIAÇÃO AXINENE — Lista de membros</h1><p><strong>${election}</strong></p><div class="meta">${coordination} · Zona: ${zone} · Impresso em ${printedAt}</div>
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
setTimeout(applyCoordinationTerminology, 700);
