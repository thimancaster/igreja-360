import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Bell, Baby, ChevronRight, Clock, MapPin, CalendarDays, User, Sparkles } from "lucide-react";
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

import heroImg from "@/assets/portal/welcome-hero.jpg";
import escalasImg from "@/assets/portal/card-escalas.jpg";
import comunicadosImg from "@/assets/portal/card-comunicados.jpg";
import filhosImg from "@/assets/portal/card-filhos.jpg";
import eventosImg from "@/assets/portal/card-eventos.jpg";

const stagger = {
  container: { transition: { staggerChildren: 0.08 } },
  item: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } },
};

function ImageCard({
  to,
  image,
  label,
  badge,
  badgeVariant = "secondary",
  overlay = "from-black/70 via-black/40 to-transparent",
  className = "",
}: {
  to: string;
  image: string;
  label: string;
  badge?: string | number;
  badgeVariant?: "secondary" | "destructive";
  overlay?: string;
  className?: string;
}) {
  return (
    <motion.div variants={stagger.item}>
      <Link to={to} className="block">
        <div
          className={`relative overflow-hidden rounded-2xl aspect-[4/3] group cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 active:scale-[0.97] ${className}`}
        >
          <img
            src={image}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${overlay}`} />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-bold text-lg tracking-wide drop-shadow-lg uppercase">
              {label}
            </h3>
          </div>
          {badge !== undefined && (
            <Badge
              variant={badgeVariant}
              className="absolute top-3 right-3 shadow-lg text-xs font-semibold"
            >
              {badge}
            </Badge>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

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

  const upcomingSchedules = (mySchedules || [])
    .filter((s) => new Date(s.schedule_date) >= new Date())
    .slice(0, 3);

  if (statusLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Membro";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 space-y-5 p-4 max-w-2xl mx-auto w-full"
    >
      {/* Hero Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative overflow-hidden rounded-3xl shadow-lg">
          <img
            src={heroImg}
            alt="Welcome"
            className="w-full h-44 sm:h-52 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center p-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-amber-300 text-xs font-medium uppercase tracking-widest">
                Bem-vindo
              </span>
            </div>
            <h1 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight">
              Olá, {firstName}!
            </h1>
            <p className="text-white/70 text-sm mt-1">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          {/* Avatar on right side */}
          <div className="absolute top-4 right-4">
            <Link to="/portal/perfil">
              <Avatar className="h-12 w-12 border-2 border-white/30 shadow-lg">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-white/20 text-white font-bold backdrop-blur-sm">
                  {firstName[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Present Children Alert */}
      {presentChildren && presentChildren.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-sm">Filhos Presentes Agora</span>
              </div>
              {presentChildren.map((checkIn: any) => (
                <div key={checkIn.id} className="flex items-center justify-between rounded-xl border bg-background/80 backdrop-blur-sm p-3">
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

      {/* Image Cards Grid */}
      <motion.div
        variants={stagger.container}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3"
      >
        <ImageCard
          to="/portal/escalas"
          image={escalasImg}
          label="Escalas"
          badge={upcomingSchedules.length > 0 ? `${upcomingSchedules.length} próx.` : undefined}
        />
        <ImageCard
          to="/portal/comunicados"
          image={comunicadosImg}
          label="Comunicados"
          badge={volunteerUnread > 0 ? volunteerUnread : undefined}
          badgeVariant="destructive"
        />
        <ImageCard
          to="/portal/eventos"
          image={eventosImg}
          label="Eventos"
        />
        <ImageCard
          to="/portal/filhos"
          image={filhosImg}
          label="Meus Filhos"
          badge={children && children.length > 0 ? `${children.length}` : undefined}
        />
      </motion.div>

      {/* Upcoming Schedules */}
      {upcomingSchedules.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Próximas Escalas</h2>
              <Link to="/portal/escalas">
                <span className="text-sm text-primary flex items-center gap-1 font-medium">
                  Ver todas <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
            <div className="space-y-2">
              {upcomingSchedules.map((schedule: any) => (
                <Card key={schedule.id} className="rounded-xl overflow-hidden border-0 shadow-sm bg-card">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary uppercase">
                          {format(new Date(schedule.schedule_date), "MMM", { locale: ptBR })}
                        </span>
                        <span className="text-lg font-extrabold text-primary leading-none">
                          {format(new Date(schedule.schedule_date), "dd")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {format(new Date(schedule.schedule_date), "EEEE", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {schedule.shift_start} - {schedule.shift_end}
                          {schedule.ministry_name && ` • ${schedule.ministry_name}`}
                        </p>
                      </div>
                      {schedule.confirmed ? (
                        <Badge className="text-xs shrink-0 bg-accent text-accent-foreground">✓</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs shrink-0">Pendente</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Active Ministries */}
      {activeMinistries.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="space-y-3">
            <h2 className="font-bold text-base">Meus Ministérios</h2>
            <div className="flex flex-wrap gap-2">
              {activeMinistries.map((m) => (
                <Badge
                  key={m.id}
                  className="text-sm py-2 px-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 text-foreground border-0 font-medium"
                >
                  {m.ministry_name}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
