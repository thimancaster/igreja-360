import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Calendar, List, ClipboardList } from "lucide-react";
import { pageVariants, pageTransition } from "@/lib/pageAnimations";
import { EventDashboard } from "@/components/events/EventDashboard";
import { EventCalendar } from "@/components/events/EventCalendar";
import { EventList } from "@/components/events/EventList";

export default function Eventos() {
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
        <p className="text-muted-foreground">Gerencie todos os eventos da igreja</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendário</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><EventDashboard /></TabsContent>
        <TabsContent value="calendar"><EventCalendar /></TabsContent>
        <TabsContent value="list"><EventList /></TabsContent>
      </Tabs>
    </motion.div>
  );
}
