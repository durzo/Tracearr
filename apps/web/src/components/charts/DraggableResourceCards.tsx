import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { GripVertical, Cpu, MemoryStick, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ServerResourceDataPoint, ServerBandwidthDataPoint } from '@tracearr/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResourceChart } from '@/components/charts/ServerResourceCharts';
import { ServerBandwidthChart } from '@/components/charts/BandwidthChart';
import { useResourceCardLayout, type CardId } from '@/hooks/useResourceCardLayout';

// ─── Constants ───────────────────────────────────────────────────────────────

export const ROW_GAP_PREFIX = 'row-gap:';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DraggableResourceCardsProps {
  resourceData: ServerResourceDataPoint[] | undefined;
  resourceLoading?: boolean;
  resourceAverages?: {
    hostCpu: number;
    processCpu: number;
    hostMemory: number;
    processMemory: number;
  } | null;
  bandwidthData: ServerBandwidthDataPoint[] | undefined;
  bandwidthLoading?: boolean;
  bandwidthAverages?: {
    local: number;
    remote: number;
  } | null;
  bandwidthPollInterval: number;
  onBandwidthPollIntervalChange: (interval: number) => void;
}

// ─── Collision detection ─────────────────────────────────────────────────────

// Cards take priority when the pointer is directly over one (enables cross-row
// joining). Gap zones only win when the pointer is in the strip between rows.
const customCollisionDetection: CollisionDetection = (args) => {
  const allHits = pointerWithin(args);

  const cardHits = allHits.filter((c) => !String(c.id).startsWith(ROW_GAP_PREFIX));
  if (cardHits.length > 0) return cardHits;

  const gapHits = allHits.filter((c) => String(c.id).startsWith(ROW_GAP_PREFIX));
  if (gapHits.length > 0) return gapHits;

  return closestCenter(args);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CARD_CONFIG: Record<CardId, { titleKey: string; icon: React.ReactNode }> = {
  cpu: { titleKey: 'CPU', icon: <Cpu className="h-4 w-4" /> },
  ram: { titleKey: 'RAM', icon: <MemoryStick className="h-4 w-4" /> },
  bandwidth: { titleKey: 'dashboard.bandwidth', icon: <ArrowUpDown className="h-4 w-4" /> },
};

export function getFlexBasis(cardsInRow: number): string {
  if (cardsInRow === 3) return 'calc(33.333% - 0.667rem)';
  if (cardsInRow === 2) return 'calc(50% - 0.5rem)';
  return '100%';
}

export function findCardRowInLayout(layout: CardId[][], cardId: string): number {
  return layout.findIndex((row) => row.includes(cardId as CardId));
}

/** Compute a new layout by moving `activeId` next to `overId` (joining its row),
 *  or into a new row at `gapPosition` if dropping on a gap zone. */
export function computeNewLayout(
  rows: CardId[][],
  activeId: CardId,
  overId: string
): CardId[][] | null {
  const isGap = overId.startsWith(ROW_GAP_PREFIX);

  if (isGap) {
    const gapPosition = parseInt(overId.slice(ROW_GAP_PREFIX.length), 10);
    const srcRow = findCardRowInLayout(rows, activeId);
    if (srcRow === -1) return null;

    const newRows = rows.map((r) => [...r]);
    newRows[srcRow] = newRows[srcRow]!.filter((id) => id !== activeId);
    const insertAt = Math.min(gapPosition, newRows.length);
    newRows.splice(insertAt, 0, [activeId]);
    return newRows.filter((r) => r.length > 0);
  }

  // Card-to-card
  const srcRowIdx = findCardRowInLayout(rows, activeId);
  const tgtRowIdx = findCardRowInLayout(rows, overId);
  if (srcRowIdx === -1 || tgtRowIdx === -1) return null;

  if (srcRowIdx === tgtRowIdx) {
    const newRows = rows.map((r) => [...r]);
    const row = newRows[srcRowIdx]!;
    const oldIdx = row.indexOf(activeId);
    const newIdx = row.indexOf(overId as CardId);
    if (oldIdx === -1 || newIdx === -1) return null;
    newRows[srcRowIdx] = arrayMove(row, oldIdx, newIdx);
    return newRows;
  }

  // Cross-row — join target row
  const newRows = rows.map((r) => [...r]);
  newRows[srcRowIdx] = newRows[srcRowIdx]!.filter((id) => id !== activeId);
  const tgtRow = newRows[tgtRowIdx]!;
  const overIdx = tgtRow.indexOf(overId as CardId);
  if (overIdx === -1) return null;
  tgtRow.splice(overIdx + 1, 0, activeId);
  return newRows.filter((r) => r.length > 0);
}

// ─── Draggable + Droppable card wrapper ──────────────────────────────────────

// No state updates during drag. `isOver` comes from dnd-kit's internal store
// and renders a highlight ring — zero custom state, zero feedback loops.
function DraggableCardSlot({
  id,
  flexBasis,
  isDragActive,
  children,
}: {
  id: string;
  flexBasis: string;
  isDragActive: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({ id });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id });

  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setDraggableRef(node);
      setDroppableRef(node);
    },
    [setDraggableRef, setDroppableRef]
  );

  const showDropHighlight = isOver && isDragActive && !isDragging;

  return (
    <div
      ref={combinedRef}
      style={{ flexBasis, minWidth: 280, flexShrink: 1, flexGrow: 1 }}
      className={`group relative transition-opacity duration-150 ${
        isDragging ? 'opacity-40' : ''
      } ${showDropHighlight ? 'ring-primary ring-offset-background rounded-xl ring-2 ring-offset-2' : ''}`}
    >
      <button
        className="text-muted-foreground hover:text-foreground absolute top-3.5 left-1.5 z-10 cursor-grab rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

// ─── Row gap drop zone ───────────────────────────────────────────────────────

function RowGapDropZone({ position, isDragActive }: { position: number; isDragActive: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${ROW_GAP_PREFIX}${position}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ flexBasis: '100%', height: !isDragActive ? 0 : isOver ? 48 : 32 }}
      className={`w-full overflow-hidden ${
        !isDragActive
          ? ''
          : isOver
            ? 'border-primary bg-primary/5 rounded-md border-2 border-dashed'
            : 'border-muted-foreground/30 rounded-md border border-dashed'
      }`}
    />
  );
}

