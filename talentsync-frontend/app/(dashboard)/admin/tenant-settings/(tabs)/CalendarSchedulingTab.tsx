"use client";

import { WorkingHoursSettings } from "@/components/calendar/WorkingHoursSettings";
import { SchedulingRulesSettings } from "./SchedulingRulesSettings";
import { Separator } from "@/components/ui/separator";

export default function CalendarSchedulingTab() {
    return (
        <div className="space-y-8">
            <WorkingHoursSettings />

            <Separator />

            <SchedulingRulesSettings />
        </div>
    );
}
