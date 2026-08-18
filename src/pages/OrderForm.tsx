import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  TextField,
  SelectField,
  FieldGroup,
} from "../components/FormField";

import { Button } from "../components/Button";
import { API_BASE } from "../lib/api";

import type {
  OrderFormValues,
  Location,
} from "../types/models";

const LOAD_TYPES = [
  { value: "20/40 dry", label: "20/40 Dry" },
  { value: "20/40 open top-special", label: "20/40 Open Top (Special)" },
  { value: "20/40 Reefer -special", label: "20/40 Reefer (Special)" },
  { value: "20/40 open reel-special", label: "20/40 Open Reel (Special)" },
];

const DOCUMENTATION_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
  { value: "on_hold", label: "On Hold" },
];

const schema = z.object({
  bol_number: z.string().min(1, "BOL number is required"),

  customer_name: z.string().min(1, "Customer is required"),

  cargo_type: z.string().min(1, "Cargo type is required"),

  load_type: z.enum([
    "20/40 dry",
    "20/40 open top-special",
    "20/40 Reefer -special",
    "20/40 open reel-special",
  ]),

  weight_tonnes: z.coerce
    .number({ invalid_type_error: "Weight is required" })
    .positive("Weight must be greater than 0")
    .max(100, "Weight looks too high - enter tonnes (e.g. 20, not 20000)"),

  container_number: z.string().optional(),

  container_type: z.string().optional(),

  pickup_location_id: z.coerce
    .number()
    .min(1, "Select a pickup location"),

  delivery_location_id: z.coerce
    .number()
    .min(1, "Select a delivery location"),

  consignee_name: z.string().min(1, "Consignee name is required"),

  consignee_phone: z.string().optional(),

  free_storage_days: z
    .coerce
    .number()
    .min(0, "Free storage days cannot be negative")
    .max(15, "Maximum 15 days"),

  eta_discharge_date: z.string().optional(),

  documentation_status: z.string().optional(),

  special_instructions: z.string().optional(),
});

interface Props {
  onSubmit: (
    values: OrderFormValues
  ) => Promise<void>;
  onViewAll?: () => void;
}

export default function OrderForm({
  onSubmit,
  onViewAll,
}: Props) {
  const [locations, setLocations] = useState<Location[]>([]);

  const [submitError, setSubmitError] = useState<
    string | null
  >(null);

  useEffect(() => {
    fetch(`${API_BASE}/locations`)
      .then((r) => r.json())
      .then(setLocations)
      .catch(console.error);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(schema),
  });

  const freeDays = watch("free_storage_days");

  const urgency =
    freeDays == null
      ? null
      : freeDays <= 2
      ? {
          label: "High urgency",
          tone: "text-red-700",
        }
      : freeDays <= 5
      ? {
          label: "Medium urgency",
          tone: "text-yellow-600",
        }
      : {
          label: "Low urgency",
          tone: "text-green-700",
        };

  const locationOptions = locations.map((l) => ({
    value: String(l.locationId),
    label: l.name,
  }));

  const submit = async (values: OrderFormValues) => {
    try {
      setSubmitError(null);
      await onSubmit(values);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to save order. Please try again."
      );
      throw err;
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold">
          New Order
        </h1>

        <p className="text-sm text-gray-500">
          Capture customer order.
        </p>
      </header>

      <form
        onSubmit={handleSubmit(submit)}
        className="flex flex-col gap-8"
      >
        <FieldGroup title="Cargo">
          <TextField
            label="BOL Number"
            id="bol_number"
            {...register("bol_number")}
            error={errors.bol_number?.message}
          />

          <TextField
            label="Customer"
            id="customer_name"
            {...register("customer_name")}
            error={errors.customer_name?.message}
          />

          <TextField
            label="Cargo Type"
            id="cargo_type"
            {...register("cargo_type")}
            error={errors.cargo_type?.message}
          />

          <SelectField
            id="load_type"
            label="Load Type"
            options={LOAD_TYPES}
            placeholder="Select load type"
            {...register("load_type")}
            error={errors.load_type?.message}
          />

          <TextField
            label="Weight (Tonnes)"
            id="weight_tonnes"
            type="number"
            {...register("weight_tonnes")}
            error={errors.weight_tonnes?.message}
          />

          <TextField
            label="Free Storage Days"
            id="free_storage_days"
            type="number"
            max={15}
            {...register("free_storage_days")}
            error={errors.free_storage_days?.message}
            hint="Maximum 15 days"
          />

          {urgency && (
            <span className={urgency.tone}>
              {urgency.label}
            </span>
          )}

          <TextField
            label="ETA Discharge Date"
            id="eta_discharge_date"
            type="date"
            {...register("eta_discharge_date")}
            error={errors.eta_discharge_date?.message}
          />

          <SelectField
            id="documentation_status"
            label="Documentation Status"
            options={DOCUMENTATION_STATUS_OPTIONS}
            placeholder="Select documentation status"
            {...register("documentation_status")}
            error={errors.documentation_status?.message}
          />
        </FieldGroup>

        <FieldGroup title="Container">
          <TextField
            label="Container Number"
            id="container_number"
            {...register("container_number")}
          />

          <TextField
            label="Container Type"
            id="container_type"
            {...register("container_type")}
          />
        </FieldGroup>

        <FieldGroup title="Locations">
          <SelectField
            id="pickup_location_id"
            label="Pickup Location"
            placeholder="Select pickup location"
            options={locationOptions}
            {...register("pickup_location_id")}
            error={errors.pickup_location_id?.message}
          />

          <SelectField
            id="delivery_location_id"
            label="Delivery Location"
            placeholder="Select delivery location"
            options={locationOptions}
            {...register("delivery_location_id")}
            error={errors.delivery_location_id?.message}
          />
        </FieldGroup>

        <FieldGroup title="Consignee">
          <TextField
            label="Consignee Name"
            id="consignee_name"
            {...register("consignee_name")}
            error={errors.consignee_name?.message}
          />

          <TextField
            label="Consignee Phone"
            id="consignee_phone"
            {...register("consignee_phone")}
          />

          <TextField
            label="Special Instructions"
            id="special_instructions"
            {...register("special_instructions")}
          />
        </FieldGroup>

        <div className="flex flex-col gap-3 border-t border-navy-950/10 pt-6">
          {submitError && (
            <span
              role="alert"
              className="text-sm font-medium text-red-700"
            >
              {submitError}
            </span>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}