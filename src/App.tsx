import { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import AppShell, { type CaptureSection, type SubAction } from "./components/AppShell";
import TruckForm from "./pages/TruckForm";
import DriverForm from "./pages/DriverForm";
import TrucksListPage from "./pages/TrucksListPage";
import DriversListPage from "./pages/DriversListPage";
import TruckDetailPage from "./pages/TruckDetailPage";
import DriverDetailPage from "./pages/DriverDetailPage";
import OrderForm from "./pages/OrderForm";
import OrdersListPage from "./pages/OrdersListPage";
import AllocationForm from "./pages/AllocationForm";
import AllocationsListPage from "./pages/AllocationsListPage";
import UsersListPage from "./pages/UsersListPage";
import UserForm from "./pages/UserForm";
import CustomerForm from "./pages/CustomerForm";
import CustomersListPage from "./pages/CustomersListPage";
import ReportsPage from "./pages/ReportsPage";

import { API_BASE } from "./lib/api";
import type {
  TruckFormValues,
  Driver,
  OrderFormValues,
  Customer,
  CustomerFormValues,
} from "./types/models";

type User = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
};

type TruckRecord = TruckFormValues & {
  id: number | string;
};

type UserView =
  | { mode: "form"; user?: User }
  | { mode: "list" };

type CustomerView =
  | { mode: "form"; customer?: Customer }
  | { mode: "list" };

async function loginRequest(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Invalid credentials");
  }

  const data = await res.json();
  return data.user;
}

type TruckView =
  | { mode: "form"; truck?: TruckRecord }
  | { mode: "list" }
  | { mode: "detail"; truck: TruckRecord };

type DriverView =
  | { mode: "form"; driver?: Driver }
  | { mode: "list" }
  | { mode: "detail"; driver: Driver };

type OrderView =
  | { mode: "form"; order?: any }
  | { mode: "list" }
  | { mode: "detail"; order: any };

