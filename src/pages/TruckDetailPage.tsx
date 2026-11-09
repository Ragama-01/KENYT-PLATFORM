import { Button } from "../components/Button";
import type {
  TruckFormValues,
  TruckInsuranceHistory,
  TruckTGLHistory,
  TruckInspectionHistory,
  TrailerInsuranceHistory,
  TrailerCOMESAHistory,
} from "../types/models";

type TruckRecord = TruckFormValues & {
  id: number | string;
  insuranceHistory?: TruckInsuranceHistory[];
  tglHistory?: TruckTGLHistory[];
  inspectionHistory?: TruckInspectionHistory[];
  trailerInsuranceHistory?: TrailerInsuranceHistory[];
  trailerCOMESAHistory?: TrailerCOMESAHistory[];
};

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
  const trailer = truck.trailer;

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
            <Field label="Capacity (tonnes)" value={truck.capacity_tonnes} />
            <Field label="Control Tech Unit ID" value={truck.controlTechUnitId} />
            <Field label="Logbook number" value={truck.logbook_number} />
            <Field label="TGL number" value={truck.tgl_number} />
            <Field label="TGL year" value={truck.tgl_year} />
            <Field label="Factors to note" value={truck.factors_to_note} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Truck insurance</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Issued" value={truck.truck_insurance_issued} />
            <Field label="Expiry" value={truck.truck_insurance_expiry} />
            <Field label="Policy number" value={truck.truck_insurance_ref} />
            <Field label="Serial number" value={truck.truck_insurance_serial} />
            <Field label="Purchase date" value={truck.truck_insurance_purchase} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">TGL</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="TGL number" value={truck.tgl_number} />
            <Field label="TGL year" value={truck.tgl_year} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Inspection</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Issued" value={truck.inspection_issued} />
            <Field label="Expiry" value={truck.inspection_expiry} />
            <Field label="Certificate number" value={truck.inspection_cert_number} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Speed governor</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Issued" value={truck.speed_governor_issued} />
            <Field label="Renewal due" value={truck.speed_governor_expiry} />
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

        {trailer && (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink">Trailer</h2>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="Trailer registration" value={trailer.registration_number} />
                <Field label="Trailer logbook number" value={trailer.logbook_number} />
              </dl>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink">Trailer insurance</h2>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="Issued" value={trailer.insurance_issued} />
                <Field label="Expiry" value={trailer.insurance_expiry} />
                <Field label="Policy number" value={trailer.insurance_ref} />
              </dl>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink">Trailer COMESA</h2>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="Policy number" value={trailer.comesa_policy_number} />
                <Field label="Insurer" value={trailer.comesa_insurer} />
                <Field label="Date taken" value={trailer.comesa_date_taken} />
                <Field label="Date of expiry" value={trailer.comesa_date_expiry} />
                <Field label="Premium amount" value={trailer.comesa_premium_amount} />
              </dl>
            </section>
          </>
        )}

        {/* History Sections */}
        {(truck.insuranceHistory && truck.insuranceHistory.length > 0) && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">Truck Insurance History</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {truck.insuranceHistory.map((h, i) => (
                <div key={i} className="col-span-4 border-b border-navy-950/10 py-2">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Field label="Policy number" value={h.policyNumber} />
                    <Field label="Serial number" value={h.serialNumber} />
                    <Field label="Insurer" value={h.insurer} />
                    <Field label="Issued" value={h.issuedDate} />
                    <Field label="Expiry" value={h.expiryDate} />
                    <Field label="Purchase date" value={h.purchaseDate} />
                    <Field label="Premium" value={h.premiumAmount} />
                    <Field label="Notes" value={h.notes} />
                    <Field label="Recorded" value={h.createdAt} />
                  </div>
                </div>
              ))}
            </dl>
          </section>
        )}

        {(truck.tglHistory && truck.tglHistory.length > 0) && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">TGL History</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {truck.tglHistory.map((h, i) => (
                <div key={i} className="col-span-4 border-b border-navy-950/10 py-2">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Field label="TGL number" value={h.tglNumber} />
                    <Field label="TGL year" value={h.tglYear} />
                    <Field label="Issued" value={h.issuedDate} />
                    <Field label="Expiry" value={h.expiryDate} />
                    <Field label="Notes" value={h.notes} />
                    <Field label="Recorded" value={h.createdAt} />
                  </div>
                </div>
              ))}
            </dl>
          </section>
        )}

        {(truck.inspectionHistory && truck.inspectionHistory.length > 0) && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">Inspection History</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {truck.inspectionHistory.map((h, i) => (
                <div key={i} className="col-span-4 border-b border-navy-950/10 py-2">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Field label="Cert number" value={h.certNumber} />
                    <Field label="Inspection body" value={h.inspectionBody} />
                    <Field label="Issued" value={h.issuedDate} />
                    <Field label="Expiry" value={h.expiryDate} />
                    <Field label="Notes" value={h.notes} />
                    <Field label="Recorded" value={h.createdAt} />
                  </div>
                </div>
              ))}
            </dl>
          </section>
        )}

        {trailer && (truck.trailerInsuranceHistory && truck.trailerInsuranceHistory.length > 0) && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">Trailer Insurance History</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {truck.trailerInsuranceHistory.map((h, i) => (
                <div key={i} className="col-span-4 border-b border-navy-950/10 py-2">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Field label="Policy number" value={h.policyNumber} />
                    <Field label="Insurer" value={h.insurer} />
                    <Field label="Issued" value={h.issuedDate} />
                    <Field label="Expiry" value={h.expiryDate} />
                    <Field label="Premium" value={h.premiumAmount} />
                    <Field label="Notes" value={h.notes} />
                    <Field label="Recorded" value={h.createdAt} />
                  </div>
                </div>
              ))}
            </dl>
          </section>
        )}

        {trailer && (truck.trailerCOMESAHistory && truck.trailerCOMESAHistory.length > 0) && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">Trailer COMESA History</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {truck.trailerCOMESAHistory.map((h, i) => (
                <div key={i} className="col-span-4 border-b border-navy-950/10 py-2">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Field label="Policy number" value={h.policyNumber} />
                    <Field label="Insurer" value={h.insurer} />
                    <Field label="Date taken" value={h.dateTaken} />
                    <Field label="Date expiry" value={h.dateExpiry} />
                    <Field label="Premium" value={h.premiumAmount} />
                    <Field label="Notes" value={h.notes} />
                    <Field label="Recorded" value={h.createdAt} />
                  </div>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}