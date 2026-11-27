import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { API_BASE } from "../lib/api";

type DriverRecord = {
  id: number | string;
  driver_id?: number;
  full_name: string;
  id_number: string;
  truck_id?: number | null;
  truck?: { registration_number?: string; truckId?: number } | null;
  date_of_joining: string;
  kra_pin: string;
  kpa_id?: string;
  kpa_id_expiry?: string;
  phone_number: string;
  alternative_phone_number?: string;
  email: string;
  nssf_number: string;
  shif_number: string;
  certificate_of_good_conduct?: string;
  status?: string;
  archivedAt?: string | null;
  archivedBy?: string | null;
  archiveReason?: string | null;
  dateOfLeaving?: string | null;
  archiveNote?: string | null;
};

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isAdmin(): boolean {
  try {
    const u = JSON.parse(localStorage.getItem("auth_user") || "{}");
    return u.role === "admin" || u.role === "super_admin";
  } catch { return false; }
}

function mask(v?: string): string {
  if (!v) return "";
  if (v.length <= 3) return v;
  return "•".repeat(v.length - 3) + v.slice(-3);
}

const COLUMNS = [
  "full_name", "id_number", "date_of_joining", "assigned_truck",
  "phone_number", "alternative_phone_number", "email",
  "kra_pin", "kpa_id", "kpa_id_expiry", "nssf_number", "shif_number", "certificate_of_good_conduct",
] as const;

const COLUMN_LABELS: Record<string, string> = {
  full_name: "Full Name", id_number: "ID Number", date_of_joining: "Date of Joining",
  assigned_truck: "Assigned Truck", phone_number: "Phone Number",
  alternative_phone_number: "Alternative Phone Number", email: "Email",
  kra_pin: "KRA PIN", kpa_id: "KPA ID Number", kpa_id_expiry: "KPA ID Expiry Date",
  nssf_number: "NSSF Number", shif_number: "SHIF/SHA Number",
  certificate_of_good_conduct: "Certificate of Good Conduct No.",
};

const BANDS = [
  { label: "DRIVER", cols: ["full_name", "id_number", "date_of_joining", "assigned_truck"] },
  { label: "CONTACT", cols: ["phone_number", "alternative_phone_number", "email"] },
  { label: "STATUTORY", cols: ["kra_pin", "kpa_id", "kpa_id_expiry", "nssf_number", "shif_number", "certificate_of_good_conduct"] },
];

const ARCHIVE_REASONS = ["Resigned", "Terminated", "Retired", "Contract ended", "Other"];

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
  return v === null || v === undefined || v === "";
}

function hasMissingData(d: DriverRecord): boolean {
  return ["full_name", "id_number", "date_of_joining", "phone_number", "email", "kra_pin", "nssf_number", "shif_number"].some((k) => isMissing((d as any)[k]));
}

