import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { TextField } from "../components/FormField";

import type {
  Customer,
  CustomerFormValues,
} from "../types/models";

interface CustomerFormProps {
  customer?: Customer | null;
  onSubmit: (values: CustomerFormValues) => void | Promise<void>;
  onCancel: () => void;
}

export default function CustomerForm({
  customer,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const isEditMode = !!customer;

  const [name, setName] = useState(customer?.name ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(customer?.name ?? "");
    setAddress(customer?.address ?? "");
    setPhone(customer?.phone ?? "");
    setEmail(customer?.email ?? "");
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Customer name is required");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          {isEditMode ? "Edit Customer" : "New Customer"}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {isEditMode
            ? `Updating ${name}.`
            : "Add a customer to the client directory."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <TextField
          id="name"
          label="Customer Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Acme Logistics Ltd."
        />

        <TextField
          id="phone"
          label="Customer Phone Number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +254 700 000 000"
        />

        <TextField
          id="email"
          label="Customer Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. accounts@acme.co.ke"
        />

        <TextField
          id="address"
          label="Customer Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. Mombasa Road, Nairobi"
        />

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? "Saving…"
              : isEditMode
              ? "Update Customer"
              : "Add Customer"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}