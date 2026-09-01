const COPY_CODE_SUPABASE_URL = 'https://uvypcuixxrjikjaduvyo.supabase.co';
const COPY_CODE_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const COPY_CODE_URL = `${COPY_CODE_SUPABASE_URL}/functions/v1/vote-view-code-admin`;
const COPY_CODE_SESSION_KEY = 'axinene_admin_pin_session';
const COPY_CODE_LEVEL_KEY = 'axinene_admin_access_level';

function copyCodeIsAbsolute() {
  return sessionStorage.getItem(COPY_CODE_LEVEL_KEY) === 'full';
}
function copyCodeElectionId() {
  return document.getElementById('adminElectionSelect')?.value || '';
}
function copyCodeToast(message, type = 'info', timeout = 4800) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}
async function copyCodeApi(action, payload = {}) {
  const token = sessionStorage.getItem(COPY_CODE_SESSION_KEY) || '';
  if (!token) throw Object.assign(new Error('Sessão administrativa não encontrada.'), { status: 401 });
  const response = await fetch(COPY_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: COPY_CODE_KEY, 'x-client-info': 'axinene-voto-code-copy/1.0' },
    cache: 'no-store',
    body: JSON.stringify({ action, token, election_id: copyCodeElectionId(), ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    const error = new Error(data?.message || 'Não foi possível concluir a operação.');
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

function ensureCopyCodeDialog() {
  let dialog = document.getElementById('copyCodeDialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'copyCodeDialog';
  dialog.style.cssText = 'width:min(440px,calc(100vw - 26px));border:0;border-radius:18px;padding:0;box-shadow:0 24px 70px rgba(0,0,0,.24)';
  dialog.innerHTML = `<div style="padding:24px"><h2 style="margin:0 0 5px">Código de acesso</h2><p id="copyCodeMember" style="color:var(--muted)">Membro</p><code id="copyCodeValue" style="display:block;margin:18px 0;padding:14px;border:1px solid #bfe3ca;border-radius:12px;background:#f3fff7;font-size:28px;font-weight:900;text-align:center;letter-spacing:.16em">——</code><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button id="copyCodeNowBtn" class="btn btn-primary" type="button">Copiar código</button><button id="copyCodeCloseBtn" class="btn btn-ghost" type="button">Fechar</button></div></div>`;
  document.body.appendChild(dialog);
  document.getElementById('copyCodeCloseBtn')?.addEventListener('click', () => dialog.close());
  document.getElementById('copyCodeNowBtn')?.addEventListener('click', async () => {
    const code = document.getElementById('copyCodeValue')?.textContent?.trim() || '';
    if (!/^\d{6}$/.test(code)) return;
    try {
      await navigator.clipboard.writeText(code);
      copyCodeToast('Código copiado.', 'success');
    } catch {
      copyCodeToast('Não foi possível copiar automaticamente. Selecione o código e copie manualmente.', 'error');
    }
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  return dialog;
}
function showCopyCode(code, label = 'Código de acesso') {
  const dialog = ensureCopyCodeDialog();
  const codeEl = document.getElementById('copyCodeValue');
  const memberEl = document.getElementById('copyCodeMember');
  if (codeEl) codeEl.textContent = code || '——';
  if (memberEl) memberEl.textContent = label;
  dialog.showModal();
}
async function copyToClipboard(code) {
  try {
    await navigator.clipboard.writeText(code);
    copyCodeToast('Código copiado.', 'success');
  } catch {
    showCopyCode(code, 'Copie o código manualmente');
  }
}

async function generateSecureViewCode(voterId, button = null) {
  if (!copyCodeIsAbsolute()) return copyCodeToast('Apenas Administradores Absolutos podem gerar códigos.', 'error');
  if (!voterId) return copyCodeToast('Selecione um membro.', 'error');
  const old = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'Gerando…'; }
  try {
    const data = await copyCodeApi('generate', { voter_id: voterId });
    const label = `${data.credential?.member_number || ''}${data.credential?.member_number ? ' — ' : ''}${data.credential?.member_name || 'Membro'}`;
    showCopyCode(data.code, label);
    copyCodeToast(data.message || 'Código gerado.', 'success');
    if (!document.getElementById('adminViewSettings')?.classList.contains('hidden')) {
      setTimeout(() => document.querySelector('[data-admin-view="settings"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })), 80);
      setTimeout(addCopyButtonsToCodeList, 700);
    }
  } catch (error) {
    copyCodeToast(error.message || 'Não foi possível gerar o código.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = old || 'Gerar código'; }
  }
}

async function revealAndCopyCode(codeId, button = null) {
  if (!copyCodeIsAbsolute()) return;
  const old = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'A obter…'; }
  try {
    const data = await copyCodeApi('reveal', { code_id: codeId });
    await copyToClipboard(data.code);
  } catch (error) {
    if (error.payload?.legacy) {
      const ok = window.confirm('Este código foi criado antes da função de cópia permanente e não pode ser recuperado. Deseja gerar um novo código para este mesmo membro? O código antigo deixará de funcionar.');
      if (!ok) return;
      try {
        const data = await copyCodeApi('regenerate', { code_id: codeId });
        showCopyCode(data.code, `${data.credential?.member_number || ''}${data.credential?.member_number ? ' — ' : ''}${data.credential?.member_name || 'Membro'}`);
        copyCodeToast(data.message || 'Novo código gerado.', 'success', 6000);
        setTimeout(() => document.querySelector('[data-admin-view="settings"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })), 80);
        setTimeout(addCopyButtonsToCodeList, 700);
      } catch (regenError) {
        copyCodeToast(regenError.message || 'Não foi possível regenerar o código.', 'error');
      }
    } else {
      copyCodeToast(error.message || 'Não foi possível copiar o código.', 'error');
    }
  } finally {
    if (button) { button.disabled = false; button.textContent = old || 'Copiar'; }
  }
}

function addCopyButtonsToCodeList() {
  if (!copyCodeIsAbsolute()) return;
  const body = document.getElementById('accessCodesTableBody');
  if (!body) return;
  body.querySelectorAll('[data-access-toggle]').forEach(toggle => {
    const id = toggle.dataset.accessToggle;
    const actions = toggle.closest('.access-code-actions');
    if (!id || !actions || actions.querySelector(`[data-access-copy="${CSS.escape(id)}"]`)) return;
    const button = document.createElement('button');
    button.className = 'access-block-btn';
    button.type = 'button';
    button.textContent = 'Copiar';
    button.dataset.accessCopy = id;
    button.addEventListener('click', event => {
      event.preventDefault();
      revealAndCopyCode(id, button);
    });
    actions.prepend(button);
  });
}

// Substitui apenas a geração por uma versão que permite cópia posterior pelo
// Administrador Absoluto. A captura ocorre antes dos handlers antigos.
document.addEventListener('click', event => {
  const settingsGenerate = event.target.closest?.('#generateViewCodeBtn');
  if (settingsGenerate) {
    event.preventDefault();
    event.stopImmediatePropagation();
    generateSecureViewCode(document.getElementById('accessCodeMemberSelect')?.value || '', settingsGenerate);
    return;
  }
  const memberGenerate = event.target.closest?.('[data-member-view-code]');
  if (memberGenerate) {
    event.preventDefault();
    event.stopImmediatePropagation();
    generateSecureViewCode(memberGenerate.dataset.memberViewCode || '', memberGenerate);
    return;
  }
  if (event.target.closest?.('[data-admin-view="settings"]')) {
    setTimeout(addCopyButtonsToCodeList, 650);
    setTimeout(addCopyButtonsToCodeList, 1200);
  }
  if (event.target.closest?.('[data-access-toggle], [data-access-delete]')) {
    setTimeout(addCopyButtonsToCodeList, 900);
  }
}, true);

ensureCopyCodeDialog();
setTimeout(addCopyButtonsToCodeList, 900);
