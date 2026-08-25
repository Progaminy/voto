// Edição de vagas. O login administrativo é tratado apenas pelo app-core.js.
// Mantemos um único fluxo de autenticação para evitar dois handlers concorrentes.
await import('./admin-position-edit-core.js?v=20260826-0001');
await import('./print-report-table.js?v=20260826-0140');
