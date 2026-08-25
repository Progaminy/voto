import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
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
    session: null,
    elections: [],
    election: null,
    positions: [],
    candidates: [],
    voters: [],
    results: [],
    participation: [],
    realtimeChannel: null,
    refreshTimer: null
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

async function ensureAdminState() {
  const { data: { session } } = await supabase.auth.getSession();
  state.admin.session = session;
  if (!session) {
    showAdminLogin();
    return;
  }
  const allowed = await isAdmin();
  if (!allowed) {
    await supabase.auth.signOut();
    state.admin.session = null;
    showAdminLogin();
    toast('Esta conta não possui permissão de administrador.', 'error');
    return;
  }
  showAdminDashboard();
  await loadAdminElections();
}

async function isAdmin() {
  const { data, error } = await supabase.rpc('is_vote_admin');
  if (error) {
    console.error(error);
    return false;
  }
  return data === true;
}

function showAdminLogin() {
  $('#adminLoginView').classList.remove('hidden');
  $('#adminDashboard').classList.add('hidden');
}

function showAdminDashboard() {
  $('#adminLoginView').classList.add('hidden');
  $('#adminDashboard').classList.remove('hidden');
}

async function adminLogin(email, password) {
  const button = $('#adminLoginBtn');
  setBusy(button, true, 'A entrar…');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  setBusy(button, false);
  if (error) {
    toast('E-mail ou palavra-passe incorretos.', 'error');
    return;
  }
  state.admin.session = data.session;
  if (!(await isAdmin())) {
    await supabase.auth.signOut();
    state.admin.session = null;
    toast('A conta existe, mas não é administrador desta plataforma.', 'error');
    return;
  }
  showAdminDashboard();
  await loadAdminElections();
  toast('Sessão administrativa iniciada.', 'success');
}

async function adminLogout() {
  stopRealtime();
  await supabase.auth.signOut();
  state.admin.session = null;
  showAdminLogin();
  toast('Sessão encerrada.');
}

async function loadAdminElections() {
  const { data, error } = await supabase
    .from('vote_elections')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    toast('Não foi possível carregar a eleição.', 'error');
    return;
  }
  state.admin.elections = data || [];
  const select = $('#adminElectionSelect');
  select.innerHTML = state.admin.elections.map(e => `<option value="${e.id}">${escapeHtml(e.title)} — ${escapeHtml(e.organization_name)}</option>`).join('');
  if (!state.admin.elections.length) {
    toast('Nenhuma eleição encontrada.', 'error');
    return;
  }
  const currentId = state.admin.election?.id;
  state.admin.election = state.admin.elections.find(e => e.id === currentId) || state.admin.elections[0];
  select.value = state.admin.election.id;
  await loadAdminElectionData();
}

