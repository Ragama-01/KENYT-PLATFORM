import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import type { TruckFormValues } from "../types/models";

type TruckRecord = TruckFormValues & { id: number | string };

async function fetchTrucks(): Promise<TruckRecord[]> {
  const res = await fetch("http://localhost:4000/trucks");

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();

  console.log("API RESPONSE:", data);

  return data;
}

async function deleteTruck(id: TruckRecord["id"]): Promise<void> {
  const res = await fetch(`http://localhost:4000/trucks/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to delete truck");
  }
}

type ExpiryStatus = "ok" | "warning" | "expired";

function expiryStatus(dateStr: string, warningDays = 30): ExpiryStatus {
  const expiry = new Date(dateStr);
  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "expired";
  if (daysLeft <= warningDays) return "warning";
  return "ok";
}

function earliestExpiry(truck: TruckRecord) {
  const dates = [
    { label: "Insurance", value: truck.truck_insurance_expiry },
    { label: "Inspection", value: truck.inspection_expiry },
    { label: "Speed governor", value: truck.speed_governor_expiry },
    { label: "COMESA", value: truck.truck_comesa_date_expiry },
  ].filter((d) => d.value);

  if (dates.length === 0) return null;

  return dates.reduce((soonest, current) =>
    new Date(current.value) < new Date(soonest.value) ? current : soonest
  );
}

function ExpiryBadge({ dateStr, label }: { dateStr: string; label: string }) {
  const status = expiryStatus(dateStr);
  const daysLeft = Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const styles: Record<ExpiryStatus, string> = {
    ok: "bg-navy-50 text-navy-700",
    warning: "bg-amber-50 text-amber-700",
    expired: "bg-red-50 text-red-700",
  };

  const text = status === "expired" ? `${label} expired` : `${label} in ${daysLeft}d`;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {text}
    </span>
  );
}

interface TrucksListPageProps {
  onAddTruck: () => void;
  onViewTruck: (truck: TruckRecord) => void;
  onEditTruck: (truck: TruckRecord) => void;
}

export default function TrucksListPage({ onAddTruck, onViewTruck, onEditTruck }: TrucksListPageProps) {
  const [trucks, setTrucks] = useState<TruckRecord[] | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<TruckRecord["id"] | null>(null);
  const [deletingId, setDeletingId] = useState<TruckRecord["id"] | null>(null);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchTrucks()
    .then((data) => {
      console.log("First truck", data[0]);
      setTrucks(data);
    })
    .catch((err) => {
      console.error(err);
      setError(err.message);
    });
}, []);

  // Soonest-expiry-first so the trucks that need attention surface at the top.
  const sortedTrucks = useMemo(() => {
    if (!trucks) return [];
    return [...trucks].sort((a, b) => {
      const aExp = earliestExpiry(a)?.value ?? "9999-12-31";
      const bExp = earliestExpiry(b)?.value ?? "9999-12-31";
      return aExp.localeCompare(bExp);
    });
  }, [trucks]);

  const handleDelete = async (id: TruckRecord["id"]) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteTruck(id);
      setTrucks((prev) => prev?.filter((t) => t.id !== id) ?? prev);
    } catch {
      setError("Couldn't delete that truck. Try again.");
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  };

  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Trucks</h1>
          <p className="mt-1 text-sm text-ink-muted">Fleet vehicles and their compliance status.</p>
        </div>
        <Button onClick={onAddTruck}>Add truck</Button>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {trucks === null ? (
        <p className="text-sm text-ink-muted">Loading trucks…</p>
      ) : sortedTrucks.length === 0 ? (
        <p className="text-sm text-ink-muted">No trucks yet. Add your first one to get started.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-950/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950/5 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Registration</th>
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium">Compliance</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-950/10">
              {sortedTrucks.map((truck) => {
                const soonest = earliestExpiry(truck);
                const isConfirming = confirmingDeleteId === truck.id;
                const isDeleting = deletingId === truck.id;

                return (
                  <tr key={truck.id} className="hover:bg-navy-950/[0.02]">
                    <td className="px-4 py-3 font-mono text-ink">{truck.registration_number}</td>
                    <td className="px-4 py-3 text-ink-muted">{truck.year_of_manufacture}</td>
                    <td className="px-4 py-3">
                      {soonest ? (
                        <ExpiryBadge dateStr={soonest.value} label={soonest.label} />
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="text-sm font-medium text-navy-700 hover:underline"
                          onClick={() => onViewTruck(truck)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="text-sm font-medium text-navy-700 hover:underline"
                          onClick={() => onEditTruck(truck)}
                        >
                          Edit
                        </button>
                        {isConfirming ? (
                          <button
                            type="button"
                            disabled={isDeleting}
                            className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                            onClick={() => handleDelete(truck.id)}
                          >
                            {isDeleting ? "Deleting…" : "Confirm delete?"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-sm font-medium text-red-600 hover:underline"
                            onClick={() => setConfirmingDeleteId(truck.id)}
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