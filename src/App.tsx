import { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import AppShell, { type CaptureSection } from "./components/AppShell";
import TruckForm from "./pages/TruckForm";
import DriverForm from "./pages/DriverForm";
import TrucksListPage from "./pages/TrucksListPage";
import DriversListPage from "./pages/DriversListPage";
import TruckDetailPage from "./pages/TruckDetailPage";
import DriverDetailPage from "./pages/DriverDetailPage";
import OrderForm from "./pages/OrderForm";
import AllocationForm from "./pages/AllocationForm";

import type {
  TruckFormValues,
  Driver,
  OrderFormValues,
} from "./types/models";

type TruckRecord = TruckFormValues & {
  id: number | string;
};

async function loginRequest(email: string, password: string) {
  await new Promise((r) => setTimeout(r, 500));

  if (!password) {
    throw new Error("Invalid credentials");
  }
}

type TruckView =
  | { mode: "form"; truck?: TruckRecord }
  | { mode: "list" }
  | { mode: "detail"; truck: TruckRecord };

type DriverView =
  | { mode: "form"; driver?: Driver }
  | { mode: "list" }
  | { mode: "detail"; driver: Driver };

export default function App() {
  const [authed, setAuthed] = useState(false);

  const [section, setSection] =
    useState<CaptureSection>("orders");

  const [truckView, setTruckView] =
    useState<TruckView>({
      mode: "form",
    });

  const [driverView, setDriverView] =
    useState<DriverView>({
      mode: "form",
    });

  // ------------------------
  // Live data
  // ------------------------

  const [orders, setOrders] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);

  async function loadOrders() {
    const res = await fetch("http://localhost:4000/orders");

    const data = await res.json();

    setOrders(data);
  }

  async function loadTrucks() {
    const res = await fetch("http://localhost:4000/trucks");

    const data = await res.json();

    setTrucks(data);
  }

  useEffect(() => {
    if (!authed) return;

    loadOrders();
    loadTrucks();
  }, [authed]);

  if (!authed) {
    return (
      <LoginPage
        onSubmit={async (email, password) => {
          await loginRequest(email, password);

          setAuthed(true);
        }}
      />
    );
  }

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
        ? `http://localhost:4000/trucks/${id}`
        : "http://localhost:4000/trucks",
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
        ? `http://localhost:4000/drivers/${id}`
        : "http://localhost:4000/drivers",
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
      "http://localhost:4000/orders",
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

    setSection("allocations");
  };

  //---------------------------------------------------------
  // Allocation
  //---------------------------------------------------------

  const handleAllocate = async (
    values: {
      order_id: number;
      truck_id: number;
    }
  ) => {
    const res = await fetch(
      "http://localhost:4000/allocations",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          orderId: values.order_id,
          truckId: values.truck_id,
        }),
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

    alert(
      `Allocated ${data.selectedTruck.registration}`
    );
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
    onNavigate={setSection}
  >
    {/* Trucks */}

    {section === "trucks" &&
      truckView.mode === "form" && (
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

    {section === "trucks" &&
      truckView.mode === "list" && (
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

    {section === "trucks" &&
      truckView.mode === "detail" && (
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

    {section === "drivers" &&
      driverView.mode === "form" && (
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

    {section === "drivers" &&
      driverView.mode === "list" && (
        <DriversListPage
          truckLookup={truckLookup}
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

    {section === "drivers" &&
      driverView.mode === "detail" && (
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

    {section === "orders" && (
      <OrderForm
        onSubmit={handleSaveOrder}
      />
    )}

    {/* Allocations */}

    {section === "allocations" && (
      <AllocationForm
        orders={orders}
        trucks={trucks}
        onSubmit={handleAllocate}
      />
    )}
  </AppShell>
);
}