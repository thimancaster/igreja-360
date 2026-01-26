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
import {
  Megaphone,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useAnnouncements } from "@/hooks/useAnnouncements";

export default function ParentAnnouncements() {
  const { parentAnnouncements, isLoadingParent, markAsRead, unreadCount } =
    useAnnouncements();

  if (isLoadingParent) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comunicados</h1>
          <p className="text-muted-foreground">
            Fique por dentro das novidades do ministério infantil
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="secondary" className="text-sm">
            {unreadCount} não lido(s)
          </Badge>
        )}
      </div>

      {parentAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum comunicado disponível no momento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {parentAnnouncements.map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !announcement.is_read ? "border-primary bg-primary/5" : ""
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
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {announcement.priority === "urgent" && (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      )}
                      <CardTitle className="text-lg">
                        {announcement.title}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {announcement.is_read ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Badge variant="default" className="text-xs">
                          Novo
                        </Badge>
                      )}
                      {announcement.priority === "urgent" && (
                        <Badge variant="destructive">Urgente</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(
                      new Date(announcement.published_at!),
                      "dd 'de' MMMM 'às' HH:mm",
                      { locale: ptBR }
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