async function fetchDrivers(archived: boolean): Promise<DriverRecord[]> {
  const res = await fetch(`${API_BASE}/drivers?archived=${archived ? "true" : "false"}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const list: any[] = Array.isArray(data) ? data : data.data ?? [];
  return list.map((d) => ({
    ...d,
    id: d.driver_id ?? d.id,
    full_name: d.fullName ?? d.full_name,
    id_number: d.idNumber ?? d.id_number,
    truck_id: d.truckId ?? d.truck_id,
    truck: d.truck,
    date_of_joining: d.dateOfJoining ?? d.date_of_joining,
    kra_pin: d.kraPin ?? d.kra_pin,
    kpa_id: d.kpaId ?? d.kpa_id,
    kpa_id_expiry: d.kpaIdExpiry ?? d.kpa_id_expiry,
    phone_number: d.phoneNumber ?? d.phone_number,
    alternative_phone_number: d.alternativePhoneNumber ?? d.alternative_phone_number,
    email: d.email,
    nssf_number: d.nssfNumber ?? d.nssf_number,
    shif_number: d.shifNumber ?? d.shif_number,
    certificate_of_good_conduct: d.certificateOfGoodConduct ?? d.certificate_of_good_conduct,
    archivedAt: d.archivedAt ?? d.archived_at,
    archiveReason: d.archiveReason ?? d.archive_reason,
    dateOfLeaving: d.dateOfLeaving ?? d.date_of_leaving,
    archiveNote: d.archiveNote ?? d.archive_note,
  }));
}

export default function DriversListPage({ onAddDriver, onViewDriver, onEditDriver, canWrite = true }: any) {
  const admin = isAdmin();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [drivers, setDrivers] = useState<DriverRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterAssign, setFilterAssign] = useState("");
  const [filterExpiry, setFilterExpiry] = useState("");
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<"compact" | "comfortable">(
    (localStorage.getItem("driverDensity") as any) || "compact"
  );
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("driverCols");
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set(COLUMNS);
  });
  const [sortKey, setSortKey] = useState("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [drawerDriver, setDrawerDriver] = useState<DriverRecord | null>(null);
  const [archiveModal, setArchiveModal] = useState<{ ids: string[] } | null>(null);
  const [archiveReason, setArchiveReason] = useState(ARCHIVE_REASONS[0]);
  const [dateOfLeaving, setDateOfLeaving] = useState("");
  const [archiveNote, setArchiveNote] = useState("");
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [pendingUnassignReg, setPendingUnassignReg] = useState<string | null>(null);
  const [archivedCount, setArchivedCount] = useState<number | null>(null);
const [archiving, setArchiving] = useState(false);

  useEffect(() => { localStorage.setItem("driverDensity", density); }, [density]);
  useEffect(() => { localStorage.setItem("driverCols", JSON.stringify([...visibleCols])); }, [visibleCols]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchDrivers(tab === "archived");
      setDrivers(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); setSelected(new Set()); }, [tab]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/drivers?archived=true`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.data ?? [];
          setArchivedCount(list.length);
        }
      } catch {}
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!drivers) return [];
    let list = drivers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        [d.full_name, d.id_number, d.phone_number, d.kra_pin, d.nssf_number, d.truck?.registration_number]
          .some((v) => (v || "").toLowerCase().includes(q))
      );
    }
    if (filterAssign === "assigned") list = list.filter((d) => d.truck_id);
    if (filterAssign === "unassigned") list = list.filter((d) => !d.truck_id);
    if (showIncomplete) list = list.filter(hasMissingData);
    if (filterExpiry) {
      list = list.filter((d) => {
        const b = expiryBadge(d.kpa_id_expiry).label;
        if (filterExpiry === "expired") return b === "Expired";
        if (filterExpiry === "expiring") return b !== "Valid" && b !== "Missing" && b !== "Expired";
        if (filterExpiry === "valid") return b === "Valid";
        return true;
      });
    }
    list = [...list].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [drivers, search, filterAssign, filterExpiry, showIncomplete, sortKey, sortDir]);

  const summary = useMemo(() => {
    if (!drivers) return { total: 0, unassigned: 0, expiring: 0, expired: 0, incomplete: 0 };
    let unassigned = 0, expiring = 0, expired = 0, incomplete = 0;
    drivers.forEach((d) => {
      if (!d.truck_id) unassigned++;
      const b = expiryBadge(d.kpa_id_expiry).label;
      if (b === "Expired") expired++;
      else if (b !== "Valid" && b !== "Missing") expiring++;
      if (hasMissingData(d)) incomplete++;
    });
    return { total: drivers.length, unassigned, expiring, expired, incomplete };
  }, [drivers]);

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
    else setSelected(new Set(filtered.map((d) => String(d.id))));
  };

  const initiateArchive = (ids: string[]) => {
    setArchiveModal({ ids });
    setArchiveReason(ARCHIVE_REASONS[0]);
    setDateOfLeaving("");
    setArchiveNote("");
    setConfirmUnassign(false);
    setPendingUnassignReg(null);
    if (ids.length === 1) {
      const d = drivers?.find((x) => String(x.id) === ids[0]);
      if (d?.truck?.registration_number) setPendingUnassignReg(d.truck.registration_number);
    }
  };

  const doArchive = async () => {
    if (!archiveModal) return;
    setArchiving(true);
    try {
      if (archiveModal.ids.length === 1 && pendingUnassignReg && !confirmUnassign) {
        // first confirm unassign
        setConfirmUnassign(true);
        setArchiving(false);
        return;
      }
      const body: any = { reason: archiveReason, dateOfLeaving, note: archiveNote };
      if (archiveModal.ids.length === 1 && pendingUnassignReg) body.confirmUnassign = true;
      const url = archiveModal.ids.length === 1
        ? `${API_BASE}/drivers/${archiveModal.ids[0]}/archive`
        : `${API_BASE}/drivers/bulk/archive`;
      if (archiveModal.ids.length > 1) body.ids = archiveModal.ids;
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Archive failed"); }
      setArchiveModal(null);
      setPendingUnassignReg(null);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setArchiving(false); }
  };

  const doRestore = async (ids: string[]) => {
    try {
      const url = ids.length === 1 ? `${API_BASE}/drivers/${ids[0]}/restore` : `${API_BASE}/drivers/bulk/restore`;
      await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: ids.length > 1 ? JSON.stringify({ ids }) : undefined,
      });
      load();
    } catch (e: any) { setError(e.message); }
  };

  const exportCSV = () => {
    const cols = COLUMNS.filter((c) => visibleCols.has(c));
    const adminMode = admin;
    const header = cols.map((c) => COLUMN_LABELS[c]).join(",");
    const sensitive = new Set(["id_number", "kra_pin", "nssf_number", "shif_number"]);
    const rows = filtered.map((d) =>
      cols.map((c) => {
        let v = (d as any)[c];
        if (c === "assigned_truck") v = d.truck?.registration_number || "Unassigned";
        if (sensitive.has(c) && !adminMode) v = mask(v);
        const val = v === null || v === undefined ? "" : String(v).replace(/,/g, ";");
        return `"${val}"`;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `drivers-${tab}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const pad = density === "compact" ? "px-2 py-1" : "px-3 py-2";
  const truckTypes = useMemo(() => {
    const s = new Set<string>();
    (drivers || []).forEach((d) => { if ((d as any).truck_type) s.add((d as any).truck_type); });
    return [...s];
  }, [drivers]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-navy-950/10 pb-2">
        <button onClick={() => setTab("active")} className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "active" ? "bg-navy-950 text-paper" : "text-ink-muted hover:bg-navy-950/5"}`}>
          Active ({tab === "active" && drivers ? drivers.length : "…"})
        </button>
        <button onClick={() => setTab("archived")} className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "archived" ? "bg-navy-950 text-paper" : "text-ink-muted hover:bg-navy-950/5"}`}>
          Archived ({archivedCount ?? (tab === "archived" && drivers ? drivers.length : "…")})
        </button>
        <div className="ml-auto flex items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID, phone, KRA, NSSF, truck…" className="rounded-md border border-navy-600/20 px-3 py-1.5 text-sm" />
          <select value={filterAssign} onChange={(e) => setFilterAssign(e.target.value)} className="rounded-md border border-navy-600/20 px-2 py-1.5 text-sm">
            <option value="">All</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
          <select value={filterExpiry} onChange={(e) => setFilterExpiry(e.target.value)} className="rounded-md border border-navy-600/20 px-2 py-1.5 text-sm">
            <option value="">All expiry</option>
            <option value="expired">Expired</option>
            <option value="expiring">Expiring soon</option>
            <option value="valid">Valid</option>
          </select>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={showIncomplete} onChange={(e) => setShowIncomplete(e.target.checked)} />
            Incomplete
          </label>
          <button onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")} className="rounded-md border border-navy-600/20 px-2 py-1.5 text-sm">
            {density === "compact" ? "Compact" : "Comfortable"}
          </button>
          <details className="group relative">
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
          <Button onClick={exportCSV}>Export</Button>
          {canWrite && onAddDriver && <Button onClick={onAddDriver}>Add driver</Button>}
        </div>
      </div>

      {tab === "active" && drivers && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total drivers", value: summary.total, filter: () => { setShowIncomplete(false); setFilterExpiry(""); setFilterAssign(""); } },
            { label: "Unassigned", value: summary.unassigned, filter: () => setFilterAssign("unassigned") },
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

      <div className="flex-1 overflow-auto rounded-xl border border-navy-950/10">
        {loading ? (
          <div className="p-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="mb-2 h-8 animate-pulse rounded bg-navy-950/5" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">No drivers match the filters.</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-navy-950/5 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="sticky left-0 z-20 bg-navy-950/5 px-2 py-1" />
                {BANDS.map((b) => {
                  const visible = b.cols.filter((c) => visibleCols.has(c));
                  if (visible.length === 0) return null;
                  return <th key={b.label} colSpan={visible.length} className="px-2 py-1 text-center font-semibold">{b.label}</th>;
                })}
                <th className="px-2 py-1" />
              </tr>
              <tr>
                <th className="sticky left-0 z-20 bg-navy-950/5 px-2 py-1">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
                </th>
                {COLUMNS.map((c) => {
                  if (!visibleCols.has(c)) return null;
                  const sticky = c === "full_name";
                  return (
                    <th key={c} className={`${sticky ? "sticky left-0 z-20 bg-navy-950/5" : ""} ${pad} font-medium`} title={COLUMN_LABELS[c]}>
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
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-navy-950/[0.02]">
                  <td className="sticky left-0 z-10 bg-white px-2 py-1">
                    <input type="checkbox" checked={selected.has(String(d.id))} onChange={() => toggleSelect(String(d.id))} />
                  </td>
                  {visibleCols.has("full_name") && (
                    <td className="sticky left-0 z-10 bg-white px-2 py-1 font-medium text-ink">{d.full_name}</td>
                  )}
                  {COLUMNS.filter((c) => c !== "full_name" && visibleCols.has(c)).map((c) => {
                    if (c === "assigned_truck") {
                      const reg = d.truck?.registration_number;
                      return (
                        <td key={c} className={`${pad} text-ink-muted`}>
                          {reg ? <span className="text-navy-700">{reg}</span> : <span className="text-xs text-gray-400">Unassigned</span>}
                        </td>
                      );
                    }
                    if (c === "kpa_id_expiry") {
                      const b = expiryBadge(d.kpa_id_expiry);
                      return (
                        <td key={c} className={pad}>
                          {d.kpa_id_expiry ? <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${b.cls}`}>{formatDate(d.kpa_id_expiry)} · {b.label}</span> : <span className="text-xs text-gray-400">Missing</span>}
                        </td>
                      );
                    }
                    const v = (d as any)[c];
                    const sensitive = new Set(["id_number", "kra_pin", "nssf_number", "shif_number"]);
                    const display = sensitive.has(c) && !admin ? mask(v) : (isMissing(v) ? null : v);
                    return (
                      <td key={c} className={`${pad} text-ink-muted`}>
                        {isMissing(v) ? <span className="text-xs text-gray-400">Missing</span> : String(display)}
                      </td>
                    );
                  })}
                  <td className={`${pad} text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setDrawerDriver(d)} className="text-xs font-medium text-navy-700 hover:underline">Details</button>
                      {canWrite && (
                        <>
                          <button onClick={() => onEditDriver(d)} className="text-xs font-medium text-navy-700 hover:underline">Edit</button>
                          {tab === "active" ? (
                            <button onClick={() => initiateArchive([String(d.id)])} className="text-xs font-medium text-red-600 hover:underline">Archive</button>
                          ) : (
                            <button onClick={() => doRestore([String(d.id)])} className="text-xs font-medium text-green-700 hover:underline">Restore</button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {drawerDriver && (
        <div className="fixed inset-y-0 right-0 z-40 w-96 overflow-y-auto bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{drawerDriver.full_name}</h2>
            <button onClick={() => setDrawerDriver(null)} className="text-ink-muted">✕</button>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            {COLUMNS.map((c) => {
              if (c === "assigned_truck") return null;
              const v = (drawerDriver as any)[c];
              const sensitive = new Set(["id_number", "kra_pin", "nssf_number", "shif_number"]);
              const display = sensitive.has(c) && !admin ? mask(v) : (isMissing(v) ? "Missing" : v);
              return (
                <div key={c} className="flex justify-between border-b border-navy-950/5 py-1">
                  <span className="text-ink-muted">{COLUMN_LABELS[c]}</span>
                  <span className="font-medium text-ink">{isMissing(v) ? "Missing" : String(display)}</span>
                </div>
              );
            })}
            <div className="flex justify-between border-b border-navy-950/5 py-1">
              <span className="text-ink-muted">Assigned Truck</span>
              <span className="font-medium text-ink">{drawerDriver.truck?.registration_number || "Unassigned"}</span>
            </div>
            {drawerDriver.archivedAt && (
              <div className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">
                Archived: {drawerDriver.archiveReason} {drawerDriver.dateOfLeaving ? `on ${formatDate(drawerDriver.dateOfLeaving)}` : ""} {drawerDriver.archiveNote ? `— ${drawerDriver.archiveNote}` : ""}
              </div>
            )}
          </div>
        </div>
      )}

      {archiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 font-display text-lg font-semibold">Archive driver{archiveModal.ids.length > 1 ? "s" : ""}</h3>
            {pendingUnassignReg && !confirmUnassign && (
              <p className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-700">
                This will unassign {pendingUnassignReg}.
              </p>
            )}
            <label className="mb-2 block text-sm font-medium">Reason</label>
            <select value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} className="mb-3 w-full rounded-md border border-navy-600/20 px-3 py-2 text-sm">
              {ARCHIVE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <label className="mb-2 block text-sm font-medium">Date of leaving</label>
            <input type="date" value={dateOfLeaving} onChange={(e) => setDateOfLeaving(e.target.value)} className="mb-3 w-full rounded-md border border-navy-600/20 px-3 py-2 text-sm" />
            <label className="mb-2 block text-sm font-medium">Note (optional)</label>
            <textarea value={archiveNote} onChange={(e) => setArchiveNote(e.target.value)} rows={3} className="mb-4 w-full rounded-md border border-navy-600/20 px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setArchiveModal(null)} className="rounded-md px-3 py-1.5 text-sm text-ink-muted hover:bg-navy-950/5">Cancel</button>
              <Button onClick={doArchive} disabled={archiving}>
                {archiving ? "Archiving…" : confirmUnassign ? "Confirm unassign & archive" : "Archive"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
