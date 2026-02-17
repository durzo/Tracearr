function resolveBasePath(): string {
  if (import.meta.env.DEV) {
    return import.meta.env.BASE_URL.replace(/\/+$/, '');
  }
  const baseEl = document.querySelector('base');
  if (baseEl) {
    return new URL(baseEl.href).pathname.replace(/\/+$/, '');
  }
  return '';
}

/** e.g. "/tracearr" or "" */
export const BASE_PATH = resolveBasePath();

/** e.g. "/tracearr/" or "/" */
export const BASE_URL = BASE_PATH ? `${BASE_PATH}/` : '/';
