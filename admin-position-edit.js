// Compatibilidade para versões antigas do carregador principal.
// Mantém apenas módulos administrativos sem observers globais.
await import('./member-only-verification.js?v=20260901-2400');

if (location.hash === '#admin') {
  await import('./admin-position-edit-core.js?v=20260901-2400');
  await import('./admin-sensitive-confirm.js?v=20260901-2400');
  await import('./print-report-table.js?v=20260901-2400');
}
