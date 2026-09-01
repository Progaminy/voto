function publicPrintToast(message) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'toast error';
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function ensurePublicPrintResultsButton() {
  const section = document.getElementById('publicResultsSection');
  if (!section || section.classList.contains('hidden')) return;
  const head = section.querySelector('.public-results-head');
  if (!head || document.getElementById('publicPrintResultsBtn')) return;

  const actions = document.createElement('div');
  actions.className = 'public-results-print-actions';
  actions.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';
  const existingBadge = head.querySelector('.public-result-official');
  if (existingBadge) actions.appendChild(existingBadge);

  const button = document.createElement('button');
  button.id = 'publicPrintResultsBtn';
  button.className = 'btn btn-ghost';
  button.type = 'button';
  button.textContent = 'Imprimir resultados';
  button.addEventListener('click', printPublicResults);
  actions.appendChild(button);
  head.appendChild(actions);
}

function printPublicResults() {
  const card = document.querySelector('#publicResultsSection .public-results-card');
  if (!card) return publicPrintToast('Os resultados oficiais ainda não foram anunciados.');

  const clone = card.cloneNode(true);
  clone.querySelector('#publicPrintResultsBtn')?.remove();
  clone.querySelector('.public-results-print-actions')?.replaceWith(clone.querySelector('.public-result-official') || document.createTextNode(''));

  const popup = window.open('', '_blank', 'width=1000,height=760');
  if (!popup) return publicPrintToast('O navegador bloqueou a janela de impressão.');
  popup.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Resultados oficiais — AXINENE</title><style>
    @page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font:12px/1.4 Arial,sans-serif;color:#111;margin:0}.public-results-card{padding:0}.public-results-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:2px solid #222;padding-bottom:10px;margin-bottom:14px}.public-results-head h2{font-size:22px;margin:0 0 4px}.public-results-head p{margin:0;color:#444}.public-result-official{display:inline-block;padding:5px 8px;border:1px solid #777;border-radius:999px;font-size:10px;font-weight:bold}.public-result-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:0 0 18px}.public-result-meta article{border:1px solid #aaa;padding:8px}.public-result-meta span{display:block;font-size:9px;text-transform:uppercase;color:#555}.public-result-meta strong{display:block;margin-top:4px;font-size:13px}.public-distribution{border:1px solid #999;padding:12px;margin:0 0 18px;break-inside:avoid}.public-distribution h3{margin:0 0 5px;font-size:15px}.public-assignment-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.public-assignment{border:1px solid #aaa;padding:8px}.public-assignment small{display:block;font-size:9px;text-transform:uppercase}.public-assignment strong,.public-assignment span{display:block;margin-top:3px}.public-result-position{break-inside:avoid;border-top:1px solid #aaa;padding-top:12px;margin-top:12px}.public-result-position h3{margin:0 0 8px;font-size:16px}.public-result-row{display:grid;grid-template-columns:minmax(180px,1.4fr) minmax(130px,2fr) 80px;gap:8px;align-items:center;padding:6px 0}.public-result-person{display:flex;gap:8px;align-items:center}.public-result-person img,.public-result-avatar{width:28px;height:28px;border-radius:50%;object-fit:cover;background:#ddd}.public-result-bar{height:8px;background:#e5e5e5;border-radius:99px;overflow:hidden}.public-result-bar span{display:block;height:100%;background:#555}.public-result-score{text-align:right;font-weight:bold}.public-result-score small{display:block;font-size:9px;color:#555}.btn{display:none!important}@media(max-width:650px){.public-assignment-grid{grid-template-columns:1fr}.public-result-row{grid-template-columns:1fr 70px}.public-result-bar{grid-column:1/-1}}</style></head><body>${clone.outerHTML}<script>window.onload=()=>window.print();<\/script></body></html>`);
  popup.document.close();
}

const baseRefreshPublicResults = window.axineneRefreshPublicResults;
if (typeof baseRefreshPublicResults === 'function') {
  const wrappedRefresh = async (...args) => {
    const result = await baseRefreshPublicResults(...args);
    ensurePublicPrintResultsButton();
    return result;
  };
  window.axineneRefreshPublicResults = wrappedRefresh;
  wrappedRefresh();
} else {
  setTimeout(ensurePublicPrintResultsButton, 900);
}

setTimeout(ensurePublicPrintResultsButton, 1600);
