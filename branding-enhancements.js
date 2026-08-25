import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const BRANDING_EDGE_URL = `${SUPABASE_URL}/functions/v1/vote-branding`;
const ADMIN_SESSION_KEY = 'axinene_admin_pin_session';
const ADMIN_ACCESS_KEY = 'axinene_admin_access_level';
const DEFAULT_SYMBOL = 'assets/axinene-eleitoral.jpg?v=3';

const DEFAULTS = {
  page_name: 'Comissão Eleitoral',
  hero_eyebrow: 'Votação interna segura',
  hero_title: 'O seu voto. A sua escolha.',
  hero_text: 'Consulte os candidatos e os manifestos. Para votar, confirme primeiro que o seu nome, número de membro ou telefone consta da lista autorizada.',
  badge_one: '1 voto por vaga',
  badge_two: 'Voto privado',
  badge_three: 'Confirmação imediata',
  verify_title: 'Confirme a sua identidade',
  candidates_title: 'Candidaturas',
  footer_text: 'Criado por Pensador Sem Fronteiras',
  primary_color: '#0757b6',
  secondary_color: '#0da84b',
  accent_color: '#0a78cf',
  background_color: '#f4f8fc',
  surface_color: '#ffffff',
  text_color: '#122033'
};

const supabaseBranding = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

let latestBranding = null;
let observerQueued = false;
let loadingForm = false;

const style = document.createElement('style');
style.textContent = `
  :root {
    --theme-primary: #0757b6;
    --theme-secondary: #0da84b;
    --theme-accent: #0a78cf;
    --theme-background: #f4f8fc;
    --theme-surface: #ffffff;
    --theme-text: #122033;
    --theme-hero-text: #ffffff;
  }
  body { background: var(--theme-background) !important; color: var(--theme-text) !important; }
  .site-header { background: var(--theme-surface) !important; }
  .site-footer { background: var(--theme-surface) !important; color: var(--theme-text) !important; }
  .hero {
    background:
      radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--theme-secondary) 28%, transparent), transparent 28%),
      linear-gradient(135deg, var(--blue-950) 0%, var(--theme-primary) 58%, var(--theme-accent) 100%) !important;
    color: var(--theme-hero-text) !important;
  }
  .hero p { color: color-mix(in srgb, var(--theme-hero-text) 84%, transparent) !important; }
  .hero .eyebrow { color: color-mix(in srgb, var(--theme-secondary) 35%, var(--theme-hero-text)) !important; }
  .card, .notice-card, .result-position { background-color: var(--theme-surface); }

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
  .position-description.is-expanded { display: block; max-height: 1000px; }
  .position-description-toggle {
    margin-top: 6px;
    border: 0;
    background: transparent;
    color: var(--blue-700);
    font-weight: 800;
    font-size: 12px;
    padding: 2px 0;
  }

  .public-settings-card, .symbol-settings-card { margin-top: 16px; width: 100% !important; }
  .public-settings-card h2, .symbol-settings-card h2 { margin-bottom: 6px; }
  .settings-intro { margin: 0 0 18px; color: var(--muted); font-size: 13px; }
  .public-settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
  .public-settings-grid .wide { grid-column: 1 / -1; }
  .public-settings-grid label, .color-setting label {
    display: grid; gap: 6px; color: var(--blue-950); font-size: 12px; font-weight: 800;
  }
  .color-settings {
    display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px;
    margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line);
  }
  .color-setting { display: grid; gap: 6px; }
  .color-setting input[type="color"] { height: 46px; padding: 4px; cursor: pointer; }
  .public-setting-actions { display: flex; gap: 9px; flex-wrap: wrap; margin-top: 18px; }
  .symbol-settings-grid { display: grid; grid-template-columns: 110px 1fr; gap: 16px; align-items: center; }
  .symbol-preview {
    width: 96px; height: 96px; border-radius: 50%; object-fit: cover;
    border: 3px solid #fff; box-shadow: 0 0 0 2px var(--blue-600), 0 8px 22px rgba(7,87,182,.16); background: white;
  }
  .symbol-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  .symbol-help { margin: 0 0 10px; color: var(--muted); font-size: 12px; }
  body.admin-readonly #symbolSettingsCard,
  body.admin-readonly #publicPageSettingsCard { display: none !important; }
  @media (max-width: 720px) {
    .public-settings-grid, .color-settings { grid-template-columns: 1fr; }
    .public-settings-grid .wide { grid-column: auto; }
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

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
  return [0,2,4].map(i => parseInt(clean.slice(i, i + 2), 16));
}
function rgbToHex(rgb) {
  return `#${rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}
