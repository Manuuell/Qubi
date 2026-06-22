"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Images, LayoutGrid, List, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatabaseTable, type Property, type Row } from "./database-table";
import { KanbanBoard } from "./kanban-board";
import { CalendarView } from "./calendar-view";
import { ListView } from "./list-view";
import { GalleryView } from "./gallery-view";
import { FilterSortBar } from "./filter-sort-bar";
import { applyFiltersSort, type Filter, type Sort } from "../filter-sort";

type View = "table" | "board" | "calendar" | "list" | "gallery";

export function DatabaseView({
  databaseId,
  workspaceId,
  properties,
  rows,
}: {
  databaseId: string;
  workspaceId: string;
  properties: Property[];
  rows: Row[];
}) {
  const [view, setView] = useState<View>("table");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sort, setSort] = useState<Sort | null>(null);

  const visibleRows = useMemo(
    () => applyFiltersSort(rows, properties, filters, sort),
    [rows, properties, filters, sort],
  );

  return (
    <div>
      <div className="mt-4 flex gap-1 border-b">
        <Tab active={view === "table"} onClick={() => setView("table")}>
          <Table2 className="size-4" />
          Tabla
        </Tab>
        <Tab active={view === "board"} onClick={() => setView("board")}>
          <LayoutGrid className="size-4" />
          Tablero
        </Tab>
        <Tab active={view === "calendar"} onClick={() => setView("calendar")}>
          <CalendarDays className="size-4" />
          Calendario
        </Tab>
        <Tab active={view === "list"} onClick={() => setView("list")}>
          <List className="size-4" />
          Lista
        </Tab>
        <Tab active={view === "gallery"} onClick={() => setView("gallery")}>
          <Images className="size-4" />
          Galería
        </Tab>
      </div>

      <FilterSortBar
        properties={properties}
        filters={filters}
        sort={sort}
        onFiltersChange={setFilters}
        onSortChange={setSort}
      />

      {view === "table" && (
        <DatabaseTable
          databaseId={databaseId}
          workspaceId={workspaceId}
          properties={properties}
          rows={visibleRows}
        />
      )}
      {view === "board" && (
        <KanbanBoard
          databaseId={databaseId}
          workspaceId={workspaceId}
          properties={properties}
          rows={visibleRows}
        />
      )}
      {view === "calendar" && (
        <CalendarView
          databaseId={databaseId}
          workspaceId={workspaceId}
          properties={properties}
          rows={visibleRows}
        />
      )}
      {view === "list" && (
        <ListView properties={properties} rows={visibleRows} />
      )}
      {view === "gallery" && (
        <GalleryView properties={properties} rows={visibleRows} />
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-foreground font-medium"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {children}
    </button>
  );
}
