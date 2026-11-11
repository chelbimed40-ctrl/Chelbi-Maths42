import crypto from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const COOKIE_NAME = "sim_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function secret() {
  return process.env.SESSION_SECRET || "dev-secret-change-in-production";
}

export type Role = "teacher" | "student";
export interface AuthPayload {
  role: Role;
  id: number;
  exp: number;
}

/* ── password hashing (scrypt) ── */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(computed, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ── signed session cookie ── */
function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function encodeSession(p: AuthPayload): string {
  const body = Buffer.from(JSON.stringify(p), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSession(value: string | undefined): AuthPayload | null {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig || sign(body) !== sig) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthPayload;
    if (!p || (p.role !== "teacher" && p.role !== "student") || typeof p.id !== "number") return null;
    if (p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

export async function getAuth(): Promise<AuthPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(COOKIE_NAME)?.value);
}

export function setSessionCookie(res: NextResponse, p: Omit<AuthPayload, "exp">) {
  const token = encodeSession({ ...p, exp: Date.now() + MAX_AGE * 1000 });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}
