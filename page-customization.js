import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CUSTOM_SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const CUSTOM_SUPABASE_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const CUSTOM_EDGE_URL = `${CUSTOM_SUPABASE_URL}/functions/v1/vote-branding`;
const CUSTOM_ADMIN_SESSION_KEY = 'axinene_admin_pin_session';
const CUSTOM_ADMIN_ACCESS_KEY = 'axinene_admin_access_level';
const CUSTOM_DEFAULT_SYMBOL = 'assets/axinene-eleitoral.jpg?v=3';

const customDb = createClient(CUSTOM_SUPABASE_URL, CUSTOM_SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const DEFAULTS = {
  page_name: 'Comissão Eleitoral',
  organization_name: 'AXINENE',
  hero_eyebrow: 'Votação interna segura',
  hero_title: 'O seu voto. A sua escolha.',
  hero_text: 'Consulte os candidatos e os manifestos. Para votar, confirme primeiro o seu número de membro AX registado na lista autorizada.',
  badge_one: '1 voto por vaga',
  badge_two: 'Voto privado',
  badge_three: 'Confirmação imediata',
  verify_title: 'Confirme o seu número de membro',
  candidates_title: 'Candidaturas',
  footer_text: 'Criado por Pensador Sem Fronteiras',
  primary_color: '#0757b6',
  secondary_color: '#0da84b',
  accent_color: '#0a78cf',
  background_color: '#f4f8fc',
  surface_color: '#ffffff',
  text_color: '#122033'
};

let latestBranding = null;

function customToast(message, type = 'info', timeout = 4600) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
  return [0, 2, 4].map(i => parseInt(clean.slice(i, i + 2), 16));
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

function applyTheme(branding) {
  const b = { ...DEFAULTS, ...branding };
  const primary = b.primary_color;
  const secondary = b.secondary_color;
  const accent = b.accent_color;
  const background = b.background_color;
  const surface = b.surface_color;
  const text = b.text_color;
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

function applyBranding(branding) {
  if (!branding) return;
  latestBranding = { ...DEFAULTS, ...branding };
  const b = latestBranding;
  const symbol = b.symbol_url || CUSTOM_DEFAULT_SYMBOL;

  setText('.brand-copy strong', b.page_name);
  setText('.brand-copy small', b.organization_name || DEFAULTS.organization_name);
  document.querySelectorAll('.brand-mark img, .hero-logo').forEach(img => {
    if (img.getAttribute('src') !== symbol) img.src = symbol;
    img.alt = `${b.page_name} — ${b.organization_name || DEFAULTS.organization_name}`;
  });
  setText('.hero .eyebrow', b.hero_eyebrow);
  setText('.hero h1', b.hero_title);
  setText('.hero-copy > p', b.hero_text);

  const badges = document.querySelectorAll('.hero-badges span');
  [b.badge_one, b.badge_two, b.badge_three].forEach((text, index) => {
    if (badges[index] && badges[index].textContent !== text) badges[index].textContent = text;
  });

  setText('.verify-card .section-heading h2', b.verify_title);
  setText('#ballotSection > .section-heading h2', b.candidates_title);
  setText('.site-footer span', b.footer_text);
  document.title = `${b.page_name} — ${b.organization_name || DEFAULTS.organization_name}`;
  setFavicon(symbol);
  applyTheme(b);

  const preview = document.getElementById('customSymbolPreview');
  if (preview) preview.src = symbol;
}

async function loadPublicBranding() {
  const { data, error } = await customDb.rpc('vote_public_branding');
  if (error) {
    console.warn('page customization:', error.message);
    return null;
  }
  const branding = Array.isArray(data) ? data[0] : data;
  if (branding) applyBranding(branding);
  return branding || null;
}

async function loadBrandingForElection(electionId) {
  if (!electionId) return null;
  const { data, error } = await customDb.rpc('vote_public_branding_by_id', { p_election_id: electionId });
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data || null;
}

function currentElectionId() {
  return document.getElementById('adminElectionSelect')?.value || latestBranding?.election_id || '';
}

async function callCustomizationApi(action, payload = {}) {
  const token = sessionStorage.getItem(CUSTOM_ADMIN_SESSION_KEY) || '';
  const electionId = currentElectionId();
  if (!token) throw new Error('Sessão administrativa não encontrada.');
  if (!electionId) throw new Error('Selecione uma eleição.');

  const response = await fetch(CUSTOM_EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': CUSTOM_SUPABASE_KEY,
      'x-client-info': 'axinene-voto-customization/1.0'
    },
    cache: 'no-store',
    body: JSON.stringify({ action, token, election_id: electionId, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) throw new Error(data?.message || 'Não foi possível guardar a personalização.');
  return data;
}

function installCustomizationStyles() {
  if (document.getElementById('pageCustomizationStyles')) return;
  const style = document.createElement('style');
  style.id = 'pageCustomizationStyles';
  style.textContent = `
    :root {
      --theme-primary:#0757b6; --theme-secondary:#0da84b; --theme-accent:#0a78cf;
      --theme-background:#f4f8fc; --theme-surface:#fff; --theme-text:#122033; --theme-hero-text:#fff;
    }
    body { background: var(--theme-background) !important; color: var(--theme-text) !important; }
    .site-header, .site-footer { background: var(--theme-surface) !important; }
    .hero {
      background: radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--theme-secondary) 28%, transparent), transparent 28%),
                  linear-gradient(135deg, var(--blue-950) 0%, var(--theme-primary) 58%, var(--theme-accent) 100%) !important;
      color: var(--theme-hero-text) !important;
    }
    .hero p { color: color-mix(in srgb, var(--theme-hero-text) 84%, transparent) !important; }
    .page-customization-card { margin-bottom: 18px; }
    .page-customization-card h2 { margin-bottom: 5px; }
    .customization-intro { margin: 0 0 16px; color: var(--muted); font-size: 13px; }
    .customization-grid { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
    .customization-grid .wide { grid-column:1 / -1; }
    .customization-grid label, .custom-color label { display:grid; gap:6px; font-size:12px; font-weight:800; color:var(--ink); }
    .custom-color-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-top:16px; }
    .custom-color input[type="color"] { width:100%; min-height:46px; padding:4px; }
    .custom-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:18px; }
    .custom-symbol-box { display:grid; grid-template-columns:100px 1fr; gap:16px; align-items:center; margin-top:18px; padding-top:16px; border-top:1px solid var(--line); }
    .custom-symbol-preview { width:92px; height:92px; border-radius:50%; object-fit:cover; background:#fff; border:2px solid var(--line); }
    .custom-symbol-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:9px; }
    .custom-section-note { margin:8px 0 0; color:var(--muted); font-size:11px; }
    body.admin-readonly #pageCustomizationCard { display:none !important; }
    @media (max-width:720px) {
      .customization-grid, .custom-color-grid { grid-template-columns:1fr; }
      .customization-grid .wide { grid-column:auto; }
      .custom-symbol-box { grid-template-columns:1fr; }
    }
  `;
  document.head.appendChild(style);
}

function ensureCustomizationUI() {
  installCustomizationStyles();
  const settings = document.getElementById('adminViewSettings');
  if (!settings || document.getElementById('pageCustomizationCard')) return;

  const card = document.createElement('section');
  card.id = 'pageCustomizationCard';
  card.className = 'card page-customization-card';
  card.innerHTML = `
    <h2>Personalização da página pública</h2>
    <p class="customization-intro">Edite textos, rodapé, cores, cartões, símbolo e títulos visuais. O <strong>título da eleição</strong>, organização e datas continuam editáveis em “Dados da eleição” logo abaixo.</p>
    <form id="pageCustomizationForm">
      <div class="customization-grid">
        <label>Nome no cabeçalho<input id="customPageName" type="text" maxlength="80" /></label>
        <label>Linha pequena do destaque<input id="customHeroEyebrow" type="text" maxlength="80" /></label>
        <label class="wide">Título principal<input id="customHeroTitle" type="text" maxlength="140" /></label>
        <label class="wide">Texto principal<textarea id="customHeroText" rows="4" maxlength="500"></textarea></label>
        <label>Cartão informativo 1<input id="customBadgeOne" type="text" maxlength="60" /></label>
        <label>Cartão informativo 2<input id="customBadgeTwo" type="text" maxlength="60" /></label>
        <label>Cartão informativo 3<input id="customBadgeThree" type="text" maxlength="60" /></label>
        <label>Título da verificação<input id="customVerifyTitle" type="text" maxlength="100" /></label>
        <label>Título das candidaturas<input id="customCandidatesTitle" type="text" maxlength="100" /></label>
        <label class="wide">Rodapé<input id="customFooterText" type="text" maxlength="120" /></label>
      </div>
      <div class="custom-color-grid">
        <div class="custom-color"><label>Cor principal<input id="customPrimaryColor" type="color" /></label></div>
        <div class="custom-color"><label>Cor secundária<input id="customSecondaryColor" type="color" /></label></div>
        <div class="custom-color"><label>Cor de destaque<input id="customAccentColor" type="color" /></label></div>
        <div class="custom-color"><label>Fundo da página<input id="customBackgroundColor" type="color" /></label></div>
        <div class="custom-color"><label>Cor dos cartões<input id="customSurfaceColor" type="color" /></label></div>
        <div class="custom-color"><label>Cor dos textos<input id="customTextColor" type="color" /></label></div>
      </div>
      <div class="custom-actions">
        <button class="btn btn-primary" type="submit">Guardar personalização</button>
        <button id="resetPageCustomization" class="btn btn-ghost" type="button">Restaurar visual padrão</button>
      </div>
    </form>
    <div class="custom-symbol-box">
      <img id="customSymbolPreview" class="custom-symbol-preview" src="${CUSTOM_DEFAULT_SYMBOL}" alt="Símbolo atual" />
      <div>
        <strong>Símbolo / logótipo da página</strong>
        <p class="custom-section-note">A mesma imagem é usada no cabeçalho, destaque e ícone da página.</p>
        <input id="customSymbolFile" type="file" accept="image/png,image/jpeg,image/webp" />
        <div class="custom-symbol-actions">
          <button id="saveCustomSymbol" class="btn btn-secondary" type="button">Guardar símbolo</button>
          <button id="clearCustomSymbol" class="btn btn-ghost" type="button">Restaurar símbolo padrão</button>
        </div>
      </div>
    </div>`;
  settings.prepend(card);

  document.getElementById('pageCustomizationForm')?.addEventListener('submit', saveCustomization);
  document.getElementById('resetPageCustomization')?.addEventListener('click', resetCustomization);
  document.getElementById('saveCustomSymbol')?.addEventListener('click', saveSymbol);
  document.getElementById('clearCustomSymbol')?.addEventListener('click', clearSymbol);
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function fillCustomizationForm(branding) {
  const b = { ...DEFAULTS, ...branding };
  setValue('customPageName', b.page_name);
  setValue('customHeroEyebrow', b.hero_eyebrow);
  setValue('customHeroTitle', b.hero_title);
  setValue('customHeroText', b.hero_text);
  setValue('customBadgeOne', b.badge_one);
  setValue('customBadgeTwo', b.badge_two);
  setValue('customBadgeThree', b.badge_three);
  setValue('customVerifyTitle', b.verify_title);
  setValue('customCandidatesTitle', b.candidates_title);
  setValue('customFooterText', b.footer_text);
  setValue('customPrimaryColor', b.primary_color);
  setValue('customSecondaryColor', b.secondary_color);
  setValue('customAccentColor', b.accent_color);
  setValue('customBackgroundColor', b.background_color);
  setValue('customSurfaceColor', b.surface_color);
  setValue('customTextColor', b.text_color);
  const preview = document.getElementById('customSymbolPreview');
  if (preview) preview.src = b.symbol_url || CUSTOM_DEFAULT_SYMBOL;
}

function formPayload() {
  const value = id => document.getElementById(id)?.value?.trim() || '';
  return {
    page_name: value('customPageName'),
    hero_eyebrow: value('customHeroEyebrow'),
    hero_title: value('customHeroTitle'),
    hero_text: value('customHeroText'),
    badge_one: value('customBadgeOne'),
    badge_two: value('customBadgeTwo'),
    badge_three: value('customBadgeThree'),
    verify_title: value('customVerifyTitle'),
    candidates_title: value('customCandidatesTitle'),
    footer_text: value('customFooterText'),
    primary_color: value('customPrimaryColor'),
    secondary_color: value('customSecondaryColor'),
    accent_color: value('customAccentColor'),
    background_color: value('customBackgroundColor'),
    surface_color: value('customSurfaceColor'),
    text_color: value('customTextColor')
  };
}

async function saveCustomization(event) {
  event.preventDefault();
  if (sessionStorage.getItem(CUSTOM_ADMIN_ACCESS_KEY) !== 'full') return customToast('Este acesso é somente para visualização.', 'error');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const old = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'A guardar…'; }
  try {
    const data = await callCustomizationApi('saveDesign', formPayload());
    const branding = { ...(latestBranding || {}), ...(data.branding || {}) };
    applyBranding(branding);
    fillCustomizationForm(branding);
    customToast(data.message || 'Personalização guardada.', 'success');
  } catch (error) {
    customToast(error.message || 'Não foi possível guardar a personalização.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = old || 'Guardar personalização'; }
  }
}

async function resetCustomization() {
  if (sessionStorage.getItem(CUSTOM_ADMIN_ACCESS_KEY) !== 'full') return customToast('Este acesso é somente para visualização.', 'error');
  if (!confirm('Restaurar os textos e cores padrão da página? O título da eleição e os candidatos não serão alterados.')) return;
  try {
    const data = await callCustomizationApi('resetDesign');
    const branding = { ...(latestBranding || {}), ...(data.branding || {}) };
    applyBranding(branding);
    fillCustomizationForm(branding);
    customToast(data.message || 'Visual padrão restaurado.', 'success');
  } catch (error) {
    customToast(error.message || 'Não foi possível restaurar o visual.', 'error');
  }
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
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', .9));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

async function saveSymbol() {
  if (sessionStorage.getItem(CUSTOM_ADMIN_ACCESS_KEY) !== 'full') return customToast('Este acesso é somente para visualização.', 'error');
  const file = document.getElementById('customSymbolFile')?.files?.[0];
  if (!file) return customToast('Selecione uma imagem para o símbolo.', 'error');
  const button = document.getElementById('saveCustomSymbol');
  const old = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'A enviar…'; }
  try {
    const imageDataUrl = await imageFileToDataUrl(file);
    const data = await callCustomizationApi('saveSymbol', { image_data_url: imageDataUrl });
    latestBranding = { ...(latestBranding || DEFAULTS), symbol_url: data.symbol_url };
    applyBranding(latestBranding);
    document.getElementById('customSymbolFile').value = '';
    customToast(data.message || 'Símbolo atualizado.', 'success');
  } catch (error) {
    customToast(error.message || 'Não foi possível guardar o símbolo.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = old || 'Guardar símbolo'; }
  }
}

async function clearSymbol() {
  if (sessionStorage.getItem(CUSTOM_ADMIN_ACCESS_KEY) !== 'full') return customToast('Este acesso é somente para visualização.', 'error');
  try {
    const data = await callCustomizationApi('clearSymbol');
    latestBranding = { ...(latestBranding || DEFAULTS), symbol_url: null };
    applyBranding(latestBranding);
    customToast(data.message || 'Símbolo padrão restaurado.', 'success');
  } catch (error) {
    customToast(error.message || 'Não foi possível restaurar o símbolo.', 'error');
  }
}

async function refreshAdminCustomization() {
  ensureCustomizationUI();
  const electionId = currentElectionId();
  if (!electionId) return;
  try {
    const branding = await loadBrandingForElection(electionId);
    if (branding) {
      latestBranding = branding;
      fillCustomizationForm(branding);
    }
  } catch (error) {
    console.warn('admin customization:', error?.message || error);
  }
}

document.getElementById('adminElectionSelect')?.addEventListener('change', () => {
  setTimeout(refreshAdminCustomization, 0);
});

document.addEventListener('click', event => {
  if (event.target.closest?.('[data-admin-view="settings"]')) setTimeout(refreshAdminCustomization, 0);
}, true);

window.addEventListener('hashchange', () => {
  if (location.hash === '#admin') setTimeout(refreshAdminCustomization, 0);
  else setTimeout(loadPublicBranding, 0);
});

ensureCustomizationUI();
await loadPublicBranding();
if (location.hash === '#admin') await refreshAdminCustomization();
