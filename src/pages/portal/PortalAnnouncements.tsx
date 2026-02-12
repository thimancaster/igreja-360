import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, AlertTriangle, CheckCircle, Clock, Bell, Inbox, CheckCheck } from "lucide-react";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useVolunteerAnnouncements } from "@/hooks/useVolunteerAnnouncements";
import { useRole } from "@/hooks/useRole";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PortalAnnouncements() {
  const { isParent } = useRole();
  const { parentAnnouncements, isLoadingParent, markAsRead: markParentRead, unreadCount: parentUnread } = useAnnouncements();
  const { myAnnouncements, myAnnouncementsLoading, markAsRead: markVolunteerRead, unreadCount: volunteerUnread } = useVolunteerAnnouncements();

  const isLoading = isLoadingParent || myAnnouncementsLoading;
  const totalUnread = (parentUnread || 0) + (volunteerUnread || 0);

  // Merge all announcements
  const allAnnouncements = [
    ...(parentAnnouncements || []).map((a: any) => ({ ...a, source: "infantil" as const })),
    ...(myAnnouncements || []).map((a: any) => ({ ...a, source: "ministerio" as const })),
  ].sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime());

  const unreadAnnouncements = allAnnouncements.filter((a) => !a.is_read);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  const handleRead = (announcement: any) => {
    if (!announcement.is_read) {
      if (announcement.source === "infantil") {
        markParentRead(announcement.id);
      } else {
        markVolunteerRead(announcement.id);
      }
    }
  };

  const AnnouncementCard = ({ announcement, index }: { announcement: any; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={`cursor-pointer transition-all active:scale-[0.98] ${
          !announcement.is_read ? "border-primary bg-primary/5 shadow-sm" : ""
        } ${announcement.priority === "urgent" ? "border-destructive bg-destructive/5" : ""}`}
        onClick={() => handleRead(announcement)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {announcement.priority === "urgent" && (
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              )}
              <CardTitle className="text-base leading-snug truncate">
                {announcement.title}
              </CardTitle>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {announcement.is_read ? (
                <CheckCircle className="h-4 w-4 text-primary" />
              ) : (
                <Badge variant="default" className="text-xs">Novo</Badge>
              )}
            </div>
          </div>
          <CardDescription className="flex items-center gap-2 text-xs">
            <Clock className="h-3 w-3" />
            {format(new Date(announcement.published_at || announcement.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            {announcement.ministry_name && (
              <Badge variant="outline" className="text-[10px] ml-1">{announcement.ministry_name}</Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {announcement.content}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comunicados</h1>
          <p className="text-sm text-muted-foreground">Avisos dos seus ministérios</p>
        </div>
        {totalUnread > 0 && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {totalUnread} não lido{totalUnread > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {allAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium">Nenhum comunicado</p>
            <p className="text-muted-foreground text-center text-sm mt-1">
              Você receberá avisos quando houver novos comunicados
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={totalUnread > 0 ? "unread" : "all"} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="unread" className="gap-2 text-sm">
              <Inbox className="h-4 w-4" />
              Não Lidos ({totalUnread})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2 text-sm">
              <CheckCheck className="h-4 w-4" />
              Todos ({allAnnouncements.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="space-y-3 mt-4">
            {unreadAnnouncements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <CheckCircle className="h-10 w-10 text-primary mb-3" />
                  <p className="font-medium">Tudo lido!</p>
                </CardContent>
              </Card>
            ) : (
              unreadAnnouncements.map((a, i) => <AnnouncementCard key={a.id} announcement={a} index={i} />)
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-3 mt-4">
            {allAnnouncements.map((a, i) => (
              <AnnouncementCard key={a.id} announcement={a} index={i} />
            ))}
          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  );
}
