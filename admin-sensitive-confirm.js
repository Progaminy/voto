const ADMIN_ACCESS_KEY = 'axinene_admin_access_level';
const previousFetch = window.fetch.bind(window);
const sensitiveActions = new Set(['toggleElection', 'deleteCandidate', 'deleteVoter', 'changePin']);

function deniedResponse(message) {
  return Promise.resolve(new Response(JSON.stringify({ ok: false, message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  }));
}

window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (!url.includes('/functions/v1/vote-admin') || typeof init.body !== 'string') {
    return previousFetch(input, init);
  }

  let payload;
  try { payload = JSON.parse(init.body); } catch { return previousFetch(input, init); }
  const action = String(payload?.action || '');

  if (!sensitiveActions.has(action) || payload.confirmation_pin) {
    return previousFetch(input, init);
  }

  if (sessionStorage.getItem(ADMIN_ACCESS_KEY) !== 'full') {
    return previousFetch(input, init);
  }

  const labels = {
    toggleElection: 'abrir ou encerrar a votação',
    deleteCandidate: 'apagar esta candidatura',
    deleteVoter: 'apagar este eleitor e os votos associados',
    changePin: 'alterar o PIN principal'
  };
  const entered = window.prompt(`Confirme o PIN principal para ${labels[action] || 'concluir esta operação'}:`);
  if (entered === null) return deniedResponse('Operação cancelada.');
  const pin = String(entered).replace(/\D/g, '').slice(0, 6);
  if (pin.length !== 6) return deniedResponse('O PIN de confirmação deve ter 6 dígitos.');

  payload.confirmation_pin = pin;
  return previousFetch(input, { ...init, body: JSON.stringify(payload) });
};