async function loadAdminElectionData() {
  const election = state.admin.election;
  if (!election) return;
  updateAdminElectionUI();

  const [positionsRes, votersRes] = await Promise.all([
    supabase.from('vote_positions').select('*').eq('election_id', election.id).order('display_order').order('title'),
    supabase.from('vote_voters').select('*').eq('election_id', election.id).order('full_name')
  ]);

  if (positionsRes.error) console.error(positionsRes.error);
  if (votersRes.error) console.error(votersRes.error);
  state.admin.positions = positionsRes.data || [];
  state.admin.voters = votersRes.data || [];

  let candidates = [];
  if (state.admin.positions.length) {
    const { data, error } = await supabase
      .from('vote_candidates')
      .select('*')
      .in('position_id', state.admin.positions.map(p => p.id))
      .order('display_order').order('name');
    if (error) console.error(error);
    candidates = data || [];
  }
  state.admin.candidates = candidates;

  await Promise.all([loadAdminStats(), loadAdminResults(), loadAdminParticipation()]);
  renderCandidateAdmin();
  renderVoters();
  fillElectionForm();
  startRealtime();
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

async function toggleElectionStatus() {
  const election = state.admin.election;
  if (!election) return;
  const newStatus = election.status === 'open' ? 'closed' : 'open';
  if (newStatus === 'open' && (!state.admin.positions.length || !state.admin.candidates.length || !state.admin.voters.length)) {
    const ok = confirm('A lista ainda parece incompleta. Deseja abrir a votação mesmo assim?');
    if (!ok) return;
  }
  const button = $('#toggleElectionBtn');
  setBusy(button, true, 'A atualizar…');
  const patch = { status: newStatus, updated_at: new Date().toISOString() };
  if (newStatus === 'open' && !election.opens_at) patch.opens_at = new Date().toISOString();
  if (newStatus === 'closed') patch.closes_at = new Date().toISOString();
  const { data, error } = await supabase.from('vote_elections').update(patch).eq('id', election.id).select().single();
  setBusy(button, false);
  if (error) {
    console.error(error);
    toast('Não foi possível alterar o estado da votação.', 'error');
    return;
  }
  state.admin.election = data;
  const idx = state.admin.elections.findIndex(e => e.id === data.id);
  if (idx >= 0) state.admin.elections[idx] = data;
  updateAdminElectionUI();
  fillElectionForm();
  toast(newStatus === 'open' ? 'Votação aberta.' : 'Votação encerrada.', 'success');
  await loadPublicElection();
}

async function loadAdminStats() {
  if (!state.admin.election) return;
  const { data, error } = await supabase.rpc('vote_admin_stats', { p_election_id: state.admin.election.id });
  if (error) {
    console.error(error);
    return;
  }
  $('#statVoters').textContent = data?.voters ?? 0;
  $('#statStarted').textContent = data?.started ?? 0;
  $('#statVotes').textContent = data?.votes ?? 0;
  $('#statPositions').textContent = data?.positions ?? 0;
  $('#statPercent').textContent = `${data?.participation_percent ?? 0}% participação`;
}

async function loadAdminResults() {
  if (!state.admin.election) return;
  const { data, error } = await supabase.rpc('vote_admin_results', { p_election_id: state.admin.election.id });
  if (error) {
    console.error(error);
    return;
  }
  state.admin.results = data || [];
  renderAdminResults();
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
          <div class="result-bar" aria-label="${pct}%"><span style="width:${Math.min(100,pct)}%"></span></div>
          <div class="result-score">${count}<small>${pct}%</small></div>
        </div>`;
      }).join('')}
    </article>`;
  }).join('');
}

async function loadAdminParticipation() {
  if (!state.admin.election) return;
  const { data, error } = await supabase.rpc('vote_admin_voter_status', { p_election_id: state.admin.election.id });
  if (error) {
    console.error(error);
    return;
  }
  state.admin.participation = data || [];
  renderParticipation();
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
  const displayOrder = state.admin.positions.length;
  const { error } = await supabase.from('vote_positions').insert({
    election_id: state.admin.election.id,
    title,
    description: description || null,
    display_order: displayOrder
  });
  if (error) {
    console.error(error);
    toast('Não foi possível guardar a vaga.', 'error');
    return false;
  }
  toast('Vaga adicionada.', 'success');
  await loadAdminElectionData();
  return true;
}

