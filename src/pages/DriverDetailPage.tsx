import { Button } from "../components/Button";
import type { Driver } from "../types/models";

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

interface DriverDetailPageProps {
  driver: Driver;
  onBack: () => void;
  onEdit: () => void;
  // Same lookup shape as DriversListPage — pass the truck's registration
  // number for the driver's assigned truck_id, if any.
  truckLabel?: string;
}

export default function DriverDetailPage({
  driver,
  onBack,
  onEdit,
  truckLabel = "Unassigned",
}: DriverDetailPageProps) {
  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <button
            type="button"
            className="mb-2 text-sm font-medium text-navy-700 hover:underline"
            onClick={onBack}
          >
            ← Back to drivers
          </button>
          <h1 className="font-display text-2xl font-semibold text-ink">{driver.full_name}</h1>
        </div>
        <Button onClick={onEdit}>Edit driver</Button>
      </header>

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Driver</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Full name" value={driver.full_name} />
            <Field label="ID number" value={driver.id_number} />
            <Field label="Date of joining" value={driver.date_of_joining} />
            <Field label="Assigned truck" value={truckLabel} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Contact</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Phone number" value={driver.phone_number} />
            <Field label="Email" value={driver.email} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Statutory</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="KRA PIN" value={driver.kra_pin} />
            <Field label="KPA ID number" value={driver.kpa_id} />
            <Field label="NSSF number" value={driver.nssf_number} />
            <Field label="SHIF/SHA number" value={driver.shif_number} />
          </dl>
        </section>
      </div>
    </div>
  );
}