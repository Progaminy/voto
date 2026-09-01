// Edição de vagas. O login administrativo é tratado apenas pelo app-core.js.
// Mantemos um único fluxo de autenticação para evitar dois handlers concorrentes.
await import('./admin-position-edit-core.js?v=20260826-1805');

// Segurança adicional: operações sensíveis exigem confirmação do PIN principal.
await import('./admin-sensitive-confirm.js?v=20260826-1805');

// Gestão de membros: numeração AX, duplicados, delegação/zona, edição e impressão.
await import('./member-management.js?v=20260901-2200');

// Página pública: uma aba por vaga, mantendo apenas um voto por vaga.
await import('./public-position-tabs.js?v=20260826-1805');

// Mesmo antes da abertura, visitantes podem consultar vagas, candidatos e manifestos.
await import('./public-candidate-catalog.js?v=20260826-1805');

// Relatório impresso com tabelas detalhadas.
await import('./print-report-table.js?v=20260826-1805');
