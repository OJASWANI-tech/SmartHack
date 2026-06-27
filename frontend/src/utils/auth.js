export function parseToken(token) {
  try {
    const base64  = token.split(".")[1];
    const decoded = JSON.parse(atob(base64));
    return decoded;
  } catch {
    return null;
  }
}

export function isTokenExpired(decoded) {
  if (!decoded?.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

export async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type":  "application/json",
      Authorization:   `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail:"Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}
