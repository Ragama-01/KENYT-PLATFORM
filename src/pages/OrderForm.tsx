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

import type {
  OrderFormValues,
  Location,
} from "../types/models";

const LOAD_TYPES = [
  { value: "FCL", label: "FCL — Full Container Load" },
  { value: "LCL", label: "LCL — Less than Container Load" },
  { value: "bulk", label: "Bulk" },
  { value: "reefer", label: "Reefer" },
  { value: "breakbulk", label: "Breakbulk" },
];

const schema = z.object({
  bol_number: z.string().min(1),

  customer_name: z.string().min(1),

  cargo_type: z.string().min(1),

  load_type: z.enum([
    "FCL",
    "LCL",
    "bulk",
    "reefer",
    "breakbulk",
  ]),

  weight_tonnes: z.coerce.number(),

  container_number: z.string().optional(),

  container_type: z.string().optional(),

  pickup_location_id: z.coerce.number(),

  delivery_location_id: z.coerce.number(),

  consignee_name: z.string().min(1),

  consignee_phone: z.string().optional(),

  free_storage_days: z.coerce.number(),

  special_instructions: z.string().optional(),
});

interface Props {
  onSubmit: (
    values: OrderFormValues
  ) => Promise<void>;
}

export default function OrderForm({
  onSubmit,
}: Props) {
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    fetch("http://localhost:4000/locations")
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
    console.log(values);
    await onSubmit(values);
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
            {...register("free_storage_days")}
            error={errors.free_storage_days?.message}
          />

          {urgency && (
            <span className={urgency.tone}>
              {urgency.label}
            </span>
          )}
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

        <div className="flex items-center gap-3 border-t border-navy-950/10 pt-6">
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