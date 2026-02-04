import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Megaphone,
  AlertTriangle,
  CheckCircle,
  Clock,
  Inbox,
  CheckCheck,
} from "lucide-react";
import { useAnnouncements } from "@/hooks/useAnnouncements";

export default function ParentAnnouncements() {
  const { parentAnnouncements, isLoadingParent, markAsRead, unreadCount } =
    useAnnouncements();

  if (isLoadingParent) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const unreadAnnouncements = parentAnnouncements?.filter((a) => !a.is_read) || [];
  const readAnnouncements = parentAnnouncements?.filter((a) => a.is_read) || [];

  const AnnouncementCard = ({ announcement, index }: { announcement: any; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={`cursor-pointer transition-all active:scale-[0.98] ${
          !announcement.is_read ? "border-primary bg-primary/5 shadow-sm" : ""
        } ${
          announcement.priority === "urgent"
            ? "border-destructive bg-destructive/5"
            : ""
        }`}
        onClick={() => {
          if (!announcement.is_read) {
            markAsRead(announcement.id);
          }
        }}
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
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Badge variant="default" className="text-xs">
                  Novo
                </Badge>
              )}
              {announcement.priority === "urgent" && (
                <Badge variant="destructive" className="text-xs">Urgente</Badge>
              )}
            </div>
          </div>
          <CardDescription className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {format(
              new Date(announcement.published_at!),
              "dd 'de' MMMM 'às' HH:mm",
              { locale: ptBR }
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comunicados</h1>
          <p className="text-sm text-muted-foreground">
            Avisos do ministério infantil
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {unreadCount} não lido{unreadCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {parentAnnouncements && parentAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium">Nenhum comunicado</p>
            <p className="text-muted-foreground text-center text-sm mt-1">
              Você receberá notificações quando houver novos comunicados
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={unreadCount > 0 ? "unread" : "all"} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="unread" className="gap-2 text-sm">
              <Inbox className="h-4 w-4" />
              Não Lidos ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2 text-sm">
              <CheckCheck className="h-4 w-4" />
              Todos ({parentAnnouncements?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="space-y-3 mt-4">
            {unreadAnnouncements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                  <p className="font-medium">Tudo lido!</p>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Você não tem comunicados pendentes
                  </p>
                </CardContent>
              </Card>
            ) : (
              unreadAnnouncements.map((announcement, index) => (
                <AnnouncementCard 
                  key={announcement.id} 
                  announcement={announcement} 
                  index={index} 
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-3 mt-4">
            {parentAnnouncements?.map((announcement, index) => (
              <AnnouncementCard 
                key={announcement.id} 
                announcement={announcement} 
                index={index} 
              />
            ))}
          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  );
}
