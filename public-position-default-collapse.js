// Mantém a informação detalhada de cada vaga recolhida por padrão.
// O observador é restrito aos filhos diretos de #positionsList.
const vacancyCollapseRoot = document.getElementById('positionsList');

if (vacancyCollapseRoot) {
  let collapseScheduled = false;

  function collapseVacancyInformation() {
    collapseScheduled = false;
    [...vacancyCollapseRoot.children]
      .filter(block => block.classList?.contains('position-block'))
      .forEach(block => {
        const button = block.querySelector('.vacancy-detail-toggle');
        if (!button || button.dataset.defaultCollapseApplied === '1') return;
        block.classList.add('vacancy-info-collapsed');
        button.textContent = 'Expandir informação da vaga';
        button.setAttribute('aria-expanded', 'false');
        button.dataset.defaultCollapseApplied = '1';
      });
  }

  function scheduleCollapse() {
    if (collapseScheduled) return;
    collapseScheduled = true;
    requestAnimationFrame(() => {
      collapseVacancyInformation();
      // public-position-tabs também finaliza a sua montagem em requestAnimationFrame.
      // Esta segunda passagem cobre a primeira renderização sem observar o body/subtree.
      setTimeout(collapseVacancyInformation, 0);
    });
  }

  const vacancyCollapseObserver = new MutationObserver(scheduleCollapse);
  vacancyCollapseObserver.observe(vacancyCollapseRoot, { childList: true });
  scheduleCollapse();
}
