import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
  Customer,
} from "../types/models";

const LOAD_TYPES = [
  { value: "20/40 dry", label: "20/40 Dry" },
  { value: "20/40 open top-special", label: "20/40 Open Top (Special)" },
  { value: "20/40 Reefer -special", label: "20/40 Reefer (Special)" },
  { value: "20/40 open reel-special", label: "20/40 Open Reel (Special)" },
];

const GF_DO_OPTIONS = [
  { value: "", label: "None" },
  { value: "GF", label: "GF Given" },
  { value: "DO", label: "DO Given" },
];

const IM4_IM7_OPTIONS = [
  { value: "", label: "None" },
  { value: "IM4", label: "IM4 Given" },
  { value: "IM7", label: "IM7 Given" },
];

const containerSchema = z.object({
  container_number: z.string().min(1, "Container number is required"),
  container_type: z.string().optional(),
  weight_tonnes: z.coerce
    .number({ invalid_type_error: "Weight is required" })
    .positive("Weight must be greater than 0")
    .max(100, "Weight looks too high - enter tonnes (e.g. 20, not 20000)"),
  cargo_type: z.string().min(1, "Contents / cargo type is required"),
});

const schema = z.object({
  bol_number: z.string().optional(),

  customer_name: z.string().min(1, "Customer is required"),

  load_type: z.enum([
    "20/40 dry",
    "20/40 open top-special",
    "20/40 Reefer -special",
    "20/40 open reel-special",
  ]),

  containers: z.array(containerSchema).min(1, "Add at least one container"),

  pickup_location_id: z.coerce
    .number()
    .min(1, "Select a pickup location"),

  delivery_location_id: z.coerce
    .number()
    .min(1, "Select a delivery location"),

  consignee_name: z.string().min(1, "Consignee name is required"),

  consignee_phone: z.string().optional(),

  eta_discharge_date: z.string().optional(),

  documentation_status: z.string().optional(),

  gf_do_type: z.string().optional(),
  gf_do_document: z.string().optional(),
  gf_do_document_name: z.string().optional(),

  im4_im7_type: z.string().optional(),
  im4_im7_document: z.string().optional(),
  im4_im7_document_name: z.string().optional(),

  special_instructions: z.string().optional(),
});

interface Props {
  onSubmit: (
    values: OrderFormValues
  ) => Promise<void>;
  onViewAll?: () => void;
  initialOrder?: any;
}

