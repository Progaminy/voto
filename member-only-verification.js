function applyVotingCodeVerificationUI() {
  const heroText = document.querySelector('.hero-copy > p');
  if (heroText) {
    heroText.textContent = 'Consulte os candidatos e os manifestos. Para votar, introduza o código de votação de 6 dígitos entregue pela Comissão Eleitoral.';
  }

  const heading = document.querySelector('.verify-card .section-heading.compact');
  if (heading) {
    const title = heading.querySelector('h2');
    const help = heading.querySelector('p');
    if (title) title.textContent = 'Confirme o seu código de votação';
    if (help) help.textContent = 'Introduza o código de 6 dígitos entregue pela Comissão Eleitoral ao membro autorizado.';
  }

  document.querySelector('.verify-tabs')?.remove();

  const form = document.getElementById('verifyForm');
  const input = document.getElementById('identifierInput');
  if (form && input) {
    const label = form.querySelector('label[for="identifierInput"]');
    if (label) label.textContent = 'Código de votação';
    input.type = 'password';
    input.placeholder = '••••••';
    input.autocomplete = 'one-time-code';
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('pattern', '[0-9]{6}');
    input.setAttribute('maxlength', '6');
    input.setAttribute('title', 'Introduza o código de votação de 6 dígitos');
  }

  const privacy = document.querySelector('.verify-card .privacy-note p');
  if (privacy) {
    privacy.textContent = 'O código de votação identifica apenas um membro autorizado e não concede acesso administrativo.';
  }
}

function votingCodeValid(value) {
  return /^[0-9]{6}$/.test(String(value || '').trim());
}

function votingCodeToast(message) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'toast error';
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

document.addEventListener('submit', event => {
  if (event.target?.id !== 'verifyForm') return;
  const input = document.getElementById('identifierInput');
  const value = input?.value?.trim() || '';
  if (votingCodeValid(value)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  votingCodeToast('Para votar, informe o código de votação de 6 dígitos entregue pela Comissão Eleitoral.');
  input?.focus();
}, true);

applyVotingCodeVerificationUI();
