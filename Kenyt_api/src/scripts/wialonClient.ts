import axios from "axios";

const WIALON_HOST = "https://hst-api.wialon.com";

// Captured from Control-Tech's own login request (DevTools -> Network ->
// oauth/authorize.html -> Payload). client_id/sign are tied to Control-Tech's
// app registration with Wialon, not your personal credentials. If login
// starts failing with "No redirect from oauth/authorize.html", re-capture a
// fresh `sign` value the same way and update it here.
const APP_CONFIG = {
  wialon_sdk_url: "https://hst-api.wialon.com",
  client_id: "ControlTech Limited",
  access_type: -1,
  activation_time: 0,
  duration: 2592000, // 30 days
  flags: 7,
  response_type: "hash",
  sign: "RIYJcGoF03PTqxbJhsTVH155e9mtHoHvmjLf+jeK88o=",
  redirect_uri: "https://track3.controltech-ea.com/post_message.html",
};

export interface WialonPosition {
  controlTechUnitId: number;
  name: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  headingDeg: number;
  satellites: number;
  reportedAt: Date;
}

async function getAccessHash(login: string, password: string): Promise<string> {
  const body = new URLSearchParams({
    ...Object.fromEntries(Object.entries(APP_CONFIG).map(([k, v]) => [k, String(v)])),
    login,
    passw: password,
    request_id: "1",
  });

  const response = await axios.post(`${WIALON_HOST}/oauth/authorize.html`, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    maxRedirects: 0,
    validateStatus: (status) => status === 301 || status === 302 || status === 200,
  });

  const location = response.headers.location as string | undefined;
  if (!location) {
    throw new Error("No redirect from oauth/authorize.html -- login likely failed (check credentials).");
  }

  const svcError = location.match(/svc_error=(\d+)/);
  if (svcError && svcError[1] !== "0") {
    throw new Error(`Wialon returned svc_error=${svcError[1]} -- login rejected.`);
  }

  const match = location.match(/access_hash=([^&]+)/);
  if (!match) {
    throw new Error(`Redirect did not contain access_hash. Location was: ${location}`);
  }

  return decodeURIComponent(match[1]);
}

async function getSessionId(accessHash: string): Promise<string> {
  const params = JSON.stringify({
    authHash: accessHash,
    appName: "web/track3.controltech-ea.com",
    siteName: "controltech_0",
    checkService: "",
  });

  const response = await axios.get(`${WIALON_HOST}/wialon/ajax.html`, {
    params: { svc: "core/use_auth_hash", params },
  });

  const data = response.data;
  if (!data || !data.eid) {
    throw new Error(`Unexpected use_auth_hash response: ${JSON.stringify(data)}`);
  }

  return data.eid as string;
}

export async function loginToWialon(loginName: string, password: string): Promise<string> {
  const accessHash = await getAccessHash(loginName, password);
  return getSessionId(accessHash);
}

/**
 * Fetches every unit's name + last known position in one call.
 * flags = 1 (name) + 1024 (last position) = 1025
 */
export async function fetchAllUnitPositions(sid: string): Promise<WialonPosition[]> {
  const params = JSON.stringify({
    spec: {
      itemsType: "avl_unit",
      propName: "sys_name",
      propValueMask: "*",
      sortType: "sys_name",
    },
    force: 1,
    flags: 1025,
    from: 0,
    to: 0,
  });

  const response = await axios.get(`${WIALON_HOST}/wialon/ajax.html`, {
    params: { svc: "core/search_items", params, sid },
  });

  const data = response.data;
  if (!data || !Array.isArray(data.items)) {
    throw new Error(`Unexpected search_items response: ${JSON.stringify(data)}`);
  }

  return data.items
    .filter((item: any) => item.pos)
    .map((item: any) => ({
      controlTechUnitId: item.id,
      name: item.nm,
      latitude: item.pos.y,
      longitude: item.pos.x,
      speedKmh: item.pos.s,
      headingDeg: item.pos.c,
      satellites: item.pos.sc,
      reportedAt: new Date(item.pos.t * 1000),
    }));
}