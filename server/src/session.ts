import type { Request, Response } from "express";
import * as cookie from "cookie";
import { sign, unsign } from "./crypto.js";
import { config } from "./config.js";

/* Opaque session id in a signed, httpOnly cookie. The id maps server-side to
   the encrypted refresh token (tokenStore). The browser never holds a token. */

const SESSION_COOKIE = "aco_sid";
const STATE_COOKIE = "aco_oauth_state";
const secure = config.allowedOrigin.startsWith("https");

export function setSession(res: Response, sid: string): void {
  res.append("Set-Cookie", cookie.serialize(SESSION_COOKIE, sign(sid), {
    httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 30,
  }));
}

export function readSession(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const signed = cookie.parse(header)[SESSION_COOKIE];
  return signed ? unsign(signed) : null;
}

export function clearSession(res: Response): void {
  res.append("Set-Cookie", cookie.serialize(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 }));
}

/** Short-lived signed cookie carrying the OAuth `state` for CSRF protection. */
export function setState(res: Response, state: string): void {
  res.append("Set-Cookie", cookie.serialize(STATE_COOKIE, sign(state), {
    httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 600,
  }));
}

export function takeState(req: Request, res: Response): string | null {
  const header = req.headers.cookie;
  res.append("Set-Cookie", cookie.serialize(STATE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 }));
  if (!header) return null;
  const signed = cookie.parse(header)[STATE_COOKIE];
  return signed ? unsign(signed) : null;
}
