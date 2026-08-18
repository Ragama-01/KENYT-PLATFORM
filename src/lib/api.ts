// Base URL for the Kenyt backend API (Fastify service in /Kenyt_api).
//
// - Local dev: falls back to http://localhost:4000 when VITE_API_URL is unset.
// - Railway: set VITE_API_URL on the frontend service to your backend's
//   public URL, e.g. https://kenyt-api-production.up.railway.app
//   (Railway "Reference Variable" -> backend service's RAILWAY_PUBLIC_DOMAIN).
//   Vite inlines VITE_* env vars into the bundle at build time.
// Use || (not ??) so an empty string also falls back to the local dev URL.
const base = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Trailing-slash tolerant so both "https://host" and "https://host/" work.
export const API_BASE = base.replace(/\/$/, "");