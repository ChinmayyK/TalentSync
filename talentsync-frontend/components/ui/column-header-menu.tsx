"use client";

import React, { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface ColumnHeaderMenuProps {
    columnName: string;
    onSort?: (direction: 'asc' | 'desc') => void;
    onGroup?: (direction: 'asc' | 'desc') => void;
    onHide?: () => void;
    onSearch?: () => void;
}

export function ColumnHeaderMenu({
    columnName,
    onSort,
    onGroup,
    onHide,
    onSearch
}: ColumnHeaderMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors w-full">
                    <span>{columnName}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
                {onSearch && (
                    <>
                        <DropdownMenuItem onClick={onSearch}>
                            Search
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                {onSort && (
                    <>
                        <DropdownMenuItem onClick={() => onSort('asc')}>
                            Sort by Ascending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSort('desc')}>
                            Sort by Descending
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                {onGroup && (
                    <>
                        <DropdownMenuItem onClick={() => onGroup('asc')}>
                            Group by Ascending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onGroup('desc')}>
                            Group by Descending
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                {onHide && (
                    <DropdownMenuItem onClick={onHide}>
                        Hide Column
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
