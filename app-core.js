import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const ADMIN_EDGE_URL = `${SUPABASE_URL}/functions/v1/vote-admin`;
const ADMIN_SESSION_KEY = 'axinene_admin_pin_session';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const shortText = (value = '', max = 145) => value.length > max ? `${value.slice(0, max).trim()}…` : value;
const phoneKey = (value = '') => value.replace(/\D/g, '');
const textKey = (value = '') => value.trim().replace(/\s+/g, ' ').toLowerCase();
const toLocalInput = value => {
  if (!value) return '';
  const d = new Date(value);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const state = {
  publicElection: null,
  positions: [],
  candidates: [],
  voterToken: null,
  voterName: null,
  myVotes: [],
  pendingCandidateId: null,
  admin: {
    token: sessionStorage.getItem(ADMIN_SESSION_KEY),
    elections: [],
    election: null,
    positions: [],
    candidates: [],
    voters: [],
    results: [],
    participation: [],
    stats: {},
    liveTimer: null,
    liveBusy: false
  }
};

function toast(message, type = 'info', timeout = 3600) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  $('#toastRegion').appendChild(el);
  setTimeout(() => el.remove(), timeout);
}

function setBusy(button, busy, busyLabel = 'A processar…') {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = busyLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

function showPublicMode() {
  stopLivePolling();
  $('#publicApp').classList.remove('hidden');
  $('#adminApp').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showAdminMode() {
  $('#publicApp').classList.add('hidden');
  $('#adminApp').classList.remove('hidden');
  ensureAdminState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function route() {
  if (location.hash === '#admin') showAdminMode();
  else showPublicMode();
}

async function loadPublicElection() {
  const notice = $('#electionNotice');
  notice.className = 'notice-card loading-card';
  notice.innerHTML = '<span class="pulse-dot"></span><div><strong>A carregar a votação…</strong><p>Estamos a consultar o estado atual da eleição.</p></div>';

  const { data, error } = await supabase
    .from('vote_elections')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    notice.className = 'notice-card is-closed';
    notice.innerHTML = '<span class="pulse-dot"></span><div><strong>Não foi possível consultar a votação</strong><p>Tente novamente dentro de instantes.</p></div>';
    return;
  }

  if (!data) {
    state.publicElection = null;
    state.positions = [];
    state.candidates = [];
    $('#voterArea').classList.add('hidden');
    $('#ballotSection').classList.add('hidden');
    notice.className = 'notice-card is-closed';
    notice.innerHTML = '<span class="pulse-dot"></span><div><strong>Votação não aberta</strong><p>A Comissão Eleitoral ainda não abriu a votação ou ela já foi encerrada.</p></div>';
    return;
  }

  state.publicElection = data;
  notice.className = 'notice-card is-open';
  notice.innerHTML = `<span class="pulse-dot"></span><div><strong>${escapeHtml(data.title)} — votação aberta</strong><p>${escapeHtml(data.organization_name)} · Vote uma única vez em cada vaga.</p></div>`;
  $('#voterArea').classList.remove('hidden');
  $('#ballotSection').classList.remove('hidden');

  await loadPublicCandidates();
  restoreVoterSession();
}

async function loadPublicCandidates() {
  if (!state.publicElection) return;
  const { data: positions, error: positionsError } = await supabase
    .from('vote_positions')
    .select('*')
    .eq('election_id', state.publicElection.id)
    .order('display_order')
    .order('title');

  if (positionsError) {
    console.error(positionsError);
    toast('Não foi possível carregar as vagas.', 'error');
    return;
  }
  state.positions = positions || [];

  if (!state.positions.length) {
    state.candidates = [];
    renderBallot();
    return;
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from('vote_candidates')
    .select('*')
    .in('position_id', state.positions.map(p => p.id))
    .eq('active', true)
    .order('display_order')
    .order('name');

  if (candidatesError) {
    console.error(candidatesError);
    toast('Não foi possível carregar os candidatos.', 'error');
    return;
  }
  state.candidates = candidates || [];
  renderBallot();
}

function restoreVoterSession() {
  if (!state.publicElection) return;
  const key = `axinene_vote_session_${state.publicElection.id}`;
  const saved = sessionStorage.getItem(key);
  if (!saved) {
    renderVerifiedState();
    renderBallot();
    return;
  }
  try {
    const parsed = JSON.parse(saved);
    state.voterToken = parsed.token || null;
    state.voterName = parsed.name || null;
  } catch {
    sessionStorage.removeItem(key);
  }
  renderVerifiedState();
  if (state.voterToken) loadMyVotes();
}

function saveVoterSession() {
  if (!state.publicElection || !state.voterToken) return;
  sessionStorage.setItem(`axinene_vote_session_${state.publicElection.id}`, JSON.stringify({
    token: state.voterToken,
    name: state.voterName
  }));
}

function clearVoterSession() {
  if (state.publicElection) sessionStorage.removeItem(`axinene_vote_session_${state.publicElection.id}`);
  state.voterToken = null;
  state.voterName = null;
  state.myVotes = [];
  renderVerifiedState();
  renderBallot();
}

function renderVerifiedState() {
  const verifyCard = $('.verify-card');
  const verifiedCard = $('#verifiedCard');
  if (state.voterToken) {
    verifyCard.classList.add('hidden');
    verifiedCard.classList.remove('hidden');
    $('#verifiedName').textContent = state.voterName || 'Eleitor autorizado';
  } else {
    verifyCard.classList.remove('hidden');
    verifiedCard.classList.add('hidden');
  }
}

async function verifyVoter(identifier) {
  if (!state.publicElection) return;
  const button = $('#verifyBtn');
  setBusy(button, true, 'A verificar…');
  const { data, error } = await supabase.rpc('vote_verify_voter', {
    p_election_id: state.publicElection.id,
    p_identifier: identifier
  });
  setBusy(button, false);

  if (error) {
    console.error(error);
    toast('Não foi possível verificar agora. Tente novamente.', 'error');
    return;
  }
  if (!data?.ok) {
    toast(data?.message || 'Eleitor não autorizado.', 'error');
    return;
  }

  state.voterToken = data.token;
  state.voterName = data.voter_name;
  state.myVotes = [];
  saveVoterSession();
  renderVerifiedState();
  await loadMyVotes();
  toast(`Bem-vindo, ${data.voter_name}.`, 'success');
}

async function loadMyVotes() {
  if (!state.voterToken) return;
  const { data, error } = await supabase.rpc('vote_my_votes', { p_token: state.voterToken });
  if (error) {
    console.error(error);
    return;
  }
  state.myVotes = data || [];
  renderBallot();
}

function renderBallot() {
  const root = $('#positionsList');
  if (!root) return;
  if (!state.positions.length) {
    root.innerHTML = '<div class="empty-state"><strong>Ainda não há candidaturas publicadas.</strong>A Comissão Eleitoral está a preparar as vagas e candidatos.</div>';
    return;
  }

  root.innerHTML = state.positions.map(position => {
    const candidates = state.candidates.filter(c => c.position_id === position.id);
    const myVote = state.myVotes.find(v => v.position_id === position.id);
    const stateLabel = myVote ? '<span class="position-state done">✓ Voto concluído</span>' : '<span class="position-state">1 voto disponível</span>';
    const cards = candidates.length ? candidates.map(candidate => candidateCard(candidate, position, myVote)).join('') : '<div class="empty-state"><strong>Sem candidatos nesta vaga.</strong></div>';
    return `
      <article class="position-block">
        <header class="position-head">
          <div><h3>${escapeHtml(position.title)}</h3><p>${escapeHtml(position.description || 'Escolha um candidato para esta vaga.')}</p></div>
          ${stateLabel}
        </header>
        <div class="candidate-grid">${cards}</div>
      </article>`;
  }).join('');

  $$('.manifesto-btn', root).forEach(btn => btn.addEventListener('click', () => openManifesto(btn.dataset.candidateId)));
  $$('.vote-choice', root).forEach(btn => btn.addEventListener('click', () => requestVote(btn.dataset.candidateId)));
}

function candidateCard(candidate, position, myVote) {
  const selected = myVote?.candidate_id === candidate.id;
  const locked = Boolean(myVote) && !selected;
  const initial = escapeHtml((candidate.name || '?').trim().charAt(0).toUpperCase());
  const photo = candidate.photo_url
    ? `<img src="${escapeHtml(candidate.photo_url)}" alt="Foto de ${escapeHtml(candidate.name)}" loading="lazy" />`
    : `<div class="candidate-photo placeholder" aria-hidden="true">${initial}</div>`;
  const photoWrap = candidate.photo_url ? `<div class="candidate-photo">${photo}</div>` : photo;
  const voteLabel = selected ? '☑ Seu voto' : locked ? 'Voto concluído' : '☐ Votar';

  return `
    <article class="candidate-card ${selected ? 'is-selected' : ''}">
      ${photoWrap}
      <div class="candidate-body">
        <small>${escapeHtml(position.title)}</small>
        <h4>${escapeHtml(candidate.name)}</h4>
        <p class="manifesto-preview">${escapeHtml(shortText(candidate.manifesto || 'Manifesto não informado.'))}</p>
        <div class="candidate-actions">
          <button class="manifesto-btn" type="button" data-candidate-id="${candidate.id}">Ver manifesto</button>
          <button class="vote-choice ${selected ? 'selected' : ''}" type="button" data-candidate-id="${candidate.id}" ${locked || selected ? 'disabled' : ''}>${voteLabel}</button>
        </div>
      </div>
    </article>`;
}

function openManifesto(candidateId) {
  const candidate = state.candidates.find(c => c.id === candidateId);
  if (!candidate) return;
  const position = state.positions.find(p => p.id === candidate.position_id);
  const photo = candidate.photo_url ? `<img src="${escapeHtml(candidate.photo_url)}" alt="Foto de ${escapeHtml(candidate.name)}" />` : '';
  $('#manifestoDialogContent').innerHTML = `
    ${photo}
    <span class="manifesto-role">${escapeHtml(position?.title || 'Candidatura')}</span>
    <h2>${escapeHtml(candidate.name)}</h2>
    <div class="manifesto-copy">${escapeHtml(candidate.manifesto || 'Manifesto não informado.')}</div>`;
  $('#manifestoDialog').showModal();
}

function requestVote(candidateId) {
  if (!state.voterToken) {
    toast('Confirme primeiro a sua identidade para poder votar.', 'error');
    $('.verify-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const candidate = state.candidates.find(c => c.id === candidateId);
  const position = state.positions.find(p => p.id === candidate?.position_id);
  if (!candidate || !position) return;
  state.pendingCandidateId = candidateId;
  $('#voteDialogText').innerHTML = `Você escolheu <strong>${escapeHtml(candidate.name)}</strong> para <strong>${escapeHtml(position.title)}</strong>. Depois de confirmado, este voto não poderá ser alterado.`;
  $('#voteDialog').showModal();
}

async function confirmVote() {
  if (!state.pendingCandidateId || !state.voterToken) return;
  const button = $('#confirmVoteBtn');
  setBusy(button, true, 'A registar…');
  const { data, error } = await supabase.rpc('vote_cast_vote', {
    p_token: state.voterToken,
    p_candidate_id: state.pendingCandidateId
  });
  setBusy(button, false);

  if (error) {
    console.error(error);
    toast('Não foi possível registar o voto.', 'error');
    return;
  }
  if (!data?.ok) {
    toast(data?.message || 'O voto não foi registado.', 'error');
    if ((data?.message || '').includes('sessão expirou')) clearVoterSession();
    return;
  }

  $('#voteDialog').close();
  state.pendingCandidateId = null;
  await loadMyVotes();
  toast(data.message || 'Voto registado com sucesso.', 'success');
}

/* ------------------------- Administração por PIN ------------------------- */

async function adminApi(action, payload = {}, options = {}) {
  const response = await fetch(ADMIN_EDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      action,
      token: options.withoutToken ? undefined : state.admin.token,
      ...payload
    })
  });

  let data = {};
  try { data = await response.json(); } catch {}
  if (response.status === 401 && action !== 'login') {
    clearAdminSession();
    if (location.hash === '#admin') showAdminLogin();
  }
  if (!response.ok || data?.ok === false) {
    const error = new Error(data?.message || 'Operação administrativa falhou.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function saveAdminSession(token) {
  state.admin.token = token;
  sessionStorage.setItem(ADMIN_SESSION_KEY, token);
}

function clearAdminSession() {
  stopLivePolling();
  state.admin.token = null;
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

async function ensureAdminState() {
  if (!state.admin.token) {
    showAdminLogin();
    return;
  }
  try {
    showAdminDashboard();
    await loadAdminDashboard(state.admin.election?.id || null);
    startLivePolling();
  } catch (error) {
    console.error(error);
    clearAdminSession();
    showAdminLogin();
    if (error.status !== 401) toast(error.message || 'Não foi possível abrir o painel.', 'error');
  }
}

function showAdminLogin() {
  stopLivePolling();
  $('#adminLoginView').classList.remove('hidden');
  $('#adminDashboard').classList.add('hidden');
  $('#adminPin').value = '';
  setTimeout(() => $('#adminPin')?.focus(), 60);
}

function showAdminDashboard() {
  $('#adminLoginView').classList.add('hidden');
  $('#adminDashboard').classList.remove('hidden');
}

async function adminLogin(pin) {
  const button = $('#adminLoginBtn');
  setBusy(button, true, 'A entrar…');
  try {
    const data = await adminApi('login', { pin }, { withoutToken: true });
    saveAdminSession(data.token);
    showAdminDashboard();
    await loadAdminDashboard();
    startLivePolling();
    toast('Sessão administrativa iniciada.', 'success');
  } catch (error) {
    toast(error.message || 'PIN incorreto.', 'error');
  } finally {
    setBusy(button, false);
    $('#adminPin').value = '';
  }
}

async function adminLogout() {
  try {
    if (state.admin.token) await adminApi('logout');
  } catch {}
  clearAdminSession();
  showAdminLogin();
  toast('Sessão encerrada.');
}

async function loadAdminDashboard(electionId = null) {
  const data = await adminApi('dashboard', { election_id: electionId || state.admin.election?.id || null });
  applyAdminDashboard(data);
}

function applyAdminDashboard(data) {
  state.admin.elections = data.elections || [];
  state.admin.election = data.election || null;
  state.admin.positions = data.positions || [];
  state.admin.candidates = data.candidates || [];
  state.admin.voters = data.voters || [];
  state.admin.results = data.results || [];
  state.admin.participation = data.participation || [];
  state.admin.stats = data.stats || {};

  const select = $('#adminElectionSelect');
  if (select) {
    select.innerHTML = state.admin.elections.map(e => `<option value="${e.id}">${escapeHtml(e.title)} — ${escapeHtml(e.organization_name)}</option>`).join('');
    if (state.admin.election) select.value = state.admin.election.id;
  }

  updateAdminElectionUI();
  renderAdminStats();
  renderAdminResults();
  renderParticipation();
  renderCandidateAdmin();
  renderVoters($('#voterSearch')?.value || '');
  fillElectionForm();
}

function updateAdminElectionUI() {
  const election = state.admin.election;
  if (!election) return;
  const status = $('#adminElectionStatus');
  status.textContent = election.status === 'open' ? 'Aberta' : election.status === 'closed' ? 'Encerrada' : 'Rascunho';
  status.className = `status-pill ${election.status}`;
  const toggle = $('#toggleElectionBtn');
  toggle.textContent = election.status === 'open' ? 'Encerrar votação' : election.status === 'closed' ? 'Reabrir votação' : 'Abrir votação';
  toggle.className = election.status === 'open' ? 'btn btn-secondary' : 'btn btn-primary';
}

function renderAdminStats() {
  const s = state.admin.stats || {};
  $('#statVoters').textContent = s.voters ?? 0;
  $('#statStarted').textContent = s.started ?? 0;
  $('#statVotes').textContent = s.votes ?? 0;
  $('#statPositions').textContent = s.positions ?? 0;
  $('#statPercent').textContent = `${s.participation_percent ?? 0}% participação`;
}

async function toggleElectionStatus() {
  const election = state.admin.election;
  if (!election) return;
  const opening = election.status !== 'open';
  if (opening && (!state.admin.positions.length || !state.admin.candidates.length || !state.admin.voters.length)) {
    const ok = confirm('A lista ainda parece incompleta. Deseja abrir a votação mesmo assim?');
    if (!ok) return;
  }
  const button = $('#toggleElectionBtn');
  setBusy(button, true, 'A atualizar…');
  try {
    const result = await adminApi('toggleElection', { election_id: election.id });
    await loadAdminDashboard(election.id);
    toast(result.status === 'open' ? 'Votação aberta.' : 'Votação encerrada.', 'success');
    await loadPublicElection();
  } catch (error) {
    toast(error.message || 'Não foi possível alterar o estado da votação.', 'error');
  } finally {
    setBusy(button, false);
  }
}

function renderAdminResults() {
  const root = $('#adminResults');
  if (!state.admin.results.length) {
    root.innerHTML = '<div class="empty-state"><strong>Sem resultados ainda.</strong>Adicione vagas e candidatos para começar.</div>';
    return;
  }
  const grouped = new Map();
  state.admin.results.forEach(row => {
    if (!grouped.has(row.position_id)) grouped.set(row.position_id, { title: row.position_title, rows: [] });
    grouped.get(row.position_id).rows.push(row);
  });

  root.innerHTML = [...grouped.values()].map(group => {
    const total = Number(group.rows[0]?.position_total || 0);
    return `<article class="result-position">
      <h3>${escapeHtml(group.title)}</h3>
      ${group.rows.map(row => {
        const count = Number(row.vote_count || 0);
        const pct = total ? Math.round((count * 1000) / total) / 10 : 0;
        const avatar = row.photo_url ? `<img class="result-avatar" src="${escapeHtml(row.photo_url)}" alt="" />` : '<span class="result-avatar"></span>';
        return `<div class="result-row">
          <div class="result-person">${avatar}<strong>${escapeHtml(row.candidate_name)}</strong></div>
          <div class="result-bar" aria-label="${pct}%"><span style="width:${Math.min(100, pct)}%"></span></div>
          <div class="result-score">${count}<small>${pct}%</small></div>
        </div>`;
      }).join('')}
    </article>`;
  }).join('');
}

function renderParticipation() {
  const body = $('#participationTableBody');
  const positionsCount = state.admin.positions.length;
  if (!state.admin.participation.length) {
    body.innerHTML = '<tr><td colspan="4">Nenhum eleitor registado.</td></tr>';
    return;
  }
  body.innerHTML = state.admin.participation.map(v => {
    const count = Number(v.votes_cast || 0);
    const done = positionsCount > 0 && count >= positionsCount;
    const label = done ? `Concluído · ${count}/${positionsCount}` : count > 0 ? `Em curso · ${count}/${positionsCount || '—'}` : 'Ainda não votou';
    return `<tr>
      <td><strong>${escapeHtml(v.full_name)}</strong></td>
      <td>${escapeHtml(v.member_number || '—')}</td>
      <td>${escapeHtml(v.phone || '—')}</td>
      <td><span class="state-chip ${done ? 'done' : ''}">${label}</span></td>
    </tr>`;
  }).join('');
}

function renderCandidateAdmin() {
  const select = $('#candidatePosition');
  if (!state.admin.positions.length) {
    select.innerHTML = '<option value="">Crie uma vaga primeiro</option>';
    select.disabled = true;
  } else {
    select.disabled = false;
    select.innerHTML = state.admin.positions.map(p => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('');
  }

  const root = $('#adminCandidateList');
  if (!state.admin.candidates.length) {
    root.innerHTML = '<div class="empty-state"><strong>Nenhum candidato registado.</strong>Use o formulário acima para adicionar a primeira candidatura.</div>';
    return;
  }
  root.innerHTML = state.admin.candidates.map(c => {
    const position = state.admin.positions.find(p => p.id === c.position_id);
    const avatar = c.photo_url ? `<img src="${escapeHtml(c.photo_url)}" alt="" />` : `<span class="admin-candidate-avatar">${escapeHtml(c.name.charAt(0).toUpperCase())}</span>`;
    return `<div class="admin-candidate-row">
      ${avatar}
      <div><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(position?.title || 'Vaga')}</small></div>
      <button class="icon-btn delete-candidate" type="button" data-id="${c.id}">Remover</button>
    </div>`;
  }).join('');
  $$('.delete-candidate', root).forEach(btn => btn.addEventListener('click', () => deleteCandidate(btn.dataset.id)));
}

async function addPosition(title, description) {
  try {
    await adminApi('addPosition', {
      election_id: state.admin.election.id,
      title,
      description,
      display_order: state.admin.positions.length
    });
    toast('Vaga adicionada.', 'success');
    await loadAdminDashboard(state.admin.election.id);
    return true;
  } catch (error) {
    toast(error.message || 'Não foi possível guardar a vaga.', 'error');
    return false;
  }
}

async function imageFileToDataUrl(file) {
  if (!file?.size) return null;
  if (!file.type.startsWith('image/')) throw new Error('Selecione uma imagem válida.');
  if (file.size > 8 * 1024 * 1024) throw new Error('A foto deve ter no máximo 8 MB.');

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = objectUrl;
    });
    const max = 900;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function addCandidate({ positionId, name, manifesto, photoFile }) {
  try {
    const photoDataUrl = await imageFileToDataUrl(photoFile);
    await adminApi('addCandidate', {
      election_id: state.admin.election.id,
      position_id: positionId,
      name,
      manifesto,
      photo_data_url: photoDataUrl,
      display_order: state.admin.candidates.filter(c => c.position_id === positionId).length
    });
    toast('Candidato registado.', 'success');
    await loadAdminDashboard(state.admin.election.id);
    await loadPublicElection();
    return true;
  } catch (error) {
    toast(error.message || 'Não foi possível guardar o candidato.', 'error');
    return false;
  }
}

async function deleteCandidate(candidateId) {
  const candidate = state.admin.candidates.find(c => c.id === candidateId);
  if (!candidate || !confirm(`Remover a candidatura de ${candidate.name}?`)) return;
  try {
    await adminApi('deleteCandidate', { candidate_id: candidateId });
    toast('Candidato removido.');
    await loadAdminDashboard(state.admin.election.id);
    await loadPublicElection();
  } catch (error) {
    toast(error.message || 'Não é possível remover este candidato. Pode já existir voto registado.', 'error');
  }
}

async function addVoter({ fullName, memberNumber, phone }) {
  try {
    await adminApi('addVoter', {
      election_id: state.admin.election.id,
      full_name: fullName,
      member_number: memberNumber,
      phone
    });
    toast('Eleitor adicionado.', 'success');
    await loadAdminDashboard(state.admin.election.id);
    return true;
  } catch (error) {
    toast(error.message || 'Não foi possível adicionar o eleitor.', 'error');
    return false;
  }
}

async function bulkAddVoters(raw) {
  const rows = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const [fullName = '', memberNumber = '', phone = ''] = line.split(';').map(v => v.trim());
    return { full_name: fullName, member_number: memberNumber || '', phone: phone || '' };
  }).filter(row => row.full_name);

  if (!rows.length) {
    toast('Cole pelo menos um eleitor válido.', 'error');
    return false;
  }

  const existingMembers = new Set(state.admin.voters.map(v => textKey(v.member_number || '')).filter(Boolean));
  const existingPhones = new Set(state.admin.voters.map(v => phoneKey(v.phone || '')).filter(Boolean));
  const batchMembers = new Set();
  const batchPhones = new Set();
  let ignored = 0;

  const safeRows = rows.filter(row => {
    const member = textKey(row.member_number || '');
    const phone = phoneKey(row.phone || '');
    if ((member && (existingMembers.has(member) || batchMembers.has(member))) || (phone && (existingPhones.has(phone) || batchPhones.has(phone)))) {
      ignored += 1;
      return false;
    }
    if (member) batchMembers.add(member);
    if (phone) batchPhones.add(phone);
    return true;
  });

  if (!safeRows.length) {
    toast('Todos os registos já existem ou estão duplicados.', 'error');
    return false;
  }

  try {
    const result = await adminApi('bulkAddVoters', {
      election_id: state.admin.election.id,
      rows: safeRows
    });
    toast(`${result.count || safeRows.length} eleitor(es) importado(s)${ignored ? `; ${ignored} duplicado(s) ignorado(s)` : ''}.`, 'success', 5000);
    await loadAdminDashboard(state.admin.election.id);
    return true;
  } catch (error) {
    toast(error.message || 'A importação falhou. Verifique os dados da lista.', 'error');
    return false;
  }
}

function renderVoters(filter = '') {
  const needle = textKey(filter);
  const voters = state.admin.voters.filter(v => !needle || textKey(`${v.full_name} ${v.member_number || ''} ${v.phone || ''}`).includes(needle));
  $('#voterCountLabel').textContent = `${state.admin.voters.length} eleitor${state.admin.voters.length === 1 ? '' : 'es'}`;
  const body = $('#voterTableBody');
  if (!voters.length) {
    body.innerHTML = '<tr><td colspan="5">Nenhum eleitor encontrado.</td></tr>';
    return;
  }
  body.innerHTML = voters.map(v => `<tr>
    <td><strong>${escapeHtml(v.full_name)}</strong></td>
    <td>${escapeHtml(v.member_number || '—')}</td>
    <td>${escapeHtml(v.phone || '—')}</td>
    <td><span class="state-chip ${v.active ? 'done' : ''}">${v.active ? 'Autorizado' : 'Inativo'}</span></td>
    <td><button class="icon-btn delete-voter" type="button" data-id="${v.id}">Remover</button></td>
  </tr>`).join('');
  $$('.delete-voter', body).forEach(btn => btn.addEventListener('click', () => deleteVoter(btn.dataset.id)));
}

async function deleteVoter(voterId) {
  const voter = state.admin.voters.find(v => v.id === voterId);
  if (!voter || !confirm(`Remover ${voter.full_name} da lista autorizada?`)) return;
  try {
    await adminApi('deleteVoter', { voter_id: voterId });
    toast('Eleitor removido.');
    await loadAdminDashboard(state.admin.election.id);
  } catch (error) {
    toast(error.message || 'Não é possível remover este eleitor porque já existem votos associados.', 'error');
  }
}

function fillElectionForm() {
  const e = state.admin.election;
  if (!e) return;
  $('#electionTitle').value = e.title || '';
  $('#electionOrganization').value = e.organization_name || '';
  $('#electionOpensAt').value = toLocalInput(e.opens_at);
  $('#electionClosesAt').value = toLocalInput(e.closes_at);
}

async function saveElectionSettings() {
  const e = state.admin.election;
  if (!e) return false;
  try {
    await adminApi('saveElection', {
      election_id: e.id,
      title: $('#electionTitle').value.trim(),
      organization_name: $('#electionOrganization').value.trim(),
      opens_at: $('#electionOpensAt').value ? new Date($('#electionOpensAt').value).toISOString() : null,
      closes_at: $('#electionClosesAt').value ? new Date($('#electionClosesAt').value).toISOString() : null
    });
    toast('Dados da eleição guardados.', 'success');
    await loadAdminDashboard(e.id);
    await loadPublicElection();
    return true;
  } catch (error) {
    toast(error.message || 'Não foi possível guardar os dados da eleição.', 'error');
    return false;
  }
}

async function changeAdminPin(newPin, confirmPin) {
  if (!/^\d{6}$/.test(newPin)) {
    toast('O PIN deve ter exatamente 6 dígitos.', 'error');
    return false;
  }
  if (newPin !== confirmPin) {
    toast('Os dois PINs não coincidem.', 'error');
    return false;
  }
  try {
    const data = await adminApi('changePin', { new_pin: newPin });
    toast(data.message || 'PIN alterado com sucesso.', 'success');
    return true;
  } catch (error) {
    toast(error.message || 'Não foi possível alterar o PIN.', 'error');
    return false;
  }
}

function startLivePolling() {
  stopLivePolling();
  state.admin.liveTimer = setInterval(refreshLiveAdmin, 1500);
}

function stopLivePolling() {
  if (state.admin.liveTimer) {
    clearInterval(state.admin.liveTimer);
    state.admin.liveTimer = null;
  }
}

async function refreshLiveAdmin() {
  if (!state.admin.token || state.admin.liveBusy || location.hash !== '#admin' || $('#adminDashboard').classList.contains('hidden')) return;
  state.admin.liveBusy = true;
  try {
    const data = await adminApi('dashboard', { election_id: state.admin.election?.id || null });
    state.admin.results = data.results || [];
    state.admin.participation = data.participation || [];
    state.admin.stats = data.stats || {};
    if (data.election) {
      state.admin.election = data.election;
      updateAdminElectionUI();
    }
    renderAdminStats();
    renderAdminResults();
    renderParticipation();
  } catch (error) {
    if (error.status !== 401) console.error(error);
  } finally {
    state.admin.liveBusy = false;
  }
}

function setAdminView(view) {
  $$('.admin-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.adminView === view));
  $$('.admin-view').forEach(section => section.classList.add('hidden'));
  const section = $(`#adminView${view.charAt(0).toUpperCase()}${view.slice(1)}`);
  section?.classList.remove('hidden');
}

/* ------------------------- Eventos ------------------------- */

$('#adminEntryBtn').addEventListener('click', () => { location.hash = 'admin'; });
$('#backToPublicBtn').addEventListener('click', () => { location.hash = 'inicio'; });
$('#publicPreviewBtn').addEventListener('click', () => { location.hash = 'inicio'; });
window.addEventListener('hashchange', route);

$$('.verify-tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.verify-tab').forEach(item => item.classList.remove('active'));
  tab.classList.add('active');
  $('#identifierInput').placeholder = tab.dataset.placeholder;
  $('#identifierInput').focus();
}));

$('#verifyForm').addEventListener('submit', event => {
  event.preventDefault();
  const value = $('#identifierInput').value.trim();
  if (value) verifyVoter(value);
});
$('#changeVoterBtn').addEventListener('click', clearVoterSession);
$('#confirmVoteBtn').addEventListener('click', confirmVote);
$$('[data-close-dialog]').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog')?.close()));

$('#adminLoginForm').addEventListener('submit', event => {
  event.preventDefault();
  const pin = $('#adminPin').value.replace(/\D/g, '').slice(0, 6);
  if (pin.length === 6) adminLogin(pin);
  else toast('Informe um PIN de 6 dígitos.', 'error');
});
$('#adminPin').addEventListener('input', event => {
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
});
$('#adminLogoutBtn').addEventListener('click', adminLogout);
$('#toggleElectionBtn').addEventListener('click', toggleElectionStatus);
$('#adminElectionSelect').addEventListener('change', async event => {
  try {
    await loadAdminDashboard(event.target.value);
  } catch (error) {
    toast(error.message || 'Não foi possível mudar de eleição.', 'error');
  }
});

$$('.admin-tab').forEach(tab => tab.addEventListener('click', () => setAdminView(tab.dataset.adminView)));

$('#positionForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $('button[type="submit"]', form);
  setBusy(button, true, 'A guardar…');
  const ok = await addPosition($('#positionTitle').value.trim(), $('#positionDescription').value.trim());
  setBusy(button, false);
  if (ok) form.reset();
});

