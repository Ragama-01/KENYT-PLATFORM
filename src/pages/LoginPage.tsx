import { useState, type FormEvent } from "react";
import { TextField } from "../components/FormField";
import { Button } from "../components/Button";
import { API_BASE } from "../lib/api";

interface LoginPageProps {
  onSubmit: (email: string, password: string) => void | Promise<void>;
  companyName?: string;
}

// Signature element: the panel divide reads as a torn manifest stub —
// a dashed "perforation" line with a gold route-dot trail above it,
// echoing the waybill this system exists to move.
export default function LoginPage({ onSubmit, companyName = "Kenyt International" }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(email, password);
    } catch {
      setError("Email or password is incorrect.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full font-body">
      {/* Left panel — identity */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-navy-950 px-12 py-14 text-paper lg:flex">
        <div className="absolute inset-0 bg-route-line opacity-[0.08]" aria-hidden="true" />

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gold-500 font-display text-lg font-bold text-navy-950">
              K
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">{companyName}</span>
          </div>
        </div>

        <div className="relative">
          <p className="font-display text-3xl font-medium leading-snug text-paper">
            Every load,
            <br />
            every truck,
            <br />
            <span className="text-gold-400">tracked to the door.</span>
          </p>
          <p className="mt-4 max-w-xs text-sm text-navy-400">
            Fleet, driver, and consignment records — one manifest, always current.
          </p>
        </div>

        <div className="relative flex items-center gap-3 text-xs text-navy-400">
          <span className="font-mono">© {new Date().getFullYear()}</span>
          <span className="h-1 w-1 rounded-full bg-navy-600" />
          <span>Operations Platform</span>
        </div>
      </div>

      {/* Perforation seam between panels */}
      <div
        className="relative hidden w-0 border-l-2 border-dashed border-gold-500/40 lg:block"
        aria-hidden="true"
      >
        <span className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-paper" />
        <span className="absolute -left-1.5 bottom-0 h-3 w-3 rounded-full bg-paper" />
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-950 font-display text-lg font-bold text-gold-400">
              K
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">Access your operations dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <TextField
              id="email"
              label="Email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@kenyt.co.ke"
            />
            <TextField
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {error && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="mt-2 w-full">
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-ink/10" />
            <span className="text-xs text-ink-muted">or</span>
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          <a
            href={`${API_BASE}/auth/google`}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-md border border-ink/15 bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6" />
              <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.2 0-5.8-2.1-6.8-5l-.14.01-3.6 2.8-.05.13C3.4 21.3 7.4 24 12 24" />
              <path fill="#FBBC05" d="M5.2 14.4c-.25-.7-.4-1.5-.4-2.4s.14-1.6.4-2.4l-.01-.16-3.66-2.84-.12.06C.5 8.2 0 10 0 12s.5 3.8 1.4 5.3l3.8-2.9" />
              <path fill="#EA4335" d="M12 4.6c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.7l3.8 2.9c1-2.9 3.6-5 6.8-5" />
            </svg>
            Sign in with Google
          </a>
        </div>
      </div>
    </div>
  );
}
