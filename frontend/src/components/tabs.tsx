"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm",
        className
      )}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-600",
        "transition-colors hover:text-slate-900",
        "data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm",
        className
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Content
      value={value}
      className={cn("mt-6 focus-visible:outline-none", className)}
    >
      {children}
    </TabsPrimitive.Content>
  );
}