$('#candidateForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $('button[type="submit"]', form);
  setBusy(button, true, 'A guardar…');
  const ok = await addCandidate({
    positionId: $('#candidatePosition').value,
    name: $('#candidateName').value.trim(),
    manifesto: $('#candidateManifesto').value.trim(),
    photoFile: $('#candidatePhoto').files[0] || null
  });
  setBusy(button, false);
  if (ok) form.reset();
});

$('#voterForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $('button[type="submit"]', form);
  setBusy(button, true, 'A adicionar…');
  const ok = await addVoter({
    fullName: $('#voterName').value.trim(),
    memberNumber: $('#voterMember').value.trim(),
    phone: $('#voterPhone').value.trim()
  });
  setBusy(button, false);
  if (ok) form.reset();
});

$('#bulkVoterForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $('button[type="submit"]', form);
  setBusy(button, true, 'A importar…');
  const ok = await bulkAddVoters($('#bulkVoters').value);
  setBusy(button, false);
  if (ok) form.reset();
});

$('#voterSearch').addEventListener('input', event => renderVoters(event.target.value));

$('#electionForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('button[type="submit"]', event.currentTarget);
  setBusy(button, true, 'A guardar…');
  await saveElectionSettings();
  setBusy(button, false);
});

$('#changePinForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $('button[type="submit"]', form);
  setBusy(button, true, 'A alterar…');
  const ok = await changeAdminPin($('#newAdminPin').value, $('#confirmAdminPin').value);
  setBusy(button, false);
  if (ok) form.reset();
});
['#newAdminPin', '#confirmAdminPin'].forEach(selector => $(selector).addEventListener('input', event => {
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
}));

await loadPublicElection();
route();
