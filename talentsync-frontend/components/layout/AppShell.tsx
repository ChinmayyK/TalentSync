"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { MobileHeader } from './MobileHeader';
import { CommandPalette, useCommandEvent } from '@/components/command-palette';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import {
  mockTenants,
  mockCurrentUser,
  mainNavItems,
  adminNavItems,
  othersNavItems,
  clientRelatedNavItems,
  recruiterRelatedNavItems
} from '@/lib/navigation-mock-data';
import { UploadCandidatesModal } from '@/components/candidates/UploadCandidatesModal';
import { ScheduleInterviewModal } from '@/components/scheduling/ScheduleInterviewModal';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();

  // All hooks MUST be called before any conditional returns
  const [currentTenantId, setCurrentTenantId] = useState(mockCurrentUser.tenantId);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Listen for command events from keyboard shortcuts
  const handleAddCandidate = useCallback(() => {
    setShowAddCandidateModal(true);
  }, []);

  const handleScheduleInterview = useCallback(() => {
    setShowScheduleModal(true);
  }, []);

  useCommandEvent('ADD_CANDIDATE', handleAddCandidate);
  useCommandEvent('SCHEDULE_INTERVIEW', handleScheduleInterview);

  const handleTenantChange = (tenantId: string) => {
    setCurrentTenantId(tenantId);
    const tenant = mockTenants.find((t) => t.id === tenantId);
    toast({
      title: 'Tenant Switched',
      description: `Now viewing ${tenant?.name || 'Unknown'}`,
    });
  };

  const handleLogout = () => {
    // Clear access token
    localStorage.removeItem('accessToken');

    toast({
      title: 'Signed out',
      description: 'You have been successfully signed out.',
    });

    // Redirect to login page
    router.push('/login');
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background">
        <MobileHeader
          mainNav={mainNavItems}
          adminNav={adminNavItems}
          clientRelatedNav={clientRelatedNavItems}
          recruiterRelatedNav={recruiterRelatedNavItems}
          currentUser={mockCurrentUser}
          onLogout={handleLogout}
        />

        <CommandPalette />

        <AppSidebar
          tenants={mockTenants}
          currentTenantId={currentTenantId}
          currentUser={mockCurrentUser}
          mainNav={mainNavItems}
          adminNav={adminNavItems}
          othersNav={othersNavItems}
          clientRelatedNav={clientRelatedNavItems}
          recruiterRelatedNav={recruiterRelatedNavItems}
          onTenantChange={handleTenantChange}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50 transition-colors relative">
          {children}
        </main>
      </div>

      {/* Global modals triggered by keyboard shortcuts */}
      <UploadCandidatesModal
        open={showAddCandidateModal}
        onOpenChange={setShowAddCandidateModal}
        onSuccess={() => {
          toast({
            title: 'Candidates Added',
            description: 'Candidates have been imported successfully.',
          });
        }}
      />

      <ScheduleInterviewModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        onSuccess={() => {
          toast({
            title: 'Interview Scheduled',
            description: 'The interview has been scheduled successfully.',
          });
        }}
      />
    </TooltipProvider>
  );
}
