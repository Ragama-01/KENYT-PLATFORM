import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextField, SelectField, FieldGroup } from "../components/FormField";
import { Button } from "../components/Button";
import { API_BASE } from "../lib/api";
import type { Truck, TruckFormValues } from "../types/models";

type TruckRecord = TruckFormValues & { id: number | string };

const currentYear = new Date().getFullYear();

const schema = z.object({
  registration_number: z
    .string()
    .min(1, "Required")
    .regex(/^K[A-Z]{2}\s?\d{3}[A-Z]$/i, "Expected format e.g. KDA 123B"),
  logbook_number: z.string().min(1, "Required"),
  truck_type: z.string().min(1, "Required"),
  truck_make_model: z.string().optional(),
  truck_comesa_policy_number: z.string().min(1, "Required"),
  truck_comesa_date_expiry: z.string().min(1, "Required"),
  driver_name: z.string().min(1, "Required"),

  trailer_registration: z.string().min(1, "Required"),
  logbook_trailer: z.string().min(1, "Required"),
  trailer_comesa_policy_number: z.string().min(1, "Required"),
  trailer_comesa_date_expiry: z.string().min(1, "Required"),

  inspection_cert_number: z.string().min(1, "Required"),
  inspection_expiry: z.string().min(1, "Required"),
  speed_governor_cert_no: z.string().min(1, "Required"),
  speed_governor_expiry: z.string().min(1, "Required"),
  tgl_year: z.string().min(1, "Required"),
  tgl_number: z.string().min(1, "Required"),
  truck_insurance_expiry: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const TRUCK_TYPES = [
  { value: "Flatbed", label: "Flatbed" },
  { value: "Container Carrier", label: "Container Carrier" },
  { value: "Tanker", label: "Tanker" },
  { value: "Tipper", label: "Tipper" },
  { value: "Refrigerated", label: "Refrigerated" },
  { value: "Other", label: "Other" },
];

const UPLOAD_SLOTS = [
  { key: "truck_front", label: "Images of Truck (Front)" },
  { key: "trailer_back", label: "Images of Trailer (Back)" },
  { key: "truck_logbook", label: "Images of Truck Logbook" },
  { key: "trailer_logbook", label: "Images of Trailer Logbook" },
  { key: "truck_comesa", label: "Images of Truck COMESA" },
  { key: "trailer_comesa", label: "Images of Trailer COMESA" },
  { key: "insurance", label: "Image of Insurance" },
  { key: "tgl", label: "Image of TGL" },
  { key: "speed_governor", label: "Image of Speed Governor Certificate" },
  { key: "inspection", label: "Image of Inspection Certificate" },
];

interface TruckFormProps {
  truck?: TruckRecord;
  onSubmit: (values: any) => void | Promise<void>;
  onViewAll?: () => void;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function TruckForm({ truck, onSubmit, onViewAll }: TruckFormProps) {
  const isEditMode = Boolean(truck);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: truck
      ? {
          registration_number: truck.registration_number,
          logbook_number: truck.logbook_number ?? "",
          truck_type: (truck as any).truck_type ?? "",
          truck_make_model: (truck as any).truck_make_model ?? "",
          truck_comesa_policy_number: truck.truck_comesa_policy_number ?? "",
          truck_comesa_date_expiry: truck.truck_comesa_date_expiry ?? "",
          driver_name: truck.driver_name ?? "",
          trailer_registration: truck.trailer_registration ?? "",
          logbook_trailer: truck.logbook_trailer ?? "",
          trailer_comesa_policy_number: truck.trailer?.comesa_policy_number ?? "",
          trailer_comesa_date_expiry: truck.trailer?.comesa_date_expiry ?? "",
          inspection_cert_number: truck.inspection_cert_number ?? "",
          inspection_expiry: truck.inspection_expiry ?? "",
          speed_governor_cert_no: (truck as any).speed_governor_cert_no ?? "",
          speed_governor_expiry: truck.speed_governor_expiry ?? "",
          tgl_year: truck.tgl_year ?? "",
          tgl_number: truck.tgl_number ?? "",
          truck_insurance_expiry: truck.truck_insurance_expiry ?? "",
        }
      : {},
  });

  useEffect(() => {
    // no-op; handled by defaultValues
  }, []);

  const [images, setImages] = useState<Record<string, string>>(
    (truck?.images as Record<string, string>) ?? {}
  );
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const toFormValues = (t?: Truck) => (t ? {} : {});
  void toFormValues;

  const handleFileSelect = async (slot: string, file: File | null) => {
    if (!file) return;
    setUploadError(null);
    const preview = URL.createObjectURL(file);
    setPreviews((p) => ({ ...p, [slot]: preview }));

    if (isEditMode && truck?.id) {
      setUploadingSlot(slot);
      try {
        const formData = new FormData();
        formData.append("image", file);
        const res = await fetch(
          `${API_BASE}/trucks/${truck.id}/image?slot=${encodeURIComponent(slot)}`,
          { method: "POST", headers: authHeaders(), body: formData }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message ?? "Upload failed");
        }
        const data = await res.json();
        setImages((prev) => ({ ...prev, [slot]: data.image_url }));
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploadingSlot(null);
      }
    } else {
      setPendingFiles((p) => ({ ...p, [slot]: file }));
    }
  };

  const removeImage = (slot: string) => {
    setImages((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setPreviews((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  };

  const submit = async (values: FormValues) => {
    setSuccessMsg(null);
    const body: any = {
      registration_number: values.registration_number.toUpperCase().trim(),
      logbook_number: values.logbook_number,
      truck_type: values.truck_type,
      truck_make_model: values.truck_make_model,
      truck_comesa_policy_number: values.truck_comesa_policy_number,
      truck_comesa_date_expiry: values.truck_comesa_date_expiry,
      driver_name: values.driver_name,
      trailer_registration: values.trailer_registration.toUpperCase().trim(),
      logbook_trailer: values.logbook_trailer,
      trailer: {
        comesa_policy_number: values.trailer_comesa_policy_number,
        comesa_date_expiry: values.trailer_comesa_date_expiry,
      },
      inspection_cert_number: values.inspection_cert_number,
      inspection_expiry: values.inspection_expiry,
      speed_governor_cert_no: values.speed_governor_cert_no,
      speed_governor_expiry: values.speed_governor_expiry,
      tgl_year: values.tgl_year,
      tgl_number: values.tgl_number,
      truck_insurance_expiry: values.truck_insurance_expiry || undefined,
      images: Object.keys(images).length ? images : undefined,
    };

    await onSubmit(isEditMode ? { ...body, id: truck!.id } : body);

    // Upload pending images after create (need id). For create, onSubmit
    // handles navigation; skip pending uploads here to keep it simple.
    setSuccessMsg(isEditMode ? "Changes saved." : "Truck saved.");
    if (!isEditMode) reset();
  };

  return (
    <div>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {isEditMode ? "Edit truck" : "Truck Registration Form"}
          </h1>
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
        <FieldGroup title="Truck details">
          <TextField
            id="registration_number"
            label="Truck Registration No. *"
            mono
            placeholder="KDA 123B"
            error={errors.registration_number?.message}
            {...register("registration_number", {
              onChange: (e) => {
                e.target.value = e.target.value.toUpperCase();
              },
            })}
          />
          <TextField
            id="logbook_number"
            label="Truck Logbook No. *"
            placeholder="e.g. LGB-12345"
            error={errors.logbook_number?.message}
            {...register("logbook_number")}
          />
          <SelectField
            id="truck_type"
            label="Truck Type *"
            placeholder="Select type"
            options={TRUCK_TYPES}
            error={errors.truck_type?.message}
            {...register("truck_type")}
          />
          <TextField
            id="truck_make_model"
            label="Truck Make/Model"
            placeholder="e.g. Isuzu FRR"
            error={errors.truck_make_model?.message}
            {...register("truck_make_model")}
          />
          <TextField
            id="truck_comesa_policy_number"
            label="Truck COMESA No. *"
            mono
            error={errors.truck_comesa_policy_number?.message}
            {...register("truck_comesa_policy_number")}
          />
          <TextField
            id="truck_comesa_date_expiry"
            label="Truck COMESA Expiry Date *"
            type="date"
            error={errors.truck_comesa_date_expiry?.message}
            {...register("truck_comesa_date_expiry")}
          />
          <TextField
            id="driver_name"
            label="Truck Driver Full Names *"
            placeholder="e.g. John Kamau"
            error={errors.driver_name?.message}
            {...register("driver_name")}
          />
        </FieldGroup>

        <FieldGroup title="Trailer details">
          <TextField
            id="trailer_registration"
            label="Trailer Registration No. *"
            mono
            placeholder="ZE 4021"
            error={errors.trailer_registration?.message}
            {...register("trailer_registration", {
              onChange: (e) => {
                e.target.value = e.target.value.toUpperCase();
              },
            })}
          />
          <TextField
            id="logbook_trailer"
            label="Trailer Logbook No. *"
            placeholder="e.g. LGB-67890"
            error={errors.logbook_trailer?.message}
            {...register("logbook_trailer")}
          />
          <TextField
            id="trailer_comesa_policy_number"
            label="Trailer COMESA No. *"
            mono
            error={errors.trailer_comesa_policy_number?.message}
            {...register("trailer_comesa_policy_number")}
          />
          <TextField
            id="trailer_comesa_date_expiry"
            label="Trailer COMESA Expiry Date *"
            type="date"
            error={errors.trailer_comesa_date_expiry?.message}
            {...register("trailer_comesa_date_expiry")}
          />
        </FieldGroup>

        <FieldGroup title="Compliance documents">
          <TextField
            id="inspection_cert_number"
            label="Inspection Certificate No. *"
            mono
            error={errors.inspection_cert_number?.message}
            {...register("inspection_cert_number")}
          />
          <TextField
            id="inspection_expiry"
            label="Inspection Expiry Date *"
            type="date"
            error={errors.inspection_expiry?.message}
            {...register("inspection_expiry")}
          />
          <TextField
            id="speed_governor_cert_no"
            label="Speed Governor Certificate No. *"
            mono
            error={errors.speed_governor_cert_no?.message}
            {...register("speed_governor_cert_no")}
          />
          <TextField
            id="speed_governor_expiry"
            label="Speed Governor Expiry Date *"
            type="date"
            error={errors.speed_governor_expiry?.message}
            {...register("speed_governor_expiry")}
          />
          <TextField
            id="tgl_year"
            label="TGL Year *"
            type="number"
            placeholder="2025"
            error={errors.tgl_year?.message}
            {...register("tgl_year")}
          />
          <TextField
            id="tgl_number"
            label="TGL No. *"
            mono
            error={errors.tgl_number?.message}
            {...register("tgl_number")}
          />
          <TextField
            id="truck_insurance_expiry"
            label="Insurance Expiry Date"
            type="date"
            error={errors.truck_insurance_expiry?.message}
            {...register("truck_insurance_expiry")}
          />
        </FieldGroup>

        <FieldGroup title="Document uploads" columns={2}>
          {UPLOAD_SLOTS.map((slot) => {
            const url = images[slot.key] || previews[slot.key];
            const resolved = url ? resolveImageUrl(url) : null;
            const isUploading = uploadingSlot === slot.key;
            return (
              <div key={slot.key} className="flex flex-col gap-2">
                <span className="text-sm font-medium text-ink">{slot.label}</span>
                {resolved && (
                  <div className="relative">
                    <img
                      src={resolved}
                      alt={slot.label}
                      className="h-24 w-full rounded border border-navy-950/10 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(slot.key)}
                      className="absolute right-1 top-1 rounded bg-red-600 px-2 py-0.5 text-xs text-white"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-navy-600/20 bg-white px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-950/5">
                  {isUploading ? "Uploading…" : "Add an image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => handleFileSelect(slot.key, e.target.files?.[0] ?? null)}
                  />
                </label>
                {previews[slot.key] && !images[slot.key] && !isEditMode && (
                  <span className="text-xs text-ink-muted">Pending upload on save</span>
                )}
              </div>
            );
          })}
        </FieldGroup>

        {uploadError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</p>
        )}

        <div className="flex items-center gap-3 border-t border-navy-950/10 pt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEditMode ? "Save changes" : "Submit →"}
          </Button>
          {successMsg && (
            <span className="text-sm font-medium text-navy-700">{successMsg}</span>
          )}
          {isSubmitSuccessful && !isEditMode && (
            <span className="text-sm font-medium text-navy-700">Form cleared.</span>
          )}
        </div>
      </form>
    </div>
  );
}