function mixHex(a, b, weight = .5) {
  const ar = hexToRgb(a), br = hexToRgb(b);
  if (!ar || !br) return a;
  return rgbToHex(ar.map((v, i) => v * (1 - weight) + br[i] * weight));
}
function readableHeroText(primary, accent) {
  const values = [primary, accent].map(hexToRgb).filter(Boolean);
  if (!values.length) return '#ffffff';
  const avg = values.reduce((sum, rgb) => sum + (rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114), 0) / values.length;
  return avg > 175 ? '#122033' : '#ffffff';
}
function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el && typeof value === 'string' && el.textContent !== value) el.textContent = value;
}
function setMetaDescription(value) {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.appendChild(meta);
  }
  meta.content = value;
}
function setFavicon(url) {
  if (!url) return;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

function applyTheme(branding) {
  const primary = branding.primary_color || DEFAULTS.primary_color;
  const secondary = branding.secondary_color || DEFAULTS.secondary_color;
  const accent = branding.accent_color || DEFAULTS.accent_color;
  const background = branding.background_color || DEFAULTS.background_color;
  const surface = branding.surface_color || DEFAULTS.surface_color;
  const text = branding.text_color || DEFAULTS.text_color;
  const root = document.documentElement.style;

  root.setProperty('--theme-primary', primary);
  root.setProperty('--theme-secondary', secondary);
  root.setProperty('--theme-accent', accent);
  root.setProperty('--theme-background', background);
  root.setProperty('--theme-surface', surface);
  root.setProperty('--theme-text', text);
  root.setProperty('--theme-hero-text', readableHeroText(primary, accent));

  root.setProperty('--blue-950', mixHex(primary, '#000000', .45));
  root.setProperty('--blue-900', mixHex(primary, '#000000', .28));
  root.setProperty('--blue-700', primary);
  root.setProperty('--blue-600', accent);
  root.setProperty('--blue-100', mixHex(primary, '#ffffff', .90));
  root.setProperty('--green-700', mixHex(secondary, '#000000', .18));
  root.setProperty('--green-600', secondary);
  root.setProperty('--green-100', mixHex(secondary, '#ffffff', .90));
  root.setProperty('--ink', text);
  root.setProperty('--surface', surface);
  root.setProperty('--surface-soft', background);
  root.setProperty('--line', mixHex(text, surface, .82));
}

function applyBranding(branding) {
  if (!branding) return;
  latestBranding = { ...DEFAULTS, ...branding };
  const b = latestBranding;
  const pageName = b.page_name || DEFAULTS.page_name;
  const organization = b.organization_name || 'AXINENE';
  const symbol = b.symbol_url || DEFAULT_SYMBOL;

  setText('.brand-copy strong', pageName);
  setText('.brand-copy small', organization);
  document.querySelectorAll('.brand-mark img, .hero-logo').forEach(img => {
    if (img.getAttribute('src') !== symbol) img.src = symbol;
    img.alt = `${pageName} — ${organization}`;
  });

  setText('.hero .eyebrow', b.hero_eyebrow);
  setText('.hero h1', b.hero_title);
  setText('.hero-copy > p', b.hero_text);
  const badges = document.querySelectorAll('.hero-badges span');
  [b.badge_one, b.badge_two, b.badge_three].forEach((text, i) => {
    if (badges[i] && badges[i].textContent !== text) badges[i].textContent = text;
  });
  setText('.verify-card .section-heading h2', b.verify_title);
  setText('#ballotSection > .section-heading h2', b.candidates_title);
  setText('.site-footer span', b.footer_text);

  document.title = `${pageName} — ${organization}`;
  setMetaDescription(b.hero_text);
  setFavicon(symbol);
  applyTheme(b);
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
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Selecione uma imagem válida.'));
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
      'x-client-info': 'axinene-voto-branding/2.0'
    },
    cache: 'no-store',
    body: JSON.stringify({ action, token, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) throw new Error(data?.message || 'Não foi possível guardar a personalização.');
  return data;
}

function designFieldsFromForm() {
  const get = id => document.getElementById(id)?.value?.trim() || '';
  return {
    page_name: get('publicPageName'),
    hero_eyebrow: get('publicHeroEyebrow'),
    hero_title: get('publicHeroTitle'),
    hero_text: get('publicHeroText'),
    badge_one: get('publicBadgeOne'),
    badge_two: get('publicBadgeTwo'),
    badge_three: get('publicBadgeThree'),
    verify_title: get('publicVerifyTitle'),
    candidates_title: get('publicCandidatesTitle'),
    footer_text: get('publicFooterText'),
    primary_color: get('publicPrimaryColor'),
    secondary_color: get('publicSecondaryColor'),
    accent_color: get('publicAccentColor'),
    background_color: get('publicBackgroundColor'),
    surface_color: get('publicSurfaceColor'),
    text_color: get('publicTextColor')
  };
}

function populateDesignForm(branding) {
  if (!branding) return;
  const b = { ...DEFAULTS, ...branding };
  const map = {
    publicPageName: 'page_name', publicHeroEyebrow: 'hero_eyebrow', publicHeroTitle: 'hero_title', publicHeroText: 'hero_text',
    publicBadgeOne: 'badge_one', publicBadgeTwo: 'badge_two', publicBadgeThree: 'badge_three',
    publicVerifyTitle: 'verify_title', publicCandidatesTitle: 'candidates_title', publicFooterText: 'footer_text',
    publicPrimaryColor: 'primary_color', publicSecondaryColor: 'secondary_color', publicAccentColor: 'accent_color',
    publicBackgroundColor: 'background_color', publicSurfaceColor: 'surface_color', publicTextColor: 'text_color'
  };
  loadingForm = true;
  Object.entries(map).forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (input) input.value = b[key] || DEFAULTS[key] || '';
  });
  loadingForm = false;
}

