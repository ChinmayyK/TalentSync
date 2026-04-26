import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/lib/api/users";

export function useUserRole() {
    const { activeTenantId, tenants, isLoading } = useAuth();

    const currentRole = useMemo(() => {
        const activeTenant = tenants?.find(t => t.id === activeTenantId);
        return (activeTenant?.role as UserRole) || "RECRUITER";
    }, [activeTenantId, tenants]);

    return {
        role: currentRole,
        isLoading,
        isSuperAdmin: currentRole === "SUPERADMIN",
        isAdmin: currentRole === "ADMIN" || currentRole === "SUPERADMIN",
        isManager: ["ADMIN", "MANAGER", "SUPERADMIN"].includes(currentRole),
    };
}
