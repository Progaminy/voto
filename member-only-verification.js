function applyMemberOnlyVerificationUI() {
  const heroText = document.querySelector('.hero-copy > p');
  if (heroText && heroText.textContent !== 'Consulte os candidatos e os manifestos. Para votar, confirme primeiro o seu número de membro AX registado na lista autorizada.') {
    heroText.textContent = 'Consulte os candidatos e os manifestos. Para votar, confirme primeiro o seu número de membro AX registado na lista autorizada.';
  }

  const heading = document.querySelector('.verify-card .section-heading.compact');
  if (heading) {
    const title = heading.querySelector('h2');
    const help = heading.querySelector('p');
    if (title && title.textContent !== 'Confirme o seu número de membro') title.textContent = 'Confirme o seu número de membro';
    if (help && help.textContent !== 'A votação só pode ser liberada com um número de membro AX válido e autorizado.') {
      help.textContent = 'A votação só pode ser liberada com um número de membro AX válido e autorizado.';
    }
  }

  document.querySelector('.verify-tabs')?.remove();

  const form = document.getElementById('verifyForm');
  const input = document.getElementById('identifierInput');
  if (form && input) {
    const label = form.querySelector('label[for="identifierInput"]');
    if (label && label.textContent !== 'N.º de membro') label.textContent = 'N.º de membro';
    input.placeholder = 'Ex.: AX-51';
    input.autocomplete = 'off';
    input.setAttribute('inputmode', 'text');
    input.setAttribute('pattern', '[Aa][Xx]-[0-9]+');
    input.setAttribute('title', 'Use o formato AX-51');
  }

  const privacy = document.querySelector('.verify-card .privacy-note p');
  if (privacy && privacy.textContent !== 'A lista de membros não é exibida publicamente. O número informado é usado apenas para confirmar o direito de voto.') {
    privacy.textContent = 'A lista de membros não é exibida publicamente. O número informado é usado apenas para confirmar o direito de voto.';
  }
}

function memberNumberValid(value) {
  return /^AX-\d+$/i.test(String(value || '').trim());
}

function memberOnlyToast(message) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'toast error';
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// Bloqueio no navegador. A mesma regra também é aplicada no banco de dados,
// portanto nome e telefone não conseguem criar uma sessão de votação.
document.addEventListener('submit', event => {
  if (event.target?.id !== 'verifyForm') return;
  const input = document.getElementById('identifierInput');
  const value = input?.value?.trim() || '';
  if (memberNumberValid(value)) {
    input.value = value.toUpperCase();
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  memberOnlyToast('Para votar, informe o seu número de membro no formato AX-51. Nome e telefone não são aceites.');
  input?.focus();
}, true);

// A interface é estática; aplicar uma vez evita um ciclo de MutationObserver
// que poderia manter o navegador ocupado indefinidamente.
applyMemberOnlyVerificationUI();
