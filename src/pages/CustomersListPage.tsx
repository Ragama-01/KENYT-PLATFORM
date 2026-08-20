import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { API_BASE } from "../lib/api";

import type { Customer } from "../types/models";

async function fetchCustomers(): Promise<Customer[]> {
  const res = await fetch(`${API_BASE}/customers`);
  if (!res.ok) throw new Error("Failed to load customers");
  return res.json();
}

async function deleteCustomer(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/customers/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete customer");
}

interface CustomersListPageProps {
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
}

export default function CustomersListPage({
  onAddCustomer,
  onEditCustomer,
}: CustomersListPageProps) {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers()
      .then(setCustomers)
      .catch(() => setError("Couldn't load customers."));
  }, []);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteCustomer(id);
      setCustomers((prev) => prev?.filter((c) => c.customerId !== id) ?? prev);
    } catch {
      setError("Couldn't delete that customer. Try again.");
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  };

  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Customers
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Client directory used by orders for customer selection.
          </p>
        </div>
        <Button onClick={onAddCustomer}>Add Customer</Button>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {customers === null ? (
        <p className="text-sm text-ink-muted">Loading customers…</p>
      ) : customers.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No customers yet. Add your first customer to select them on an order.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-950/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950/5 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-950/10">
              {customers.map((customer) => {
                const isConfirming = confirmingDeleteId === customer.customerId;
                const isDeleting = deletingId === customer.customerId;
                return (
                  <tr key={customer.customerId} className="hover:bg-navy-950/[0.02]">
                    <td className="px-4 py-3 font-medium text-ink">
                      {customer.name}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {customer.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {customer.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {customer.address || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="text-sm font-medium text-navy-700 hover:underline"
                          onClick={() => onEditCustomer(customer)}
                        >
                          Edit
                        </button>
                        {isConfirming ? (
                          <button
                            type="button"
                            disabled={isDeleting}
                            className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                            onClick={() => handleDelete(customer.customerId!)}
                          >
                            {isDeleting ? "Deleting…" : "Confirm delete?"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-sm font-medium text-red-600 hover:underline"
                            onClick={() => setConfirmingDeleteId(customer.customerId!)}
                            onBlur={() => setConfirmingDeleteId(null)}
                          >
                            Delete
                          </button>
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