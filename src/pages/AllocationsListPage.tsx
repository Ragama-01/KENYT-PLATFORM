import { useEffect, useState } from "react";
import { Button } from "../components/Button";

type AllocationRecord = any;

async function fetchAllocations(): Promise<AllocationRecord[]> {
  const res = await fetch("http://localhost:4000/allocations");
  if (!res.ok) throw new Error("Failed to load allocations");
  const data = await res.json();

  // Transform API response from camelCase to snake_case to match frontend types
  const transformed = data.map((allocation: any) => ({
    ...allocation,
    allocationId: allocation.allocationId,
    orderId: allocation.orderId,
    truckId: allocation.truckId,
    allocatedAt: allocation.allocatedAt,
    status: allocation.status,
    // Transform nested order object
    order: allocation.order
      ? {
          ...allocation.order,
          orderId: allocation.order.orderId,
          bol_number: allocation.order.bolNumber,
          customer_name: allocation.order.customerName,
          cargo_type: allocation.order.cargoType,
          weight_tonnes: allocation.order.cargoWeightTonnes,
        }
      : null,
    // Transform nested truck object
    truck: allocation.truck
      ? {
          ...allocation.truck,
          truckId: allocation.truck.truckId,
          registration_number: allocation.truck.registration_number,
          capacity_tonnes: allocation.truck.capacity_tonnes,
        }
      : null,
  }));

  return transformed;
}

async function deleteAllocation(id: number): Promise<void> {
  const res = await fetch(`http://localhost:4000/allocations/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to delete allocation");
  }
}

interface AllocationsListPageProps {
  onAddAllocation: () => void;
  onViewAllocation: (allocation: AllocationRecord) => void;
  onEditAllocation: (allocation: AllocationRecord) => void;
}

export default function AllocationsListPage({
  onAddAllocation,
  onViewAllocation,
  onEditAllocation,
}: AllocationsListPageProps) {
  const [allocations, setAllocations] = useState<AllocationRecord[] | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllocations()
      .then(setAllocations)
      .catch((err) => {
        console.error(err);
        setError("Couldn't load allocations.");
      });
  }, []);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteAllocation(id);
      setAllocations((prev) => prev?.filter((a) => a.id !== id) ?? prev);
    } catch {
      setError("Couldn't delete that allocation. Try again.");
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  };
  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Allocations</h1>
          <p className="mt-1 text-sm text-ink-muted">All truck-to-order assignments.</p>
        </div>
        <Button onClick={onAddAllocation}>New Allocation</Button>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {allocations === null ? (
        <p className="text-sm text-ink-muted">Loading allocations…</p>
      ) : allocations.length === 0 ? (
        <p className="text-sm text-ink-muted">No allocations yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-950/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950/5 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Truck</th>
                <th className="px-4 py-3 font-medium">Allocated At</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-950/10">
              {allocations.map((allocation) => {
                const isConfirming = confirmingDeleteId === allocation.id;
                const isDeleting = deletingId === allocation.id;

                return (
                  <tr key={allocation.id} className="hover:bg-navy-950/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">
                        {allocation.order?.bol_number || `#${allocation.orderId}`}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {allocation.order?.customer_name || "Unknown customer"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">
                        {allocation.truck?.registration_number || `Truck ${allocation.truckId}`}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {allocation.truck?.capacity_tonnes ? `${allocation.truck.capacity_tonnes}t capacity` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {allocation.allocatedAt ? new Date(allocation.allocatedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="text-sm font-medium text-navy-700 hover:underline"
                          onClick={() => onViewAllocation(allocation)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="text-sm font-medium text-navy-700 hover:underline"
                          onClick={() => onEditAllocation(allocation)}
                        >
                          Edit
                        </button>
                        {isConfirming ? (
                          <button
                            type="button"
                            disabled={isDeleting}
                            className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                            onClick={() => handleDelete(allocation.id)}
                          >
                            {isDeleting ? "Deleting…" : "Confirm delete?"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-sm font-medium text-red-600 hover:underline"
                            onClick={() => setConfirmingDeleteId(allocation.id)}
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
