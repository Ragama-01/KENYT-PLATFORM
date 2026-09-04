import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SelectField, FieldGroup } from "../components/FormField";
import { Button } from "../components/Button";
import { API_BASE } from "../lib/api";

interface OrderOption {
  id: number;
  bolNumber: string;
  cargoWeightTonnes: number;
  consigneeName: string;
}

interface TruckCandidate {
  truckId: number;
  registration: string;
  capacity: number;
  distanceKm: number;
  currentLocation: string | null;
  hasExistingOrder: boolean;
  currentOrderDestination: string | null;
  lastAllocatedAt: string | null;
}

interface TruckRecommendation {
  orderId: number;
  cargoWeightTonnes: number;
  pickupLocation: string;
  deliveryLocation: string;
  trucks: TruckCandidate[];
}

const schema = z.object({});

type AllocationFormValues = z.infer<typeof schema>;

interface AllocationFormProps {
  orders: OrderOption[];
  trucks: any[];

  onSubmit: (values: {
    order_ids: number[];
    truck_id: number;
  }) => Promise<void>;
}

export default function AllocationForm({
  orders,
  trucks,
  onSubmit,
}: AllocationFormProps) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  const [selectedOrderId, setSelectedOrderId] = useState("");

  const [recommendation, setRecommendation] =
    useState<TruckRecommendation | null>(null);

  const [selectedTruckId, setSelectedTruckId] = useState<
    number | null
  >(null);

  const [recommendationError, setRecommendationError] =
    useState<string | null>(null);

  const [loadingRecommendation, setLoadingRecommendation] =
    useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: {
      errors,
      isSubmitting,
      isSubmitSuccessful,
    },
  } = useForm<AllocationFormValues>({
    resolver: zodResolver(schema),
  });

  //-----------------------------------------------------
  // Orders for dropdown
  //-----------------------------------------------------

  const orderOptions = orders.map((o) => ({
    value: String(o.id),

    label: `${o.bolNumber} • ${o.consigneeName} (${Number(
      o.cargoWeightTonnes
    )} t)`,
  }));

  // Auto-select the first pending order when orders load
  useEffect(() => {
    if (selectedOrderIds.length === 0 && orders.length > 0) {
      const firstOrderId = orders[0].id;
      setSelectedOrderIds([firstOrderId]);
      setSelectedOrderId(String(firstOrderId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  //-----------------------------------------------------
  // Combined weight of all selected orders
  //-----------------------------------------------------

  const selectedOrders = orders.filter((o) =>
    selectedOrderIds.includes(o.id)
  );

  const combinedWeight = selectedOrders.reduce(
    (sum, o) => sum + Number(o.cargoWeightTonnes),
    0
  );

  //-----------------------------------------------------
  // Toggle an order in/out of the batch selection
  //-----------------------------------------------------

  const handleOrderToggle = (orderId: number) => {
    setSelectedOrderIds((prev) => {
      const next = prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId];

      // Recommendation endpoint works per-order; use it when
      // exactly one order is selected.
      setSelectedOrderId(
        next.length === 1 ? String(next[0]) : ""
      );

      return next;
    });

    setRecommendationError(null);
    setSelectedTruckId(null);
    setRecommendation(null);
  };

  //-----------------------------------------------------
  // Load recommendation
  //-----------------------------------------------------

  useEffect(() => {
    if (!selectedOrderId) {
      setRecommendation(null);
      setSelectedTruckId(null);
      setRecommendationError(null);
      return;
    }

    async function loadRecommendation() {
      try {
        setLoadingRecommendation(true);
        setRecommendationError(null);
        setRecommendation(null);
        setSelectedTruckId(null);

        const res = await fetch(
          `${API_BASE}/allocations/suggest/${selectedOrderId}`
        );

        const data = await res.json();

        if (!res.ok) {
          setRecommendation(null);
          setSelectedTruckId(null);
          setRecommendationError(
            data.error || "No suitable truck found."
          );
          return;
        }

        setRecommendation(data);

        // Auto-select the nearest truck
        if (data.trucks && data.trucks.length > 0) {
          setSelectedTruckId(data.trucks[0].truckId);
        }
      } catch (err) {
        setRecommendation(null);
        setSelectedTruckId(null);
        setRecommendationError(
          "Failed to reach the recommendation service."
        );
      } finally {
        setLoadingRecommendation(false);
      }
    }

    loadRecommendation();
  }, [selectedOrderId]);

  //-----------------------------------------------------
  // Helpers
  //-----------------------------------------------------

  const formatLastAllocated = (iso: string | null) => {
    if (!iso) return null;

    const date = new Date(iso);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  //-----------------------------------------------------
  // Truck selected
  //-----------------------------------------------------

  const handleTruckSelect = (truckId: number) => {
    setSelectedTruckId(truckId);
  };

  //-----------------------------------------------------
  // Allocate
  //-----------------------------------------------------

  const submit = async (
    values: AllocationFormValues
  ) => {
    if (selectedTruckId == null) {
      return;
    }

    if (selectedOrderIds.length === 0) {
      return;
    }

    await onSubmit({
      order_ids: selectedOrderIds,
      truck_id: selectedTruckId,
    });

    reset();

    setSelectedOrderIds([]);
    setSelectedOrderId("");
    setSelectedTruckId(null);
    setRecommendation(null);
    setRecommendationError(null);
  };

  //-----------------------------------------------------
  // UI
  //-----------------------------------------------------

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Allocate Truck
        </h1>

        <p className="mt-2 text-sm text-ink-muted">
          Select an order. The system will recommend
          available trucks capable of carrying the cargo,
          sorted by distance to the pickup point.
        </p>
      </header>

      <form
        onSubmit={handleSubmit(submit)}
        className="flex flex-col gap-8"
      >
        <FieldGroup title="Orders">
          <p className="text-sm text-ink-muted">
            Tick one or more orders to assign them to the same
            truck (e.g. two 20ft containers on one truck). The
            combined weight must fit the truck's capacity.
          </p>

          <div className="space-y-2">
            {orderOptions.length === 0 && (
              <p className="text-sm text-ink-muted">
                No pending orders.
              </p>
            )}

            {orderOptions.map((opt) => {
              const order = orders.find(
                (o) => String(o.id) === opt.value
              )!;
              const isChecked = selectedOrderIds.includes(
                order.id
              );

              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    isChecked
                      ? "border-green-600 bg-green-50"
                      : "border-navy-950/10 bg-white hover:border-navy-950/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() =>
                      handleOrderToggle(order.id)
                    }
                    className="h-4 w-4 text-green-600"
                  />

                  <div className="flex-1">
                    <div className="font-semibold text-ink">
                      {order.bolNumber}
                    </div>
                    <div className="text-sm text-ink-muted">
                      {order.consigneeName} •{" "}
                      {Number(order.cargoWeightTonnes)} t
                    </div>
                  </div>

                  {isChecked && (
                    <span className="text-green-700 font-semibold text-sm">
                      ✔ Selected
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {selectedOrderIds.length > 0 && (
            <div className="rounded-lg border p-4 bg-white">
              <div className="text-sm text-ink">
                <strong>
                  {selectedOrderIds.length} order
                  {selectedOrderIds.length > 1 ? "s" : ""}{" "}
                  selected
                </strong>{" "}
                — combined load:{" "}
                <strong>{combinedWeight.toFixed(2)} t</strong>
              </div>
            </div>
          )}
        </FieldGroup>

        <FieldGroup title="Recommended Trucks">
          {selectedOrderIds.length === 0 && (
            <p className="text-sm text-ink-muted">
              Select an order first.
            </p>
          )}

          {selectedOrderIds.length > 1 && (
            <div className="space-y-3">
              <div className="rounded-lg border p-4 bg-white">
                <div className="text-sm text-ink">
                  <strong>Batch allocation:</strong>{" "}
                  {selectedOrderIds.length} orders •{" "}
                  {combinedWeight.toFixed(2)} t combined — pick
                  a truck with enough capacity.
                </div>
              </div>

              <div className="space-y-2">
                {trucks
                  .filter((t) => t.status === "available")
                  .map((t) => {
                    const isSelected =
                      selectedTruckId === t.truckId;

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
                          name="truck_batch"
                          checked={isSelected}
                          onChange={() =>
                            handleTruckSelect(t.truckId)
                          }
                          className="h-4 w-4 text-green-600"
                        />

                        <div className="flex-1">
                          <div className="font-semibold text-ink">
                            {t.registration_number}
                          </div>
                          <div className="text-sm text-ink-muted">
                            Capacity:{" "}
                            {t.capacity_tonnes} tonnes
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
            </div>
          )}

          {loadingRecommendation && (
            <p className="text-sm text-ink-muted">
              Searching for suitable trucks...
            </p>
          )}

          {!loadingRecommendation &&
            selectedOrderId &&
            !recommendation &&
            recommendationError && (
              <p className="text-red-600 text-sm">
                {recommendationError}
              </p>
            )}

          {recommendation && (
            <div className="space-y-3">
              <div className="rounded-lg border p-4 bg-white">
                <div className="text-sm text-ink-muted">
                  <strong>Cargo weight:</strong>{" "}
                  {recommendation.cargoWeightTonnes} tonnes
                </div>
                <div className="text-sm text-ink-muted">
                  <strong>Pickup:</strong>{" "}
                  {recommendation.pickupLocation}
                </div>
                <div className="text-sm text-ink-muted">
                  <strong>Delivery:</strong>{" "}
                  {recommendation.deliveryLocation}
                </div>
                <div className="text-sm text-ink-muted">
                  <strong>
                    {recommendation.trucks.length} truck
                    {recommendation.trucks.length > 1
                      ? "s"
                      : ""}{" "}
                    available
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                {recommendation.trucks.map((truck) => {
                  const isSelected =
                    selectedTruckId === truck.truckId;

                  return (
                    <label
                      key={truck.truckId}
                      className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? "border-green-600 bg-green-50"
                          : "border-navy-950/10 bg-white hover:border-navy-950/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="truck"
                        checked={isSelected}
                        onChange={() =>
                          handleTruckSelect(truck.truckId)
                        }
                        className="h-4 w-4 text-green-600"
                      />

                      <div className="flex-1">
                        <div className="font-semibold text-ink">
                          {truck.registration}
                        </div>
                        <div className="text-sm text-ink-muted">
                          Capacity: {truck.capacity} tonnes
                        </div>
                        <div className="text-sm text-ink-muted">
                          Current location:{" "}
                          {truck.currentLocation ?? "Unknown"}
                        </div>
                        {truck.hasExistingOrder && (
                          <div className="text-sm text-amber-600">
                            ⚠ Currently on an order — heading
                            to{" "}
                            {truck.currentOrderDestination ??
                              "Unknown"}
                          </div>
                        )}
                        {truck.lastAllocatedAt ? (
                          <div
                            className={`text-sm ${
                              truck.hasExistingOrder
                                ? "text-amber-600"
                                : "text-ink-muted"
                            }`}
                          >
                            🕒 Last allocated:{" "}
                            {formatLastAllocated(
                              truck.lastAllocatedAt
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-green-700">
                            ✓ Never allocated
                          </div>
                        )}
                      </div>

                      <div className="text-sm font-medium text-ink-muted">
                        {truck.distanceKm} km away
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
            </div>
          )}
        </FieldGroup>

        <div className="flex items-center gap-3 border-t border-navy-950/10 pt-6">
          <Button
            type="submit"
            disabled={
              isSubmitting || selectedTruckId == null
            }
          >
            {isSubmitting
              ? "Allocating..."
              : "Allocate Truck"}
          </Button>

          {isSubmitSuccessful && (
            <span className="text-sm font-medium text-green-700">
              Allocation completed.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}