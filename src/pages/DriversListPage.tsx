import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { API_BASE } from "../lib/api";
import type { Driver } from "../types/models";

interface DriversListPageProps {
  truckLookup: Record<string, string>;
  drivers: Driver[];
  onAddDriver: () => void;
  onViewDriver: (driver: Driver) => void;
  onEditDriver: (driver: Driver) => void;
}

async function deleteDriver(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/drivers/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to delete driver");
  }
}

export default function DriversListPage({
  truckLookup,
  drivers,
  onAddDriver,
  onViewDriver,
  onEditDriver,
}: DriversListPageProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteDriver(id);
      // Note: Parent should reload drivers after delete
    } catch {
      setError("Couldn't delete that driver. Try again.");
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  };

  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Drivers</h1>
          <p className="mt-1 text-sm text-ink-muted">Driver records and current truck assignments.</p>
        </div>
        <Button onClick={onAddDriver}>Add driver</Button>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {drivers.length === 0 ? (
        <p className="text-sm text-ink-muted">No drivers yet. Add your first one to get started.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-950/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950/5 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">ID number</th>
                <th className="px-4 py-3 font-medium">KPA ID</th>
                <th className="px-4 py-3 font-medium">Assigned truck</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-950/10">
              {drivers.map((driver) => {
                const isConfirming = confirmingDeleteId === driver.id;
                const isDeleting = deletingId === driver.id;
                const truckLabel =
                  driver.truck_id != null
                    ? truckLookup[String(driver.truck_id)] ?? "Unassigned"
                    : "Unassigned";

                return (
                  <tr key={driver.id} className="hover:bg-navy-950/[0.02]">
                    <td className="px-4 py-3 font-medium text-ink">{driver.full_name}</td>
                    <td className="px-4 py-3 font-mono text-ink-muted">{driver.id_number}</td>
                    <td className="px-4 py-3 font-mono text-ink-muted">{driver.kpa_id || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{truckLabel}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="text-sm font-medium text-navy-700 hover:underline"
                          onClick={() => onViewDriver(driver)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="text-sm font-medium text-navy-700 hover:underline"
                          onClick={() => onEditDriver(driver)}
                        >
                          Edit
                        </button>
                        {isConfirming ? (
                          <button
                            type="button"
                            disabled={isDeleting}
                            className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                            onClick={() => handleDelete(driver.id!)}
                          >
                            {isDeleting ? "Deleting…" : "Confirm delete?"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-sm font-medium text-red-600 hover:underline"
                            onClick={() => setConfirmingDeleteId(driver.id!)}
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