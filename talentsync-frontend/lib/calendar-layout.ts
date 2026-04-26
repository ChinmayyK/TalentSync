import { CalendarEvent } from '@/types/calendar';

export interface EventLayout {
    left: number; // 0 to 1 (percentage)
    width: number; // 0 to 1 (percentage)
    column: number;
    totalColumns: number;
}

/**
 * Calculates the visual layout for a set of overlapping events.
 * Returns a map of event ID to layout configuration.
 */
export function getEventLayout(events: CalendarEvent[]): Record<string, EventLayout> {
    // Sort events by start time, then by duration (longer first for better packing)
    const sortedEvents = [...events].sort((a, b) => {
        if (a.startTime === b.startTime) {
            return b.duration - a.duration;
        }
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    const layout: Record<string, EventLayout> = {};
    const columns: CalendarEvent[][] = [];
    let lastEventEnd: number | null = null;

    sortedEvents.forEach((event) => {
        const start = new Date(event.startTime).getTime();
        const end = new Date(event.endTime).getTime();

        // If this event starts after the last group ended, clear columns
        if (lastEventEnd !== null && start >= lastEventEnd) {
            packEvents(columns, layout);
            columns.length = 0;
            lastEventEnd = null;
        }

        // Place event in the first available column
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            const lastInCol = col[col.length - 1];
            if (new Date(lastInCol.endTime).getTime() <= start) {
                col.push(event);
                placed = true;
                break;
            }
        }

        if (!placed) {
            columns.push([event]);
        }

        if (lastEventEnd === null || end > lastEventEnd) {
            lastEventEnd = end;
        }
    });

    if (columns.length > 0) {
        packEvents(columns, layout);
    }

    return layout;
}

function packEvents(columns: CalendarEvent[][], layout: Record<string, EventLayout>) {
    const numColumns = columns.length;
    columns.forEach((col, colIndex) => {
        col.forEach((event) => {
            layout[event.id] = {
                left: colIndex / numColumns,
                width: 1 / numColumns,
                column: colIndex,
                totalColumns: numColumns,
            };
        });
    });
}
