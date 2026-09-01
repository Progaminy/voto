const ADMIN_PRINT_ACCESS_KEY = 'axinene_admin_access_level';

const printEscape = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function adminCanPrintResults() {
  return sessionStorage.getItem(ADMIN_PRINT_ACCESS_KEY) === 'full';
}

function adminPrintToast(message, type = 'info') {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function ensureAdminPrintResultsButton() {
  if (!adminCanPrintResults()) return;
  if (document.getElementById('printResultsBtn')) return;
  const header = document.querySelector('#adminViewResults .view-header');
  if (!header) return;
  const button = document.createElement('button');
  button.id = 'printResultsBtn';
  button.className = 'btn btn-ghost';
  button.type = 'button';
  button.textContent = 'Imprimir resultados';
  button.addEventListener('click', printAdminResults);
  const announceWrap = header.querySelector('.announce-result-wrap');
  if (announceWrap) announceWrap.appendChild(button);
  else header.appendChild(button);
}

function scoreFromRow(row) {
  const score = row.querySelector('.result-score');
  const percent = score?.querySelector('small')?.textContent?.trim() || '0%';
  let votes = '';
  if (score) {
    for (const node of score.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) votes += node.textContent.trim();
    }
  }
  return { votes: Number((votes.match(/\d+/) || score?.textContent?.match(/\d+/) || ['0'])[0]), percent };
}

function collectAdminResults() {
  return [...document.querySelectorAll('#adminResults .result-position')].map(position => ({
    title: position.querySelector('h3')?.textContent?.trim() || 'Vaga',
    rows: [...position.querySelectorAll('.result-row')].map(row => {
      const score = scoreFromRow(row);
      return {
        candidate: row.querySelector('.result-person strong')?.textContent?.trim() || 'Candidato',
        votes: score.votes,
        percent: score.percent
      };
    }).sort((a, b) => b.votes - a.votes || a.candidate.localeCompare(b.candidate, 'pt'))
  }));
}

function printAdminResults() {
  if (!adminCanPrintResults()) return adminPrintToast('Este acesso não pode imprimir resultados.', 'error');
  const positions = collectAdminResults();
  if (!positions.length) return adminPrintToast('Ainda não existem resultados para imprimir.', 'error');

  const election = document.getElementById('adminElectionSelect')?.selectedOptions?.[0]?.textContent?.trim() || 'Comissão Eleitoral Interna — AXINENE';
  const voters = document.getElementById('statVoters')?.textContent?.trim() || '0';
  const participation = document.getElementById('statPercent')?.textContent?.trim() || '0%';
  const totalVotes = document.getElementById('statVotes')?.textContent?.trim() || '0';
  const printedAt = new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

  const resultHtml = positions.map(position => {
    const total = position.rows.reduce((sum, row) => sum + row.votes, 0);
    let previousVotes = null;
    let previousRank = 0;
    const rows = position.rows.map((row, index) => {
      const rank = previousVotes === row.votes ? previousRank : index + 1;
      previousVotes = row.votes;
      previousRank = rank;
      return `<tr><td>${rank}.º</td><td>${printEscape(row.candidate)}</td><td>${row.votes}</td><td>${printEscape(row.percent)}</td></tr>`;
    }).join('');
    return `<section class="position"><h2>${printEscape(position.title)}</h2><table><thead><tr><th>Classificação</th><th>Candidato</th><th>Votos</th><th>Percentagem</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th colspan="2">Total da vaga</th><td>${total}</td><td>${total ? '100%' : '0%'}</td></tr></tfoot></table></section>`;
  }).join('');

  const popup = window.open('', '_blank', 'width=1000,height=760');
  if (!popup) return adminPrintToast('O navegador bloqueou a janela de impressão.', 'error');
  popup.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Resultados — ${printEscape(election)}</title><style>
    @page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font:12px/1.4 Arial,sans-serif;color:#111;margin:0}h1{font-size:22px;margin:0 0 4px}p{margin:3px 0}.meta{color:#444;margin-bottom:16px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:15px 0 20px}.summary div{border:1px solid #aaa;padding:8px}.summary small{display:block;color:#555}.summary strong{font-size:15px}.position{break-inside:avoid;margin:0 0 20px}.position h2{font-size:16px;margin:0 0 7px;border-bottom:2px solid #222;padding-bottom:5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:7px;text-align:left}th{background:#eee}td:nth-child(1),td:nth-child(3),td:nth-child(4){text-align:center}tfoot{font-weight:bold}.footer{margin-top:18px;border-top:1px solid #aaa;padding-top:8px;font-size:10px;color:#555}</style></head><body>
    <h1>Resultados da eleição</h1><p><strong>${printEscape(election)}</strong></p><p class="meta">Impresso em ${printEscape(printedAt)}</p>
    <div class="summary"><div><small>Eleitores autorizados</small><strong>${printEscape(voters)}</strong></div><div><small>Participação</small><strong>${printEscape(participation)}</strong></div><div><small>Votos registados</small><strong>${printEscape(totalVotes)}</strong></div></div>
    ${resultHtml}<div class="footer">Comissão Eleitoral Interna — AXINENE</div><script>window.onload=()=>window.print();<\/script></body></html>`);
  popup.document.close();
}

document.addEventListener('click', event => {
  if (event.target.closest?.('[data-admin-view="results"]')) setTimeout(ensureAdminPrintResultsButton, 80);
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#admin') setTimeout(ensureAdminPrintResultsButton, 250);
});
setTimeout(ensureAdminPrintResultsButton, 400);
