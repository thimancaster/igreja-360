import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Megaphone,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
} from "lucide-react";
import { useAnnouncements, Announcement } from "@/hooks/useAnnouncements";
import { AnnouncementDialog } from "./AnnouncementDialog";

export function AnnouncementsPanel() {
  const {
    announcements,
    isLoading,
    createAnnouncement,
    updateAnnouncement,
    publishAnnouncement,
    deleteAnnouncement,
    isCreating,
    isUpdating,
    isPublishing,
    isDeleting,
  } = useAnnouncements();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  const handleCreate = () => {
    setSelectedAnnouncement(null);
    setDialogOpen(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setAnnouncementToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (announcementToDelete) {
      deleteAnnouncement(announcementToDelete);
    }
    setDeleteDialogOpen(false);
    setAnnouncementToDelete(null);
  };

  const getStatusBadge = (announcement: Announcement) => {
    if (announcement.published_at) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Publicado
        </Badge>
      );
    }
    if (announcement.scheduled_at) {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Agendado
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Rascunho
      </Badge>
    );
  };

  const getAudienceBadge = (announcement: Announcement) => {
    switch (announcement.target_audience) {
      case "all":
        return (
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            Todos
          </Badge>
        );
      case "classroom":
        return (
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            {announcement.target_classrooms?.length || 0} turma(s)
          </Badge>
        );
      case "specific_children":
        return (
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            {announcement.target_child_ids?.length || 0} criança(s)
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Comunicados
            </CardTitle>
            <CardDescription>
              Gerencie comunicados para os pais e responsáveis
            </CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Comunicado
          </Button>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum comunicado criado ainda</p>
              <p className="text-sm">
                Clique em "Novo Comunicado" para começar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement, index) => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 border rounded-lg ${
                    announcement.priority === "urgent"
                      ? "border-destructive bg-destructive/5"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {announcement.priority === "urgent" && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        <h4 className="font-semibold">{announcement.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {announcement.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(announcement)}
                        {getAudienceBadge(announcement)}
                        {announcement.priority === "urgent" && (
                          <Badge variant="destructive">Urgente</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(
                            new Date(announcement.created_at),
                            "dd/MM/yyyy HH:mm",
                            { locale: ptBR }
                          )}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(announcement)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {!announcement.published_at && (
                          <DropdownMenuItem
                            onClick={() => publishAnnouncement(announcement.id)}
                            disabled={isPublishing}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Publicar Agora
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(announcement.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        announcement={selectedAnnouncement}
        onSubmit={(data) => {
          if (selectedAnnouncement) {
            updateAnnouncement({ id: selectedAnnouncement.id, data });
          } else {
            createAnnouncement(data);
          }
        }}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Comunicado</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este comunicado? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
