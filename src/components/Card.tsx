import { forwardRef, type HTMLAttributes } from "react";

import { classNames } from "../lib/classNames";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={classNames(
        "rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm",
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = "Card";
