import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, Bell, Settings } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { useDepartmentVolunteers } from "@/hooks/useDepartmentVolunteers";
import { useVolunteerSchedules, VolunteerSchedule } from "@/hooks/useVolunteerSchedules";
import { useVolunteerAnnouncements } from "@/hooks/useVolunteerAnnouncements";
import {
  DepartmentSelector,
  ScheduleCalendar,
  ScheduleDialog,
  VolunteerList,
  InviteVolunteerDialog,
  MySchedulesCard,
  VolunteerAnnouncementsPanel,
} from "@/components/schedules";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Escalas() {
  const navigate = useNavigate();
  const { isAdmin, isPastor, isTesoureiro, isLider, isLoading: roleLoading } = useRole();
  const { isVolunteer, hasPendingInvites, activeMinistries, isLoading: statusLoading } = useVolunteerStatus();

  const [selectedMinistry, setSelectedMinistry] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<VolunteerSchedule | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Determine if user can edit schedules
  const canEdit = isAdmin || isPastor || isLider;
  const canViewAll = isAdmin || isPastor || isTesoureiro;

  // Fetch data for selected ministry
  const {
    volunteers,
    isLoading: volunteersLoading,
    inviteVolunteer,
    isInviting,
    deactivateVolunteer,
    reactivateVolunteer,
  } = useDepartmentVolunteers(selectedMinistry);

  const {
    schedules,
    schedulesByDate,
    mySchedules,
    isLoading: schedulesLoading,
    mySchedulesLoading,
    createSchedule,
    isCreating,
    updateSchedule,
    isUpdating,
    deleteSchedule,
    confirmSchedule,
    isConfirming,
    hasConflict,
  } = useVolunteerSchedules(selectedMinistry, currentMonth);

  const {
    myAnnouncements,
    unreadCount,
    myAnnouncementsLoading,
    markAsRead,
  } = useVolunteerAnnouncements();

  // Redirect to accept term if has pending invites
  useEffect(() => {
    if (!statusLoading && hasPendingInvites) {
      navigate("/app/voluntario/aceitar-termo");
    }
  }, [statusLoading, hasPendingInvites, navigate]);

  // Auto-select first ministry if user only has one
  useEffect(() => {
    if (!selectedMinistry && activeMinistries.length === 1) {
      setSelectedMinistry(activeMinistries[0].ministry_id);
    }
  }, [activeMinistries, selectedMinistry]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedSchedule(null);
    setShowScheduleDialog(true);
  };

  const handleScheduleClick = (schedule: VolunteerSchedule) => {
    if (canEdit) {
      setSelectedSchedule(schedule);
      setSelectedDate(new Date(schedule.schedule_date));
      setShowScheduleDialog(true);
    }
  };

  if (roleLoading || statusLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  // Check if user has access
  if (!canViewAll && !isVolunteer && !isLider) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
          <Calendar className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Acesso Restrito</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Você não tem acesso às escalas de voluntários. 
            Aguarde um convite de algum líder de ministério para participar.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Escalas de Voluntários</h1>
            <p className="text-muted-foreground">
              {canEdit ? "Gerencie as escalas do seu ministério" : "Visualize suas escalas"}
            </p>
          </div>

          {(canViewAll || isLider) && (
            <DepartmentSelector
              value={selectedMinistry}
              onValueChange={setSelectedMinistry}
            />
          )}
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            {canEdit && selectedMinistry && (
              <TabsTrigger value="volunteers" className="gap-2">
                <Users className="h-4 w-4" />
                Voluntários
              </TabsTrigger>
            )}
            <TabsTrigger value="my-schedules" className="gap-2">
              <Calendar className="h-4 w-4" />
              Minhas Escalas
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2 relative">
              <Bell className="h-4 w-4" />
              Comunicados
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            {selectedMinistry ? (
              <ScheduleCalendar
                schedules={schedules}
                schedulesByDate={schedulesByDate}
                isLoading={schedulesLoading}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                onDayClick={canEdit ? handleDayClick : undefined}
                onScheduleClick={handleScheduleClick}
                canEdit={canEdit}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um ministério para ver as escalas</p>
              </div>
            )}
          </TabsContent>

          {canEdit && selectedMinistry && (
            <TabsContent value="volunteers">
              <VolunteerList
                volunteers={volunteers}
                isLoading={volunteersLoading}
                onInvite={() => setShowInviteDialog(true)}
                onDeactivate={deactivateVolunteer}
                onReactivate={reactivateVolunteer}
                canEdit={canEdit}
              />
            </TabsContent>
          )}

          <TabsContent value="my-schedules">
            <MySchedulesCard
              schedules={mySchedules}
              isLoading={mySchedulesLoading}
              onConfirm={confirmSchedule}
              isConfirming={isConfirming}
            />
          </TabsContent>

          <TabsContent value="announcements">
            <VolunteerAnnouncementsPanel
              announcements={myAnnouncements}
              isLoading={myAnnouncementsLoading}
              onMarkAsRead={markAsRead}
              showMinistryName
            />
          </TabsContent>
        </Tabs>

        {/* Schedule Dialog */}
        {selectedMinistry && (
          <ScheduleDialog
            open={showScheduleDialog}
            onOpenChange={setShowScheduleDialog}
            volunteers={volunteers}
            selectedDate={selectedDate}
            selectedSchedule={selectedSchedule}
            ministryId={selectedMinistry}
            onSave={createSchedule}
            onUpdate={updateSchedule}
            onDelete={deleteSchedule}
            isLoading={isCreating || isUpdating}
            hasConflict={hasConflict}
          />
        )}

        {/* Invite Dialog */}
        {selectedMinistry && (
          <InviteVolunteerDialog
            open={showInviteDialog}
            onOpenChange={setShowInviteDialog}
            ministryId={selectedMinistry}
            onInvite={inviteVolunteer}
            isLoading={isInviting}
          />
        )}
      </div>
    </AppLayout>
  );
}
