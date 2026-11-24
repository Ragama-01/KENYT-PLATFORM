import { useEffect, useState } from "react";
import { FieldGroup } from "../components/FormField";
import { Button } from "../components/Button";
import { API_BASE } from "../lib/api";

// A transformed order coming from the App (snake_case fields + nested
// containers list that came back from the /orders API).
interface ContainerOption {
  containerId: number;
  containerNumber: string;
  containerType: string | null;
  weightTonnes: number;
  cargoType: string;
}

interface OrderOption {
  orderId: number;
  bol_number: string;
  customer_name: string;
  weight_tonnes: number;
  containers: ContainerOption[];
}

interface TruckSuggestion {
  truckId: number;
  registration: string;
  capacity: number;
  distanceKm: number;
  canCarry: boolean;
  currentLocation: string | null;
  hasExistingOrder: boolean;
  currentOrderDestination: string | null;
  lastAllocatedAt: string | null;
}

export type AllocationSubmit =
  | { kind: "single"; orderId: number; truckId: number }
  | {
      kind: "containers";
      orderId: number;
      assignments: Array<{ containerId: number; truckId: number }>;
    };

interface AllocationFormProps {
  orders: OrderOption[];
  trucks: any[];

  onSubmit: (payload: AllocationSubmit) => Promise<void>;
}

/**
 * Capacity-label rule, mirrors the backend `maxCargoForTruck` util:
 *   26 t (and below) -> carries <= 20 t
 *   28 t             -> carries <= 28 t
 *   above 28 t       -> carries ANY cargo
 */
function maxCargo(capacityTonnes: unknown): number | null {
  if (capacityTonnes == null) return null;
  const cap = Number(capacityTonnes);
  if (Number.isNaN(cap) || cap <= 0) return null;
  if (cap <= 26) return 20;
  if (cap <= 28) return 28;
  return Infinity;
}