type AllocationView =
  | { mode: "form" }
  | { mode: "list" }
  | { mode: "detail"; allocation: any };

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Google sign-in callback: the backend redirects back here with the user
  // payload (?google_user=...) or an error code (?google_error=...).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleUser = params.get("google_user");
    const googleError = params.get("google_error");
    if (!googleUser && !googleError) return;

    if (googleUser) {
      try {
        const user = JSON.parse(
          atob(googleUser.replace(/-/g, "+").replace(/_/g, "/"))
        ) as User;
        setCurrentUser(user);
        setAuthed(true);
      } catch {
        // fall through to the error case below
      }
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const [section, setSection] =
    useState<CaptureSection>("orders");

  const [truckView, setTruckView] =
    useState<TruckView>({
      mode: "list",
    });

  const [driverView, setDriverView] =
    useState<DriverView>({
      mode: "list",
    });

  const [orderView, setOrderView] =
    useState<OrderView>({
      mode: "list",
    });

  const [allocationView, setAllocationView] =
    useState<AllocationView>({
      mode: "list",
    });

  const [userView, setUserView] =
    useState<UserView>({
      mode: "list",
    });

  const [customerView, setCustomerView] =
    useState<CustomerView>({
      mode: "list",
    });

  // ------------------------
  // Live data
  // ------------------------

  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  async function loadOrders() {
    const res = await fetch(`${API_BASE}/orders`);

    const data = await res.json();

    // Transform API response from camelCase to snake_case to match frontend types
    const transformed = data.map((order: any) => ({
      ...order,
      orderId: order.orderId,
      bol_number: order.bolNumber,
      customer_name: order.customerName,
      weight_tonnes: order.cargoWeightTonnes,
      cargo_type: order.cargoType,
      load_type: order.loadType,
      container_number: order.containerNumber,
      container_type: order.containerType,
      containers: order.containers || [],
      pickup_location_id: order.pickupLocation?.locationId,
      delivery_location_id: order.deliveryLocation?.locationId,
      pickup_location_name: order.pickupLocation?.name,
      delivery_location_name: order.deliveryLocation?.name,
      consignee_name: order.consigneeName,
      consignee_phone: order.consigneePhone,
      free_storage_days: order.freeStorageDays,
      eta_discharge_date: order.etaDischargeDate,
      documentation_status: order.documentationStatus,
      special_instructions: order.specialInstructions,
    }));

    console.log("Loaded orders:", transformed);
    setOrders(transformed);
  }

  // Only show pending (non-allocated) orders in the allocation dropdown
  const pendingOrders = orders.filter(
    (o) => o.status !== "allocated"
  );

  async function loadTrucks() {
    const res = await fetch(`${API_BASE}/trucks`);

    const data = await res.json();

    // Transform API response to ensure consistent field names
    const transformed = data.map((truck: any) => ({
      ...truck,
      truckId: truck.truckId || truck.id,
      registration_number: truck.registration_number,
      capacity_tonnes: truck.capacity_tonnes,
      status: truck.status,
    }));

    setTrucks(transformed);
  }

  async function loadDrivers() {
    const res = await fetch(`${API_BASE}/drivers`);

    const data = await res.json();

    // Transform API response from camelCase to snake_case to match frontend types
    const transformed = data.map((driver: any) => ({
      ...driver,
      id: driver.driverId,
      full_name: driver.fullName,
      id_number: driver.idNumber,
      truck_id: driver.truckId,
      date_of_joining: driver.dateOfJoining,
      kra_pin: driver.kraPin,
      kpa_id: driver.kpaId,
      phone_number: driver.phoneNumber,
      nssf_number: driver.nssfNumber,
      shif_number: driver.shifNumber,
    }));

    console.log("Loaded drivers:", transformed);
    setDrivers(transformed);
  }

  async function loadUsers() {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data);
  }

  useEffect(() => {
    if (!authed) return;

    loadOrders();
    loadTrucks();
    loadDrivers();
    loadUsers();
  }, [authed]);

  if (!authed) {
    return (
      <LoginPage
        onSubmit={async (email, password) => {
          const user = await loginRequest(email, password);
          setCurrentUser(user);
          setAuthed(true);
        }}
      />
    );
  }

  const isSuperAdmin = currentUser?.role === "super_admin";

  async function handleSaveUser(values: {
    email: string;
    password?: string;
    fullName: string;
    role: string;
    isActive: boolean;
  }) {
    const isEdit = userView.mode === "form" && userView.user;
    const url = isEdit
      ? `${API_BASE}/users/${userView.user!.id}`
      : `${API_BASE}/users`;

    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to save user");
    }

    await loadUsers();
    setUserView({ mode: "list" });
  }

  async function handleDeleteUser(id: number) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to delete user");
    }

    await loadUsers();
  }

  const handleSectionNavigate = (newSection: CaptureSection) => {
    setSection(newSection);
    // Reset sub-view based on section
    if (newSection === "trucks") {
      setTruckView({ mode: "list" });
    } else if (newSection === "drivers") {
      setDriverView({ mode: "list" });
    } else if (newSection === "orders") {
      setOrderView({ mode: "list" });
    } else if (newSection === "allocations") {
      setAllocationView({ mode: "list" });
    } else if (newSection === "users") {
      setUserView({ mode: "list" });
    } else if (newSection === "customers") {
      setCustomerView({ mode: "list" });
    } else if (newSection === "reports") {
      // nothing extra to reset; reports page is single-mode
    }
  };

  const handleSubNavigate = (newSection: CaptureSection, action: SubAction) => {
    setSection(newSection);
    const goList = action === "view_all";
    if (newSection === "trucks") {
      setTruckView(goList ? { mode: "list" } : { mode: "form" });
    } else if (newSection === "drivers") {
      setDriverView(goList ? { mode: "list" } : { mode: "form" });
    } else if (newSection === "orders") {
      setOrderView(goList ? { mode: "list" } : { mode: "form" });
    } else if (newSection === "allocations") {
      setAllocationView(goList ? { mode: "list" } : { mode: "form" });
    } else if (newSection === "users") {
      setUserView(goList ? { mode: "list" } : { mode: "form" });
    } else if (newSection === "customers") {
      setCustomerView(goList ? { mode: "list" } : { mode: "form" });
    }
  };

  
  //---------------------------------------------------------
  // Trucks
  //---------------------------------------------------------

  const handleSaveTruck = async (
    values: TruckFormValues & {
      id?: TruckRecord["id"];
    }
  ) => {
    const { id, ...body } = values;

    const res = await fetch(
      id
        ? `${API_BASE}/trucks/${id}`
        : `${API_BASE}/trucks`,
      {
        method: id ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json();

      throw new Error(err.message);
    }

    await loadTrucks();

    setTruckView({
      mode: "list",
    });
  };

  //---------------------------------------------------------
  // Drivers
  //---------------------------------------------------------

  const handleSaveDriver = async (
    values: Omit<Driver, "status">
  ) => {
    const { id, ...body } = values as any;

    const res = await fetch(
      id
        ? `${API_BASE}/drivers/${id}`
        : `${API_BASE}/drivers`,
      {
        method: id ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json();

      throw new Error(err.message);
    }

    await loadDrivers();

    setDriverView({
      mode: "list",
    });
  };

  //---------------------------------------------------------
  // Orders
  //---------------------------------------------------------

  const handleSaveOrder = async (
    values: OrderFormValues
  ) => {
    const res = await fetch(
      `${API_BASE}/orders`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(values),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.message || "Failed to save order"
      );
    }

    await loadOrders();

    setOrderView({
      mode: "list",
    });
  };

  const handleUpdateOrder = async (
    values: OrderFormValues & { id?: number }
  ) => {
    const { id, ...body } = values;

    const res = await fetch(
      id
        ? `${API_BASE}/orders/${id}`
        : `${API_BASE}/orders`,
      {
        method: id ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json();

      throw new Error(err.message || "Failed to update order");
    }

    await loadOrders();

    setOrderView({
      mode: "list",
    });
  };

  //---------------------------------------------------------
  // Customers
  //---------------------------------------------------------

  const handleSaveCustomer = async (
    values: CustomerFormValues,
    id?: number
  ) => {
    const res = await fetch(
      id ? `${API_BASE}/customers/${id}` : `${API_BASE}/customers`,
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to save customer");
    }

    setCustomerView({ mode: "list" });
  };

  //---------------------------------------------------------
  // Allocation
  //---------------------------------------------------------

  const handleAllocate = async (
    values: {
      order_ids: number[];
      truck_id: number;
    }
  ) => {
    const multi = values.order_ids.length > 1;

    const res = await fetch(
      `${API_BASE}/allocations${multi ? "/batch" : ""}`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(
          multi
            ? {
                orderIds: values.order_ids,
                truckId: values.truck_id,
              }
            : {
                orderId: values.order_ids[0],
                truckId: values.truck_id,
              }
        ),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.message || "Allocation failed."
      );
    }

    await loadOrders();
    await loadTrucks();

    setAllocationView({
      mode: "list",
    });
  };

  //---------------------------------------------------------
  // Truck lookup
  //---------------------------------------------------------

  const truckLookup: Record<string, string> =
    Object.fromEntries(
      trucks.map((t) => [
        String(t.truckId),
        t.registration_number,
      ])
    );

  return (
  <AppShell
    active={section}
    onNavigate={handleSectionNavigate}
    onSubNavigate={handleSubNavigate}
    isSuperAdmin={isSuperAdmin}
  >
    {/* Trucks */}

    {section === "trucks" && truckView.mode === "form" && (
      <TruckForm
        truck={truckView.truck}
        onSubmit={handleSaveTruck}
        onViewAll={() =>
          setTruckView({
            mode: "list",
          })
        }
      />
    )}

    {section === "trucks" && truckView.mode === "list" && (
      <TrucksListPage
        onAddTruck={() =>
          setTruckView({
            mode: "form",
          })
        }
        onViewTruck={(truck) =>
          setTruckView({
            mode: "detail",
            truck,
          })
        }
        onEditTruck={(truck) =>
          setTruckView({
            mode: "form",
            truck,
          })
        }
      />
    )}

    {section === "trucks" && truckView.mode === "detail" && (
      <TruckDetailPage
        truck={truckView.truck}
        onBack={() =>
          setTruckView({
            mode: "list",
          })
        }
        onEdit={() =>
          setTruckView({
            mode: "form",
            truck: truckView.truck,
          })
        }
      />
    )}

    {/* Drivers */}

    {section === "drivers" && driverView.mode === "form" && (
      <DriverForm
        truckOptions={trucks.map((t) => ({
          value: String(t.truckId),
          label: t.registration_number,
        }))}
        driver={driverView.driver}
        onSubmit={handleSaveDriver}
        onViewAll={() =>
          setDriverView({
            mode: "list",
          })
        }
      />
    )}

    {section === "drivers" && driverView.mode === "list" && (
      <DriversListPage
        truckLookup={truckLookup}
        drivers={drivers}
        onAddDriver={() =>
          setDriverView({
            mode: "form",
          })
        }
        onViewDriver={(driver) =>
          setDriverView({
            mode: "detail",
            driver,
          })
        }
        onEditDriver={(driver) =>
          setDriverView({
            mode: "form",
            driver,
          })
        }
      />
    )}

    {section === "drivers" && driverView.mode === "detail" && (
      <DriverDetailPage
        driver={driverView.driver}
        truckLabel={
          driverView.driver.truck_id != null
            ? truckLookup[
                String(driverView.driver.truck_id)
              ] ?? "Unassigned"
            : "Unassigned"
        }
        onBack={() =>
          setDriverView({
            mode: "list",
          })
        }
        onEdit={() =>
          setDriverView({
            mode: "form",
            driver: driverView.driver,
          })
        }
      />
    )}

    {/* Orders */}

    {section === "orders" && orderView.mode === "form" && (
      <OrderForm
        onSubmit={handleSaveOrder}
        onViewAll={() =>
          setOrderView({
            mode: "list",
          })
        }
      />
    )}

    {section === "orders" && orderView.mode === "list" && (
      <OrdersListPage
        orders={orders}
        onAddOrder={() =>
          setOrderView({
            mode: "form",
          })
        }
        onViewOrder={(order) =>
          setOrderView({
            mode: "detail",
            order,
          })
        }
        onEditOrder={(order) =>
          setOrderView({
            mode: "form",
            order,
          })
        }
      />
    )}

    {section === "orders" && orderView.mode === "detail" && (
      <div>
        <div className="mb-6">
          <h2 className="font-display text-xl font-semibold text-ink">Order Details</h2>
          <p className="mt-1 text-sm text-ink-muted">Order #{orderView.order.bol_number}</p>
        </div>
        <div className="rounded-lg border border-navy-950/10 bg-white p-6">
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-ink-muted">BOL Number</label>
              <p className="mt-1 text-ink">{orderView.order.bol_number}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-ink-muted">Customer</label>
              <p className="mt-1 text-ink">{orderView.order.customer_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-ink-muted">Cargo Type</label>
              <p className="mt-1 text-ink">{orderView.order.cargo_type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-ink-muted">Weight</label>
              <p className="mt-1 text-ink">{orderView.order.weight_tonnes} tonnes</p>
            </div>
            <div>
              <label className="text-sm font-medium text-ink-muted">Status</label>
              <p className="mt-1">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-navy-50 text-navy-700">
                  {orderView.order.status || "pending"}
                </span>
              </p>
            </div>
          </div>

          {Array.isArray(orderView.order.containers) &&
            orderView.order.containers.length >  0&& (
            <div className="mt-6 border-t border-navy-950/10 pt-6">
              <h3 className="mb-3 text-sm font-semibold text-ink">
                Containers
              </h3>
              <div className="overflow-hidden rounded-lg border border-navy-950/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-navy-950/5 text-xs uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Container N.o</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Contents</th>
                      <th className="px-3 py-2 font-medium text-right">Weight (t)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-950/10">
                    {orderView.order.containers.map((c: any, i: number) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-ink-muted">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-ink">{c.containerNumber}</td>
                        <td className="px-3 py-2 text-ink-muted">{c.containerType || "—"}</td>
                        <td className="px-3 py-2 text-ink">{c.cargoType}</td>
                        <td className="px-3 py-2 text-right text-ink">{Number(c.weightTonnes)} t</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              className="rounded-lg bg-navy-950 px-4 py-2 text-sm font-medium text-paper hover:bg-navy-800"
              onClick={() =>
                setOrderView({
                  mode: "form",
                })
              }
            >
              Edit Order
            </button>
            <button
              type="button"
              className="rounded-lg border border-navy-950/20 px-4 py-2 text-sm font-medium text-ink hover:bg-navy-50"
              onClick={() =>
                setOrderView({
                  mode: "list",
                })
              }
            >
              Back to List
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Allocations */}

    {section === "allocations" && allocationView.mode === "form" && (
      <AllocationForm
        orders={pendingOrders}
        trucks={trucks}
        onSubmit={handleAllocate}
      />
    )}

    {section === "allocations" && allocationView.mode === "list" && (
      <AllocationsListPage
        onAddAllocation={() =>
          setAllocationView({
            mode: "form",
          })
        }
        onViewAllocation={(allocation) =>
          setAllocationView({
            mode: "detail",
            allocation,
          })
        }
        onEditAllocation={(allocation) => {
          alert("Edit functionality would open allocation edit form");
        }}
      />
    )}

    {section === "allocations" && allocationView.mode === "detail" && (
      <div>
        <div className="mb-6">
          <h2 className="font-display text-xl font-semibold text-ink">Allocation Details</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Order: {allocationView.allocation.order?.bol_number} - {allocationView.allocation.order?.customer_name}
          </p>
        </div>
        <div className="rounded-lg border border-navy-950/10 bg-white p-6">
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-ink-muted">Order</label>
              <p className="mt-1 text-ink">
                {allocationView.allocation.order?.bol_number} - {allocationView.allocation.order?.customer_name}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-ink-muted">Truck</label>
              <p className="mt-1 text-ink">
                {allocationView.allocation.truck?.registration_number} ({allocationView.allocation.truck?.capacity_tonnes}t)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-ink-muted">Allocated At</label>
              <p className="mt-1 text-ink">
                {allocationView.allocation.allocatedAt ? new Date(allocationView.allocation.allocatedAt).toLocaleString() : "�"}
              </p>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              className="rounded-lg bg-navy-950 px-4 py-2 text-sm font-medium text-paper hover:bg-navy-800"
              onClick={() => alert("Edit allocation form would open here")}
            >
              Edit Allocation
            </button>
            <button
              type="button"
              className="rounded-lg border border-navy-950/20 px-4 py-2 text-sm font-medium text-ink hover:bg-navy-50"
              onClick={() =>
                setAllocationView({
                  mode: "list",
                })
              }
            >
              Back to List
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Users - Only visible to super_admin */}
    {isSuperAdmin && section === "users" && userView.mode === "form" && (
      <UserForm
        user={userView.user}
        onSubmit={handleSaveUser}
        onCancel={() =>
          setUserView({
            mode: "list",
          })
        }
      />
    )}

    {isSuperAdmin && section === "users" && userView.mode === "list" && (
      <UsersListPage
        onAddUser={() =>
          setUserView({
            mode: "form",
          })
        }
        onEditUser={(user) =>
          setUserView({
            mode: "form",
            user,
          })
        }
      />
    )}

    {/* Customers */}
    {section === "customers" && customerView.mode === "form" && (
      <CustomerForm
        customer={customerView.customer}
        onSubmit={(values: CustomerFormValues) =>
          handleSaveCustomer(values, customerView.customer?.customerId)
        }
        onCancel={() =>
          setCustomerView({
            mode: "list",
          })
        }
      />
    )}

    {section === "customers" && customerView.mode === "list" && (
      <CustomersListPage
        onAddCustomer={() =>
          setCustomerView({
            mode: "form",
          })
        }
        onEditCustomer={(customer) =>
          setCustomerView({
            mode: "form",
            customer,
          })
        }
      />
    )}

    {/* Reports */}
    {section === "reports" && <ReportsPage />}
  </AppShell>
);
}

