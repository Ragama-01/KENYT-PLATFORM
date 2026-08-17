import { useEffect, useState } from "react";
import { Button } from "../components/Button";

type UserRecord = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
};

async function fetchUsers(): Promise<UserRecord[]> {
  const res = await fetch("http://localhost:4000/users");
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`http://localhost:4000/users/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete user");
}

interface UsersListPageProps {
  onAddUser: () => void;
  onEditUser: (user: UserRecord) => void;
}

export default function UsersListPage({ onAddUser, onEditUser }: UsersListPageProps) {
  const [users, setUsers] = useState<UserRecord[] | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => setError("Couldn't load users."));
  }, []);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteUser(id);
      setUsers((prev) => prev?.filter((u) => u.id !== id) ?? prev);
    } catch {
      setError("Couldn't delete that user. Try again.");
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  };

  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Users</h1>
          <p className="mt-1 text-sm text-ink-muted">Manage system users and permissions.</p>
        </div>
        <Button onClick={onAddUser}>New User</Button>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {users === null ? (
        <p className="text-sm text-ink-muted">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-ink-muted">No users yet. Add your first user to get started.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-950/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950/5 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-950/10">
              {users.map((user) => {
                const isConfirming = confirmingDeleteId === user.id;
                const isDeleting = deletingId === user.id;
                return (
                  <tr key={user.id} className="hover:bg-navy-950/[0.02]">
                    <td className="px-4 py-3 font-medium text-ink">{user.fullName}</td>
                    <td className="px-4 py-3 text-ink-muted">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === "super_admin"
                            ? "bg-gold-50 text-gold-700"
                            : user.role === "admin"
                            ? "bg-navy-50 text-navy-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="text-sm font-medium text-navy-700 hover:underline"
                          onClick={() => onEditUser(user)}
                        >
                          Edit
                        </button>
                        {isConfirming ? (
                          <button
                            type="button"
                            disabled={isDeleting}
                            className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                            onClick={() => handleDelete(user.id)}
                          >
                            {isDeleting ? "Deleting…" : "Confirm delete?"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-sm font-medium text-red-600 hover:underline"
                            onClick={() => setConfirmingDeleteId(user.id)}
                            onBlur={() => setConfirmingDeleteId(null)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}