async function refreshSelectedBranding() {
  const electionId = document.getElementById('adminElectionSelect')?.value || latestBranding?.election_id;
  const branding = await loadBrandingByElectionId(electionId);
  if (!branding) return;
  populateDesignForm(branding);
  const preview = document.getElementById('electionSymbolPreview');
  if (preview) preview.src = branding.symbol_url || DEFAULT_SYMBOL;
}

function ensurePublicPageSettings() {
  if (document.getElementById('publicPageSettingsCard')) return;
  const settingsView = document.getElementById('adminViewSettings');
  if (!settingsView) return;

  const card = document.createElement('div');
  card.id = 'publicPageSettingsCard';
  card.className = 'card form-card settings-card public-settings-card';
  card.innerHTML = `
    <h2>Personalizar página pública</h2>
    <p class="settings-intro">Controle o nome da página, textos principais, rodapé e toda a paleta visual. O título da eleição e a organização continuam no formulário acima.</p>
    <div class="public-settings-grid">
      <label>Nome da página
        <input id="publicPageName" type="text" maxlength="80" placeholder="Ex.: Comissão Eleitoral" />
      </label>
      <label>Chamada superior
        <input id="publicHeroEyebrow" type="text" maxlength="80" placeholder="Ex.: Votação interna segura" />
      </label>
      <label class="wide">Título principal
        <input id="publicHeroTitle" type="text" maxlength="140" />
      </label>
      <label class="wide">Texto principal
        <textarea id="publicHeroText" rows="4" maxlength="500"></textarea>
      </label>
      <label>Selo 1<input id="publicBadgeOne" type="text" maxlength="60" /></label>
      <label>Selo 2<input id="publicBadgeTwo" type="text" maxlength="60" /></label>
      <label>Selo 3<input id="publicBadgeThree" type="text" maxlength="60" /></label>
      <label>Título da identificação<input id="publicVerifyTitle" type="text" maxlength="100" /></label>
      <label>Título das candidaturas<input id="publicCandidatesTitle" type="text" maxlength="100" /></label>
      <label class="wide">Texto do rodapé<input id="publicFooterText" type="text" maxlength="120" /></label>
    </div>
    <div class="color-settings">
      <div class="color-setting"><label>Cor principal<input id="publicPrimaryColor" type="color" /></label></div>
      <div class="color-setting"><label>Cor secundária<input id="publicSecondaryColor" type="color" /></label></div>
      <div class="color-setting"><label>Cor de destaque<input id="publicAccentColor" type="color" /></label></div>
      <div class="color-setting"><label>Fundo da página<input id="publicBackgroundColor" type="color" /></label></div>
      <div class="color-setting"><label>Fundo dos cartões<input id="publicSurfaceColor" type="color" /></label></div>
      <div class="color-setting"><label>Cor do texto<input id="publicTextColor" type="color" /></label></div>
    </div>
    <div class="public-setting-actions">
      <button id="savePublicPageSettingsBtn" class="btn btn-primary" type="button">Guardar personalização</button>
      <button id="previewPublicPageSettingsBtn" class="btn btn-ghost" type="button">Pré-visualizar</button>
      <button id="resetPublicPageSettingsBtn" class="btn btn-ghost" type="button">Restaurar visual padrão</button>
    </div>`;

  const firstRow = settingsView.querySelector('.admin-two-col');
  if (firstRow) firstRow.insertAdjacentElement('afterend', card);
  else settingsView.appendChild(card);

  document.getElementById('previewPublicPageSettingsBtn')?.addEventListener('click', () => {
    if (loadingForm) return;
    applyBranding({ ...(latestBranding || {}), ...designFieldsFromForm() });
    toast('Pré-visualização aplicada. Guarde para tornar permanente.', 'info');
  });

  document.getElementById('savePublicPageSettingsBtn')?.addEventListener('click', async event => {
    if (sessionStorage.getItem(ADMIN_ACCESS_KEY) !== 'full') return toast('Apenas o acesso total pode alterar a página.', 'error');
    const electionId = document.getElementById('adminElectionSelect')?.value || latestBranding?.election_id;
    if (!electionId) return;
    const button = event.currentTarget;
    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'A guardar…';
    try {
      const result = await callBrandingApi('saveDesign', { election_id: electionId, ...designFieldsFromForm() });
      latestBranding = { ...(latestBranding || {}), ...(result.branding || {}) };
      applyBranding(latestBranding);
      populateDesignForm(latestBranding);
      toast('Página pública atualizada com sucesso.', 'success');
    } catch (error) {
      toast(error.message || 'Não foi possível guardar a página.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  });

  document.getElementById('resetPublicPageSettingsBtn')?.addEventListener('click', async event => {
    if (sessionStorage.getItem(ADMIN_ACCESS_KEY) !== 'full') return toast('Apenas o acesso total pode alterar a página.', 'error');
    if (!confirm('Restaurar os textos e cores padrão da página pública? O símbolo não será apagado.')) return;
    const electionId = document.getElementById('adminElectionSelect')?.value || latestBranding?.election_id;
    if (!electionId) return;
    const button = event.currentTarget;
    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'A restaurar…';
    try {
      const result = await callBrandingApi('resetDesign', { election_id: electionId });
      latestBranding = { ...(latestBranding || {}), ...(result.branding || {}) };
      applyBranding(latestBranding);
      populateDesignForm(latestBranding);
      toast('Visual padrão restaurado.', 'success');
    } catch (error) {
      toast(error.message || 'Não foi possível restaurar o visual.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  });

  if (latestBranding) populateDesignForm(latestBranding);
}

function ensureSymbolSettings() {
  if (document.getElementById('symbolSettingsCard')) return;
  const settingsView = document.getElementById('adminViewSettings');
  if (!settingsView) return;

  const card = document.createElement('div');
  card.id = 'symbolSettingsCard';
  card.className = 'card form-card settings-card symbol-settings-card';
  card.innerHTML = `
    <h2>Símbolo / logótipo</h2>
    <p class="symbol-help">Troque a imagem principal da página pública. Ela aparece no cabeçalho, no destaque principal e também como ícone da página no navegador.</p>
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

  const publicCard = document.getElementById('publicPageSettingsCard');
  if (publicCard) publicCard.insertAdjacentElement('afterend', card);
  else settingsView.appendChild(card);

  const fileInput = document.getElementById('electionSymbolFile');
  const preview = document.getElementById('electionSymbolPreview');
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try { preview.src = await imageFileToDataUrl(file); }
    catch (error) { toast(error.message || 'Imagem inválida.', 'error'); }
  });

  document.getElementById('saveElectionSymbolBtn')?.addEventListener('click', async event => {
    if (sessionStorage.getItem(ADMIN_ACCESS_KEY) !== 'full') return toast('Apenas o acesso total pode alterar o símbolo.', 'error');
    const file = fileInput?.files?.[0];
    if (!file) return toast('Selecione primeiro a nova imagem do símbolo.', 'error');
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
      latestBranding = { ...(latestBranding || {}), symbol_url: result.symbol_url };
      applyBranding(latestBranding);
      toast('Símbolo atualizado com sucesso.', 'success');
    } catch (error) {
      toast(error.message || 'Não foi possível atualizar o símbolo.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  });

  document.getElementById('clearElectionSymbolBtn')?.addEventListener('click', async event => {
    if (sessionStorage.getItem(ADMIN_ACCESS_KEY) !== 'full') return toast('Apenas o acesso total pode alterar o símbolo.', 'error');
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
      latestBranding = { ...(latestBranding || {}), symbol_url: null };
      applyBranding(latestBranding);
      toast('Símbolo padrão restaurado.', 'success');
    } catch (error) {
      toast(error.message || 'Não foi possível restaurar o símbolo.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  });
}

function applyReadonlyState() {
  const readonly = sessionStorage.getItem(ADMIN_ACCESS_KEY) === 'readonly';
  document.getElementById('symbolSettingsCard')?.classList.toggle('readonly-hidden', readonly);
  document.getElementById('publicPageSettingsCard')?.classList.toggle('readonly-hidden', readonly);
}

function refreshEnhancements() {
  enhancePositionDescriptions();
  ensurePublicPageSettings();
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
  if (event.target?.id === 'adminElectionSelect') refreshSelectedBranding();
});

document.addEventListener('submit', event => {
  if (event.target?.id === 'electionForm') {
    setTimeout(async () => {
      const selected = document.getElementById('adminElectionSelect')?.value;
      const branding = await loadBrandingByElectionId(selected);
      if (branding) {
        applyBranding(branding);
        populateDesignForm(branding);
      }
    }, 900);
  }
});

await loadLatestBranding();
refreshEnhancements();
