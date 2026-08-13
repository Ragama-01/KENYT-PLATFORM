import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextField, SelectField, FieldGroup } from "../components/FormField";
import { Button } from "../components/Button";
import type { Driver } from "../types/models";

const schema = z.object({
  full_name: z.string().min(2, "Enter the driver's full name"),
  id_number: z.string().regex(/^\d{6,10}$/, "Enter a valid national ID number"),
  truck_id: z.string().optional(),
  date_of_joining: z.string().min(1, "Required"),

  kra_pin: z
    .string()
    .regex(/^[A-Z]\d{9}[A-Z]$/i, "Expected format e.g. A012345678Z"),
  kpa_id: z.string().optional(),
  phone_number: z
    .string()
    .regex(/^(?:\+254|0)7\d{8}$|^(?:\+254|0)1\d{8}$/, "Enter a valid Kenyan phone number"),
  email: z.string().email("Enter a valid email address"),
  nssf_number: z.string().min(1, "Required"),
  shif_number: z.string().min(1, "Required"),
});

type DriverFormValues = z.infer<typeof schema>;

interface DriverFormProps {
  // Populate from GET /trucks — kept as a prop so this form has no
  // hidden data dependency and is easy to test / storybook.
  truckOptions: { value: string; label: string }[];
  onSubmit: (values: Omit<Driver, "status">) => void | Promise<void>;
  // Pass an existing driver to switch the form into edit mode.
  // Omit (or pass undefined) for the "add driver" flow.
  driver?: Driver;
  // Called when the "View all drivers" button is clicked. Omit to hide the button.
  onViewAll?: () => void;
}

function toFormValues(driver?: Driver): Partial<DriverFormValues> {
  if (!driver) return {};
  return {
    full_name: driver.full_name,
    id_number: driver.id_number,
    truck_id: driver.truck_id != null ? String(driver.truck_id) : undefined,
    date_of_joining: driver.date_of_joining,
    kra_pin: driver.kra_pin,
    kpa_id: driver.kpa_id,
    phone_number: driver.phone_number,
    email: driver.email,
    nssf_number: driver.nssf_number,
    shif_number: driver.shif_number,
  };
}

export default function DriverForm({ truckOptions, onSubmit, driver, onViewAll }: DriverFormProps) {
  const isEditMode = Boolean(driver);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<DriverFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(driver),
  });

  // Re-populate the form if the driver prop changes (e.g. the record
  // finishes loading after the form has already mounted, or the user
  // picks a different driver to edit without unmounting the form).
  useEffect(() => {
    reset(toFormValues(driver));
  }, [driver, reset]);

  const submit = async (values: DriverFormValues) => {
    await onSubmit({
      ...(isEditMode ? { id: driver!.id } : {}),
      full_name: values.full_name,
      id_number: values.id_number,
      truck_id: values.truck_id ? Number(values.truck_id) : null,
      date_of_joining: values.date_of_joining,
      kra_pin: values.kra_pin,
      kpa_id: values.kpa_id,
      phone_number: values.phone_number,
      email: values.email,
      nssf_number: values.nssf_number,
      shif_number: values.shif_number,
    } as Omit<Driver, "status">);

    // Only clear the form back to blank on create; on edit, keep the
    // just-saved values showing instead of wiping the fields.
    if (!isEditMode) reset();
  };

  return (
    <div>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {isEditMode ? "Edit driver" : "Add driver"}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isEditMode
              ? `Updating ${driver?.full_name ?? "driver"}'s record.`
              : "Driver record and current truck assignment."}
          </p>
        </div>
        {onViewAll && (
          <button
            type="button"
            className="text-sm font-medium text-navy-700 hover:underline"
            onClick={onViewAll}
          >
            View all drivers
          </button>
        )}
      </header>

      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-8">
        <FieldGroup title="Driver">
          <TextField
            id="full_name"
            label="Full name"
            placeholder="Jane Wanjiku"
            error={errors.full_name?.message}
            {...register("full_name")}
          />
          <TextField
            id="id_number"
            label="ID number"
            mono
            placeholder="29876543"
            error={errors.id_number?.message}
            {...register("id_number")}
          />
          <TextField
            id="date_of_joining"
            label="Date of joining"
            type="date"
            error={errors.date_of_joining?.message}
            {...register("date_of_joining")}
          />
          <SelectField
            id="truck_id"
            label="Assigned truck"
            placeholder="Unassigned"
            hint="Can be left unassigned and set later"
            options={truckOptions}
            error={errors.truck_id?.message}
            {...register("truck_id")}
          />
        </FieldGroup>

        <FieldGroup title="Contact">
          <TextField
            id="phone_number"
            label="Phone number"
            mono
            placeholder="0712345678"
            error={errors.phone_number?.message}
            {...register("phone_number")}
          />
          <TextField
            id="email"
            label="Email"
            type="email"
            placeholder="jane.wanjiku@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
        </FieldGroup>

        <FieldGroup title="Statutory">
          <TextField
            id="kra_pin"
            label="KRA PIN"
            mono
            placeholder="A012345678Z"
            error={errors.kra_pin?.message}
            {...register("kra_pin")}
          />
          <TextField
            id="kpa_id"
            label="KPA ID number"
            mono
            placeholder="e.g. KPA-12345"
            error={errors.kpa_id?.message}
            {...register("kpa_id")}
          />
          <TextField
            id="nssf_number"
            label="NSSF number"
            mono
            error={errors.nssf_number?.message}
            {...register("nssf_number")}
          />
          <TextField
            id="shif_number"
            label="SHIF/SHA number"
            mono
            error={errors.shif_number?.message}
            {...register("shif_number")}
          />
        </FieldGroup>

        <div className="flex items-center gap-3 border-t border-navy-950/10 pt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEditMode ? "Save changes" : "Save driver"}
          </Button>
          {isSubmitSuccessful && (
            <span className="text-sm font-medium text-navy-700">
              {isEditMode ? "Changes saved." : "Driver saved."}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}