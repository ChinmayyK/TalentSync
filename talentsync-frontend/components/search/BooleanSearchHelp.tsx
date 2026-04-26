"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export function BooleanSearchHelp() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                    <h4 className="font-medium text-sm">Advanced Search Syntax</h4>
                    <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-[80px_1fr] gap-2">
                            <code className="bg-muted px-1.5 py-0.5 rounded">AND</code>
                            <span className="text-muted-foreground">Both terms required</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-2">
                            <code className="bg-muted px-1.5 py-0.5 rounded">OR</code>
                            <span className="text-muted-foreground">Either term matches</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-2">
                            <code className="bg-muted px-1.5 py-0.5 rounded">NOT</code>
                            <span className="text-muted-foreground">Exclude term</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-2">
                            <code className="bg-muted px-1.5 py-0.5 rounded">"..."</code>
                            <span className="text-muted-foreground">Exact phrase</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-2">
                            <code className="bg-muted px-1.5 py-0.5 rounded">field:</code>
                            <span className="text-muted-foreground">Search specific field</span>
                        </div>
                    </div>
                    <div className="border-t pt-2">
                        <p className="text-xs font-medium mb-1">Examples:</p>
                        <div className="space-y-1 text-xs text-muted-foreground">
                            <p><code className="bg-muted px-1 rounded">python AND java</code></p>
                            <p><code className="bg-muted px-1 rounded">react OR angular</code></p>
                            <p><code className="bg-muted px-1 rounded">"senior developer"</code></p>
                            <p><code className="bg-muted px-1 rounded">skills:python</code></p>
                        </div>
                    </div>
                    <div className="border-t pt-2">
                        <p className="text-xs text-muted-foreground">
                            Fields: name, email, phone, roleTitle, skills, tags
                        </p>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
