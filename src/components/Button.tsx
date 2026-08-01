import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, children, ...props }, ref) => {
    const base =
      "font-body inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 " +
      "text-sm font-semibold transition-colors focus:outline-none focus:ring-2 " +
      "focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    const variants = {
      primary:
        "bg-gold-500 text-navy-950 hover:bg-gold-400 focus:ring-gold-500 shadow-sm",
      secondary:
        "bg-navy-800 text-paper hover:bg-navy-700 focus:ring-navy-600",
      ghost:
        "bg-transparent text-navy-800 hover:bg-navy-950/5 focus:ring-navy-600",
    };

    return (
      <button ref={ref} className={`${base} ${variants[variant]} ${className ?? ""}`} {...props}>
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
