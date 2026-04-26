import { getAuthToken } from "@/lib/auth";
import { client } from "./client";

export type UserRole = "ADMIN" | "MANAGER" | "RECRUITER" | "INTERVIEWER" | "SUPERADMIN" | "SUPPORT";
export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "active" | "inactive" | "pending";

export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role: UserRole;
    status: UserStatus;
    teams?: string[];
    lastLogin?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface Team {
    id: string;
    name: string;
    description: string;
    leadId: string;
    memberIds: string[];
    createdAt: string;
}

export interface CreateTeamDto {
    name: string;
    description?: string;
    leadId?: string;
}

export interface InviteUserDto {
    name: string;
    email: string;
    role: UserRole;
    teamId?: string;
}

// Users API
export async function getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    status?: UserStatus;
}): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    // Map frontend param names to backend DTO expected names
    const backendParams: Record<string, any> = {};
    if (params?.page) backendParams.page = params.page;
    if (params?.limit) backendParams.perPage = params.limit;
    if (params?.search) backendParams.q = params.search;
    if (params?.role) backendParams.role = params.role;
    if (params?.status) backendParams.status = params.status;

    return client.get("/users", { params: backendParams });
}

export async function inviteUser(data: InviteUserDto) {
    return client.post("/users/invite", data);
}

export async function updateUser(id: string, data: Partial<User>) {
    return client.patch(`/users/${id}`, data);
}

export async function deleteUser(id: string) {
    // Note: The backend uses deactivate/activate endpoints, or purely delete for cleanup.
    // Assuming we want to deactivate based on the UI context showing "Delete/Deactivate"
    return client.post(`/users/${id}/deactivate`);
}

// Teams API
export async function getTeams(params?: {
    page?: number;
    limit?: number;
    search?: string;
}): Promise<{ data: Team[]; total: number; page: number; limit: number }> {
    // Map frontend params to backend expected params
    const backendParams = {
        page: params?.page,
        perPage: params?.limit,
        q: params?.search || undefined,
    };
    return client.get("/teams", { params: backendParams as any });
}

export async function getTeam(id: string): Promise<Team> {
    return client.get(`/teams/${id}`);
}

export async function createTeam(data: CreateTeamDto) {
    return client.post("/teams", data);
}

export async function updateTeam(id: string, data: Partial<CreateTeamDto>) {
    return client.patch(`/teams/${id}`, data);
}

export async function deleteTeam(id: string) {
    return client.delete(`/teams/${id}`);
}

export async function addTeamMember(teamId: string, userId: string, role: string = 'TEAM_MEMBER') {
    return client.post(`/teams/${teamId}/members`, { userId, role });
}

export async function removeTeamMember(teamId: string, userId: string) {
    return client.delete(`/teams/${teamId}/members/${userId}`);
}

export const mockUsers: User[] = []; // Kept empty for type compatibility if needed temporarily
export const mockTeams: Team[] = [];
