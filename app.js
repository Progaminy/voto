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

await import('./app-core.js?v=20260825-2105');
