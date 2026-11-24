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
      <header className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Allocate trucks
          </h1>
          {order && (
            <p className="text-sm text-ink-muted">
              {order.bol_number || "N/A"} • {order.customer_name}
            </p>
          )}
        </div>

        {orders.length > 0 && (
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="max-w-[300px] w-full rounded-lg border border-navy-950/20 bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="">Select an order...</option>
            {orderOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </header>

      {orders.length === 0 && (
        <p className="text-sm text-ink-muted mb-6">
          No pending orders.
        </p>
      )}

      {!order && orders.length > 0 && (
        <p className="text-sm text-ink-muted mb-6">
          Select an order to begin allocating trucks.
        </p>
      )}

      {order && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border p-4 bg-white">
              <div className="text-xs text-ink-muted">Containers</div>
              <div className="text-lg font-semibold text-ink">
                {containers.length}
              </div>
            </div>
            <div className="rounded-xl border p-4 bg-white">
              <div className="text-xs text-ink-muted">Total weight</div>
              <div className="text-lg font-semibold text-ink">
                {Number(order.weight_tonnes)} t
              </div>
            </div>
            <div className="rounded-xl border p-4 bg-white">
              <div className="text-xs text-ink-muted">Assigned</div>
              <div className="text-lg font-semibold text-ink">
                {containers.filter((c) =>
                  !!assignments[String(c.containerId)]
                ).length} / {containers.length}
              </div>
            </div>
          </div>

          {containers.length > 0 && (
            <>
              <div className="space-y-3">
                {containers.map((c, i) => {
                  const suitable = suggestedTrucks
                    .map((s) => trucksById.get(String(s.truckId)))
                    .filter(Boolean)
                    .filter((t) => {
                      const alreadyAssignedWeight =
                        weightByTruck[String(t.truckId)] || 0;
                      const max = maxCargo(t.capacity_tonnes);
                      if (max == null) return false;
                      return (
                        alreadyAssignedWeight + Number(c.weightTonnes) <= max
                      );
                    });
                  const current = assignments[String(c.containerId)] || "";

                  return (
                    <div
                      key={c.containerId}
                      className="rounded-xl border p-4 bg-white mb-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="font-semibold text-ink text-sm">
                          Container {c.containerNumber || "—"}
                        </span>
                        <span
                          className="text-xs rounded-full border border-navy-950/10 bg-white px-2 py-0.5 text-ink-muted"
                        >
                          {c.containerType || "Any type"}
                        </span>
                        <span
                          className="text-xs rounded-full border border-navy-950/10 bg-white px-2 py-0.5 text-ink-muted"
                        >
                          {c.cargoType || "n/a"}
                        </span>
                        <span
                          className="ml-auto text-xs rounded-full border border-navy-950/10 bg-white px-2 py-0.5 text-ink-muted"
                        >
                          {Number(c.weightTonnes)} t
                        </span>
                      </div>

                      <div
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                      >
                        {suitable.length === 0 ? (
                          <p className="col-span-2 text-sm text-red-600">
                            No truck can carry this container
                          </p>
                        ) : (
                          suitable.map((t) => {
                            const suggestion = suggestedTrucks.find(
                              (s) => String(s.truckId) === String(t.truckId)
                            );
                            const isSelected =
                              current === String(t.truckId);
                            const alreadyAssignedWeight =
                              weightByTruck[String(t.truckId)] || 0;
                            const max = maxCargo(t.capacity_tonnes);
                            const remaining = max == null
                              ? null
                              : Math.max(0, max - alreadyAssignedWeight);
                            const isAlreadyUsed =
                              alreadyAssignedWeight > 0 &&
                              current !== String(t.truckId);
                            return (
                              <label
                                key={t.truckId}
                                className={`block rounded-xl border p-3 cursor-pointer transition-colors ${isSelected
                                  ? "border-green-600 bg-green-50"
                                  : isAlreadyUsed
                                  ? "border-navy-950/20 bg-green-5/50 hover:border-navy-950/30"
                                  : "border-navy-950/10 bg-white hover:border-navy-950/30"
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
                                  className="sr-only"
                                />
                                <div className="flex items-center gap-2">
                                  <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isSelected
                                    ? "border-green-600 bg-green-50"
                                    : "border-navy-950/10 bg-white"
                                  }`}
                                  >
                                    {isSelected && (
                                      <svg
                                        className="w-2.5 h-2.5 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={3}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                      <div className="text-sm font-semibold text-ink truncate">
                                        {t.registration_number}
                                      </div>
                                      {suggestion && (
                                        <div className="text-xs text-ink-muted shrink-0">
                                          {suggestion.distanceKm.toFixed(1)} km
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-xs text-ink-muted">
                                      {Number(t.capacity_tonnes)} t capacity{remaining != null ? ` • ${remaining.toFixed(1)} t left` : ""}{isAlreadyUsed ? " • already carrying another container" : ""}
                                    </div>
                                  </div>
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedTruckIds.size > 0 && (
                <div className="rounded-xl border p-4 bg-white mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
                    Load per truck
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {trucks
                      .filter(
                        (t) => (weightByTruck[String(t.truckId)] || 0) > 0
                      )
                      .map((t) => {
                        const load =
                          weightByTruck[String(t.truckId)] || 0;
                        const max = maxCargo(t.capacity_tonnes);
                        const fits =
                          max == null ||
                          max === Infinity ||
                          load <= max;
                        const limit =
                          max === Infinity
                            ? Number(t.capacity_tonnes)
                            : max ?? Number(t.capacity_tonnes);
                        const pct =
                          limit > 0
                            ? Math.min(100, (load / limit) * 100)
                            : 0;
                        return (
                          <div
                            key={t.truckId}
                            className="min-w-0"
                          >
                            <div className="flex justify-between items-baseline mb-1">
                              <div className="text-sm font-semibold text-ink truncate">
                                {t.registration_number}
                              </div>
                              <div className={`text-xs font-semibold ${fits ? "text-ink" : "text-red-600"}`}>
                                {load.toFixed(2)} / {limit} t{
                                  max !== Infinity && !fits && " · over"
                                }
                              </div>
                            </div>
                            <div className="w-full h-[6px] rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full ${fits ? "bg-green-600" : "bg-red-600"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}

          {containers.length === 0 && (
            <FieldGroup title="Assign Truck">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        className={`block rounded-xl border p-3 cursor-pointer transition-colors ${isSelected
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
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2">
                          <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isSelected
                            ? "border-green-600 bg-green-50"
                            : "border-navy-950/10 bg-white"
                          }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                              <div className="text-sm font-semibold text-ink truncate">
                                {t.registration_number}
                              </div>
                              {suggestion && (
                                <div className="text-xs text-ink-muted shrink-0">
                                  {suggestion.distanceKm.toFixed(1)} km
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-ink-muted">
                              {Number(t.capacity_tonnes)} t capacity{suggestion && suggestion.currentLocation ? ` • ${suggestion.currentLocation}` : ""}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
              </div>
            </FieldGroup>
          )}
        </>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-navy-950/10 pt-6 mt-6 flex-wrap">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
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