// ─── Drag overlay ────────────────────────────────────────────────────────────

function CardDragOverlay({ cardId }: { cardId: CardId }) {
  const { t } = useTranslation(['pages']);
  const config = CARD_CONFIG[cardId];
  const title = cardId === 'bandwidth' ? t('dashboard.bandwidth') : config.titleKey;

  return (
    <Card className="ring-primary/20 w-[300px] shadow-lg ring-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {config.icon}
          {String(title)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 text-muted-foreground flex h-[180px] items-center justify-center rounded-lg text-sm">
          Chart
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function DraggableResourceCards({
  resourceData,
  resourceLoading,
  resourceAverages,
  bandwidthData,
  bandwidthLoading,
  bandwidthAverages,
  bandwidthPollInterval,
  onBandwidthPollIntervalChange,
}: DraggableResourceCardsProps) {
  const { layout, setLayout } = useResourceCardLayout();
  const [activeId, setActiveId] = useState<CardId | null>(null);

  // No preview state. Cards stay at their committed sizes during drag.
  // Visual feedback is handled by dnd-kit's `isOver` (ring highlight on
  // drop targets). Layout only changes on drop — zero state updates during
  // drag, zero re-renders, zero feedback loops.
  const activeRows = layout.rows;

  const cardFlexMap = useMemo(() => {
    const map = new Map<CardId, string>();
    for (const row of activeRows) {
      const basis = getFlexBasis(row.length);
      for (const id of row) map.set(id, basis);
    }
    return map;
  }, [activeRows]);

  const flatOrder = useMemo(() => activeRows.flat(), [activeRows]);
  const rowStartIndices = useMemo(() => {
    const starts = new Set<number>();
    let offset = 0;
    for (const row of activeRows) {
      starts.add(offset);
      offset += row.length;
    }
    return starts;
  }, [activeRows]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as CardId);
  }, []);

  // No onDragOver handler. Zero state updates during drag.

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const newLayout = computeNewLayout(layout.rows, active.id as CardId, String(over.id));
      if (newLayout) {
        setLayout({ rows: newLayout });
        // Highcharts reflow after layout change
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 250);
      }
    },
    [layout.rows, setLayout]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  function renderCard(cardId: CardId) {
    switch (cardId) {
      case 'cpu':
        return (
          <ResourceChart
            title="CPU"
            icon={<Cpu className="h-4 w-4" />}
            data={resourceData}
            processKey="processCpuUtilization"
            hostKey="hostCpuUtilization"
            processAvg={resourceAverages?.processCpu}
            hostAvg={resourceAverages?.hostCpu}
            isLoading={resourceLoading}
          />
        );
      case 'ram':
        return (
          <ResourceChart
            title="RAM"
            icon={<MemoryStick className="h-4 w-4" />}
            data={resourceData}
            processKey="processMemoryUtilization"
            hostKey="hostMemoryUtilization"
            processAvg={resourceAverages?.processMemory}
            hostAvg={resourceAverages?.hostMemory}
            isLoading={resourceLoading}
          />
        );
      case 'bandwidth':
        return (
          <ServerBandwidthChart
            data={bandwidthData}
            isLoading={bandwidthLoading}
            averages={bandwidthAverages}
            pollInterval={bandwidthPollInterval}
            onPollIntervalChange={onBandwidthPollIntervalChange}
          />
        );
    }
  }

  const isDragActive = activeId !== null;
  const renderItems: React.ReactNode[] = [];
  let rowCounter = 0;

  renderItems.push(<RowGapDropZone key="gap-0" position={0} isDragActive={isDragActive} />);

  for (let i = 0; i < flatOrder.length; i++) {
    const cardId = flatOrder[i]!;

    if (i > 0 && rowStartIndices.has(i)) {
      rowCounter++;
      renderItems.push(
        <RowGapDropZone
          key={`gap-${rowCounter}`}
          position={rowCounter}
          isDragActive={isDragActive}
        />
      );
    }

    renderItems.push(
      <DraggableCardSlot
        key={cardId}
        id={cardId}
        flexBasis={cardFlexMap.get(cardId) ?? '100%'}
        isDragActive={isDragActive}
      >
        {renderCard(cardId)}
      </DraggableCardSlot>
    );
  }

  renderItems.push(
    <RowGapDropZone
      key={`gap-${rowCounter + 1}`}
      position={rowCounter + 1}
      isDragActive={isDragActive}
    />
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-wrap gap-x-4 gap-y-4">{renderItems}</div>

      <DragOverlay dropAnimation={null}>
        {activeId ? <CardDragOverlay cardId={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
