import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { API_BASE } from "../lib/api";
import type { TruckFormValues } from "../types/models";

type TruckRecord = TruckFormValues & { id: number | string };

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// The backend returns image_url as a server-relative path ("/uploads/x.jpg").
// Resolve it against the API origin; leave absolute URLs untouched.
function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function fetchTrucks(): Promise<TruckRecord[]> {
  const res = await fetch(`${API_BASE}/trucks`, { headers: authHeaders() });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();

  // The API returns either a bare array or { data, meta } (paginated).
  const list: any[] = Array.isArray(data) ? data : data.data ?? [];

  // New Phase-1 fields come back camelCase from Prisma; map to snake_case.
  return list.map((truck) => ({
    ...truck,
    trailer_registration: truck.trailerRegistration ?? truck.trailer_registration,
    tgl_2027: truck.tgl2027 ?? truck.tgl_2027,
    logbook_truck: truck.logbookTruck ?? truck.logbook_truck,
    logbook_trailer: truck.logbookTrailer ?? truck.logbook_trailer,
    policy_number: truck.policyNumber ?? truck.policy_number,
    serial_number: truck.serialNumber ?? truck.serial_number,
    inspection_sticker_no: truck.inspectionStickerNo ?? truck.inspection_sticker_no,
    driver_name: truck.driverName ?? truck.driver_name,
    image_url: truck.imageUrl ?? truck.image_url,
  }));
}

async function deleteTruck(id: TruckRecord["id"]): Promise<void> {
  const res = await fetch(`${API_BASE}/trucks/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to delete truck");
  }
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

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

interface TrucksListPageProps {
  onAddTruck: () => void;
  onViewTruck: (truck: TruckRecord) => void;
  onEditTruck: (truck: TruckRecord) => void;
  // Whether the current user may add/edit/delete trucks (admin/super_admin).
  canWrite?: boolean;
}

export default function TrucksListPage({ onAddTruck, onViewTruck, onEditTruck, canWrite = true }: TrucksListPageProps) {
  const [trucks, setTrucks] = useState<TruckRecord[] | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<TruckRecord["id"] | null>(null);
  const [deletingId, setDeletingId] = useState<TruckRecord["id"] | null>(null);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchTrucks()
    .then((data) => {
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
        <Button onClick={onAddTruck} disabled={!canWrite}>Add truck</Button>
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
                <th className="px-4 py-3 font-medium">Image</th>
                <th className="px-4 py-3 font-medium">Truck Registration</th>
                <th className="px-4 py-3 font-medium">Trailer Registration</th>
                <th className="px-4 py-3 font-medium">2027 TGL</th>
                <th className="px-4 py-3 font-medium">Logbook Truck No.</th>
                <th className="px-4 py-3 font-medium">Logbook Trailer No.</th>
                <th className="px-4 py-3 font-medium">Insurance Policy Number</th>
                <th className="px-4 py-3 font-medium">Insurance Serial Number</th>
                <th className="px-4 py-3 font-medium">Insurance Expiry</th>
                <th className="px-4 py-3 font-medium">Inspection Sticker No.</th>
                <th className="px-4 py-3 font-medium">COMESA Insurance No.</th>
                <th className="px-4 py-3 font-medium">COMESA Insurance Expiry</th>
                <th className="px-4 py-3 font-medium">Inspection Expiry</th>
                <th className="px-4 py-3 font-medium">Driver Name</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-950/10">
              {sortedTrucks.map((truck) => {
                const isConfirming = confirmingDeleteId === truck.id;
                const isDeleting = deletingId === truck.id;

                return (
                  <tr key={truck.id} className="hover:bg-navy-950/[0.02]">
                    <td className="px-4 py-3">
                      {resolveImageUrl(truck.image_url) ? (
                        <img
                          src={resolveImageUrl(truck.image_url)!}
                          alt={truck.registration_number}
                          className="h-10 w-14 rounded border border-navy-950/10 object-cover"
                        />
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-ink">{truck.registration_number}</td>
                    <td className="px-4 py-3 text-ink-muted">{truck.trailer_registration || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{truck.tgl_2027 || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{truck.logbook_truck || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{truck.logbook_trailer || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{truck.policy_number || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{truck.serial_number || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{formatDate(truck.truck_insurance_expiry)}</td>
                    <td className="px-4 py-3 text-ink-muted">{truck.inspection_sticker_no || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{truck.truck_comesa_policy_number || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{formatDate(truck.truck_comesa_date_expiry)}</td>
                    <td className="px-4 py-3 text-ink-muted">{formatDate(truck.inspection_expiry)}</td>
                    <td className="px-4 py-3 text-ink-muted">{truck.driver_name || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="text-sm font-medium text-navy-700 hover:underline"
                          onClick={() => onViewTruck(truck)}
                        >
                          View
                        </button>
                        {canWrite && (
                          <>
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
                          </>
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