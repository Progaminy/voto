const SUPABASE_PUBLIC_KEY = 'sb_publishable_BTEfqQcnOfeZiVXjS1q3DQ_EFWeyMRj';
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (url.includes('/functions/v1/vote-admin')) {
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('apikey', SUPABASE_PUBLIC_KEY);
    headers.set('x-client-info', 'axinene-voto/1.1');
    return originalFetch(input, { ...init, headers });
  }
  return originalFetch(input, init);
};

const footerFix = document.createElement('style');
footerFix.textContent = `
  body {
    padding-bottom: calc(58px + env(safe-area-inset-bottom, 0px));
  }
  .site-footer {
    position: fixed !important;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    z-index: 80;
    min-height: 58px;
    background: rgba(255,255,255,.97);
    backdrop-filter: blur(12px);
    box-shadow: 0 -6px 24px rgba(6,46,99,.08);
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }
`;
document.head.appendChild(footerFix);

await import('./app-core.js?v=20260825-2105');
await import('./admin-position-edit.js?v=20260825-2238');