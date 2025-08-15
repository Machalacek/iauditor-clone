// frontend/src/lib/api.js
export const API_BASE = (process.env.REACT_APP_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

function errorMessageFrom(status, bodyText, statusText) {
  const text = (bodyText || "").trim() || statusText || "";
  if (text) return text;
  if (status >= 500) return "Server error";
  if (status === 404) return "Not found";
  if (status === 409) return "Conflict";
  if (status === 400) return "Bad request";
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  return "Request failed";
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    let bodyText = "";
    try { bodyText = await res.text(); } catch {}
    const msg = errorMessageFrom(res.status, bodyText, res.statusText);
    const err = new Error(msg);
    err.status = res.status;
    err.body = bodyText;
    throw err;
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

const get = (path) => request(path);
const del = (path) => request(path, { method: "DELETE" });
const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });
const put  = (path, body) => request(path, { method: "PUT",  body: JSON.stringify(body) });
const patch = (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) });

export const api = { request, get, post, put, patch, del };
