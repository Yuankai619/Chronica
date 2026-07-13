"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, GripVertical, Plus, X } from "lucide-react";
import {
  addPlannedItem,
  deletePlannedItem,
  movePlannedItem,
  setPlannedItemCategory,
} from "@/app/(app)/planning/actions";
import type { Category } from "@/lib/categories";
import { formatDuration } from "@/lib/entries";
import type { PlannedItem } from "@/lib/plan-board";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { CategoryBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Columns = Record<string, PlannedItem[]>;

function buildColumns(dayKeys: string[], items: PlannedItem[]): Columns {
  const columns: Columns = Object.fromEntries(dayKeys.map((d) => [d, []]));
  for (const item of items) {
    columns[item.day]?.push(item);
  }
  for (const key of dayKeys) {
    columns[key].sort((a, b) => a.position - b.position);
  }
  return columns;
}

function eventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ItemCard({
  item,
  category,
  categories = [],
  onDelete,
  overlay = false,
}: {
  item: PlannedItem;
  category: Category | undefined;
  categories?: Category[];
  onDelete?: () => void;
  overlay?: boolean;
}) {
  const [assigning, startAssign] = useTransition();
  const isCalendar = item.gcal_event_id !== null;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: overlay });

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={
        overlay
          ? undefined
          : { transform: CSS.Transform.toString(transform), transition }
      }
      className={cn(
        "group flex touch-none items-start gap-1.5 rounded-md border border-hairline bg-panel px-2 py-2 select-none",
        isCalendar && "border-l-2 border-l-[#7cc0f5]",
        isDragging && "opacity-40",
        overlay && "shadow-xl shadow-black/50",
      )}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
    >
      <GripVertical
        className="mt-0.5 size-3.5 shrink-0 text-muted/60"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {isCalendar ? (
          <>
            <span className="flex items-center gap-1 text-[0.65rem] tracking-[0.08em] text-[#7cc0f5] uppercase">
              <CalendarClock className="size-3" aria-hidden /> Calendar
            </span>
            <span className="text-sm font-medium break-words">
              {item.title ?? "(untitled event)"}
            </span>
            {item.start_at && item.end_at ? (
              <span className="font-mono text-xs text-muted tabular-nums">
                {eventTime(item.start_at)}–{eventTime(item.end_at)}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-sm font-medium break-words">
            {category?.name ?? "Unknown"}
          </span>
        )}
        <span className="flex flex-wrap items-center gap-1.5">
          {isCalendar && !overlay ? (
            <select
              aria-label="Assign category"
              value={item.category_id ?? ""}
              disabled={assigning}
              onPointerDown={(event) => event.stopPropagation()}
              onChange={(event) => {
                const value = event.target.value;
                startAssign(async () => {
                  await setPlannedItemCategory(item.id, value || null);
                });
              }}
              className="cursor-pointer rounded-sm border border-hairline bg-transparent px-1 py-0.5 text-[0.7rem] text-muted focus:outline-none"
            >
              <option value="">no category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : category ? (
            <CategoryBadge
              id={category.id}
              name={category.name}
              color={category.color}
            />
          ) : null}
          <span className="font-mono text-xs text-accent tabular-nums">
            {formatDuration(item.expected_minutes)}
          </span>
        </span>
      </div>
      {onDelete ? (
        <button
          type="button"
          aria-label="Remove planned item"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onDelete}
          className="cursor-pointer text-muted/60 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function AddItemForm({
  day,
  categories,
  onError,
}: {
  day: string;
  categories: Category[];
  onError: (message: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-dashed border-hairline py-1.5 text-xs text-muted transition-colors hover:border-muted hover:text-foreground"
      >
        <Plus className="size-3.5" aria-hidden /> Add
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const result = await addPlannedItem(day, formData);
          onError(result.error ?? null);
          if (!result.error) setOpen(false);
        });
      }}
      className="flex flex-col gap-1.5 rounded-md border border-hairline p-2"
    >
      <Select name="category_id" aria-label="Category" className="h-8 text-xs">
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Input
        name="duration"
        placeholder="90 or 1:30"
        aria-label="Expected duration"
        className="h-8 font-mono text-xs"
        required
      />
      <div className="flex gap-1">
        <Button type="submit" size="sm" disabled={pending} className="flex-1">
          {pending ? "…" : "Add"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DayColumn({
  day,
  label,
  isToday,
  items,
  categories,
  categoryById,
  onDelete,
  onError,
}: {
  day: string;
  label: string;
  isToday: boolean;
  items: PlannedItem[];
  categories: Category[];
  categoryById: Map<string, Category>;
  onDelete: (id: string) => void;
  onError: (message: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day });
  const totalMinutes = items.reduce((s, i) => s + i.expected_minutes, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-48 flex-col gap-1.5 rounded-lg border border-hairline p-2",
        isOver && "border-accent-dim",
        isToday && "bg-panel/40",
      )}
    >
      <div className="flex items-baseline justify-between px-1">
        <span className={cn("microlabel", isToday && "text-accent")}>
          {label}
        </span>
        <span className="font-mono text-[0.65rem] text-muted tabular-nums">
          {totalMinutes > 0 ? formatDuration(totalMinutes) : "·"}
        </span>
      </div>
      <p className="px-1 font-mono text-[0.65rem] text-muted/70 tabular-nums">
        {day.slice(5)}
      </p>
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-1.5">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              category={
                item.category_id
                  ? categoryById.get(item.category_id)
                  : undefined
              }
              categories={categories}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </div>
      </SortableContext>
      <AddItemForm day={day} categories={categories} onError={onError} />
    </div>
  );
}

