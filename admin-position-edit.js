// Edição de vagas. O login administrativo é tratado apenas pelo app-core.js.
// Mantemos um único fluxo de autenticação para evitar dois handlers concorrentes.
await import('./admin-position-edit-core.js?v=20260826-1035');

// Segurança adicional: operações sensíveis exigem confirmação do PIN principal.
await import('./admin-sensitive-confirm.js?v=20260826-1035');

// Página pública: uma aba por vaga, mantendo apenas um voto por vaga.
await import('./public-position-tabs.js?v=20260826-1035');

// Relatório impresso com tabelas detalhadas.
await import('./print-report-table.js?v=20260826-1035');
