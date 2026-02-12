import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Bell, User, Baby, ChevronRight, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { useVolunteerSchedules } from "@/hooks/useVolunteerSchedules";
import { useVolunteerAnnouncements } from "@/hooks/useVolunteerAnnouncements";
import { useParentChildren, useParentPresentChildren } from "@/hooks/useParentData";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PortalDashboard() {
  const { profile } = useAuth();
  const { isParent } = useRole();
  const { isVolunteer, activeMinistries, isLoading: statusLoading } = useVolunteerStatus();
  const { mySchedules, mySchedulesLoading } = useVolunteerSchedules(undefined, new Date());
  const { unreadCount: volunteerUnread } = useVolunteerAnnouncements();
  const { data: children, isLoading: childrenLoading } = useParentChildren();
  const { data: presentChildren } = useParentPresentChildren();

  const getTimePresent = (checkedInAt: string) => {
    const minutes = differenceInMinutes(new Date(), new Date(checkedInAt));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  // Upcoming schedules (next 7 days)
  const upcomingSchedules = (mySchedules || [])
    .filter((s) => new Date(s.schedule_date) >= new Date())
    .slice(0, 3);

  if (statusLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 space-y-4 p-4">
      {/* Welcome */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {profile?.full_name?.split(" ")[0] || "Membro"}! 👋
        </h1>
        <p className="text-muted-foreground">Seu painel pessoal</p>
      </div>

      {/* Present Children Alert (for parents) */}
      {presentChildren && presentChildren.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-primary" />
                Filhos Presentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {presentChildren.map((checkIn: any) => (
                <div key={checkIn.id} className="flex items-center justify-between rounded-xl border bg-background p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage src={checkIn.children?.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {checkIn.children?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{checkIn.children?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{checkIn.children?.classroom}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary text-xs">
                    <Clock className="h-3 w-3" />
                    {getTimePresent(checkIn.checked_in_at)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/portal/escalas">
          <Card className="h-full cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-2">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-sm">Minhas Escalas</p>
              {upcomingSchedules.length > 0 && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {upcomingSchedules.length} próximas
                </Badge>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to="/portal/comunicados">
          <Card className="h-full cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] relative">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <div className="rounded-full bg-accent p-3 mb-2">
                <Bell className="h-6 w-6" />
              </div>
              <p className="font-medium text-sm">Comunicados</p>
              {volunteerUnread > 0 && (
                <Badge variant="destructive" className="absolute top-2 right-2 h-5 min-w-5 px-1.5">
                  {volunteerUnread}
                </Badge>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to="/portal/filhos">
          <Card className="h-full cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <div className="rounded-full bg-secondary p-3 mb-2">
                <Baby className="h-6 w-6" />
              </div>
              <p className="font-medium text-sm">Meus Filhos</p>
              {children && children.length > 0 && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {children.length} {children.length === 1 ? "filho" : "filhos"}
                </Badge>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to="/portal/perfil">
          <Card className="h-full cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <div className="rounded-full bg-muted p-3 mb-2">
                <User className="h-6 w-6" />
              </div>
              <p className="font-medium text-sm">Meu Perfil</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Upcoming Schedules */}
      {upcomingSchedules.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Próximas Escalas</h2>
            <Link to="/portal/escalas">
              <span className="text-sm text-primary flex items-center gap-1">
                Ver todas <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingSchedules.map((schedule: any) => (
              <Card key={schedule.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(schedule.schedule_date), "EEEE, dd/MM", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {schedule.shift_start} - {schedule.shift_end}
                        {schedule.ministry_name && ` • ${schedule.ministry_name}`}
                      </p>
                    </div>
                    {schedule.confirmed ? (
                      <Badge variant="default" className="text-xs">Confirmado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Pendente</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Volunteer Ministries */}
      {activeMinistries.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Meus Ministérios</h2>
          <div className="flex flex-wrap gap-2">
            {activeMinistries.map((m) => (
              <Badge key={m.id} variant="secondary" className="text-sm py-1.5 px-3">
                {m.ministry_name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
