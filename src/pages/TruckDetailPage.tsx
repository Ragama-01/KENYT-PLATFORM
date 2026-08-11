import { Button } from "../components/Button";
import type { TruckFormValues } from "../types/models";

type TruckRecord = TruckFormValues & { id: number | string };

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

interface TruckDetailPageProps {
  truck: TruckRecord;
  onBack: () => void;
  onEdit: () => void;
}

export default function TruckDetailPage({ truck, onBack, onEdit }: TruckDetailPageProps) {
  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <button
            type="button"
            className="mb-2 text-sm font-medium text-navy-700 hover:underline"
            onClick={onBack}
          >
            ← Back to trucks
          </button>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {truck.registration_number}
          </h1>
        </div>
        <Button onClick={onEdit}>Edit truck</Button>
      </header>

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Truck</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Registration number" value={truck.registration_number} />
            <Field label="Year of manufacture" value={truck.year_of_manufacture} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Truck insurance</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Issued" value={truck.truck_insurance_issued} />
            <Field label="Expiry" value={truck.truck_insurance_expiry} />
            <Field label="Policy number" value={truck.truck_insurance_ref} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Truck COMESA</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Policy number" value={truck.truck_comesa_policy_number} />
            <Field label="Insurer" value={truck.truck_comesa_insurer} />
            <Field label="Date taken" value={truck.truck_comesa_date_taken} />
            <Field label="Date of expiry" value={truck.truck_comesa_date_expiry} />
            <Field label="Premium amount" value={truck.truck_comesa_premium_amount} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Inspection</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Issued" value={truck.inspection_issued} />
            <Field label="Expiry" value={truck.inspection_expiry} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Speed governor</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Issued" value={truck.speed_governor_issued} />
            <Field label="Renewal due" value={truck.speed_governor_expiry} />
          </dl>
        </section>

        {truck.trailer_registration && (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink">Trailer</h2>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="Trailer registration" value={truck.trailer_registration} />
              </dl>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink">Trailer insurance</h2>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="Issued" value={truck.trailer_insurance_issued} />
                <Field label="Expiry" value={truck.trailer_insurance_expiry} />
                <Field label="Policy number" value={truck.trailer_insurance_ref} />
              </dl>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink">Trailer COMESA</h2>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="Policy number" value={truck.trailer_comesa_policy_number} />
                <Field label="Insurer" value={truck.trailer_comesa_insurer} />
                <Field label="Date taken" value={truck.trailer_comesa_date_taken} />
                <Field label="Date of expiry" value={truck.trailer_comesa_date_expiry} />
                <Field label="Premium amount" value={truck.trailer_comesa_premium_amount} />
              </dl>
            </section>
          </>
        )}
      </div>
    </div>
  );
}