import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Baby, Clock, MapPin, Bell, Plus, History, Calendar, Megaphone,
  ChevronRight, AlertCircle, Pencil, Heart, AlertTriangle
} from "lucide-react";
import { useParentChildren, useParentPresentChildren } from "@/hooks/useParentData";
import { useParentChildMutations } from "@/hooks/useParentChildMutations";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { PortalChildDialog, PortalChildFormData } from "@/components/portal/PortalChildDialog";
import { useNavigate } from "react-router-dom";
import { format, differenceInMinutes, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ParentDashboard() {
  const { data: children, isLoading: loadingChildren } = useParentChildren();
  const { data: presentChildren, isLoading: loadingPresent } = useParentPresentChildren();
  const { parentAnnouncements, unreadCount } = useAnnouncements();
  const { createChild, updateChild } = useParentChildMutations();
  const navigate = useNavigate();

  const [childDialogOpen, setChildDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<any>(null);

  const goToTab = (tab: string) => navigate(`/portal/filhos?tab=${tab}`);

  const getTimePresent = (checkedInAt: string) => {
    const minutes = differenceInMinutes(new Date(), new Date(checkedInAt));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const getAge = (birthDate: string) => {
    const years = differenceInYears(new Date(), new Date(birthDate));
    return years === 1 ? "1 ano" : `${years} anos`;
  };

  const handleAddChild = () => {
    setEditingChild(null);
    setChildDialogOpen(true);
  };

  const handleEditChild = (child: any) => {
    setEditingChild(child);
    setChildDialogOpen(true);
  };

  const handleChildSubmit = async (data: PortalChildFormData) => {
    const payload = {
      full_name: data.full_name,
      birth_date: data.birth_date.toISOString().split("T")[0],
      classroom: data.classroom,
      allergies: data.allergies || null,
      medications: data.medications || null,
      special_needs: data.special_needs || null,
      emergency_contact: data.emergency_contact || null,
      emergency_phone: data.emergency_phone || null,
      image_consent: data.image_consent,
      notes: data.notes || null,
    };

    if (editingChild) {
      await updateChild.mutateAsync({ id: editingChild.id, ...payload });
    } else {
      await createChild.mutateAsync(payload);
    }
  };

  if (loadingChildren || loadingPresent) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const recentAnnouncements = parentAnnouncements?.slice(0, 2) || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 space-y-4 p-4"
    >
      {/* Welcome */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Olá! 👋</h1>
        <p className="text-muted-foreground">Acompanhe seus filhos em tempo real</p>
      </div>

      {/* Present Children */}
      {presentChildren && presentChildren.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="p-4 space-y-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <MapPin className="h-5 w-5 text-primary" />
                Filhos Presentes
              </h2>
              {presentChildren.map((checkIn: any) => (
                <div key={checkIn.id} className="flex items-center justify-between rounded-xl border bg-background p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarImage src={checkIn.children?.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {checkIn.children?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{checkIn.children?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{checkIn.children?.classroom}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
                      <Clock className="h-3 w-3" />
                      {getTimePresent(checkIn.checked_in_at)}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Entrada: {format(new Date(checkIn.checked_in_at), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Unread announcements */}
      {unreadCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div onClick={() => goToTab("announcements")} className="cursor-pointer">
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-amber-500/10 hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-500/20 p-2">
                    <Megaphone className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {unreadCount} {unreadCount === 1 ? "comunicado não lido" : "comunicados não lidos"}
                    </p>
                    <p className="text-sm text-muted-foreground">Toque para ver</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Children Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Meus Filhos</h2>
          <Button size="sm" onClick={handleAddChild} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Cadastrar
          </Button>
        </div>

        {children && children.length > 0 ? (
          <div className="grid gap-3">
            {children.map((child: any, index: number) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2">
                        <AvatarImage src={child.photo_url || undefined} />
                        <AvatarFallback className="text-lg font-semibold bg-muted">
                          {child.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{child.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{child.classroom}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {child.birth_date && (
                            <Badge variant="outline" className="text-xs">{getAge(child.birth_date)}</Badge>
                          )}
                          {child.is_primary && (
                            <Badge variant="default" className="text-xs">Principal</Badge>
                          )}
                          {child.allergies && (
                            <Badge variant="destructive" className="text-xs gap-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              Alergia
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => handleEditChild(child)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Quick info row */}
                    {(child.allergies || child.medications || child.special_needs) && (
                      <div className="mt-3 pt-3 border-t space-y-1.5">
                        {child.allergies && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Heart className="h-3 w-3 text-destructive shrink-0" />
                            <span className="truncate">Alergias: {child.allergies}</span>
                          </p>
                        )}
                        {child.medications && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Heart className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">Medicações: {child.medications}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Baby className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-3 font-medium text-center">Nenhum filho cadastrado</p>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Cadastre seus filhos para acompanhar no ministério infantil
              </p>
              <Button onClick={handleAddChild} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Cadastrar Filho
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Ações Rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <div onClick={() => goToTab("authorizations")} className="cursor-pointer">
            <Card className="h-full hover:shadow-md transition-shadow active:scale-[0.98]">
              <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                <div className="rounded-full bg-primary/10 p-3 mb-2">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-sm">Nova Autorização</p>
              </CardContent>
            </Card>
          </div>

          <div onClick={() => goToTab("history")} className="cursor-pointer">
            <Card className="h-full hover:shadow-md transition-shadow active:scale-[0.98]">
              <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                <div className="rounded-full bg-secondary p-3 mb-2">
                  <History className="h-6 w-6" />
                </div>
                <p className="font-medium text-sm">Ver Histórico</p>
              </CardContent>
            </Card>
          </div>

          <div onClick={() => goToTab("events")} className="cursor-pointer">
            <Card className="h-full hover:shadow-md transition-shadow active:scale-[0.98]">
              <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                <div className="rounded-full bg-accent p-3 mb-2">
                  <Calendar className="h-6 w-6" />
                </div>
                <p className="font-medium text-sm">Eventos</p>
              </CardContent>
            </Card>
          </div>

          <div onClick={() => goToTab("announcements")} className="cursor-pointer">
            <Card className="h-full hover:shadow-md transition-shadow active:scale-[0.98]">
              <CardContent className="flex flex-col items-center justify-center py-6 text-center relative">
                <div className="rounded-full bg-muted p-3 mb-2">
                  <Megaphone className="h-6 w-6" />
                </div>
                <p className="font-medium text-sm">Comunicados</p>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute top-2 right-2 h-5 min-w-5 px-1.5">
                    {unreadCount}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Recent Announcements */}
      {recentAnnouncements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Comunicados Recentes</h2>
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => goToTab("announcements")}>
              Ver todos
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {recentAnnouncements.map((announcement: any) => (
              <div key={announcement.id} onClick={() => goToTab("announcements")} className="cursor-pointer">
                <Card className={`hover:shadow-md transition-shadow ${!announcement.is_read ? "border-primary/30 bg-primary/5" : ""}`}>
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full p-2 shrink-0 ${
                        announcement.priority === "urgent" ? "bg-destructive/10" : "bg-muted"
                      }`}>
                        {announcement.priority === "urgent" ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Megaphone className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{announcement.title}</p>
                          {!announcement.is_read && <Badge variant="default" className="text-xs shrink-0">Novo</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{announcement.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Child Dialog */}
      <PortalChildDialog
        open={childDialogOpen}
        onOpenChange={setChildDialogOpen}
        child={editingChild}
        onSubmit={handleChildSubmit}
        isPending={createChild.isPending || updateChild.isPending}
      />
    </motion.div>
  );
}
