import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { API_BASE } from "../lib/api";
import type { TruckFormValues } from "../types/models";

type TruckRecord = TruckFormValues & {
  id: number | string;
  truckId?: number;
  archivedAt?: string | null;
  archivedBy?: string | null;
  archiveReason?: string | null;
  archiveNote?: string | null;
  insurance_status?: string;
  inspection_status?: string;
  images?: Record<string, string> | null;
};

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

const ARCHIVE_REASONS = ["Sold", "Decommissioned", "Accident/Written off", "Contract ended", "Other"];

const COLUMNS = [
  "image", "registration_number", "logbook_number", "truck_type", "truck_make_model",
  "truck_comesa_policy_number", "truck_comesa_date_expiry", "driver_name",
  "trailer_registration", "logbook_trailer", "trailer_comesa_policy_number", "trailer_comesa_date_expiry",
  "inspection_cert_number", "inspection_expiry", "speed_governor_cert_no", "speed_governor_expiry",
  "truck_insurance_expiry", "tgl_year", "tgl_number", "documents",
] as const;

const COLUMN_LABELS: Record<string, string> = {
  image: "Image", registration_number: "Truck Reg No.", logbook_number: "Truck Logbook No.",
  truck_type: "Truck Type", truck_make_model: "Make/Model",
  truck_comesa_policy_number: "Truck COMESA No.", truck_comesa_date_expiry: "Truck COMESA Expiry",
  driver_name: "Driver Full Names", trailer_registration: "Trailer Reg No.",
  logbook_trailer: "Trailer Logbook No.", trailer_comesa_policy_number: "Trailer COMESA No.",
  trailer_comesa_date_expiry: "Trailer COMESA Expiry", inspection_cert_number: "Inspection Cert No.",
  inspection_expiry: "Inspection Expiry", speed_governor_cert_no: "Speed Governor Cert No.",
  speed_governor_expiry: "Speed Governor Expiry", truck_insurance_expiry: "Insurance Expiry",
  tgl_year: "TGL Year", tgl_number: "TGL No.", documents: "Documents",
};

const BANDS: { label: string; cols: string[] }[] = [
  { label: "TRUCK", cols: ["image", "registration_number", "logbook_number", "truck_type", "truck_make_model", "truck_comesa_policy_number", "truck_comesa_date_expiry", "driver_name"] },
  { label: "TRAILER", cols: ["trailer_registration", "logbook_trailer", "trailer_comesa_policy_number", "trailer_comesa_date_expiry"] },
  { label: "COMPLIANCE", cols: ["inspection_cert_number", "inspection_expiry", "speed_governor_cert_no", "speed_governor_expiry", "truck_insurance_expiry", "tgl_year", "tgl_number"] },
  { label: "DOCUMENTS", cols: ["documents"] },
];

function formatDate(v?: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString();
}

function expiryBadge(v?: string | null): { label: string; cls: string } {
  if (!v) return { label: "Missing", cls: "bg-gray-100 text-gray-500" };
  const d = new Date(v);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: "Expired", cls: "bg-red-100 text-red-700" };
  if (diff <= 30) return { label: `${diff}d`, cls: "bg-amber-100 text-amber-700" };
  return { label: "Valid", cls: "bg-green-100 text-green-700" };
}

function isMissing(v: any): boolean {
  return v === null || v === undefined || v === "" || v === "—";
}

function hasMissingData(t: TruckRecord): boolean {
  return ["registration_number", "logbook_number", "truck_type", "truck_comesa_policy_number", "truck_comesa_date_expiry", "driver_name", "trailer_registration", "logbook_trailer", "trailer_comesa_policy_number", "trailer_comesa_date_expiry", "inspection_cert_number", "inspection_expiry", "speed_governor_cert_no", "speed_governor_expiry", "tgl_year", "tgl_number"].some((k) => isMissing((t as any)[k]));
}

