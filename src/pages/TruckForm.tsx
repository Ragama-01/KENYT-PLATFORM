import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextField, FieldGroup } from "../components/FormField";
import { Button } from "../components/Button";
import type { TruckFormValues } from "../types/models";

const currentYear = new Date().getFullYear();

const schema = z
  .object({
    // --- Truck ---
    registration_number: z
      .string()
      .min(1, "Registration number is required")
      .regex(/^K[A-Z]{2}\s?\d{3}[A-Z]$/i, "Expected format e.g. KDA 123B"),
    year_of_manufacture: z.coerce
      .number()
      .int()
      .min(1980, "Enter a valid year")
      .max(currentYear, "Year can't be in the future"),
      capacity_tonnes: z.coerce
      .number()
      .positive("Capacity must be greater than 0"),
    inspection_issued: z.string().min(1, "Required"),
    inspection_expiry: z.string().min(1, "Required"),
    speed_governor_issued: z.string().min(1, "Required"),
    speed_governor_expiry: z.string().min(1, "Required"),

    truck_insurance_issued: z.string().min(1, "Required"),
    truck_insurance_expiry: z.string().min(1, "Required"),
    truck_insurance_ref: z.string().optional(),

    truck_comesa_policy_number: z.string().min(1, "Required"),
    truck_comesa_insurer: z.string().min(1, "Required"),
    truck_comesa_date_taken: z.string().min(1, "Required"),
    truck_comesa_date_expiry: z.string().min(1, "Required"),
    truck_comesa_premium_amount: z.coerce
      .number({ invalid_type_error: "Enter a valid amount" })
      .positive("Enter a valid amount"),

    // --- Trailer ---
    trailer: z
      .object({
        registration_number: z.string().optional(),

        insurance_issued: z.string().optional(),
        insurance_expiry: z.string().optional(),
        insurance_ref: z.string().optional(),

        comesa_policy_number: z.string().optional(),
        comesa_insurer: z.string().optional(),
        comesa_date_taken: z.string().optional(),
        comesa_date_expiry: z.string().optional(),
        comesa_premium_amount: z.coerce
          .number({ invalid_type_error: "Enter a valid amount" })
          .positive("Enter a valid amount")
          .optional(),
      })
      .optional(),
  })
  .refine((d) => d.inspection_expiry > d.inspection_issued, {
    message: "Expiry must be after issue date",
    path: ["inspection_expiry"],
  })
  .refine((d) => d.speed_governor_expiry > d.speed_governor_issued, {
    message: "Expiry must be after issue date",
    path: ["speed_governor_expiry"],
  })
  .refine((d) => d.truck_insurance_expiry > d.truck_insurance_issued, {
    message: "Expiry must be after issue date",
    path: ["truck_insurance_expiry"],
  })
  .refine((d) => d.truck_comesa_date_expiry > d.truck_comesa_date_taken, {
    message: "Expiry must be after date taken",
    path: ["truck_comesa_date_expiry"],
  })
  .refine(
    (d) =>
      !d.trailer?.insurance_issued ||
      !d.trailer?.insurance_expiry ||
      d.trailer.insurance_expiry > d.trailer.insurance_issued,
    {
      message: "Expiry must be after issue date",
      path: ["trailer", "insurance_expiry"],
    }
  )
  .refine(
    (d) =>
      !d.trailer?.comesa_date_taken ||
      !d.trailer?.comesa_date_expiry ||
      d.trailer.comesa_date_expiry > d.trailer.comesa_date_taken,
    {
      message: "Expiry must be after date taken",
      path: ["trailer", "comesa_date_expiry"],
    }
  );

// A truck record on the wire will carry an id once it exists; the form
// itself only ever edits the TruckFormValues fields.
type TruckRecord = TruckFormValues & { id: number | string };

interface TruckFormProps {
  // values includes `id` only when editing an existing truck.
  onSubmit: (values: TruckFormValues & { id?: TruckRecord["id"] }) => void | Promise<void>;
  // Pass an existing truck to switch the form into edit mode.
  // Omit (or pass undefined) for the "add truck" flow.
  truck?: TruckRecord;
  // Called when the "View all trucks" button is clicked. Omit to hide the button.
  onViewAll?: () => void;
}

