"use client"

import * as React from "react"
import {
    Calendar,
    CreditCard,
    Settings,
    User,
    LayoutDashboard,
    Users,
    Video,
    Search,

    Plus,
    Inbox,
    Megaphone,
    FileText,
    Layers,
    Briefcase
} from "lucide-react"
import { useRouter } from "next/navigation"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"

// Custom event for triggering modals from anywhere
export const COMMAND_EVENTS = {
    ADD_CANDIDATE: 'command:add-candidate',
    SCHEDULE_INTERVIEW: 'command:schedule-interview',
} as const;

// Helper to dispatch command events
export function dispatchCommandEvent(event: keyof typeof COMMAND_EVENTS) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(COMMAND_EVENTS[event]));
    }
}

// Hook to listen for command events
export function useCommandEvent(event: keyof typeof COMMAND_EVENTS, handler: () => void) {
    React.useEffect(() => {
        const eventName = COMMAND_EVENTS[event];
        const wrappedHandler = () => handler();
        window.addEventListener(eventName, wrappedHandler);
        return () => window.removeEventListener(eventName, wrappedHandler);
    }, [event, handler]);
}

// Hook to detect if user is on Mac
function useIsMac() {
    const [isMac, setIsMac] = React.useState(true); // Default to Mac for SSR

    React.useEffect(() => {
        setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    }, []);

    return isMac;
}

export function CommandPalette() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()
    const isMac = useIsMac()

    // Modifier key symbol based on OS
    const modKey = isMac ? '⌘' : 'Ctrl+'

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            // ⌘K or Ctrl+K - Open command palette
            if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                e.stopPropagation() // Prevent double-trigger
                setOpen((prevOpen) => !prevOpen)
                return
            }

            // ⌘+Shift+C or Ctrl+Shift+C - Add Candidate
            if (e.key.toLowerCase() === "c" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
                e.preventDefault()
                e.stopPropagation()
                dispatchCommandEvent('ADD_CANDIDATE')
                return
            }

            // ⌘+Shift+S or Ctrl+Shift+S - Schedule Interview
            if (e.key.toLowerCase() === "s" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
                e.preventDefault()
                e.stopPropagation()
                dispatchCommandEvent('SCHEDULE_INTERVIEW')
                return
            }
        }

        document.addEventListener("keydown", down, { capture: true })
        return () => document.removeEventListener("keydown", down, { capture: true })
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <div className="glass backdrop-blur-3xl">
                <CommandInput placeholder="Type a command or search..." />
                <CommandList className="max-h-[350px]">
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Pages">
                        <CommandItem value="dashboard home" onSelect={() => runCommand(() => router.push('/dashboard'))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem value="candidates people" onSelect={() => runCommand(() => router.push('/candidates'))}>
                            <Users className="mr-2 h-4 w-4" />
                            <span>Candidates</span>
                        </CommandItem>
                        <CommandItem value="interviews meetings" onSelect={() => runCommand(() => router.push('/interviews'))}>
                            <Video className="mr-2 h-4 w-4" />
                            <span>Interviews</span>
                        </CommandItem>
                        <CommandItem value="calendar schedule" onSelect={() => runCommand(() => router.push('/calendar'))}>
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Calendar</span>
                        </CommandItem>
                        <CommandItem value="communication inbox messages email" onSelect={() => runCommand(() => router.push('/communication'))}>
                            <Inbox className="mr-2 h-4 w-4" />
                            <span>Inbox</span>
                        </CommandItem>
                        <CommandItem value="campaigns marketing outreach" onSelect={() => runCommand(() => router.push('/communication/campaigns'))}>
                            <Megaphone className="mr-2 h-4 w-4" />
                            <span>Campaigns</span>
                        </CommandItem>
                        <CommandItem value="reports analytics metrics" onSelect={() => runCommand(() => router.push('/reports'))}>
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Reports</span>
                        </CommandItem>
                        <CommandItem value="integrations apps connections zoho google" onSelect={() => runCommand(() => router.push('/integrations'))}>
                            <Layers className="mr-2 h-4 w-4" />
                            <span>Integrations</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Quick Actions">
                        <CommandItem value="add new candidate import upload" onSelect={() => runCommand(() => dispatchCommandEvent('ADD_CANDIDATE'))}>
                            <Plus className="mr-2 h-4 w-4" />
                            <span>Add Candidate</span>
                            <CommandShortcut>⇧{modKey}C</CommandShortcut>
                        </CommandItem>
                        <CommandItem value="schedule new interview meeting" onSelect={() => runCommand(() => dispatchCommandEvent('SCHEDULE_INTERVIEW'))}>
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Schedule Interview</span>
                            <CommandShortcut>⇧{modKey}S</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Admin">
                        <CommandItem value="users teams members employees" onSelect={() => runCommand(() => router.push('/admin/users-and-teams'))}>
                            <Users className="mr-2 h-4 w-4" />
                            <span>Users & Teams</span>
                        </CommandItem>
                        <CommandItem value="tenant settings organization company" onSelect={() => runCommand(() => router.push('/admin/tenant-settings'))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Tenant Settings</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Settings">
                        <CommandItem value="settings preferences configuration" onSelect={() => runCommand(() => router.push('/settings'))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </CommandItem>
                        <CommandItem value="profile account user me" onSelect={() => runCommand(() => router.push('/profile'))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </div>
        </CommandDialog>
    )
}

