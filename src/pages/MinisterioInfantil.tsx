import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Baby, Users, QrCode, LogOut, BarChart3, Megaphone, Calendar, Settings, UserCheck } from "lucide-react";
import { pageVariants, pageTransition } from "@/lib/pageAnimations";
import { ChildrenList } from "@/components/children-ministry/ChildrenList";
import { GuardiansList } from "@/components/children-ministry/GuardiansList";
import { CheckInPanel } from "@/components/children-ministry/CheckInPanel";
import { CheckOutPanel } from "@/components/children-ministry/CheckOutPanel";
import { MinistryDashboard } from "@/components/children-ministry/MinistryDashboard";
import { AnnouncementsPanel } from "@/components/children-ministry/announcements/AnnouncementsPanel";
import { MinistryCalendar } from "@/components/children-ministry/calendar/MinistryCalendar";
import { ClassroomCapacityManager, WaitlistPanel } from "@/components/children-ministry/capacity";
import { StaffList, StaffScheduler } from "@/components/children-ministry/staff";

export default function MinisterioInfantil() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex-1 space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ministério Infantil</h1>
          <p className="text-muted-foreground">
            Gerenciamento de crianças, responsáveis e controle de entrada/saída
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-9 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="children" className="gap-2">
            <Baby className="h-4 w-4" />
            <span className="hidden sm:inline">Crianças</span>
          </TabsTrigger>
          <TabsTrigger value="guardians" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Responsáveis</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Equipe</span>
          </TabsTrigger>
          <TabsTrigger value="capacity" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Salas</span>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Comunicados</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendário</span>
          </TabsTrigger>
          <TabsTrigger value="checkin" className="gap-2">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Check-in</span>
          </TabsTrigger>
          <TabsTrigger value="checkout" className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Check-out</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <MinistryDashboard />
        </TabsContent>

        <TabsContent value="children" className="space-y-4">
          <ChildrenList />
        </TabsContent>

        <TabsContent value="guardians" className="space-y-4">
          <GuardiansList />
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <StaffList />
          <StaffScheduler />
        </TabsContent>

        <TabsContent value="capacity" className="space-y-4">
          <ClassroomCapacityManager />
          <WaitlistPanel />
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <AnnouncementsPanel />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <MinistryCalendar />
        </TabsContent>

        <TabsContent value="checkin" className="space-y-4">
          <CheckInPanel />
        </TabsContent>

        <TabsContent value="checkout" className="space-y-4">
          <CheckOutPanel />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
