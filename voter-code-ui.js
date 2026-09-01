function applyVotingCodeUI() {
  const verifyCard = document.querySelector('.verify-card');
  if (!verifyCard) return;
  const heading = verifyCard.querySelector('h2');
  const intro = verifyCard.querySelector('.section-heading p');
  const label = verifyCard.querySelector('label[for="identifierInput"]');
  const input = document.getElementById('identifierInput');
  const privacy = verifyCard.querySelector('.privacy-note p');
  if (heading) heading.textContent = 'Confirme o seu código de votação';
  if (intro) intro.textContent = 'Introduza o código de 6 dígitos entregue pela Comissão Eleitoral ao membro autorizado.';
  if (label) label.textContent = 'Código de votação';
  if (input) {
    input.type = 'password';
    input.inputMode = 'numeric';
    input.pattern = '[0-9]{6}';
    input.maxLength = 6;
    input.autocomplete = 'one-time-code';
    input.placeholder = '••••••';
    input.title = 'Introduza o código de votação de 6 dígitos';
  }
  if (privacy) privacy.textContent = 'O código de votação identifica apenas um membro autorizado e não concede acesso administrativo.';
}

applyVotingCodeUI();
setTimeout(applyVotingCodeUI, 250);
setTimeout(applyVotingCodeUI, 900);
window.addEventListener('hashchange', () => { if (location.hash !== '#admin') setTimeout(applyVotingCodeUI, 80); });
