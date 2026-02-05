import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, AlertTriangle, Users, Check, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { VolunteerAnnouncement } from "@/hooks/useVolunteerAnnouncements";
import { Skeleton } from "@/components/ui/skeleton";

interface VolunteerAnnouncementsPanelProps {
  announcements: VolunteerAnnouncement[];
  isLoading: boolean;
  onMarkAsRead?: (announcementId: string) => void;
  onViewDetails?: (announcement: VolunteerAnnouncement) => void;
  showMinistryName?: boolean;
}

export function VolunteerAnnouncementsPanel({
  announcements,
  isLoading,
  onMarkAsRead,
  onViewDetails,
  showMinistryName = false,
}: VolunteerAnnouncementsPanelProps) {
  const getPriorityIcon = (priority: 'normal' | 'urgent' | 'meeting') => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'meeting':
        return <Users className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: 'normal' | 'urgent' | 'meeting') => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'meeting':
        return <Badge variant="default">Reunião</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comunicados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const unreadCount = announcements.filter(a => !a.is_read).length;

  if (announcements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comunicados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum comunicado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Comunicados
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} novo(s)</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={cn(
                "p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                !announcement.is_read && "border-primary bg-primary/5"
              )}
              onClick={() => {
                if (!announcement.is_read && onMarkAsRead) {
                  onMarkAsRead(announcement.id);
                }
                onViewDetails?.(announcement);
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getPriorityIcon(announcement.priority)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn(
                      "font-medium text-sm truncate",
                      !announcement.is_read && "text-primary"
                    )}>
                      {announcement.title}
                    </h4>
                    {getPriorityBadge(announcement.priority)}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {announcement.content}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {showMinistryName && announcement.ministry_name && (
                      <span>{announcement.ministry_name}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(announcement.created_at), "d 'de' MMM", { locale: ptBR })}
                    </span>
                    {announcement.priority === 'meeting' && announcement.meeting_date && (
                      <span className="flex items-center gap-1 text-primary">
                        <Users className="h-3 w-3" />
                        {format(parseISO(announcement.meeting_date), "d/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>

                {announcement.is_read ? (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
