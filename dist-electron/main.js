var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, ipcMain, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
function assertSafeErpnextPath(path2) {
  const raw = (path2 || "").trim();
  if (!raw) {
    throw new Error("path is required");
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) {
    throw new Error("Absolute URLs are not allowed in erpnextRequest path");
  }
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  if (normalized.includes("\\") || normalized.split("/").includes("..")) {
    throw new Error("Path traversal is not allowed in erpnextRequest path");
  }
  return normalized;
}
function normalizeBaseUrl(url) {
  return url.trim().replace(/\/$/, "");
}
function sanitizeClientHeaders(headers) {
  if (!headers) return void 0;
  const blocked = /* @__PURE__ */ new Set([
    "cookie",
    "authorization",
    "host",
    "origin",
    "referer",
    "x-frappe-csrf-token",
    "x-csrftoken"
  ]);
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    if (blocked.has(key.toLowerCase())) continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : void 0;
}
function parseSetCookies(headers) {
  const anyHeaders = headers;
  if (typeof anyHeaders.getSetCookie === "function") {
    return anyHeaders.getSetCookie();
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}
function mergeCookieHeader(existing, setCookies) {
  const map = /* @__PURE__ */ new Map();
  for (const part of existing.split(";").map((s) => s.trim()).filter(Boolean)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    map.set(part.slice(0, eq), part.slice(eq + 1));
  }
  for (const raw of setCookies) {
    const first = raw.split(";")[0] ?? "";
    const eq = first.indexOf("=");
    if (eq === -1) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    const lower = raw.toLowerCase();
    if (!name) continue;
    if (value === "" || lower.includes("max-age=0") || lower.includes("expires=thu, 01 jan 1970")) {
      map.delete(name);
    } else {
      map.set(name, value);
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function cookieValue(cookieHeader, name) {
  for (const part of cookieHeader.split(";").map((s) => s.trim())) {
    if (part.startsWith(`${name}=`)) return part.slice(name.length + 1);
  }
  return null;
}
async function siteFetch(baseUrl, path2, init = {}) {
  const { cookieHeader = "", csrfToken = "", ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("Accept", "application/json");
  if (cookieHeader) headers.set("Cookie", cookieHeader);
  if (csrfToken && rest.method && rest.method !== "GET") {
    headers.set("X-Frappe-CSRF-Token", csrfToken);
  }
  const res = await fetch(`${baseUrl}${path2}`, { ...rest, headers });
  const nextCookies = mergeCookieHeader(cookieHeader, parseSetCookies(res.headers));
  return { res, cookieHeader: nextCookies };
}
async function erpnextLogin(input) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  if (!baseUrl) return { ok: false, message: "Site URL is required" };
  if (!input.usr.trim() || !input.pwd) {
    return { ok: false, message: "Email and password are required" };
  }
  try {
    const { res, cookieHeader } = await siteFetch(baseUrl, "/api/method/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        usr: input.usr.trim(),
        pwd: input.pwd
      }).toString()
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof body.message === "string" ? body.message : body.message && typeof body.message === "object" ? body.message.message : `Login failed (HTTP ${res.status})`;
      return { ok: false, message: msg || `Login failed (HTTP ${res.status})` };
    }
    const messageText = typeof body.message === "string" ? body.message : body.message && typeof body.message === "object" ? body.message.message : "";
    if (messageText && /invalid|incorrect|fail/i.test(messageText)) {
      return { ok: false, message: messageText };
    }
    if (!cookieValue(cookieHeader, "sid") || cookieValue(cookieHeader, "sid") === "Guest") {
      return { ok: false, message: messageText || "Login failed — no session cookie" };
    }
    let cookies = cookieHeader;
    let csrfToken = cookieValue(cookies, "csrf_token") ?? "";
    if (!csrfToken) {
      const csrf = await siteFetch(baseUrl, "/api/method/frappe.sessions.get_csrf_token", {
        method: "GET",
        cookieHeader: cookies
      });
      cookies = csrf.cookieHeader;
      const csrfBody = await csrf.res.json().catch(() => ({}));
      if (typeof csrfBody.message === "string") csrfToken = csrfBody.message;
      csrfToken = csrfToken || cookieValue(cookies, "csrf_token") || "";
    }
    const me = await siteFetch(baseUrl, "/api/method/frappe.auth.get_logged_user", {
      method: "GET",
      cookieHeader: cookies,
      csrfToken
    });
    cookies = me.cookieHeader;
    const meBody = await me.res.json().catch(() => ({}));
    const user = typeof meBody.message === "string" ? meBody.message : input.usr.trim();
    if (!me.res.ok || !user || user === "Guest") {
      return { ok: false, message: "Logged in but could not resolve user session" };
    }
    return {
      ok: true,
      session: {
        baseUrl,
        user,
        fullName: body.full_name || user,
        cookieHeader: cookies,
        csrfToken
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return { ok: false, message };
  }
}
async function erpnextLogout(session) {
  try {
    await siteFetch(session.baseUrl, "/api/method/logout", {
      method: "POST",
      cookieHeader: session.cookieHeader,
      csrfToken: session.csrfToken,
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
  } catch {
  }
}
async function erpnextRequest(session, input) {
  const path2 = assertSafeErpnextPath(input.path);
  const safeHeaders = sanitizeClientHeaders(input.headers);
  const { res, cookieHeader } = await siteFetch(session.baseUrl, path2, {
    method: input.method ?? "GET",
    cookieHeader: session.cookieHeader,
    csrfToken: session.csrfToken,
    headers: safeHeaders,
    body: input.body ?? void 0
  });
  const bodyText = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    bodyText,
    session: { ...session, cookieHeader }
  };
}
class ErpnextSessionStore {
  constructor() {
    __publicField(this, "session", null);
  }
  get() {
    return this.session;
  }
  set(session) {
    this.session = session;
  }
  async login(input) {
    const result = await erpnextLogin(input);
    if (result.ok) this.session = result.session;
    else this.session = null;
    return result;
  }
  async logout() {
    if (!this.session) return;
    try {
      await erpnextLogout(this.session);
    } finally {
      this.session = null;
    }
  }
  async request(input) {
    if (!this.session) {
      return {
        ok: false,
        status: 401,
        bodyText: JSON.stringify({ message: "Not logged in" })
      };
    }
    const result = await erpnextRequest(this.session, input);
    this.session = result.session;
    return { ok: result.ok, status: result.status, bodyText: result.bodyText };
  }
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const erpnext = new ErpnextSessionStore();
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname$1, "../public");
let mainWindow = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "ZatGo Tracker",
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(process.env.DIST, "index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
ipcMain.handle("desktop:getAppVersion", () => app.getVersion());
ipcMain.handle("desktop:getPlatform", () => process.platform);
ipcMain.handle(
  "erpnext:login",
  async (_event, payload) => {
    const result = await erpnext.login(payload);
    if (!result.ok) return result;
    return {
      ok: true,
      user: result.session.user,
      fullName: result.session.fullName,
      baseUrl: result.session.baseUrl
    };
  }
);
ipcMain.handle("erpnext:logout", async () => {
  await erpnext.logout();
  return { ok: true };
});
ipcMain.handle("erpnext:getSession", () => {
  const s = erpnext.get();
  if (!s) return null;
  return { user: s.user, fullName: s.fullName, baseUrl: s.baseUrl };
});
ipcMain.handle(
  "erpnext:request",
  async (_event, payload) => erpnext.request(payload)
);
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
