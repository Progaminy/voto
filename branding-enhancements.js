// Modo estável.
// A personalização dinâmica anterior usava um MutationObserver global no body e podia
// entrar em ciclos de atualização com outros módulos da plataforma. O desenho base
// continua a ser fornecido por index.html e styles.css. Este ficheiro fica sem observer
// para garantir que a página pública e o painel administrativo permanecem responsivos.
