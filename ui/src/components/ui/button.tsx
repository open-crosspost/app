import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 disabled:border-gray-300 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:border-inset",
  {
    variants: {
      variant: {
        default: "bg-[rgb(245,245,245)] text-[rgb(51,51,51)] border-2 border-outset border-[rgb(51,51,51)] hover:bg-[rgb(235,235,235)] hover:border-[rgb(71,71,71)] active:border-inset dark:bg-[rgb(60,60,60)] dark:text-[rgb(230,230,230)] dark:border-[rgb(200,200,200)] dark:hover:bg-[rgb(70,70,70)]",
        destructive:
          "bg-destructive text-white border-2 border-outset border-[rgb(180,50,40)] hover:bg-[rgb(220,60,50)] hover:border-[rgb(200,70,60)] active:border-inset dark:bg-[rgb(180,50,40)] dark:border-[rgb(220,80,70)]",
        outline:
          "bg-background text-[rgb(51,51,51)] border-2 border-outset border-[rgb(51,51,51)] hover:bg-[rgb(235,235,235)] hover:border-[rgb(71,71,71)] active:border-inset dark:text-[rgb(230,230,230)] dark:border-[rgb(200,200,200)] dark:hover:bg-[rgb(70,70,70)]",
        secondary: "bg-secondary text-secondary-foreground border-2 border-outset border-[rgb(180,180,180)] hover:bg-secondary/80 hover:border-[rgb(160,160,160)] active:border-inset",
        ghost: "hover:bg-[rgb(235,235,235)] hover:text-accent-foreground dark:hover:bg-[rgb(70,70,70)]",
        link: "text-link underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 px-3 py-1.5 has-[>svg]:px-2.5 text-xs",
        lg: "h-12 px-6 py-3 has-[>svg]:px-4",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
