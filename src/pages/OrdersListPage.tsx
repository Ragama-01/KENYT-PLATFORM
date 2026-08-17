import { useEffect, useState } from "react";
import { Button } from "../components/Button";

type OrderRecord = any;

async function fetchOrders(): Promise<OrderRecord[]> {
  const res = await fetch("http://localhost:4000/orders");
  if (!res.ok) throw new Error("Failed to load orders");
  return res.json();
}

async function deleteOrder(id: number): Promise<void> {
  const res = await fetch(`http://localhost:4000/orders/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete order");
}

interface OrdersListPageProps {
  orders: OrderRecord[];
  onAddOrder: () => void;
  onViewOrder: (order: OrderRecord) => void;
  onEditOrder: (order: OrderRecord) => void;
}

export default function OrdersListPage({ orders, onAddOrder, onViewOrder, onEditOrder }: OrdersListPageProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteOrder(id);
      // Note: Parent component should handle refreshing the list
    } catch {
      setError("Couldn't delete that order. Try again.");
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  };

  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Orders</h1>
          <p className="mt-1 text-sm text-ink-muted">All customer orders and consignments.</p>
        </div>
        <Button onClick={onAddOrder}>New Order</Button>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {orders.length === 0 ? (
        <p className="text-sm text-ink-muted">No orders yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-950/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950/5 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">BOL Number</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Cargo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-950/10">
              {orders.map((order) => {
                const isConfirming = confirmingDeleteId === order.id;
                const isDeleting = deletingId === order.id;
                return (
                  <tr key={order.id} className="hover:bg-navy-950/[0.02]">
                    <td className="px-4 py-3 font-mono font-medium text-ink">{order.bol_number}</td>
                    <td className="px-4 py-3 text-ink">{order.customer_name}</td>
                    <td className="px-4 py-3 text-ink-muted">{order.cargo_type}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-navy-50 text-navy-700">
                        {order.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" className="text-sm font-medium text-navy-700 hover:underline" onClick={() => onViewOrder(order)}>View</button>
                        <button type="button" className="text-sm font-medium text-navy-700 hover:underline" onClick={() => onEditOrder(order)}>Edit</button>
                        {isConfirming ? (
                          <button type="button" disabled={isDeleting} className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50" onClick={() => handleDelete(order.id)}>
                            {isDeleting ? "Deleting…" : "Confirm delete?"}
                          </button>
                        ) : (
                          <button type="button" className="text-sm font-medium text-red-600 hover:underline" onClick={() => setConfirmingDeleteId(order.id)} onBlur={() => setConfirmingDeleteId(null)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

