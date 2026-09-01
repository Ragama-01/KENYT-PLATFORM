import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

type ReportKey = "orders" | "drivers" | "orderSummary" | "fleetSummary";

const REPORTS: { key: ReportKey; label: string; description: string }[] = [
  {
    key: "orders",
    label: "Orders by Customer",
    description: "How many orders each customer placed, plus total cargo tonnage.",
  },
  {
    key: "drivers",
    label: "Driver Details",
    description: "Full driver records with assigned truck and current status.",
  },
  {
    key: "orderSummary",
    label: "Order Summary",
    description: "Order totals and breakdowns by status, cargo type and load type.",
  },
  {
    key: "fleetSummary",
    label: "Fleet Summary",
    description: "Truck inventory, fleet status breakdown and compliance alerts.",
  },
];

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCSV(
  filename: string,
  rows: Record<string, unknown>[],
  columnKeys: string[]
) {
  const header = columnKeys.join(",");
  const body = rows
    .map((r) => columnKeys.map((k) => csvEscape(r[k])).join(","))
    .join("\n");
  const blob = new Blob([header + "\n" + body], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface Column {
  key: string;
  label: string;
}

interface DataTableProps {
  data: Record<string, unknown>[];
  columns: Column[];
  emptyText?: string;
}

function DataTable({ data, columns, emptyText = "No data yet." }: DataTableProps) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-muted">{emptyText}</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-navy-950/10">
      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-navy-950/5 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-950/10">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-navy-950/[0.02]">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-ink">
                    {row[c.key] == null || row[c.key] === ""
                      ? "—"
                      : String(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
const ORDER_COLUMNS: Column[] = [
  { key: "customer", label: "Customer" },
  { key: "orderCount", label: "Orders" },
  { key: "totalWeightTonnes", label: "Total Tonnes" },
];

const DRIVER_COLUMNS: Column[] = [
  { key: "fullName", label: "Full Name" },
  { key: "idNumber", label: "ID Number" },
  { key: "phoneNumber", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "kraPin", label: "KRA PIN" },
  { key: "kpaId", label: "KPA ID" },
  { key: "nssfNumber", label: "NSSF" },
  { key: "shifNumber", label: "SHIF" },
  { key: "dateOfJoining", label: "Joined" },
  { key: "status", label: "Status" },
  { key: "truckRegistration", label: "Truck" },
  { key: "truckStatus", label: "Truck Status" },
];

const TRUCK_COLUMNS: Column[] = [
  { key: "registration", label: "Registration" },
  { key: "yearOfManufacture", label: "Year" },
  { key: "capacityTonnes", label: "Capacity (t)" },
  { key: "status", label: "Status" },
  { key: "assignedDriver", label: "Assigned Driver" },
  { key: "trailerRegistration", label: "Trailer" },
];

const ALERT_COLUMNS: Column[] = [
  { key: "registration", label: "Truck" },
  { key: "item", label: "Compliance Item" },
  { key: "expiryDate", label: "Expiry Date" },
];

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number }[];
}) {
  return (
    <div className="rounded-xl border border-navy-950/10">
      <h3 className="border-b border-navy-950/10 px-4 py-3 text-sm font-semibold text-ink">
        {title}
      </h3>
      <div className="max-h-60 overflow-auto">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-navy-950/10">
            {rows.map((r) => (
              <tr key={r.label} className="hover:bg-navy-950/[0.02]">
                <td className="px-4 py-2.5 text-ink">{r.label}</td>
                <td className="px-4 py-2.5 text-right font-medium text-ink">
                  {r.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-navy-950/10 bg-white px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportKey>("orders");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const endpoints: Record<ReportKey, string> = {
      orders: "/reports/orders-by-customer",
      drivers: "/reports/drivers",
      orderSummary: "/reports/order-summary",
      fleetSummary: "/reports/fleet-summary",
    };

    fetch(`${API_BASE}${endpoints[activeReport]}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load report");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load report.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeReport]);
const renderContent = () => {
    if (loading) {
      return <p className="text-sm text-ink-muted">Loading report…</p>;
    }
    if (error) {
      return (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      );
    }
    if (!data) return null;

    switch (activeReport) {
      case "orders": {
        const rows = (data as unknown as Record<string, unknown>[]) ?? [];
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <button
                type="button"
                className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-paper hover:bg-navy-700"
                onClick={() =>
                  downloadCSV(
                    "orders-by-customer.csv",
                    rows,
                    ORDER_COLUMNS.map((c) => c.key)
                  )
                }
              >
                Download CSV
              </button>
            </div>
            <DataTable
              data={rows}
              columns={ORDER_COLUMNS}
              emptyText="No orders yet."
            />
          </div>
        );
      }
      case "drivers": {
        const rows = (data as unknown as Record<string, unknown>[]) ?? [];
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <button
                type="button"
                className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-paper hover:bg-navy-700"
                onClick={() =>
                  downloadCSV(
                    "driver-details.csv",
                    rows,
                    DRIVER_COLUMNS.map((c) => c.key)
                  )
                }
              >
                Download CSV
              </button>
            </div>
            <DataTable
              data={rows}
              columns={DRIVER_COLUMNS}
              emptyText="No drivers yet."
            />
          </div>
        );
      }
      case "orderSummary": {
        const summary = data as {
          totalOrders: number;
          totalWeightTonnes: number;
          byStatus: { label: string; count: number }[];
          byCargoType: { label: string; count: number }[];
          byLoadType: { label: string; count: number }[];
        };
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Total Orders" value={summary.totalOrders} />
              <StatCard
                label="Total Tonnage"
                value={`${summary.totalWeightTonnes} t`}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <BreakdownTable title="By Status" rows={summary.byStatus} />
              <BreakdownTable title="By Cargo Type" rows={summary.byCargoType} />
              <BreakdownTable title="By Load Type" rows={summary.byLoadType} />
            </div>
          </div>
        );
      }
case "fleetSummary": {
        const summary = data as {
          totalTrucks: number;
          byStatus: { status: string; count: number }[];
          rows: Record<string, unknown>[];
          complianceAlerts: Record<string, unknown>[];
        };
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Total Trucks" value={summary.totalTrucks} />
              <div className="rounded-xl border border-navy-950/10 bg-white px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-ink-muted">
                  Fleet Status
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {summary.byStatus.map((s) => (
                    <span
                      key={s.status}
                      className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-700"
                    >
                      {s.status}: {s.count}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Truck Inventory</h3>
                <button
                  type="button"
                  className="rounded-lg border border-navy-950/20 px-3 py-1.5 text-xs font-medium text-ink hover:bg-navy-50"
                  onClick={() =>
                    downloadCSV(
                      "fleet-inventory.csv",
                      summary.rows,
                      TRUCK_COLUMNS.map((c) => c.key)
                    )
                  }
                >
                  Download CSV
                </button>
              </div>
              <DataTable
                data={summary.rows}
                columns={TRUCK_COLUMNS}
                emptyText="No trucks yet."
              />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">
                Compliance Alerts (expiring within 30 days)
              </h3>
              <DataTable
                data={summary.complianceAlerts}
                columns={ALERT_COLUMNS}
                emptyText="No compliance items expiring soon."
              />
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };
return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Reports</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pull operational reports and export them to CSV.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setActiveReport(r.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeReport === r.key
                ? "bg-navy-950 text-paper"
                : "border border-navy-950/20 text-ink hover:bg-navy-50"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <p className="text-sm text-ink-muted">
          {REPORTS.find((r) => r.key === activeReport)?.description}
        </p>
      </div>

      {renderContent()}
    </div>
  );
}