export function PlanBoard({
  dayKeys,
  todayKey,
  items,
  categories,
}: {
  dayKeys: string[];
  todayKey: string;
  items: PlannedItem[];
  categories: Category[];
}) {
  const [columns, setColumns] = useState<Columns>(() =>
    buildColumns(dayKeys, items),
  );
  const [prevItems, setPrevItems] = useState(items);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Server data is the source of truth; re-derive when it changes
  // (render-phase derived state, no effect needed).
  if (items !== prevItems) {
    setPrevItems(items);
    setColumns(buildColumns(dayKeys, items));
  }

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const activeItem = activeId
    ? Object.values(columns)
        .flat()
        .find((i) => i.id === activeId)
    : null;

  // Long-press (200ms) so taps/clicks still work; touch-none on cards
  // makes the same gesture work on phones.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
  );

  function findColumn(id: string): string | null {
    if (id in columns) return id;
    for (const [day, list] of Object.entries(columns)) {
      if (list.some((i) => i.id === id)) return day;
    }
    return null;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const from = findColumn(String(active.id));
    const to = findColumn(String(over.id));
    if (!from || !to || from === to) return;

    setColumns((prev) => {
      const moving = prev[from].find((i) => i.id === active.id);
      if (!moving) return prev;
      const fromList = prev[from].filter((i) => i.id !== active.id);
      const toList = [...prev[to]];
      const overIndex = toList.findIndex((i) => i.id === over.id);
      toList.splice(overIndex < 0 ? toList.length : overIndex, 0, {
        ...moving,
        day: to,
      });
      return { ...prev, [from]: fromList, [to]: toList };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const from = findColumn(String(active.id));
    const to = findColumn(String(over.id));
    if (!from || !to) return;

    let next: Columns = columns;
    if (from === to) {
      const list = [...columns[to]];
      const oldIndex = list.findIndex((i) => i.id === active.id);
      const newIndex = list.findIndex((i) => i.id === over.id);
      if (oldIndex < 0) return;
      const [moved] = list.splice(oldIndex, 1);
      list.splice(newIndex < 0 ? list.length : newIndex, 0, moved);
      next = { ...columns, [to]: list };
      setColumns(next);
    }

    startTransition(async () => {
      const result = await movePlannedItem(String(active.id), to, {
        [from]: next[from].map((i) => i.id),
        [to]: next[to].map((i) => i.id),
      });
      setError(result.error ?? null);
    });
  }

  function handleDelete(id: string) {
    setColumns((prev) => {
      const next: Columns = {};
      for (const [day, list] of Object.entries(prev)) {
        next[day] = list.filter((i) => i.id !== id);
      }
      return next;
    });
    startTransition(async () => {
      const result = await deletePlannedItem(id);
      setError(result.error ?? null);
    });
  }

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event: DragStartEvent) =>
          setActiveId(String(event.active.id))
        }
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          {dayKeys.map((day, i) => (
            <DayColumn
              key={day}
              day={day}
              label={DAY_LABELS[i]}
              isToday={day === todayKey}
              items={columns[day] ?? []}
              categories={categories}
              categoryById={categoryById}
              onDelete={handleDelete}
              onError={setError}
            />
          ))}
        </div>
        <DragOverlay>
          {activeItem ? (
            <ItemCard
              item={activeItem}
              category={
                activeItem.category_id
                  ? categoryById.get(activeItem.category_id)
                  : undefined
              }
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
