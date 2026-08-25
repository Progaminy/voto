import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const BRANDING_EDGE_URL = `${SUPABASE_URL}/functions/v1/vote-branding`;
const ADMIN_SESSION_KEY = 'axinene_admin_pin_session';
const ADMIN_ACCESS_KEY = 'axinene_admin_access_level';
const DEFAULT_SYMBOL = 'assets/axinene-eleitoral.jpg?v=3';

const supabaseBranding = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

let latestBranding = null;
let observerQueued = false;

const style = document.createElement('style');
style.textContent = `
  .position-description-wrap { min-width: 0; }
  .position-description {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 13px;
    white-space: pre-wrap;
    overflow: hidden;
    transition: max-height .22s ease;
  }
  .position-description.is-collapsed {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    max-height: 3.2em;
  }
  .position-description.is-expanded {
    display: block;
    max-height: 1000px;
  }
  .position-description-toggle {
    margin-top: 6px;
    border: 0;
    background: transparent;
    color: var(--blue-700);
    font-weight: 800;
    font-size: 12px;
    padding: 2px 0;
  }
  .symbol-settings-card { margin-top: 16px; }
  .symbol-settings-grid {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 16px;
    align-items: center;
  }
  .symbol-preview {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #fff;
    box-shadow: 0 0 0 2px var(--blue-600), 0 8px 22px rgba(7,87,182,.16);
    background: white;
  }
  .symbol-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  .symbol-help { margin: 0 0 10px; color: var(--muted); font-size: 12px; }
  body.admin-readonly #symbolSettingsCard { display: none !important; }
  @media (max-width: 640px) {
    .symbol-settings-grid { grid-template-columns: 1fr; }
    .symbol-preview { width: 82px; height: 82px; }
  }
`;
document.head.appendChild(style);