export default function AllocationForm({
  orders,
  trucks,
  onSubmit,
}: AllocationFormProps) {
  const [selectedOrderId, setSelectedOrderId] = useState("");
  // containerId (string) -> truckId (string)
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  // Only used for legacy orders that have no container records.
  const [singleTruckId, setSingleTruckId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  // Trucks suggested by the backend for the selected order, with distance to pickup
  const [suggestedTrucks, setSuggestedTrucks] = useState<TruckSuggestion[]>([]);

  const order = orders.find((o) => String(o.orderId) === selectedOrderId);
  const containers = order?.containers ?? [];

  // All trucks known to the system (not filtered by status), enriched with
  // distance to the selected order's pickup location when suggestions are loaded.
  const trucksById = new Map(trucks.map((t) => [String(t.truckId || t.id), t]));

  const canCarry = (truck: any, weight: number): boolean => {
    const max = maxCargo(truck.capacity_tonnes);
    if (max == null) return false;
    return max >= weight;
  };

  //-----------------------------------------------------
  // Fetch truck suggestions (distance to pickup) when an order is chosen
  //-----------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    const o = orders.find((x) => String(x.orderId) === selectedOrderId);
    if (!o) {
      setSuggestedTrucks([]);
      setAssignments({});
      setSingleTruckId(null);
      return;
    }

    fetch(`${API_BASE}/allocations/suggest/${o.orderId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load truck suggestions");
        return r.json();
      })
      .then((data: any) => {
        if (cancelled) return;
        setSuggestedTrucks(data.trucks || []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Could not load truck suggestions:", err.message);
        setSuggestedTrucks([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOrderId, orders]);

  //-----------------------------------------------------
  // Auto-select a sensible default when an order is chosen
  //-----------------------------------------------------

  useEffect(() => {
    const o = orders.find((x) => String(x.orderId) === selectedOrderId);
    if (!o) {
      setAssignments({});
      setSingleTruckId(null);
      return;
    }

    // Legacy order with no container records -> fall back to single-truck.
    if (!o.containers || o.containers.length === 0) {
      setAssignments({});
      const fit = suggestedTrucks.find((t) =>
        canCarry(trucksById.get(String(t.truckId)) || t, Number(o.weight_tonnes))
      );
      setSingleTruckId(fit ? String(fit.truckId) : null);
      return;
    }

    // Container-based allocation: default each container to the first truck
    // that can carry it on its own.
    const next: Record<string, string> = {};
    for (const c of o.containers) {
      const fit = suggestedTrucks.find((t) =>
        canCarry(trucksById.get(String(t.truckId)) || t, Number(c.weightTonnes))
      );
      if (fit) next[String(c.containerId)] = String(fit.truckId);
    }
    setAssignments(next);
    setSingleTruckId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderId, suggestedTrucks, trucksById]);
// Track the truck that would carry a given container (empty string = none).
  const handleTruckChange = (containerId: number, truckId: string) => {
    const key = String(containerId);
    const next = { ...assignments };
    next[key] = truckId;
    setAssignments(next);
  };

  //-----------------------------------------------------
  // Live per-truck load summary + over-capacity check
  //-----------------------------------------------------

  const weightByTruck: Record<string, number> = {};
  for (const c of containers) {
    const tid = assignments[String(c.containerId)];
    if (tid) {
      weightByTruck[tid] =
        (weightByTruck[tid] || 0) + Number(c.weightTonnes);
    }
  }

  const overCapacity = trucks.some((t) => {
    const load = weightByTruck[String(t.truckId)] || 0;
    if (load <= 0) return false;
    const max = maxCargo(t.capacity_tonnes);
    return max != null && max !== Infinity && load > max;
  });

  const allAssigned =
    containers.length > 0 &&
    containers.every((c) => !!assignments[String(c.containerId)]);

  const selectedTruckIds = new Set(Object.values(assignments));

  //-----------------------------------------------------
  // Submit
  //-----------------------------------------------------

  const submit = async () => {
    if (!order) return;

    setError(null);
    setSucceeded(false);

    const payload: AllocationSubmit =
      containers.length === 0
        ? {
            kind: "single",
            orderId: order.orderId,
            truckId: Number(singleTruckId),
          }
        : {
            kind: "containers",
            orderId: order.orderId,
            assignments: containers.map((c) => ({
              containerId: c.containerId,
              truckId: Number(assignments[String(c.containerId)]),
            })),
          };

    if (payload.kind === "single" && !singleTruckId) {
      setError("Select a truck for this load.");
      return;
    }

    if (payload.kind === "containers" && !allAssigned) {
      setError("Assign a truck to every container before allocating.");
      return;
    }

    if (overCapacity) {
      setError(
        "One of the trucks is over its capacity. Move some containers to another truck."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
      setSucceeded(true);
      setAssignments({});
      setSingleTruckId(null);
      setSelectedOrderId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Allocation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const orderOptions = orders.map((o) => ({
    value: String(o.orderId),
    label: `${o.bol_number || "N/A"} • ${o.customer_name} (${Number(
      o.weight_tonnes
    )} t)`,
  }));

  //-----------------------------------------------------
  // UI
  //-----------------------------------------------------
return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Allocate Trucks
        </h1>

        <p className="mt-2 text-sm text-ink-muted">
          Pick an order. If it has more than one container you can assign
          them to a single truck or spread them across several trucks — each
          container is carried by the truck you choose for it.
        </p>
      </header>

      <div className="flex flex-col gap-8">
        <FieldGroup title="Order">
          {orders.length === 0 && (
            <p className="text-sm text-ink-muted">No pending orders.</p>
          )}

          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="w-full rounded-lg border border-navy-950/20 bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="">Select an order...</option>
            {orderOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {order && containers.length > 0 && (
            <div className="mt-3 rounded-lg border p-4 bg-white">
              <div className="text-sm text-ink-muted">
                <strong>Containers:</strong> {containers.length} •{" "}
                <strong>Total:</strong> {Number(order.weight_tonnes)} t
              </div>
            </div>
          )}
        </FieldGroup>

        {!order && (
          <p className="text-sm text-ink-muted">
            Select an order to begin allocating trucks.
          </p>
        )}

        {order && containers.length > 0 && (
          <FieldGroup title="Assign containers to trucks">
            <p className="text-sm text-ink-muted">
              Each container can go to a different truck, or all to the same
              truck. The combined weight on any truck must stay within its
              capacity.
            </p>

            <div className="space-y-8">
              {containers.map((c, i) => {
                const suitable = suggestedTrucks
                  .map((s) => trucksById.get(String(s.truckId)))
                  .filter(Boolean)
                  .filter((t) => canCarry(t, Number(c.weightTonnes)));
                const current = assignments[String(c.containerId)] || "";

                return (
                  <div
                    key={c.containerId}
                    className="rounded-lg border p-6 bg-white"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      <div className="lg:w-1/3">
                        <div className="font-semibold text-ink text-sm">
                          Container #{i + 1}: {c.containerNumber || "—"}
                        </div>
                        <div className="mt-2 text-sm text-ink-muted">
                          {c.containerType || "Any type"} •{" "}
                          {c.cargoType || "n/a"} •{" "}
                          {Number(c.weightTonnes)} t
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
                          Select truck
                        </div>
                        <div className="space-y-2">
                          {suitable.length === 0 ? (
                            <p className="text-sm text-red-600">
                              No truck can carry this container
                            </p>
                          ) : (
                            suitable.map((t) => {
                              const suggestion = suggestedTrucks.find(
                                (s) => String(s.truckId) === String(t.truckId)
                              );
                              const isSelected =
                                current === String(t.truckId);
                              return (
                                <label
                                  key={t.truckId}
                                  className={`flex items-center gap-4 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                                    isSelected
                                      ? "border-green-600 bg-green-50"
                                      : "border-navy-950/10 bg-white hover:border-navy-950/20"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`container_${c.containerId}`}
                                    checked={isSelected}
                                    onChange={() =>
                                      handleTruckChange(
                                        c.containerId,
                                        String(t.truckId)
                                      )
                                    }
                                    className="h-4 w-4 shrink-0 text-green-600"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                      <div className="text-sm font-semibold text-ink truncate">
                                        {t.registration_number}
                                      </div>
                                      <div className="text-xs text-ink-muted shrink-0">
                                        {suggestion ? `${suggestion.distanceKm.toFixed(1)} km from pickup` : ""}
                                      </div>
                                    </div>
                                    <div className="text-xs text-ink-muted">
                                      Capacity: {Number(t.capacity_tonnes)} t
                                    </div>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedTruckIds.size > 0 && (
              <div className="mt-4 rounded-lg border p-4 bg-white">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
                  Load summary
                </div>
                {trucks
                  .filter(
                    (t) => (weightByTruck[String(t.truckId)] || 0) > 0
                  )
                  .map((t) => {
                    const load = weightByTruck[String(t.truckId)] || 0;
                    const max = maxCargo(t.capacity_tonnes);
                    const fits =
                      max == null ||
                      max === Infinity ||
                      load <= max;
                    return (
                      <div
                        key={t.truckId}
                        className={`mt-1 text-sm ${
                          fits ? "text-ink-muted" : "text-red-600"
                        }`}
                      >
                        {t.registration_number}:{" "}
                        <strong>{load.toFixed(2)} t</strong>
                        {max != null && max !== Infinity && (
                          <> / {max} t max</>
                        )}
                        {!fits && " — over capacity!"}
                      </div>
                    );
                  })}
              </div>
            )}
          </FieldGroup>
        )}
{order && containers.length === 0 && (
          <FieldGroup title="Assign Truck">
            <p className="text-sm text-ink-muted">
              This order has no container records, so it is assigned to a
              single truck as one load.
            </p>

            <div className="space-y-2">
              {suggestedTrucks
                .map((s) => trucksById.get(String(s.truckId)))
                .filter(Boolean)
                .filter((t) => canCarry(t, Number(order.weight_tonnes)))
                .map((t) => {
                  const suggestion = suggestedTrucks.find(
                    (s) => String(s.truckId) === String(t.truckId)
                  );
                  const isSelected = singleTruckId === String(t.truckId);
                  return (
                    <label
                      key={t.truckId}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "border-green-600 bg-green-50"
                          : "border-navy-950/10 bg-white hover:border-navy-950/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="single_truck"
                        checked={isSelected}
                        onChange={() =>
                          setSingleTruckId(String(t.truckId))
                        }
                        className="h-4 w-4 text-green-600"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-ink">
                          {t.registration_number}
                        </div>
                        <div className="text-sm text-ink-muted">
                          Capacity: {Number(t.capacity_tonnes)} tonnes{suggestion ? ` • ${suggestion.distanceKm.toFixed(1)} km from pickup` : ""}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-green-700 font-semibold text-sm">
                          ✔ Selected
                        </span>
                      )}
                    </label>
                  );
                })}
            </div>
          </FieldGroup>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 border-t border-navy-950/10 pt-6">
          <Button
            type="button"
            disabled={!order || isSubmitting}
            onClick={submit}
          >
            {isSubmitting ? "Allocating..." : "Allocate Trucks"}
          </Button>

          {succeeded && (
            <span className="text-sm font-medium text-green-700">
              Allocation completed.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}