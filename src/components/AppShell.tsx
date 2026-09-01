import type { ReactNode } from "react";

export type CaptureSection = "trucks" | "drivers" | "orders" | "allocations" | "customers" | "users" | "reports";

export type SubAction = "view_all" | "add_new";

const NAV_ITEMS: {
  key: CaptureSection;
  label: string;
  hint: string;
  superAdminOnly?: boolean;
  subMenu: { action: SubAction; label: string }[];
}[] = [
  {
    key: "orders",
    label: "Orders",
    hint: "Intake & consignment",
    subMenu: [
      { action: "view_all", label: "View All Orders" },
      { action: "add_new", label: "New Order" },
    ],
  },
  {
    key: "allocations",
    label: "Allocate",
    hint: "Match order to truck",
    subMenu: [
      { action: "view_all", label: "View All Allocations" },
      { action: "add_new", label: "New Allocation" },
    ],
  },
  {
    key: "trucks",
    label: "Trucks",
    hint: "Fleet & compliance",
    subMenu: [
      { action: "view_all", label: "View All Trucks" },
      { action: "add_new", label: "Add Truck" },
    ],
  },
  {
    key: "drivers",
    label: "Drivers",
    hint: "Assignment & records",
    subMenu: [
      { action: "view_all", label: "View All Drivers" },
      { action: "add_new", label: "Add Driver" },
    ],
  },
  {
    key: "customers",
    label: "Customers",
    hint: "Client directory",
    subMenu: [
      { action: "view_all", label: "View All Customers" },
      { action: "add_new", label: "Add Customer" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    hint: "Statistics & exports",
    subMenu: [
      { action: "view_all", label: "View Reports" },
    ],
  },
  {
    key: "users",
    label: "Users",
    hint: "Manage access",
    superAdminOnly: true,
    subMenu: [
      { action: "view_all", label: "View All Users" },
      { action: "add_new", label: "New User" },
    ],
  },
];

interface AppShellProps {
  active: CaptureSection;
  onNavigate: (section: CaptureSection) => void;
  onSubNavigate: (section: CaptureSection, action: SubAction) => void;
  children: ReactNode;
  isSuperAdmin?: boolean;
}

export default function AppShell({
  active,
  onNavigate,
  onSubNavigate,
  children,
  isSuperAdmin,
}: AppShellProps) {
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.superAdminOnly || isSuperAdmin
  );

  return (
    <div className="flex min-h-screen w-full bg-paper font-body">
      <aside className="relative flex w-64 flex-col justify-between bg-navy-950 px-5 py-8 text-paper">
        <div className="absolute inset-y-0 right-0 w-px bg-route-line opacity-40" aria-hidden="true" />

        <div>
          <div className="mb-10 flex items-center gap-2.5 px-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gold-500 font-display text-base font-bold text-navy-950">
              K
            </span>
            <span className="font-display text-sm font-semibold tracking-tight">Kenyt Ops</span>
          </div>

          <nav className="flex flex-col gap-1">
            <p className="mb-2 px-3 font-display text-[11px] font-semibold uppercase tracking-wider text-navy-400">
              Menu
            </p>
            {visibleNavItems.map((item) => {
              const isActive = active === item.key;
              return (
                <div key={item.key} className="flex flex-col">
                  <button
                    onClick={() => onNavigate(item.key)}
                    className={`group flex flex-col rounded-md px-3 py-2.5 text-left transition-colors ${
                      isActive ? "bg-navy-800" : "hover:bg-navy-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                          isActive ? "bg-gold-500" : "bg-navy-600 group-hover:bg-navy-400"
                        }`}
                      />
                      <span
                        className={`font-display text-sm font-medium ${
                          isActive ? "text-gold-400" : "text-paper"
                        }`}
                      >
                        {item.label}
                      </span>
                    </span>
                    <span className="ml-3.5 text-xs text-navy-400">{item.hint}</span>
                  </button>

                  {isActive && (
                    <div className="mt-1 flex flex-col gap-0.5 pl-6">
                      {item.subMenu.map((sub) => {
                        const isViewAll = sub.action === "view_all";
                        return (
                          <button
                            key={sub.action}
                            onClick={() => onSubNavigate(item.key, sub.action)}
                            className={`group flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs transition-colors ${
                              isViewAll
                                ? "text-gold-400 hover:bg-navy-900"
                                : "text-navy-400 hover:bg-navy-900 hover:text-paper"
                            }`}
                          >
                            <span
                              className={`h-1 w-1 rounded-full ${
                                isViewAll ? "bg-gold-500" : "bg-navy-600 group-hover:bg-navy-400"
                              }`}
                            />
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-navy-800 pt-4 text-xs text-navy-400">
          <span className="font-mono">Operations Platform</span>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-10 py-10">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </div>
  );
}