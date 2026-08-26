import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const supabaseCatalog = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const esc = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const shortText = (value = '', max = 145) => {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
};

const previewStyles = document.createElement('style');
previewStyles.textContent = `
  .catalog-readonly-note {
    margin: 0 0 16px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--surface);
    color: var(--muted);
    font-size: 13px;
  }
  .catalog-readonly-note strong { color: var(--ink); }
  .catalog-vote-locked {
    border: 0;
    border-radius: 10px;
    padding: 10px 12px;
    background: #edf1f5;
    color: #6d7785;
    font-weight: 800;
    cursor: not-allowed;
  }
`;
document.head.appendChild(previewStyles);

let catalogData = null;

function openCatalogManifesto(candidate, position) {
  const dialog = document.getElementById('manifestoDialog');
  const content = document.getElementById('manifestoDialogContent');
  if (!dialog || !content) return;
  const photo = candidate.photo_url
    ? `<img src="${esc(candidate.photo_url)}" alt="Foto de ${esc(candidate.name)}" />`
    : '';
  content.innerHTML = `
    ${photo}
    <span class="manifesto-role">${esc(position.title || 'Candidatura')}</span>
    <h2>${esc(candidate.name || 'Candidato')}</h2>
    <div class="manifesto-copy">${esc(candidate.manifesto || 'Manifesto não informado.')}</div>`;
  if (!dialog.open) dialog.showModal();
}

function renderCatalog(data) {
  const election = data?.election;
  const positions = Array.isArray(data?.positions) ? data.positions : [];
  if (!election || election.status === 'open') return false;

  catalogData = data;
  const notice = document.getElementById('electionNotice');
  const voterArea = document.getElementById('voterArea');
  const ballot = document.getElementById('ballotSection');
  const root = document.getElementById('positionsList');
  if (!notice || !ballot || !root) return false;

  voterArea?.classList.add('hidden');
  ballot.classList.remove('hidden');
  notice.className = 'notice-card is-closed';

  const statusText = election.status === 'closed'
    ? 'A votação não está aberta neste momento.'
    : 'A votação ainda não foi aberta.';
  notice.innerHTML = `<span class="pulse-dot"></span><div><strong>${esc(election.title)} — candidaturas disponíveis para consulta</strong><p>${esc(election.organization_name)} · ${statusText} Pode consultar os candidatos, as vagas e os manifestos.</p></div>`;

  const oldNote = document.getElementById('catalogReadonlyNote');
  oldNote?.remove();
  const note = document.createElement('div');
  note.id = 'catalogReadonlyNote';
  note.className = 'catalog-readonly-note';
  note.innerHTML = '<strong>Consulta pública:</strong> as candidaturas e manifestos podem ser analisados antes da abertura da votação. O botão de voto só ficará disponível quando a eleição for aberta.';
  root.insertAdjacentElement('beforebegin', note);

  if (!positions.length) {
    root.innerHTML = '<div class="empty-state"><strong>Ainda não há vagas publicadas.</strong>A Comissão Eleitoral está a preparar as candidaturas.</div>';
    return true;
  }

  root.innerHTML = positions.map(position => {
    const candidates = Array.isArray(position.candidates) ? position.candidates : [];
    const cards = candidates.length
      ? candidates.map(candidate => {
          const initial = esc(String(candidate.name || '?').trim().charAt(0).toUpperCase());
          const photo = candidate.photo_url
            ? `<div class="candidate-photo"><img src="${esc(candidate.photo_url)}" alt="Foto de ${esc(candidate.name)}" loading="lazy" /></div>`
            : `<div class="candidate-photo placeholder" aria-hidden="true">${initial}</div>`;
          return `
            <article class="candidate-card catalog-candidate-card">
              ${photo}
              <div class="candidate-body">
                <small>${esc(position.title)}</small>
                <h4>${esc(candidate.name)}</h4>
                <p class="manifesto-preview">${esc(shortText(candidate.manifesto || 'Manifesto não informado.'))}</p>
                <div class="candidate-actions">
                  <button class="manifesto-btn catalog-manifesto-btn" type="button" data-position-id="${esc(position.id)}" data-candidate-id="${esc(candidate.id)}">Ver manifesto</button>
                  <button class="catalog-vote-locked" type="button" disabled>Votação não aberta</button>
                </div>
              </div>
            </article>`;
        }).join('')
      : '<div class="empty-state"><strong>Sem candidatos nesta vaga.</strong></div>';

    return `
      <article class="position-block">
        <header class="position-head">
          <div><h3>${esc(position.title)}</h3><p>${esc(position.description || 'Consulte os candidatos desta vaga.')}</p></div>
          <span class="position-state">Consulta</span>
        </header>
        <div class="candidate-grid">${cards}</div>
      </article>`;
  }).join('');

  root.querySelectorAll('.catalog-manifesto-btn').forEach(button => {
    button.addEventListener('click', () => {
      const position = positions.find(p => String(p.id) === String(button.dataset.positionId));
      const candidate = position?.candidates?.find(c => String(c.id) === String(button.dataset.candidateId));
      if (position && candidate) openCatalogManifesto(candidate, position);
    });
  });
  return true;
}

async function loadPublicCatalog() {
  try {
    const { data, error } = await supabaseCatalog.rpc('vote_public_candidate_catalog');
    if (error) throw error;
    renderCatalog(data);
  } catch (error) {
    console.warn('public candidate catalog:', error?.message || error);
  }
}

// O app principal trata normalmente a votação aberta. Este complemento atua
// apenas quando a eleição ainda não está aberta ou já foi encerrada.
await loadPublicCatalog();

// Ao voltar do painel administrativo para a página pública, atualiza a consulta.
window.addEventListener('hashchange', () => {
  if (location.hash !== '#admin') setTimeout(loadPublicCatalog, 120);
});