export default function TruckForm({ onSubmit, truck, onViewAll }: TruckFormProps) {
  const isEditMode = Boolean(truck);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<TruckFormValues>({
    resolver: zodResolver(schema),
    defaultValues: truck,
  });

  // Re-populate if the truck prop changes (record loads after mount,
  // or the user switches which truck they're editing).
  useEffect(() => {
    reset(truck ?? {});
  }, [truck, reset]);

  const submit = async (values: TruckFormValues) => {
    await onSubmit(isEditMode ? { ...values, id: truck!.id } : values);
    if (!isEditMode) reset();
  };

  return (
    <div>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {isEditMode ? "Edit truck" : "Add truck"}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isEditMode
              ? `Updating ${truck?.registration_number ?? "truck"}'s record.`
              : "Vehicle details and current compliance records. Each renewal is logged as its own entry."}
          </p>
        </div>
        {onViewAll && (
          <button
            type="button"
            className="text-sm font-medium text-navy-700 hover:underline"
            onClick={onViewAll}
          >
            View all trucks
          </button>
        )}
      </header>

      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-8">
        <FieldGroup title="Truck">
          <TextField
            id="registration_number"
            label="Registration number"
            mono
            placeholder="KDA 123B"
            error={errors.registration_number?.message}
            {...register("registration_number")}
          />
          <TextField
            id="year_of_manufacture"
            label="Year of manufacture"
            type="number"
            placeholder="2019"
            error={errors.year_of_manufacture?.message}
            {...register("year_of_manufacture")}
          />
          <TextField
    id="capacity_tonnes"
    label="Carrying capacity (Tonnes)"
    type="number"
    placeholder="28.34"
    error={errors.capacity_tonnes?.message}
    {...register("capacity_tonnes")}
  />
        
        </FieldGroup>

        <FieldGroup title="Truck insurance">
          <TextField
            id="truck_insurance_issued"
            label="Issued"
            type="date"
            error={errors.truck_insurance_issued?.message}
            {...register("truck_insurance_issued")}
          />
          <TextField
            id="truck_insurance_expiry"
            label="Expiry"
            type="date"
            error={errors.truck_insurance_expiry?.message}
            {...register("truck_insurance_expiry")}
          />
          <TextField
            id="truck_insurance_ref"
            label="Policy number"
            mono
            error={errors.truck_insurance_ref?.message}
            {...register("truck_insurance_ref")}
          />
        </FieldGroup>

        <FieldGroup title="Truck COMESA">
          <TextField
            id="truck_comesa_policy_number"
            label="Policy number"
            mono
            error={errors.truck_comesa_policy_number?.message}
            {...register("truck_comesa_policy_number")}
          />
          <TextField
            id="truck_comesa_insurer"
            label="Insurer"
            error={errors.truck_comesa_insurer?.message}
            {...register("truck_comesa_insurer")}
          />
          <TextField
            id="truck_comesa_date_taken"
            label="Date taken"
            type="date"
            error={errors.truck_comesa_date_taken?.message}
            {...register("truck_comesa_date_taken")}
          />
          <TextField
            id="truck_comesa_date_expiry"
            label="Date of expiry"
            type="date"
            error={errors.truck_comesa_date_expiry?.message}
            {...register("truck_comesa_date_expiry")}
          />
          <TextField
            id="truck_comesa_premium_amount"
            label="Premium amount"
            type="number"
            placeholder="e.g. 25000"
            error={errors.truck_comesa_premium_amount?.message}
            {...register("truck_comesa_premium_amount")}
          />
        </FieldGroup>

        <FieldGroup title="Inspection">
          <TextField
            id="inspection_issued"
            label="Issued"
            type="date"
            error={errors.inspection_issued?.message}
            {...register("inspection_issued")}
          />
          <TextField
            id="inspection_expiry"
            label="Expiry"
            type="date"
            error={errors.inspection_expiry?.message}
            {...register("inspection_expiry")}
          />
        </FieldGroup>

        <FieldGroup title="Speed governor">
          <TextField
            id="speed_governor_issued"
            label="Issued"
            type="date"
            error={errors.speed_governor_issued?.message}
            {...register("speed_governor_issued")}
          />
          <TextField
            id="speed_governor_expiry"
            label="Renewal due"
            type="date"
            error={errors.speed_governor_expiry?.message}
            {...register("speed_governor_expiry")}
          />
        </FieldGroup>

        <FieldGroup title="Trailer">
          <TextField
            id="trailer.registration_number"
            label="Trailer registration"
            mono
            hint="Leave blank if trailer isn't independently registered"
            placeholder="ZE 4021"
            error={errors.trailer?.registration_number?.message}
            {...register("trailer.registration_number")}
          />
        </FieldGroup>

        <FieldGroup title="Trailer insurance">
          <TextField
            id="trailer.insurance_issued"
            label="Issued"
            type="date"
            error={errors.trailer?.insurance_issued?.message}
            {...register("trailer.insurance_issued")}
          />
          <TextField
            id="trailer.insurance_expiry"
            label="Expiry"
            type="date"
            error={errors.trailer?.insurance_expiry?.message}
            {...register("trailer.insurance_expiry")}
          />
          <TextField
            id="trailer.insurance_ref"
            label="Policy number"
            mono
            error={errors.trailer?.insurance_ref?.message}
            {...register("trailer.insurance_ref")}
          />
        </FieldGroup>

        <FieldGroup title="Trailer COMESA">
          <TextField
            id="trailer.comesa_policy_number"
            label="Policy number"
            mono
            error={errors.trailer?.comesa_policy_number?.message}
            {...register("trailer.comesa_policy_number")}
          />
          <TextField
            id="trailer.comesa_insurer"
            label="Insurer"
            error={errors.trailer?.comesa_insurer?.message}
            {...register("trailer.comesa_insurer")}
          />
          <TextField
            id="trailer.comesa_date_taken"
            label="Date taken"
            type="date"
            error={errors.trailer?.comesa_date_taken?.message}
            {...register("trailer.comesa_date_taken")}
          />
          <TextField
            id="trailer.comesa_date_expiry"
            label="Date of expiry"
            type="date"
            error={errors.trailer?.comesa_date_expiry?.message}
            {...register("trailer.comesa_date_expiry")}
          />
          <TextField
            id="trailer.comesa_premium_amount"
            label="Premium amount"
            type="number"
            placeholder="e.g. 25000"
            error={errors.trailer?.comesa_premium_amount?.message}
            {...register("trailer.comesa_premium_amount")}
          />
        </FieldGroup>

        <div className="flex items-center gap-3 border-t border-navy-950/10 pt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEditMode ? "Save changes" : "Save truck"}
          </Button>
          {isSubmitSuccessful && (
            <span className="text-sm font-medium text-navy-700">
              {isEditMode ? "Changes saved." : "Truck saved."}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}