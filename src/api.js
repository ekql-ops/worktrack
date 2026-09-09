// ─── API client ────────────────────────────────────────────────────────────
// Every call the UI makes to the backend goes through here, so token handling
// and error shape live in one place rather than in each component.

const BASE = (process.env.REACT_APP_API_URL || "https://worktrack-api.fly.dev")
  .replace(/\/$/, "");

const TOKEN_KEY = "worktrack.token";

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = t => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
};

/** Thrown for any non-2xx response, carrying the server's message. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // The API sleeps when idle and takes a few seconds to wake, so a network
    // failure here is as likely to be a cold start as a real outage.
    throw new ApiError("Could not reach the server. It may be waking up — try again.", 0);
  }

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request("/api/auth/login", { method: "POST", body: { username, password }, auth: false }),

  me: () => request("/api/auth/me"),

  shifts: () => request("/api/shifts"),

  currentSession: () => request("/api/sessions/current"),
  clockIn:  () => request("/api/sessions/clock-in",  { method: "POST" }),
  clockOut: () => request("/api/sessions/clock-out", { method: "POST" }),
  history:  () => request("/api/sessions/history"),

  adminLive: () => request("/api/admin/sessions/live"),
  adminAll:  () => request("/api/admin/sessions"),
  adminForceOut: id => request(`/api/admin/sessions/${id}/force-clock-out`, { method: "POST" }),
};

export { BASE as API_BASE };