function toast(message, type = 'info') {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function applyBranding(branding) {
  if (!branding) return;
  latestBranding = branding;
  const title = branding.title || 'Comissão Eleitoral';
  const organization = branding.organization_name || 'AXINENE';
  const symbol = branding.symbol_url || DEFAULT_SYMBOL;

  const brandTitle = document.querySelector('.brand-copy strong');
  const brandOrg = document.querySelector('.brand-copy small');
  if (brandTitle) brandTitle.textContent = title;
  if (brandOrg) brandOrg.textContent = organization;

  document.querySelectorAll('.brand-mark img, .hero-logo').forEach(img => {
    img.src = symbol;
    img.alt = `${title} — ${organization}`;
  });

  const adminTitle = document.querySelector('.admin-topbar h1');
  if (adminTitle) adminTitle.textContent = title;
  document.title = `${title} — ${organization}`;
}

async function loadLatestBranding() {
  const { data, error } = await supabaseBranding.rpc('vote_public_branding');
  if (error) {
    console.warn('branding:', error.message);
    return null;
  }
  const branding = Array.isArray(data) ? data[0] : data;
  if (branding) applyBranding(branding);
  return branding || null;
}

async function loadBrandingByElectionId(electionId) {
  if (!electionId) return null;
  const { data, error } = await supabaseBranding.rpc('vote_public_branding_by_id', { p_election_id: electionId });
  if (error) return null;
  return Array.isArray(data) ? data[0] || null : data || null;
}

function enhancePositionDescriptions() {
  document.querySelectorAll('#positionsList .position-head').forEach(head => {
    if (head.dataset.descriptionEnhanced === '1') return;
    const holder = head.querySelector('div');
    const paragraph = holder?.querySelector('p');
    if (!holder || !paragraph) return;

    head.dataset.descriptionEnhanced = '1';
    holder.classList.add('position-description-wrap');
    paragraph.classList.add('position-description', 'is-collapsed');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'position-description-toggle';
    button.textContent = 'Ver descrição completa';
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      const expanded = paragraph.classList.toggle('is-expanded');
      paragraph.classList.toggle('is-collapsed', !expanded);
      button.textContent = expanded ? 'Encolher descrição' : 'Ver descrição completa';
      button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
    holder.appendChild(button);
  });
}

function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Selecione uma imagem válida.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida.'));
      img.onload = () => {
        const max = 1000;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

async function callBrandingApi(action, payload = {}) {
  const token = sessionStorage.getItem(ADMIN_SESSION_KEY) || '';
  const response = await fetch(BRANDING_EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_PUBLIC_KEY,
      'x-client-info': 'axinene-voto-branding/1.0'
    },
    cache: 'no-store',
    body: JSON.stringify({ action, token, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) throw new Error(data?.message || 'Não foi possível guardar o símbolo.');
  return data;
}

async function refreshAdminSymbolPreview() {
  const card = document.getElementById('symbolSettingsCard');
  if (!card) return;
  const electionId = document.getElementById('adminElectionSelect')?.value || latestBranding?.election_id;
  const branding = await loadBrandingByElectionId(electionId);
  const preview = document.getElementById('electionSymbolPreview');
  if (preview) preview.src = branding?.symbol_url || DEFAULT_SYMBOL;
}

function ensureSymbolSettings() {
  if (document.getElementById('symbolSettingsCard')) return;
  const settingsView = document.getElementById('adminViewSettings');
  if (!settingsView) return;

  const card = document.createElement('div');
  card.id = 'symbolSettingsCard';
  card.className = 'card form-card settings-card symbol-settings-card';
  card.innerHTML = `
    <h2>Identidade visual</h2>
    <p class="symbol-help">O título e a organização acima passam a aparecer na página pública. Aqui também pode trocar o símbolo/logótipo da eleição.</p>
    <div class="symbol-settings-grid">
      <img id="electionSymbolPreview" class="symbol-preview" src="${DEFAULT_SYMBOL}" alt="Símbolo atual" />
      <div>
        <label style="display:grid;gap:6px;font-size:12px;font-weight:800;color:var(--blue-950)">Nova imagem do símbolo
          <input id="electionSymbolFile" type="file" accept="image/png,image/jpeg,image/webp" />
        </label>
        <div class="symbol-actions">
          <button id="saveElectionSymbolBtn" class="btn btn-primary" type="button">Atualizar símbolo</button>
          <button id="clearElectionSymbolBtn" class="btn btn-ghost" type="button">Usar símbolo padrão</button>
        </div>
      </div>
    </div>`;

  settingsView.appendChild(card);

  const fileInput = document.getElementById('electionSymbolFile');
  const preview = document.getElementById('electionSymbolPreview');
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      preview.src = await imageFileToDataUrl(file);
    } catch (error) {
      toast(error.message || 'Imagem inválida.', 'error');
    }
  });

  document.getElementById('saveElectionSymbolBtn')?.addEventListener('click', async event => {
    if (sessionStorage.getItem(ADMIN_ACCESS_KEY) !== 'full') {
      toast('Apenas o acesso total pode alterar o símbolo.', 'error');
      return;
    }
    const file = fileInput?.files?.[0];
    if (!file) {
      toast('Selecione primeiro a nova imagem do símbolo.', 'error');
      return;
    }
    const electionId = document.getElementById('adminElectionSelect')?.value || latestBranding?.election_id;
    if (!electionId) return;
    const button = event.currentTarget;
    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'A guardar…';
    try {
      const imageDataUrl = await imageFileToDataUrl(file);
      const result = await callBrandingApi('saveSymbol', { election_id: electionId, image_data_url: imageDataUrl });
      preview.src = result.symbol_url;
      fileInput.value = '';
      toast('Símbolo atualizado com sucesso.', 'success');
      await loadLatestBranding();
    } catch (error) {
      toast(error.message || 'Não foi possível atualizar o símbolo.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  });

  document.getElementById('clearElectionSymbolBtn')?.addEventListener('click', async event => {
    if (sessionStorage.getItem(ADMIN_ACCESS_KEY) !== 'full') {
      toast('Apenas o acesso total pode alterar o símbolo.', 'error');
      return;
    }
    const electionId = document.getElementById('adminElectionSelect')?.value || latestBranding?.election_id;
    if (!electionId) return;
    const button = event.currentTarget;
    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'A restaurar…';
    try {
      await callBrandingApi('clearSymbol', { election_id: electionId });
      preview.src = DEFAULT_SYMBOL;
      if (fileInput) fileInput.value = '';
      toast('Símbolo padrão restaurado.', 'success');
      await loadLatestBranding();
    } catch (error) {
      toast(error.message || 'Não foi possível restaurar o símbolo.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  });

  refreshAdminSymbolPreview();
}

function applyReadonlyState() {
  const card = document.getElementById('symbolSettingsCard');
  if (card) card.classList.toggle('readonly-hidden', sessionStorage.getItem(ADMIN_ACCESS_KEY) === 'readonly');
}

function refreshEnhancements() {
  enhancePositionDescriptions();
  ensureSymbolSettings();
  applyReadonlyState();
}

const observer = new MutationObserver(() => {
  if (observerQueued) return;
  observerQueued = true;
  requestAnimationFrame(() => {
    observerQueued = false;
    refreshEnhancements();
  });
});
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener('change', event => {
  if (event.target?.id === 'adminElectionSelect') refreshAdminSymbolPreview();
});

document.addEventListener('submit', event => {
  if (event.target?.id === 'electionForm') {
    setTimeout(async () => {
      await loadLatestBranding();
      await refreshAdminSymbolPreview();
    }, 900);
  }
});

await loadLatestBranding();
refreshEnhancements();
