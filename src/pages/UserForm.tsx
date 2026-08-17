import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { TextField } from "../components/FormField";

type UserRecord = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
};

interface UserFormProps {
  user?: UserRecord | null;
  onSubmit: (values: {
    email: string;
    password?: string;
    fullName: string;
    role: string;
    isActive: boolean;
  }) => void | Promise<void>;
  onCancel: () => void;
}

export default function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const [email, setEmail] = useState(user?.email ?? "");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role ?? "user");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!user;

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFullName(user.fullName);
      setRole(user.role);
      setIsActive(user.isActive);
    } else {
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("user");
      setIsActive(true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        email,
        password: password || undefined,
        fullName,
        role,
        isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          {isEditMode ? "Edit User" : "New User"}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {isEditMode
            ? `Updating ${fullName}'s account.`
            : "Create a new user account for the system."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <TextField
          id="fullName"
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          placeholder="John Kamau"
        />

        <TextField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="john@kenyt.com"
        />

        <TextField
          id="password"
          label={isEditMode ? "New Password (leave blank to keep current)" : "Password"}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!isEditMode}
          placeholder="••••••••"
        />

        <div>
          <label htmlFor="role" className="mb-1.5 block font-body text-sm font-medium text-ink">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-navy-600/20 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <p className="mt-1 text-xs text-ink-muted">
            {role === "super_admin"
              ? "Full access including user management"
              : role === "admin"
              ? "Can manage trucks, drivers, orders, and allocations"
              : "Can only view data"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-navy-600/20"
          />
          <label htmlFor="isActive" className="font-body text-sm text-ink">
            Active (user can log in)
          </label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : isEditMode ? "Update User" : "Create User"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}