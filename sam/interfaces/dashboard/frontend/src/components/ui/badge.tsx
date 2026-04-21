import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded border border-transparent px-[7px] py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground",
        secondary:   "bg-muted text-muted-foreground border-border",
        destructive: "bg-destructive text-white",
        outline:     "border-border text-muted-foreground bg-muted",
        ghost:       "text-muted-foreground",
        link:        "text-primary underline-offset-4",
        blue:        "bg-[var(--primary-bg)] text-primary border-[hsl(221,83%,88%)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className, variant = "default", asChild = false, ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
