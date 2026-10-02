import { getAccessToken } from "./auth";
import { clearAuth, getRefreshedAccessToken, setOnTokenRefreshed } from "./api";

// Refresh this long before actual expiry, so a ~5min token gets refreshed
// around the 4min mark instead of waiting for a request to hit a 401.
const REFRESH_BUFFER_MS = 60_000;

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function decodeExpiryMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json);
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function scheduleTokenRefresh(): void {
  clearScheduledTokenRefresh();

  const token = getAccessToken();
  if (!token) return;

  const expiresAt = decodeExpiryMs(token);
  if (!expiresAt) return;

  const delay = Math.max(expiresAt - Date.now() - REFRESH_BUFFER_MS, 0);

  refreshTimer = setTimeout(async () => {
    try {
      await getRefreshedAccessToken();
      // getRefreshedAccessToken's onTokenRefreshed callback already
      // reschedules against the new token, nothing more to do here.
    } catch {
      clearAuth();
      window.location.href = "/";
    }
  }, delay);
}

export function clearScheduledTokenRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

// Keeps the scheduler in sync with refreshes triggered elsewhere (e.g. a
// request hitting a 401 and refreshing reactively before the proactive
// timer fires) — reschedule against whatever token is now current.
setOnTokenRefreshed(scheduleTokenRefresh);