async function fetchTrucks(archived: boolean): Promise<TruckRecord[]> {
  const res = await fetch(`${API_BASE}/trucks?archived=${archived ? "true" : "false"}&limit=500`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const list: any[] = Array.isArray(data) ? data : data.data ?? [];
  return list.map((truck) => ({
    ...truck,
    id: truck.id ?? truck.truckId,
    truck_type: truck.truckType ?? truck.truck_type,
    truck_make_model: truck.truckMakeModel ?? truck.truck_make_model,
    speed_governor_cert_no: truck.speedGovernorCertNo ?? truck.speed_governor_cert_no,
    images: truck.images ?? null,
    insurance_status: truck.insurance_status,
    inspection_status: truck.inspection_status,
  }));
}

export default function TrucksListPage({ onAddTruck, onViewTruck, onEditTruck, canWrite = true }: any) {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [trucks, setTrucks] = useState<TruckRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterExpiry, setFilterExpiry] = useState("");
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<"compact" | "comfortable">(
    (localStorage.getItem("truckDensity") as any) || "compact"
  );
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("truckCols");
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set(COLUMNS);
  });
  const [sortKey, setSortKey] = useState("registration_number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [drawerTruck, setDrawerTruck] = useState<TruckRecord | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [archiveModal, setArchiveModal] = useState<{ ids: string[] } | null>(null);
  const [archiveReason, setArchiveReason] = useState(ARCHIVE_REASONS[0]);
  const [archiveNote, setArchiveNote] = useState("");
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    localStorage.setItem("truckDensity", density);
  }, [density]);
  useEffect(() => {
    localStorage.setItem("truckCols", JSON.stringify([...visibleCols]));
  }, [visibleCols]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrucks(tab === "archived");
      setTrucks(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setSelected(new Set());
  }, [tab]);

  const filtered = useMemo(() => {
    if (!trucks) return [];
    let list = trucks;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        [t.registration_number, t.driver_name, t.logbook_number, t.truck_comesa_policy_number, t.trailer_registration]
          .some((v) => (v || "").toLowerCase().includes(q))
      );
    }
    if (filterType) list = list.filter((t) => (t as any).truck_type === filterType);
    if (showIncomplete) list = list.filter(hasMissingData);
    if (filterExpiry) {
      list = list.filter((t) => {
        const vals = [t.truck_insurance_expiry, t.inspection_expiry, t.speed_governor_expiry, t.truck_comesa_date_expiry, t.trailer?.comesa_date_expiry].filter(Boolean);
        const statuses = vals.map((v) => expiryBadge(v as string).label);
        if (filterExpiry === "expired") return statuses.includes("Expired");
        if (filterExpiry === "expiring") return statuses.some((s) => s !== "Valid" && s !== "Missing" && s !== "Expired");
        if (filterExpiry === "valid") return statuses.length > 0 && statuses.every((s) => s === "Valid");
        return true;
      });
    }
    list = [...list].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [trucks, search, filterType, filterExpiry, showIncomplete, sortKey, sortDir]);

  const summary = useMemo(() => {
    if (!trucks) return { total: 0, expiring: 0, expired: 0, incomplete: 0 };
    let expiring = 0, expired = 0, incomplete = 0;
    trucks.forEach((t) => {
      const vals = [t.truck_insurance_expiry, t.inspection_expiry, t.speed_governor_expiry, t.truck_comesa_date_expiry].filter(Boolean);
      if (vals.some((v) => expiryBadge(v as string).label === "Expired")) expired++;
      else if (vals.some((v) => {
        const b = expiryBadge(v as string).label;
        return b !== "Valid" && b !== "Missing" && b !== "Expired";
      })) expiring++;
      if (hasMissingData(t)) incomplete++;
    });
    return { total: trucks.length, expiring, expired, incomplete };
  }, [trucks]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleCol = (c: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => String(t.id))));
  };

  const doArchive = async () => {
    if (!archiveModal) return;
    setArchiving(true);
    try {
      if (archiveModal.ids.length === 1) {
        const res = await fetch(`${API_BASE}/trucks/${archiveModal.ids[0]}/archive`, {
          method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ reason: archiveReason, note: archiveNote }),
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Archive failed"); }
      } else {
        const res = await fetch(`${API_BASE}/trucks/bulk/archive`, {
          method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ ids: archiveModal.ids, reason: archiveReason, note: archiveNote }),
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Archive failed"); }
      }
      setArchiveModal(null);
      setArchiveReason(ARCHIVE_REASONS[0]);
      setArchiveNote("");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setArchiving(false);
    }
  };

  const doRestore = async (ids: string[]) => {
    try {
      if (ids.length === 1) {
        await fetch(`${API_BASE}/trucks/${ids[0]}/restore`, { method: "POST", headers: authHeaders() });
      } else {
        await fetch(`${API_BASE}/trucks/bulk/restore`, {
          method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ ids }),
        });
      }
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const exportCSV = () => {
    const cols = COLUMNS.filter((c) => visibleCols.has(c) && c !== "image" && c !== "documents");
    const header = cols.map((c) => COLUMN_LABELS[c]).join(",");
    const rows = filtered.map((t) =>
      cols.map((c) => {
        const v = (t as any)[c];
        const val = v === null || v === undefined ? "" : String(v).replace(/,/g, ";");
        return `"${val}"`;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `trucks-${tab}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const pad = density === "compact" ? "px-2 py-1" : "px-3 py-2";
  const imgSize = density === "compact" ? "h-8 w-11" : "h-10 w-14";

  const truckTypes = useMemo(() => {
    const s = new Set<string>();
    (trucks || []).forEach((t) => { if ((t as any).truck_type) s.add((t as any).truck_type); });
    return [...s];
  }, [trucks]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-navy-950/10 pb-2">
        <button
          onClick={() => setTab("active")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "active" ? "bg-navy-950 text-paper" : "text-ink-muted hover:bg-navy-950/5"}`}
        >
          Active ({tab === "active" && trucks ? trucks.length : "…"})
        </button>
        <button
          onClick={() => setTab("archived")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "archived" ? "bg-navy-950 text-paper" : "text-ink-muted hover:bg-navy-950/5"}`}
        >
          Archived ({tab === "archived" && trucks ? trucks.length : "…"})
        </button>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reg, driver, logbook, COMESA…"
            className="rounded-md border border-navy-600/20 px-3 py-1.5 text-sm"
          />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-md border border-navy-600/20 px-2 py-1.5 text-sm">
            <option value="">All types</option>
            {truckTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterExpiry} onChange={(e) => setFilterExpiry(e.target.value)} className="rounded-md border border-navy-600/20 px-2 py-1.5 text-sm">
            <option value="">All expiry</option>
            <option value="expired">Expired</option>
            <option value="expiring">Expiring soon</option>
            <option value="valid">All valid</option>
          </select>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={showIncomplete} onChange={(e) => setShowIncomplete(e.target.checked)} />
            Incomplete
          </label>
          <button onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")} className="rounded-md border border-navy-600/20 px-2 py-1.5 text-sm">
            {density === "compact" ? "Compact" : "Comfortable"}
          </button>
          <div className="relative">
            <details className="group">
              <summary className="cursor-pointer rounded-md border border-navy-600/20 px-2 py-1.5 text-sm">Columns</summary>
              <div className="absolute right-0 z-20 mt-1 max-h-64 w-48 overflow-y-auto rounded-md border border-navy-950/10 bg-white p-2 shadow">
                {COLUMNS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={visibleCols.has(c)} onChange={() => toggleCol(c)} />
                    {COLUMN_LABELS[c]}
                  </label>
                ))}
              </div>
            </details>
          </div>
          <Button onClick={exportCSV}>Export</Button>
          {canWrite && onAddTruck && <Button onClick={onAddTruck}>Add truck</Button>}
        </div>
      </div>

      {/* Summary strip (active tab only) */}
      {tab === "active" && trucks && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total trucks", value: summary.total, filter: () => { setShowIncomplete(false); setFilterExpiry(""); } },
            { label: "Expiring soon", value: summary.expiring, filter: () => setFilterExpiry("expiring") },
            { label: "Expired", value: summary.expired, filter: () => setFilterExpiry("expired") },
            { label: "Incomplete records", value: summary.incomplete, filter: () => setShowIncomplete(true) },
          ].map((s) => (
            <button key={s.label} onClick={s.filter} className="rounded-xl border border-navy-950/10 bg-white p-4 text-left hover:bg-navy-950/[0.02]">
              <div className="text-xs uppercase tracking-wide text-ink-muted">{s.label}</div>
              <div className="mt-1 font-display text-2xl font-semibold text-ink">{s.value}</div>
            </button>
          ))}
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && canWrite && (
        <div className="flex items-center gap-2 rounded-md bg-navy-950/5 px-3 py-2 text-sm">
          <span>{selected.size} selected</span>
          {tab === "active" ? (
            <Button onClick={() => setArchiveModal({ ids: [...selected] })}>Archive selected</Button>
          ) : (
            <Button onClick={() => doRestore([...selected])}>Restore selected</Button>
          )}
          <button onClick={() => setSelected(new Set())} className="text-ink-muted hover:underline">Clear</button>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-navy-950/10">
        {loading ? (
          <div className="p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mb-2 h-8 animate-pulse rounded bg-navy-950/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">No trucks match the filters.</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-navy-950/5 text-xs uppercase tracking-wide text-ink-muted">
              {/* Band row */}
              <tr>
                <th className="sticky left-0 z-20 bg-navy-950/5 px-2 py-1" />
                {BANDS.map((b) => {
                  const visible = b.cols.filter((c) => visibleCols.has(c));
                  if (visible.length === 0) return null;
                  return (
                    <th key={b.label} colSpan={visible.length} className="px-2 py-1 text-center font-semibold">
                      {b.label}
                    </th>
                  );
                })}
                <th className="px-2 py-1" />
              </tr>
              <tr>
                <th className="sticky left-0 z-20 bg-navy-950/5 px-2 py-1">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
                </th>
                {COLUMNS.map((c) => {
                  if (!visibleCols.has(c)) return null;
                  const sticky = c === "image" || c === "registration_number";
                  return (
                    <th
                      key={c}
                      className={`${sticky ? "sticky left-0 z-20 bg-navy-950/5" : ""} ${pad} font-medium`}
                      title={COLUMN_LABELS[c]}
                    >
                      <button onClick={() => toggleSort(c)} className="flex items-center gap-1 truncate">
                        {COLUMN_LABELS[c]}
                        {sortKey === c ? (sortDir === "asc" ? "▲" : "▼") : ""}
                      </button>
                    </th>
                  );
                })}
                <th className="px-2 py-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-950/10">
              {filtered.map((truck) => {
                const frontUrl = resolveImageUrl((truck.images as any)?.truck_front ?? truck.image_url);
                return (
                  <tr key={truck.id} className="hover:bg-navy-950/[0.02]">
                    <td className="sticky left-0 z-10 bg-white px-2 py-1">
                      <input type="checkbox" checked={selected.has(String(truck.id))} onChange={() => toggleSelect(String(truck.id))} />
                    </td>
                    {visibleCols.has("image") && (
                      <td className="sticky left-0 z-10 bg-white px-2 py-1">
                        {frontUrl ? (
                          <img src={frontUrl} alt="" onClick={() => setPreviewImg(frontUrl)} className="h-8 w-11 cursor-pointer rounded border border-navy-950/10 object-cover" />
                        ) : (
                          <span className="text-xs text-gray-400">Missing</span>
                        )}
                      </td>
                    )}
                    {visibleCols.has("registration_number") && (
                      <td className="sticky left-0 z-10 bg-white px-2 py-1 font-mono text-ink">{truck.registration_number}</td>
                    )}
                    {COLUMNS.filter((c) => c !== "image" && c !== "registration_number" && visibleCols.has(c)).map((c) => {
                      if (c === "documents") {
                        const imgs = truck.images || {};
                        const count = Object.keys(imgs).length;
                        return (
                          <td key={c} className={`${pad} text-ink-muted`}>
                            {count > 0 ? `${count} docs` : <span className="text-xs text-gray-400">Missing</span>}
                          </td>
                        );
                      }
                      const v = (truck as any)[c];
                      const isExp = c.includes("expiry") || c.includes("date_expiry");
                      if (isExp) {
                        const b = expiryBadge(v);
                        return (
                          <td key={c} className={pad}>
                            {v ? <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${b.cls}`}>{formatDate(v)} · {b.label}</span> : <span className="text-xs text-gray-400">Missing</span>}
                          </td>
                        );
                      }
                      return (
                        <td key={c} className={`${pad} text-ink-muted`}>
                          {isMissing(v) ? <span className="text-xs text-gray-400">Missing</span> : String(v)}
                        </td>
                      );
                    })}
                    <td className={`${pad} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDrawerTruck(truck)} className="text-xs font-medium text-navy-700 hover:underline">Details</button>
                        {canWrite && (
                          <>
                            <button onClick={() => onEditTruck(truck)} className="text-xs font-medium text-navy-700 hover:underline">Edit</button>
                            {tab === "active" ? (
                              <button onClick={() => setArchiveModal({ ids: [String(truck.id)] })} className="text-xs font-medium text-red-600 hover:underline">Archive</button>
                            ) : (
                              <button onClick={() => doRestore([String(truck.id)])} className="text-xs font-medium text-green-700 hover:underline">Restore</button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Image preview modal */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPreviewImg(null)}>
          <img src={previewImg} alt="" className="max-h-[80vh] max-w-[80vw] rounded" />
        </div>
      )}

      {/* Details drawer */}
      {drawerTruck && (
        <div className="fixed inset-y-0 right-0 z-40 w-96 overflow-y-auto bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{drawerTruck.registration_number}</h2>
            <button onClick={() => setDrawerTruck(null)} className="text-ink-muted">✕</button>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            {COLUMNS.map((c) => {
              if (c === "image" || c === "documents") return null;
              const v = (drawerTruck as any)[c];
              return (
                <div key={c} className="flex justify-between border-b border-navy-950/5 py-1">
                  <span className="text-ink-muted">{COLUMN_LABELS[c]}</span>
                  <span className="font-medium text-ink">{isMissing(v) ? "Missing" : String(v)}</span>
                </div>
              );
            })}
            <div className="mt-3">
              <h3 className="mb-2 text-sm font-semibold">Documents</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(drawerTruck.images || {}).map(([k, url]) => {
                  const u = resolveImageUrl(url);
                  return u ? <img key={k} src={u} alt={k} onClick={() => setPreviewImg(u)} className="h-20 w-full cursor-pointer rounded border object-cover" /> : null;
                })}
              </div>
            </div>
            {drawerTruck.archivedAt && (
              <div className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">
                Archived: {drawerTruck.archiveReason} {drawerTruck.archiveNote ? `— ${drawerTruck.archiveNote}` : ""}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Archive modal */}
      {archiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 font-display text-lg font-semibold">Archive truck{archiveModal.ids.length > 1 ? "s" : ""}</h3>
            <label className="mb-2 block text-sm font-medium">Reason</label>
            <select value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} className="mb-3 w-full rounded-md border border-navy-600/20 px-3 py-2 text-sm">
              {ARCHIVE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <label className="mb-2 block text-sm font-medium">Note (optional)</label>
            <textarea value={archiveNote} onChange={(e) => setArchiveNote(e.target.value)} rows={3} className="mb-4 w-full rounded-md border border-navy-600/20 px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setArchiveModal(null)} className="rounded-md px-3 py-1.5 text-sm text-ink-muted hover:bg-navy-950/5">Cancel</button>
              <Button onClick={doArchive} disabled={archiving}>{archiving ? "Archiving…" : "Archive"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
