/** Browser-side session + device helpers. No secrets ever touch these. */

const DEVICE_KEY = "aios.device.id";
const EXPIRY_KEY = "aios.session.expires_at";
const REMEMBER_KEY = "aios.session.remember";

/** 12 hours when "remember me" is off. */
const SHORT_SESSION_MS = 12 * 60 * 60 * 1000;

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function describeDevice(): { label: string; userAgent: string; platform: string } {
  if (typeof navigator === "undefined") return { label: "Server", userAgent: "", platform: "" };
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Browser";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  return { label: `${browser} on ${os}`, userAgent: ua.slice(0, 400), platform: os };
}

export function setRememberMe(remember: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  if (remember) localStorage.removeItem(EXPIRY_KEY);
  else localStorage.setItem(EXPIRY_KEY, String(Date.now() + SHORT_SESSION_MS));
}

export function isRemembered(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(REMEMBER_KEY) !== "0";
}

/** True when a non-remembered session has outlived its window. */
export function isSessionExpired(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(EXPIRY_KEY);
  if (!raw) return false;
  const expiresAt = Number(raw);
  return Number.isFinite(expiresAt) && Date.now() > expiresAt;
}

export function clearSessionMarkers() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(EXPIRY_KEY);
}
