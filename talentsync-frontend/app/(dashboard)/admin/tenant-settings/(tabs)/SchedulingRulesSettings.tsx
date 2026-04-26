"use client";

import { useState } from "react";
import { Settings, Plus, Trash2, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    useSchedulingRules,
    useCreateSchedulingRule,
    useUpdateSchedulingRule,
    useDeleteSchedulingRule,
} from "@/lib/hooks/useCalendar";
import { SchedulingRule } from "@/lib/api/calendar";
import { toast } from "@/hooks/use-toast";

export function SchedulingRulesSettings() {
    const { data: rules, isLoading } = useSchedulingRules();
    const createMutation = useCreateSchedulingRule();
    const updateMutation = useUpdateSchedulingRule();
    const deleteMutation = useDeleteSchedulingRule();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newRule, setNewRule] = useState({
        name: "",
        minNoticeMins: 60,
        bufferBeforeMins: 5,
        bufferAfterMins: 5,
        defaultSlotMins: 60,
        allowOverlapping: false,
        isDefault: false,
    });

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(newRule);
            toast({ title: "Rule Created", description: `${newRule.name} created successfully` });
            setIsCreateOpen(false);
            setNewRule({
                name: "",
                minNoticeMins: 60,
                bufferBeforeMins: 5,
                bufferAfterMins: 5,
                defaultSlotMins: 60,
                allowOverlapping: false,
                isDefault: false,
            });
        } catch (err: any) {
            toast({ title: "Failed", description: err.message, variant: "destructive" });
        }
    };

    const handleDelete = async (rule: SchedulingRule) => {
        if (!confirm(`Delete rule "${rule.name}"?`)) return;
        try {
            await deleteMutation.mutateAsync(rule.id);
            toast({ title: "Rule Deleted" });
        } catch (err: any) {
            toast({ title: "Failed", description: err.message, variant: "destructive" });
        }
    };

    const handleSetDefault = async (rule: SchedulingRule) => {
        try {
            await updateMutation.mutateAsync({ id: rule.id, data: { isDefault: true } });
            toast({ title: "Default Updated", description: `${rule.name} is now the default rule` });
        } catch (err: any) {
            toast({ title: "Failed", description: err.message, variant: "destructive" });
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-10 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Scheduling Rules
                        </CardTitle>
                        <CardDescription>
                            Configure default settings for interview scheduling like buffer times and minimum notice.
                        </CardDescription>
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                Add Rule
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Scheduling Rule</DialogTitle>
                                <DialogDescription>
                                    Define a new set of scheduling constraints.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Rule Name</Label>
                                    <Input
                                        value={newRule.name}
                                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                                        placeholder="e.g., Standard Interviews"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Min Notice (mins)</Label>
                                        <Input
                                            type="number"
                                            value={newRule.minNoticeMins}
                                            onChange={(e) => setNewRule({ ...newRule, minNoticeMins: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Default Slot (mins)</Label>
                                        <Input
                                            type="number"
                                            value={newRule.defaultSlotMins}
                                            onChange={(e) => setNewRule({ ...newRule, defaultSlotMins: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Buffer Before (mins)</Label>
                                        <Input
                                            type="number"
                                            value={newRule.bufferBeforeMins}
                                            onChange={(e) => setNewRule({ ...newRule, bufferBeforeMins: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Buffer After (mins)</Label>
                                        <Input
                                            type="number"
                                            value={newRule.bufferAfterMins}
                                            onChange={(e) => setNewRule({ ...newRule, bufferAfterMins: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Set as Default</Label>
                                    <Switch
                                        checked={newRule.isDefault}
                                        onCheckedChange={(checked) => setNewRule({ ...newRule, isDefault: checked })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreate} disabled={!newRule.name || createMutation.isPending}>
                                    {createMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    ) : null}
                                    Create Rule
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {!rules || rules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No scheduling rules configured. Create one to get started.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rules.map((rule) => (
                            <div
                                key={rule.id}
                                className="flex items-center justify-between p-4 border rounded-lg bg-background"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{rule.name}</span>
                                        {rule.isDefault && (
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {rule.defaultSlotMins}min slots • {rule.minNoticeMins}min notice •
                                        {rule.bufferBeforeMins}/{rule.bufferAfterMins}min buffers
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!rule.isDefault && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSetDefault(rule)}
                                            disabled={updateMutation.isPending}
                                        >
                                            <Check className="h-4 w-4 mr-1" />
                                            Set Default
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(rule)}
                                        disabled={deleteMutation.isPending}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
