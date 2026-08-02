import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { classNames } from "../lib/classNames";

export type InputValidationState = "default" | "valid" | "invalid";

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  label?: ReactNode;
  helperText?: ReactNode;
  validationState?: InputValidationState;
}

const validationClasses: Record<InputValidationState, string> = {
  default:
    "border-slate-300 focus:border-blue-600 focus:ring-blue-600 disabled:bg-slate-100",
  valid: "border-emerald-600 focus:border-emerald-600 focus:ring-emerald-600",
  invalid: "border-red-600 focus:border-red-600 focus:ring-red-600",
};

const messageClasses: Record<InputValidationState, string> = {
  default: "text-slate-600",
  valid: "text-emerald-700",
  invalid: "text-red-700",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      "aria-describedby": ariaDescribedBy,
      className,
      helperText,
      id,
      label,
      validationState = "default",
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const describedBy =
      [ariaDescribedBy, helperId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label
            className="text-sm font-medium text-slate-900"
            htmlFor={inputId}
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={validationState === "invalid" || undefined}
          className={classNames(
            "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:ring-1 disabled:cursor-not-allowed",
            validationClasses[validationState],
            className,
          )}
          {...props}
        />
        {helperText ? (
          <p
            id={helperId}
            className={classNames("text-sm", messageClasses[validationState])}
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