async function addCandidate({ positionId, name, manifesto, photoFile }) {
  let photoUrl = null;
  if (photoFile?.size) {
    const extension = (photoFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${state.admin.election.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('voto-candidatos').upload(path, photoFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: photoFile.type || undefined
    });
    if (uploadError) {
      console.error(uploadError);
      toast('Não foi possível enviar a foto do candidato.', 'error');
      return false;
    }
    photoUrl = supabase.storage.from('voto-candidatos').getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from('vote_candidates').insert({
    position_id: positionId,
    name,
    manifesto,
    photo_url: photoUrl,
    display_order: state.admin.candidates.filter(c => c.position_id === positionId).length
  });
  if (error) {
    console.error(error);
    toast('Não foi possível guardar o candidato.', 'error');
    return false;
  }
  toast('Candidato registado.', 'success');
  await loadAdminElectionData();
  await loadPublicElection();
  return true;
}

async function deleteCandidate(candidateId) {
  const candidate = state.admin.candidates.find(c => c.id === candidateId);
  if (!candidate || !confirm(`Remover a candidatura de ${candidate.name}?`)) return;
  const { error } = await supabase.from('vote_candidates').delete().eq('id', candidateId);
  if (error) {
    console.error(error);
    toast('Não é possível remover este candidato. Pode já existir voto registado.', 'error');
    return;
  }
  toast('Candidato removido.');
  await loadAdminElectionData();
  await loadPublicElection();
}

async function addVoter({ fullName, memberNumber, phone }) {
  const { error } = await supabase.from('vote_voters').insert({
    election_id: state.admin.election.id,
    full_name: fullName,
    member_number: memberNumber || null,
    phone: phone || null
  });
  if (error) {
    console.error(error);
    toast('Não foi possível adicionar. Verifique se o número de membro ou telefone já existe.', 'error');
    return false;
  }
  toast('Eleitor adicionado.', 'success');
  await loadAdminElectionData();
  return true;
}

async function bulkAddVoters(raw) {
  const rows = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const [fullName = '', memberNumber = '', phone = ''] = line.split(';').map(v => v.trim());
    return { full_name: fullName, member_number: memberNumber || null, phone: phone || null };
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
  }).map(row => ({ ...row, election_id: state.admin.election.id }));

  if (!safeRows.length) {
    toast('Todos os registos já existem ou estão duplicados.', 'error');
    return false;
  }

  const { error } = await supabase.from('vote_voters').insert(safeRows);
  if (error) {
    console.error(error);
    toast('A importação falhou. Verifique os dados da lista.', 'error');
    return false;
  }
  toast(`${safeRows.length} eleitor(es) importado(s)${ignored ? `; ${ignored} duplicado(s) ignorado(s)` : ''}.`, 'success', 5000);
  await loadAdminElectionData();
  return true;
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
  const { error } = await supabase.from('vote_voters').delete().eq('id', voterId);
  if (error) {
    console.error(error);
    toast('Não é possível remover este eleitor porque já existem votos associados.', 'error');
    return;
  }
  toast('Eleitor removido.');
  await loadAdminElectionData();
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
  if (!e) return;
  const patch = {
    title: $('#electionTitle').value.trim(),
    organization_name: $('#electionOrganization').value.trim(),
    opens_at: $('#electionOpensAt').value ? new Date($('#electionOpensAt').value).toISOString() : null,
    closes_at: $('#electionClosesAt').value ? new Date($('#electionClosesAt').value).toISOString() : null,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase.from('vote_elections').update(patch).eq('id', e.id).select().single();
  if (error) {
    console.error(error);
    toast('Não foi possível guardar os dados da eleição.', 'error');
    return false;
  }
  state.admin.election = data;
  const index = state.admin.elections.findIndex(item => item.id === data.id);
  if (index >= 0) state.admin.elections[index] = data;
  $('#adminElectionSelect').selectedOptions[0].textContent = `${data.title} — ${data.organization_name}`;
  toast('Dados da eleição guardados.', 'success');
  await loadPublicElection();
  return true;
}

function startRealtime() {
  stopRealtime();
  const electionId = state.admin.election?.id;
  if (!electionId) return;
  state.admin.realtimeChannel = supabase
    .channel(`vote-admin-${electionId}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vote_tallies', filter: `election_id=eq.${electionId}` }, scheduleRealtimeRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vote_participation', filter: `election_id=eq.${electionId}` }, scheduleRealtimeRefresh)
    .subscribe();
}

function stopRealtime() {
  if (state.admin.realtimeChannel) {
    supabase.removeChannel(state.admin.realtimeChannel);
    state.admin.realtimeChannel = null;
  }
}

function scheduleRealtimeRefresh() {
  clearTimeout(state.admin.refreshTimer);
  state.admin.refreshTimer = setTimeout(async () => {
    await Promise.all([loadAdminStats(), loadAdminResults(), loadAdminParticipation()]);
  }, 220);
}

function setAdminView(view) {
  $$('.admin-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.adminView === view));
  $$('.admin-view').forEach(section => section.classList.add('hidden'));
  const section = $(`#adminView${view.charAt(0).toUpperCase()}${view.slice(1)}`);
  section?.classList.remove('hidden');
}

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
  adminLogin($('#adminEmail').value.trim(), $('#adminPassword').value);
});
$('#adminLogoutBtn').addEventListener('click', adminLogout);
$('#toggleElectionBtn').addEventListener('click', toggleElectionStatus);
$('#adminElectionSelect').addEventListener('change', async event => {
  state.admin.election = state.admin.elections.find(e => e.id === event.target.value) || null;
  await loadAdminElectionData();
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

supabase.auth.onAuthStateChange((_event, session) => {
  state.admin.session = session;
});

await loadPublicElection();
route();
