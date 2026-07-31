"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

function SegmentedControl({ ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="segmented-control" {...props} />;
}

function SegmentedControlList({
  className,
  children,
  ...props
}: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="segmented-control-list"
      className={cn(
        "bg-muted relative inline-flex items-center gap-0.5 rounded-full p-1",
        className,
      )}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator className="transition-ios bg-card absolute top-1 left-0 h-[calc(100%-0.5rem)] w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full shadow-sm" />
    </TabsPrimitive.List>
  );
}

function SegmentedControlTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="segmented-control-tab"
      className={cn(
        "text-muted-foreground data-[selected]:text-foreground transition-ios relative z-10 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap outline-none select-none",
        className,
      )}
      {...props}
    />
  );
}

function SegmentedControlPanel({
  className,
  ...props
}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="segmented-control-panel"
      className={cn("transition-ios outline-none", className)}
      {...props}
    />
  );
}

export {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTab,
  SegmentedControlPanel,
};
