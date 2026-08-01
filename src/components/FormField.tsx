import { forwardRef, type SelectHTMLAttributes, type InputHTMLAttributes } from "react";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  mono?: boolean; // reference numbers (BOL, registration, ID) get mono type
  hint?: string;
  children: React.ReactNode;
}

function FieldWrapper({ label, htmlFor, error, hint, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-body text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <span className="text-xs text-ink-muted">{hint}</span>}
      {error && (
        <span role="alert" className="text-xs font-medium text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}

const fieldClasses =
  "rounded-md border border-navy-600/20 bg-white px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-gold-500 " +
  "focus:border-gold-500 transition-colors disabled:bg-paper disabled:text-ink-muted";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  mono?: boolean;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, mono, hint, id, className, ...props }, ref) => (
    <FieldWrapper label={label} htmlFor={id!} error={error} hint={hint}>
      <input
        ref={ref}
        id={id}
        className={`${fieldClasses} ${mono ? "font-mono tracking-tight" : "font-body"} ${className ?? ""}`}
        aria-invalid={!!error}
        {...props}
      />
    </FieldWrapper>
  ),
);
TextField.displayName = "TextField";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, hint, options, placeholder, id, className, ...props }, ref) => (
    <FieldWrapper label={label} htmlFor={id!} error={error} hint={hint}>
      <select
        ref={ref}
        id={id}
        className={`${fieldClasses} font-body ${className ?? ""}`}
        aria-invalid={!!error}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  ),
);
SelectField.displayName = "SelectField";

// Section heading used to group related fields within a form (e.g.
// "Compliance" within the truck form) — a small gold tick + label,
// echoes the manifest-stamp motif at a smaller scale.
export function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-wider text-navy-700">
        <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
        {title}
      </legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
