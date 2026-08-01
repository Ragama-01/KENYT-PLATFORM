import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SelectField, FieldGroup } from "../components/FormField";
import { Button } from "../components/Button";

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
}

interface TruckRecommendation {
  orderId: number;
  cargoWeightTonnes: number;
  pickupLocation: string;
  trucks: TruckCandidate[];
}

const schema = z.object({
  order_id: z.string().min(1, "Select an order"),
});

type AllocationFormValues = z.infer<typeof schema>;

interface AllocationFormProps {
  orders: OrderOption[];
  trucks: any[];

  onSubmit: (values: {
    order_id: number;
    truck_id: number;
  }) => Promise<void>;
}

export default function AllocationForm({
  orders,
  trucks,
  onSubmit,
}: AllocationFormProps) {
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

        const res = await fetch(
          `http://localhost:4000/allocations/suggest/${selectedOrderId}`
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
  // Order changed
  //-----------------------------------------------------

  const handleOrderChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedOrderId(e.target.value);
    setRecommendationError(null);

    setValue("order_id", e.target.value);
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

    await onSubmit({
      order_id: Number(values.order_id),
      truck_id: selectedTruckId,
    });

    reset();

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
        <FieldGroup title="Order">
          <SelectField
            id="order_id"
            label="Pending Orders"
            placeholder="Select an order"
            options={orderOptions}
            error={errors.order_id?.message}
            {...register("order_id")}
            onChange={handleOrderChange}
          />
        </FieldGroup>

        <FieldGroup title="Recommended Trucks">
          {!selectedOrderId && (
            <p className="text-sm text-ink-muted">
              Select an order first.
            </p>
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