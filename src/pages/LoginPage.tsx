import { useState, type FormEvent } from "react";
import { TextField } from "../components/FormField";
import { Button } from "../components/Button";

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
        </div>
      </div>
    </div>
  );
}
