import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextField, TextAreaField, FieldGroup } from "../components/FormField";
import { Button } from "../components/Button";
import { API_BASE } from "../lib/api";
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
    controlTechUnitId: z.coerce
      .number()
      .int()
      .positive("Control Tech Unit ID must be a positive integer")
      .optional(),
    logbook_number: z.string().optional(),

    // Truck insurance
    truck_insurance_issued: z.string().min(1, "Required"),
    truck_insurance_expiry: z.string().min(1, "Required"),
    truck_insurance_ref: z.string().optional(),
    truck_insurance_serial: z.string().optional(),
    truck_insurance_purchase: z.string().optional(),

    // TGL
    tgl_number: z.string().optional(),
    tgl_year: z.string().optional(),

    // Inspection
    inspection_issued: z.string().min(1, "Required"),
    inspection_expiry: z.string().min(1, "Required"),
    inspection_cert_number: z.string().optional(),

    // Speed governor
    speed_governor_issued: z.string().min(1, "Required"),
    speed_governor_expiry: z.string().min(1, "Required"),

    // COMESA
    truck_comesa_policy_number: z.string().min(1, "Required"),
    truck_comesa_insurer: z.string().min(1, "Required"),
    truck_comesa_date_taken: z.string().min(1, "Required"),
    truck_comesa_date_expiry: z.string().min(1, "Required"),
    truck_comesa_premium_amount: z.coerce
      .number({ invalid_type_error: "Enter a valid amount" })
      .positive("Enter a valid amount"),

    // Notes
    factors_to_note: z.string().optional(),

    // --- Trailer ---
    trailer: z
      .object({
        registration_number: z.string().optional(),
    logbook_number: z.string().optional(),

    // New truck details (Phase 1)
    trailer_registration: z.string().optional(),
    tgl_2027: z.string().optional(),
    logbook_truck: z.string().optional(),
    logbook_trailer: z.string().optional(),
    policy_number: z.string().optional(),
    serial_number: z.string().optional(),
    inspection_sticker_no: z.string().optional(),
    driver_name: z.string().optional(),
    image_url: z.string().optional(),

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
  // Uploads a replacement image for an existing truck. Omit to hide the
  // image uploader (e.g. for read-only users or before the truck is saved).
  onImageUpload?: (file: File) => Promise<void>;
}

export default function TruckForm({ onSubmit, truck, onViewAll, onImageUpload }: TruckFormProps) {
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

  // --- Image upload (edit mode only: the backend needs a truck id) ---
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUploaded, setImageUploaded] = useState(false);

  const currentImageUrl = (() => {
    const url = truck?.image_url;
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  })();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImageError(null);
    setImageUploaded(false);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile || !onImageUpload) return;
    setUploadingImage(true);
    setImageError(null);
    try {
      await onImageUpload(imageFile);
      setImageUploaded(true);
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

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
    <TextField
      id="controlTechUnitId"
      label="Control Tech Unit ID"
      type="number"
      placeholder="e.g. 12345"
      hint="Wialon/Control-Tech unit identifier for GPS tracking"
      error={errors.controlTechUnitId?.message}
      {...register("controlTechUnitId")}
    />
    <TextField
      id="logbook_number"
      label="Logbook Number"
      placeholder="e.g. LGB-12345"
      hint="Vehicle logbook number"
      error={errors.logbook_number?.message}
      {...register("logbook_number")}
    />

  </FieldGroup>

        <FieldGroup title="Truck details">
          <TextField
            id="trailer_registration"
            label="Trailer registration"
            mono
            placeholder="e.g. ZE 4021"
            error={errors.trailer_registration?.message}
            {...register("trailer_registration")}
          />
          <TextField
            id="tgl_2027"
            label="TGL 2027"
            mono
            placeholder="e.g. TGL-2027-001"
            error={errors.tgl_2027?.message}
            {...register("tgl_2027")}
          />
          <TextField
            id="logbook_truck"
            label="Logbook (truck)"
            placeholder="e.g. LGB-12345"
            error={errors.logbook_truck?.message}
            {...register("logbook_truck")}
          />
          <TextField
            id="logbook_trailer"
            label="Logbook (trailer)"
            placeholder="e.g. LGB-67890"
            error={errors.logbook_trailer?.message}
            {...register("logbook_trailer")}
          />
          <TextField
            id="policy_number"
            label="Policy number"
            mono
            error={errors.policy_number?.message}
            {...register("policy_number")}
          />
          <TextField
            id="serial_number"
            label="Serial number"
            mono
            error={errors.serial_number?.message}
            {...register("serial_number")}
          />
          <TextField
            id="inspection_sticker_no"
            label="Inspection sticker no."
            mono
            error={errors.inspection_sticker_no?.message}
            {...register("inspection_sticker_no")}
          />
          <TextField
            id="driver_name"
            label="Driver name"
            placeholder="e.g. John Kamau"
            error={errors.driver_name?.message}
            {...register("driver_name")}
          />
        </FieldGroup>

        {onImageUpload && (
          <FieldGroup title="Truck image" columns={1}>
            <div className="flex flex-col gap-3">
              {(imagePreview || currentImageUrl) && (
                <img
                  src={imagePreview ?? currentImageUrl ?? ""}
                  alt="Truck preview"
                  className="h-40 w-auto rounded-lg border border-navy-950/10 object-cover"
                />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleFileChange}
                className="block w-full text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-navy-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-800"
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleImageUpload}
                  disabled={!imageFile || uploadingImage || !isEditMode}
                >
                  {uploadingImage ? "Uploading…" : "Upload image"}
                </Button>
                {!isEditMode && (
                  <span className="text-xs text-ink-muted">
                    Save the truck first, then upload an image.
                  </span>
                )}
                {imageUploaded && (
                  <span className="text-sm font-medium text-navy-700">Image updated.</span>
                )}
              </div>
              {imageError && (
                <span role="alert" className="text-xs font-medium text-red-700">
                  {imageError}
                </span>
              )}
            </div>
          </FieldGroup>
        )}

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
          <TextField
            id="truck_insurance_serial"
            label="Serial number"
            mono
            error={errors.truck_insurance_serial?.message}
            {...register("truck_insurance_serial")}
          />
          <TextField
            id="truck_insurance_purchase"
            label="Purchase date"
            type="date"
            error={errors.truck_insurance_purchase?.message}
            {...register("truck_insurance_purchase")}
          />
        </FieldGroup>

        <FieldGroup title="TGL">
          <TextField
            id="tgl_number"
            label="TGL Number"
            mono
            error={errors.tgl_number?.message}
            {...register("tgl_number")}
          />
          <TextField
            id="tgl_year"
            label="TGL Year"
            type="number"
            error={errors.tgl_year?.message}
            {...register("tgl_year")}
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
          <TextField
            id="inspection_cert_number"
            label="Certificate number"
            mono
            error={errors.inspection_cert_number?.message}
            {...register("inspection_cert_number")}
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
          <TextField
            id="trailer.logbook_number"
            label="Trailer logbook number"
            placeholder="e.g. LGB-12345"
            hint="Trailer logbook number"
            error={errors.trailer?.logbook_number?.message}
            {...register("trailer.logbook_number")}
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

        <FieldGroup title="Notes">
          <TextAreaField
            id="factors_to_note"
            label="Factors to note"
            rows={3}
            placeholder="Any additional notes or factors to note about this truck..."
            error={errors.factors_to_note?.message}
            {...register("factors_to_note")}
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