export default function OrderForm({
  onSubmit,
  onViewAll,
  initialOrder,
}: Props) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [submitError, setSubmitError] = useState<
    string | null
  >(null);

  useEffect(() => {
    fetch(`${API_BASE}/locations`)
      .then((r) => r.json())
      .then(setLocations)
      .catch(console.error);

    fetch(`${API_BASE}/customers`)
      .then((r) => r.json())
      .then(setCustomers)
      .catch(console.error);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bol_number: initialOrder?.bol_number ?? "",
      customer_name: initialOrder?.customer_name ?? "",
      load_type: initialOrder?.load_type ?? undefined,
      pickup_location_id: initialOrder?.pickup_location_id ?? ("" as any),
      delivery_location_id: initialOrder?.delivery_location_id ?? ("" as any),
      consignee_name: initialOrder?.consignee_name ?? "",
      consignee_phone: initialOrder?.consignee_phone ?? "",
      eta_discharge_date: initialOrder?.eta_discharge_date
        ? String(initialOrder.eta_discharge_date).slice(0, 10)
        : "",
      documentation_status: initialOrder?.documentation_status ?? "",
      gf_do_type: initialOrder?.gf_do_type ?? "",
      gf_do_document: initialOrder?.gf_do_document ?? "",
      gf_do_document_name: initialOrder?.gf_do_document_name ?? "",
      im4_im7_type: initialOrder?.im4_im7_type ?? "",
      im4_im7_document: initialOrder?.im4_im7_document ?? "",
      im4_im7_document_name: initialOrder?.im4_im7_document_name ?? "",
      special_instructions: initialOrder?.special_instructions ?? "",
      containers:
        initialOrder?.containers?.length > 0
          ? initialOrder.containers.map((c: any) => ({
              container_number: c.containerNumber ?? c.container_number ?? "",
              container_type: c.containerType ?? c.container_type ?? "",
              weight_tonnes: c.weightTonnes ?? c.weight_tonnes ?? undefined,
              cargo_type: c.cargoType ?? c.cargo_type ?? "",
            }))
          : [
              {
                container_number: "",
                container_type: "",
                weight_tonnes: undefined as any,
                cargo_type: "",
              },
            ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "containers",
  });

  const gfDoType = watch("gf_do_type");
  const im4Im7Type = watch("im4_im7_type");

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const locationOptions = locations.map((l) => ({
    value: String(l.locationId),
    label: l.name,
  }));

  const customerOptions = customers.map((c) => ({
    value: c.name,
    label: c.name,
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
          {initialOrder ? "Edit Order" : "New Order"}
        </h1>

        <p className="text-sm text-gray-500">
          {initialOrder ? "Update customer order and documentation." : "Capture customer order."}
        </p>
      </header>

      <form
        onSubmit={handleSubmit(submit)}
        className="flex flex-col gap-8"
      >
        <FieldGroup title="Cargo" columns={1}>
          <TextField
            label="BOL Number"
            id="bol_number"
            {...register("bol_number")}
            error={errors.bol_number?.message}
          />

          <SelectField
            id="customer_name"
            label="Customer"
            options={customerOptions}
            placeholder="Select customer"
            {...register("customer_name")}
            error={errors.customer_name?.message}
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
            label="ETA Discharge Date"
            id="eta_discharge_date"
            type="date"
            {...register("eta_discharge_date")}
            error={errors.eta_discharge_date?.message}
          />

          <span className="text-sm font-semibold text-ink">Documentation Status</span>

          <div className="rounded-lg border border-navy-950/10 p-4 flex flex-col gap-4">
            <span className="text-sm font-semibold text-ink">GF / DO</span>
            <SelectField
              id="gf_do_type"
              label="GF or DO Given"
              options={GF_DO_OPTIONS}
              {...register("gf_do_type", {
                onChange: (e) => {
                  if (!e.target.value) {
                    setValue("gf_do_document", "");
                    setValue("gf_do_document_name", "");
                  }
                },
              })}
            />
            {gfDoType && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gf_do_document" className="text-sm font-medium text-ink">
                  Upload {gfDoType} Document
                </label>
                <input
                  id="gf_do_document"
                  type="file"
                  accept=".pdf,image/*,.doc,.docx"
                  className="rounded-md border border-navy-600/20 bg-white px-3 py-2 text-sm text-ink"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const data = await readFileAsDataUrl(file);
                    setValue("gf_do_document", data, { shouldDirty: true });
                    setValue("gf_do_document_name", file.name, { shouldDirty: true });
                  }}
                />
                <input type="hidden" {...register("gf_do_document")} />
                <input type="hidden" {...register("gf_do_document_name")} />
                {watch("gf_do_document_name") && (
                  <span className="text-xs text-ink-muted">
                    Selected: {watch("gf_do_document_name")}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-navy-950/10 p-4 flex flex-col gap-4">
            <span className="text-sm font-semibold text-ink">IM4 / IM7</span>
            <SelectField
              id="im4_im7_type"
              label="IM4 or IM7 Given"
              options={IM4_IM7_OPTIONS}
              {...register("im4_im7_type", {
                onChange: (e) => {
                  if (!e.target.value) {
                    setValue("im4_im7_document", "");
                    setValue("im4_im7_document_name", "");
                  }
                },
              })}
            />
            {im4Im7Type && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="im4_im7_document" className="text-sm font-medium text-ink">
                  Upload {im4Im7Type} Document
                </label>
                <input
                  id="im4_im7_document"
                  type="file"
                  accept=".pdf,image/*,.doc,.docx"
                  className="rounded-md border border-navy-600/20 bg-white px-3 py-2 text-sm text-ink"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const data = await readFileAsDataUrl(file);
                    setValue("im4_im7_document", data, { shouldDirty: true });
                    setValue("im4_im7_document_name", file.name, { shouldDirty: true });
                  }}
                />
                <input type="hidden" {...register("im4_im7_document")} />
                <input type="hidden" {...register("im4_im7_document_name")} />
                {watch("im4_im7_document_name") && (
                  <span className="text-xs text-ink-muted">
                    Selected: {watch("im4_im7_document_name")}
                  </span>
                )}
              </div>
            )}
          </div>
        </FieldGroup>

        <FieldGroup title="Containers" columns={1}>
          <p className="text-sm text-ink-muted">
            Add each container with its own number, weight and contents. A single
            order can have multiple containers.
          </p>
          <div className="flex flex-col gap-6">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-lg border border-navy-950/10 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">
                    Container #{index + 1}
                  </span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:underline"
                      onClick={() => remove(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <TextField
                    label="Container Number"
                    id={`containers.${index}.container_number`}
                    placeholder="e.g. MSKU 1234567"
                    {...register(`containers.${index}.container_number`)}
                    error={
                      errors.containers?.[index]?.container_number?.message
                    }
                  />

                  <TextField
                    label="Container Type"
                    id={`containers.${index}.container_type`}
                    placeholder="e.g. 40' Dry, 20' Reefer"
                    {...register(`containers.${index}.container_type`)}
                  />

                  <TextField
                    label="Contents / Cargo Type"
                    id={`containers.${index}.cargo_type`}
                    placeholder="e.g. Electronics"
                    {...register(`containers.${index}.cargo_type`)}
                    error={errors.containers?.[index]?.cargo_type?.message}
                  />

                  <TextField
                    label="Weight (Tonnes)"
                    id={`containers.${index}.weight_tonnes`}
                    type="number"
                    placeholder="e.g. 20"
                    {...register(`containers.${index}.weight_tonnes`)}
                    error={errors.containers?.[index]?.weight_tonnes?.message}
                  />
                </div>
              </div>
            ))}

            {errors.containers && !Array.isArray(errors.containers) && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {errors.containers.message}
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                append({
                  container_number: "",
                  container_type: "",
                  weight_tonnes: undefined as any,
                  cargo_type: "",
                })
              }
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-navy-950/20 px-4 py-3 text-sm font-medium text-navy-700 hover:border-navy-950/40 hover:bg-navy-50"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-950 text-paper">
                ＋
              </span>
              Add Container
            </button>
          </div>
        </FieldGroup>

        <FieldGroup title="Locations" columns={1}>
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

        <FieldGroup title="Consignee" columns={1}>
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