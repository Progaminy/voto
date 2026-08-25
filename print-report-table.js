const PRINT_ACCESS_KEY = 'axinene_admin_access_level';

const printTableStyles = document.createElement('style');
printTableStyles.textContent = `
  .print-explicit-report { display: none; }

  @media print {
    .print-explicit-report {
      display: block !important;
      margin-top: 20px;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
    }
    .print-explicit-report h2 {
      margin: 0 0 10px;
      font-size: 17px;
      border-bottom: 2px solid #111;
      padding-bottom: 6px;
    }
    .print-explicit-report h3 {
      margin: 18px 0 7px;
      font-size: 13px;
    }
    .print-summary-table,
    .print-results-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin: 0 0 12px;
      font-size: 10.5px;
    }
    .print-summary-table th,
    .print-summary-table td,
    .print-results-table th,
    .print-results-table td {
      border: 1px solid #333;
      padding: 7px 8px;
      vertical-align: middle;
    }
    .print-summary-table th,
    .print-results-table thead th {
      background: #ededed !important;
      color: #111 !important;
      font-weight: 700;
      text-align: left;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-summary-table td {
      font-weight: 700;
      font-size: 12px;
    }
    .print-results-table .rank,
    .print-results-table .votes,
    .print-results-table .percent {
      text-align: center;
      white-space: nowrap;
    }
    .print-results-table .rank { width: 14%; }
    .print-results-table .candidate { width: 48%; }
    .print-results-table .votes { width: 18%; }
    .print-results-table .percent { width: 20%; }
    .print-results-table tfoot th,
    .print-results-table tfoot td {
      border-top: 2px solid #111;
      font-weight: 700;
      background: #f7f7f7 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-table-note {
      margin: -4px 0 12px;
      font-size: 9px;
      color: #444;
    }
    .print-position-table-wrap {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
`;
document.head.appendChild(printTableStyles);

function text(selector, fallback = '0') {
  return document.querySelector(selector)?.textContent?.trim() || fallback;
}

function parseScore(row) {
  const score = row.querySelector('.result-score');
  const small = score?.querySelector('small');
  const percent = small?.textContent?.trim() || '0%';
  let voteText = '';
  if (score) {
    for (const node of score.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        voteText += ` ${node.textContent.trim()}`;
      }
    }
  }
  const match = voteText.match(/\d+/) || score?.textContent?.match(/\d+/);
  return { votes: Number(match?.[0] || 0), percent };
}

function buildSummaryTable() {
  const table = document.createElement('table');
  table.className = 'print-summary-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Eleitores autorizados</th>
        <th>Participaram</th>
        <th>Participação</th>
        <th>Votos registados</th>
        <th>Vagas</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${text('#statVoters')}</td>
        <td>${text('#statStarted')}</td>
        <td>${text('#statPercent', '0%')}</td>
        <td>${text('#statVotes')}</td>
        <td>${text('#statPositions')}</td>
      </tr>
    </tbody>`;
  return table;
}

function buildPositionTable(position) {
  const title = position.querySelector('h3')?.textContent?.trim() || 'Vaga';
  const rows = [...position.querySelectorAll('.result-row')].map(row => {
    const candidate = row.querySelector('.result-person strong')?.textContent?.trim() || 'Candidato';
    const { votes, percent } = parseScore(row);
    return { candidate, votes, percent };
  });

  rows.sort((a, b) => b.votes - a.votes || a.candidate.localeCompare(b.candidate, 'pt'));
  const total = rows.reduce((sum, row) => sum + row.votes, 0);

  const wrap = document.createElement('section');
  wrap.className = 'print-position-table-wrap';
  const heading = document.createElement('h3');
  heading.textContent = `Vaga: ${title}`;
  wrap.appendChild(heading);

  const table = document.createElement('table');
  table.className = 'print-results-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th class="rank">Classificação</th>
        <th class="candidate">Candidato</th>
        <th class="votes">Votos</th>
        <th class="percent">Percentagem</th>
      </tr>
    </thead>`;

  const tbody = document.createElement('tbody');
  let previousVotes = null;
  let previousRank = 0;
  rows.forEach((row, index) => {
    const rank = previousVotes === row.votes ? previousRank : index + 1;
    previousVotes = row.votes;
    previousRank = rank;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank">${rank}.º</td>
      <td class="candidate"></td>
      <td class="votes">${row.votes}</td>
      <td class="percent">${row.percent}</td>`;
    tr.querySelector('.candidate').textContent = row.candidate;
    tbody.appendChild(tr);
  });

  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4">Sem resultados registados nesta vaga.</td>';
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const tfoot = document.createElement('tfoot');
  tfoot.innerHTML = `
    <tr>
      <th colspan="2">Total de votos nesta vaga</th>
      <td class="votes">${total}</td>
      <td class="percent">100%*</td>
    </tr>`;
  table.appendChild(tfoot);
  wrap.appendChild(table);

  const note = document.createElement('p');
  note.className = 'print-table-note';
  note.textContent = total > 0
    ? '* As percentagens dos candidatos são calculadas sobre o total de votos registados nesta vaga.'
    : '* Ainda não existem votos registados nesta vaga.';
  wrap.appendChild(note);

  return wrap;
}

function buildExplicitPrintReport() {
  if (sessionStorage.getItem(PRINT_ACCESS_KEY) !== 'full') return;

  let report = document.getElementById('printExplicitReport');
  if (!report) {
    report = document.createElement('section');
    report.id = 'printExplicitReport';
    report.className = 'print-only print-explicit-report';
    const results = document.getElementById('adminResults');
    results?.insertAdjacentElement('afterend', report);
  }
  if (!report) return;

  report.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = 'Tabela detalhada dos resultados';
  report.appendChild(heading);
  report.appendChild(buildSummaryTable());

  const positions = [...document.querySelectorAll('#adminResults .result-position')];
  positions.forEach(position => report.appendChild(buildPositionTable(position)));

  if (!positions.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Não existem resultados para apresentar na tabela.';
    report.appendChild(empty);
  }
}

window.addEventListener('beforeprint', buildExplicitPrintReport);
document.addEventListener('click', event => {
  if (event.target.closest?.('#printResultsBtn')) buildExplicitPrintReport();
}, true);
