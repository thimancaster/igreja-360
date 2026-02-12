import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Baby, Shield, History, Calendar, Megaphone } from "lucide-react";
import { useRole } from "@/hooks/useRole";

// Re-use existing parent pages as tab content
import ParentDashboardContent from "@/pages/parent/ParentDashboard";
import ParentAuthorizationsContent from "@/pages/parent/ParentAuthorizations";
import ParentHistoryContent from "@/pages/parent/ParentHistory";
import ParentEventsContent from "@/pages/parent/ParentEvents";
import ParentAnnouncementsContent from "@/pages/parent/ParentAnnouncements";

export default function PortalChildren() {
  const [activeTab, setActiveTab] = useState("overview");
  const { isParent } = useRole();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Meus Filhos</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe seus filhos no ministério infantil
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-1.5">
            <Baby className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="authorizations" className="gap-1.5">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Autorizações</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Eventos</span>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-1.5">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Avisos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ParentDashboardContent />
        </TabsContent>

        <TabsContent value="authorizations">
          <ParentAuthorizationsContent />
        </TabsContent>

        <TabsContent value="history">
          <ParentHistoryContent />
        </TabsContent>

        <TabsContent value="events">
          <ParentEventsContent />
        </TabsContent>

        <TabsContent value="announcements">
          <ParentAnnouncementsContent />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
