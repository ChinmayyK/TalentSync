"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserRole,
  UserStatus,
  Team,
  User,
  getUsers,
  getTeams,
  inviteUser,
  createTeam,
  deleteUser,
  deleteTeam,
  updateUser,
  updateTeam,
  addTeamMember,
  removeTeamMember,
  InviteUserDto,
  CreateTeamDto
} from "@/lib/api/users";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Plus,
  Search,
  Users,
  Users2,
  Mail,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type Tab = "users" | "teams";

export default function UsersTeams() {
  const { role: currentUserRole, isManager, isSuperAdmin } = useUserRole();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Modals state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createTeamModalOpen, setCreateTeamModalOpen] = useState(false);
  const [teamDetailOpen, setTeamDetailOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [changeRoleModalOpen, setChangeRoleModalOpen] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("RECRUITER");

  // Add Member state
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState("");

  // Edit Team state
  const [editTeamModalOpen, setEditTeamModalOpen] = useState(false);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDesc, setEditTeamDesc] = useState("");
  const [editTeamLeadId, setEditTeamLeadId] = useState("");

  // Delete Team confirmation state
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);

  // Forms state
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("RECRUITER");
  const [inviteTeamId, setInviteTeamId] = useState<string>("");

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamLeadId, setNewTeamLeadId] = useState("");

  // Filter state
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  // Team filter for users list is tricky purely client-side with paginated API, 
  // but we can implement basic filtering if the API supported it or just remove for now if complex.
  // The current getUsers API supports role and status. Let's stick to those.

  // --- Queries ---

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', searchQuery, roleFilter, statusFilter],
    queryFn: () => getUsers({
      search: searchQuery,
      role: roleFilter === "all" ? undefined : roleFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      limit: 100 // Fetch reasonably large batch for now
    }),
    enabled: isManager,
  });

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', searchQuery],
    queryFn: () => getTeams({
      search: searchQuery,
      limit: 50
    }),
    enabled: isManager,
  });

  const users = usersData?.data || [];
  const teams = teamsData?.data || [];

  // --- Mutations ---

  const inviteMutation = useMutation({
    mutationFn: (data: InviteUserDto) => inviteUser(data),
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      setInviteModalOpen(false);
      setInviteName("");
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to invite user");
    }
  });

  const createTeamMutation = useMutation({
    mutationFn: (data: CreateTeamDto) => createTeam(data),
    onSuccess: () => {
      toast.success("Team created successfully");
      setCreateTeamModalOpen(false);
      setNewTeamName("");
      setNewTeamDesc("");
      setNewTeamLeadId("");
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create team");
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      toast.success("User deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUsers(new Set());
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete user");
    }
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => {
      toast.success("Team deleted successfully");
      setTeamDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete team");
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      addTeamMember(teamId, userId),
    onSuccess: () => {
      toast.success("Member added successfully");
      setAddMemberModalOpen(false);
      setSelectedUserToAdd("");
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add member");
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, memberId }: { teamId: string; memberId: string }) =>
      removeTeamMember(teamId, memberId),
    onSuccess: () => {
      toast.success("Member removed successfully");
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove member");
    }
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: Partial<CreateTeamDto> }) =>
      updateTeam(teamId, data),
    onSuccess: () => {
      toast.success("Team updated successfully");
      setEditTeamModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update team");
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUser(userId, { role }),
    onSuccess: () => {
      toast.success("Role updated successfully");
      setChangeRoleModalOpen(false);
      setSelectedUserForRoleChange(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update role");
    }
  });

  // --- Actions ---

  const handleChangeRole = (user: User) => {
    setSelectedUserForRoleChange(user);
    setNewRole(user.role);
    setChangeRoleModalOpen(true);
  };

  const handleConfirmRoleChange = () => {
    if (!selectedUserForRoleChange) return;
    updateRoleMutation.mutate({
      userId: selectedUserForRoleChange.id,
      role: newRole
    });
  };



  const handleInvite = () => {
    if (!inviteEmail) return;
    inviteMutation.mutate({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      teamId: inviteTeamId === "none" ? undefined : (inviteTeamId || undefined)
    });
  };

  const handleCreateTeam = () => {
    if (!newTeamName) return;
    createTeamMutation.mutate({
      name: newTeamName,
      description: newTeamDesc,
      leadId: newTeamLeadId || undefined
    });
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search, Role, and Status are handled by the API query
      const matchesTeam =
        teamFilter === "all" || (user.teams && user.teams.includes(teamFilter));
      return matchesTeam;
    });
  }, [users, teamFilter]);

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleDeleteSelected = () => {
    // For now delete one by one or implementing bulk delete API later
    // Just demonstrating single deletion for the first selected for safety/MVP
    const first = Array.from(selectedUsers)[0];
    if (first) deleteUserMutation.mutate(first);
  };

  // --- Helpers ---

  const getRoleColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      ADMIN: "bg-blue-100 text-blue-800",
      MANAGER: "bg-purple-100 text-purple-800",
      RECRUITER: "bg-green-100 text-green-800",
      INTERVIEWER: "bg-yellow-100 text-yellow-800",
      SUPERADMIN: "bg-red-100 text-red-800",
      SUPPORT: "bg-gray-100 text-gray-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: UserStatus) => {
    const statusLower = status.toLowerCase();
    const colors: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-800",
      inactive: "bg-gray-100 text-gray-800",
      pending: "bg-orange-100 text-orange-800",
    };
    return colors[statusLower] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team);
    setTeamDetailOpen(true);
  };

  const getUserName = (userId: string) => {
    return users.find((u) => u.id === userId)?.name || "Unknown";
  };

  // RBAC Check
  if (!isManager) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4 opacity-60" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Unauthorized
          </h1>
          <p className="text-muted-foreground">
            You don't have permission to access Users & Teams. Only Admins and
            Managers can access this area.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <motion.div initial="initial" animate="animate" variants={staggerContainer}>
        {/* Header */}
        <motion.div variants={fadeInUp} className="border-b border-[#E5E7EB] bg-[#FFFFFF]">
          <div className="w-full p-4 md:px-8 md:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Users & Teams
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage your organization's members, roles, and team assignments.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setCreateTeamModalOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </Button>
                <Button
                  onClick={() => setInviteModalOpen(true)}
                  className="bg-[#0066CC] hover:bg-[#0052A3] text-white w-full sm:w-auto"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-8 mt-6 border-t border-[#E5E7EB] pt-0 overflow-x-auto">
              <button
                onClick={() => setActiveTab("users")}
                className={`pb-3 pt-3 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "users"
                  ? "border-[#0066CC] text-[#0066CC]"
                  : "border-transparent text-gray-500 hover:text-foreground"
                  }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Users
              </button>
              <button
                onClick={() => setActiveTab("teams")}
                className={`pb-3 pt-3 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "teams"
                  ? "border-[#0066CC] text-[#0066CC]"
                  : "border-transparent text-gray-500 hover:text-foreground"
                  }`}
              >
                <Users2 className="w-4 h-4 inline mr-2" />
                Teams
              </button>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div variants={staggerItem} className="w-full p-4 md:px-8 md:py-8">
          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex gap-2 flex-col sm:flex-row">
                    <Select
                      value={roleFilter}
                      onValueChange={(val: UserRole | "all") => setRoleFilter(val)}
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="RECRUITER">Recruiter</SelectItem>
                        <SelectItem value="INTERVIEWER">Interviewer</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={teamFilter} onValueChange={setTeamFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Filter by team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.name}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedUsers.size > 0 && (
                <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-foreground">
                    {selectedUsers.size} user{selectedUsers.size !== 1 ? "s" : ""}{" "}
                    selected
                  </p>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUsers(new Set())}
                      className="flex-1 sm:flex-none"
                    >
                      Deselect
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive flex-1 sm:flex-none"
                      onClick={handleDeleteSelected}
                    >
                      Delete / Deactivate
                    </Button>
                  </div>
                </div>
              )}

              {/* Users List - Mobile Cards */}
              <div className="md:hidden space-y-4">
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="bg-white p-4 rounded-lg border shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0066CC] text-white flex items-center justify-center text-sm font-semibold">
                            {user.name?.charAt(0) || user.email.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{user.name || "Pending Invite"}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(user)}>Change Role</DropdownMenuItem>
                            {user.status !== 'inactive' ? (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteUserMutation.mutate(user.id)}
                              >
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-green-600">
                                Activate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getRoleColor(user.role)}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                        <Badge className={getStatusColor(user.status)}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Last login: {formatDate(user.lastLogin)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Users Table - Desktop */}
              <div className="hidden md:block bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] overflow-hidden">
                <Table>
                  <TableHeader className="bg-[#F7F9FC] border-b border-[#E5E7EB]">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            users.length > 0 &&
                            selectedUsers.size === users.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold">Name & Email</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Last Login</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex justify-center items-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                          <p className="text-foreground font-medium">
                            No users found
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Try adjusting your filters or search query
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow
                          key={user.id}
                          className="border-b border-[#E5E7EB] hover:bg-[#F7F9FC] transition-colors"
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.has(user.id)}
                              onCheckedChange={() => handleSelectUser(user.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#0066CC] text-white flex items-center justify-center text-xs font-semibold">
                                {user.name?.charAt(0) || user.email.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {user.name || "Pending Invite"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleColor(user.role)}>
                              {user.role.charAt(0).toUpperCase() +
                                user.role.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(user.status)}>
                              {user.status.charAt(0).toUpperCase() +
                                user.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(user.lastLogin)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Profile</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangeRole(user)}>Change Role</DropdownMenuItem>
                                {user.status !== 'inactive' ? (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => deleteUserMutation.mutate(user.id)}
                                  >
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem className="text-green-600">
                                    Activate
                                  </DropdownMenuItem>
                                )}

                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {activeTab === "teams" && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {teamsLoading ? (
                <div className="col-span-full flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : teams.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Users2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                  <p className="text-foreground font-medium">No teams found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first team to get started
                  </p>
                </div>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-6 cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => handleTeamClick(team)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">
                          {team.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {team.description}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit Team</DropdownMenuItem>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTeamId(team.id);
                            }}
                          >
                            Delete Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-3 mt-4">
                      <div className="text-sm">
                        <p className="text-muted-foreground">Team Lead</p>
                        <p className="font-medium text-foreground">
                          {getUserName(team.leadId)}
                        </p>
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground">
                          {team.memberIds.length} member
                          {team.memberIds.length !== 1 ? "s" : ""}
                        </p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {team.memberIds.slice(0, 3).map((memberId) => (
                            <div
                              key={memberId}
                              className="w-6 h-6 rounded-full bg-[#0066CC] text-white flex items-center justify-center text-xs font-semibold"
                              title={getUserName(memberId)}
                            >
                              {/* Fetch user name/avatar properly in a real app, utilizing cached users or separate queries */}
                              {users.find((u) => u.id === memberId)?.name?.charAt(0) || "?"}
                            </div>
                          ))}
                          {team.memberIds.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-semibold">
                              +{team.memberIds.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Invite User Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invite to a new team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Full Name
              </label>
              <Input
                placeholder="John Doe"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                placeholder="user@example.com"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Role
              </label>
              <Select
                value={inviteRole}
                onValueChange={(val: UserRole) => setInviteRole(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && (
                    <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                  )}
                  <SelectItem
                    value="ADMIN"
                    disabled={!isSuperAdmin}
                    className={!isSuperAdmin ? "opacity-50 cursor-not-allowed" : ""}
                    title={!isSuperAdmin ? "Admin role can only be assigned by TalentSync platform administrators." : undefined}
                  >
                    Admin {!isSuperAdmin && "(Platform Only)"}
                  </SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="RECRUITER">Recruiter</SelectItem>
                  <SelectItem value="INTERVIEWER">Interviewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Team (Optional)
              </label>
              <Select
                value={inviteTeamId}
                onValueChange={setInviteTeamId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
              onClick={handleInvite}
              disabled={!inviteEmail || !inviteName || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Invite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Team Modal */}
      <Dialog open={createTeamModalOpen} onOpenChange={setCreateTeamModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>
              Set up a new team for your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Team Name
              </label>
              <Input
                placeholder="e.g., Engineering"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <Input
                placeholder="What does this team do?"
                value={newTeamDesc}
                onChange={(e) => setNewTeamDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Team Lead
              </label>
              <Select
                value={newTeamLeadId}
                onValueChange={setNewTeamLeadId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team lead" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setCreateTeamModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
              onClick={handleCreateTeam}
              disabled={!newTeamName || createTeamMutation.isPending}
            >
              {createTeamMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Team"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Detail Modal */}
      <Dialog open={teamDetailOpen} onOpenChange={setTeamDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedTeam && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTeam.name}</DialogTitle>
                <DialogDescription>
                  {selectedTeam.description}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Team Lead
                  </h3>
                  <div className="flex items-center gap-3 p-3 bg-[#F7F9FC] rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-[#0066CC] text-white flex items-center justify-center font-semibold text-sm">
                      {/* Using safe access for name since it's from fetched data */}
                      {users.find((u) => u.id === selectedTeam.leadId)?.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {getUserName(selectedTeam.leadId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {users.find((u) => u.id === selectedTeam.leadId)?.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Members
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddMemberModalOpen(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Member
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(selectedTeam.memberIds ?? []).map((memberId) => {
                      const member = users.find((u) => u.id === memberId);
                      return (
                        <div
                          key={memberId}
                          className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0066CC] text-white flex items-center justify-center font-semibold text-sm">
                              {member?.name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {member?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {member?.email}
                              </p>
                            </div>
                          </div>
                          {memberId !== selectedTeam.leadId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeMemberMutation.mutate({
                                teamId: selectedTeam.id,
                                memberId: memberId
                              })}
                              disabled={removeMemberMutation.isPending}
                            >
                              {removeMemberMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Remove"}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setTeamDetailOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
                  onClick={() => {
                    setEditTeamName(selectedTeam.name);
                    setEditTeamDesc(selectedTeam.description || "");
                    setEditTeamLeadId(selectedTeam.leadId || "");
                    setEditTeamModalOpen(true);
                  }}
                >
                  Edit Team
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Role Modal */}
      <Dialog open={changeRoleModalOpen} onOpenChange={setChangeRoleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUserForRoleChange?.name || selectedUserForRoleChange?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Current Role
              </label>
              <Badge className={getRoleColor(selectedUserForRoleChange?.role || "RECRUITER")}>
                {selectedUserForRoleChange?.role}
              </Badge>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                New Role
              </label>
              <Select
                value={newRole}
                onValueChange={(val: UserRole) => setNewRole(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && (
                    <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                  )}
                  <SelectItem
                    value="ADMIN"
                    disabled={!isSuperAdmin}
                    className={!isSuperAdmin ? "opacity-50 cursor-not-allowed" : ""}
                    title={!isSuperAdmin ? "Admin role can only be assigned by TalentSync platform administrators." : undefined}
                  >
                    Admin {!isSuperAdmin && "(Platform Only)"}
                  </SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="RECRUITER">Recruiter</SelectItem>
                  <SelectItem value="INTERVIEWER">Interviewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setChangeRoleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
              onClick={handleConfirmRoleChange}
              disabled={updateRoleMutation.isPending || newRole === selectedUserForRoleChange?.role}
            >
              {updateRoleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={addMemberModalOpen} onOpenChange={setAddMemberModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a user to {selectedTeam?.name || "this team"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Select User
              </label>
              <Select
                value={selectedUserToAdd}
                onValueChange={setSelectedUserToAdd}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user to add" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(u => !selectedTeam?.memberIds?.includes(u.id))
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setAddMemberModalOpen(false);
                setSelectedUserToAdd("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
              onClick={() => {
                if (selectedTeam && selectedUserToAdd) {
                  addMemberMutation.mutate({
                    teamId: selectedTeam.id,
                    userId: selectedUserToAdd
                  });
                }
              }}
              disabled={!selectedUserToAdd || addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Member"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Team Modal */}
      <Dialog open={editTeamModalOpen} onOpenChange={setEditTeamModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Team Name
              </label>
              <Input
                placeholder="e.g., Engineering"
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <Input
                placeholder="What does this team do?"
                value={editTeamDesc}
                onChange={(e) => setEditTeamDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Team Lead
              </label>
              <Select
                value={editTeamLeadId}
                onValueChange={setEditTeamLeadId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team lead" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedTeam?.memberIds ?? []).map((memberId) => {
                    const member = users.find(u => u.id === memberId);
                    return (
                      <SelectItem key={memberId} value={memberId}>
                        {member?.name || member?.email || memberId}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setEditTeamModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
              onClick={() => {
                if (selectedTeam) {
                  updateTeamMutation.mutate({
                    teamId: selectedTeam.id,
                    data: {
                      name: editTeamName,
                      description: editTeamDesc,
                      leadId: editTeamLeadId || undefined
                    }
                  });
                }
              }}
              disabled={!editTeamName || updateTeamMutation.isPending}
            >
              {updateTeamMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation Dialog */}
      <AlertDialog open={!!deleteTeamId} onOpenChange={() => setDeleteTeamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this team? This action cannot be undone.
              All team members will be unassigned from this team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTeamId) {
                  deleteTeamMutation.mutate(deleteTeamId, {
                    onSuccess: () => setDeleteTeamId(null),
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTeamMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
