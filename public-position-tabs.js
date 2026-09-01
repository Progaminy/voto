// Modo estável: as vagas são apresentadas diretamente pelo app-core.js.
// O antigo sistema de abas observava continuamente #positionsList e podia participar
// em ciclos de renderização. Mantemos a listagem normal, sem MutationObserver.
