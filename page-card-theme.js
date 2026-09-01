// A cor `surface_color` escolhida pelo administrador deve afetar também
// os cartões que no CSS base usam branco fixo. Apenas CSS, sem observers.
const style = document.createElement('style');
style.id = 'pageCardThemeStyles';
style.textContent = `
  .card,
  .notice-card,
  .vacancy-navigation,
  .position-block,
  .candidate-card {
    background-color: var(--theme-surface, var(--surface)) !important;
  }
  .position-head {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--theme-surface, #fff) 94%, var(--theme-primary, #0757b6)),
      color-mix(in srgb, var(--theme-surface, #fff) 94%, var(--theme-secondary, #0da84b))
    ) !important;
  }
  .manifesto-btn {
    background: var(--theme-surface, var(--surface)) !important;
  }
`;
document.head.appendChild(style);
