import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEvents, ChurchEvent } from "@/hooks/useEvents";
import { useEventRegistrations } from "@/hooks/useEventRegistrations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, MoreVertical, Edit, Trash2, Users, MapPin, Clock, Eye, Copy } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ChurchEventDialog } from "./ChurchEventDialog";
import { toast } from "sonner";

const EVENT_TYPE_LABELS: Record<string, string> = {
  service: "Culto", special: "Especial", activity: "Atividade", meeting: "Reunião",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho", published: "Publicado", cancelled: "Cancelado", completed: "Concluído",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline", published: "default", cancelled: "destructive", completed: "secondary",
};

export function EventList() {
  const { events, isLoading, deleteEvent, createEvent, updateEvent, isCreating, isUpdating } = useEvents();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const filtered = events.filter(e => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && e.event_type !== typeFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  const handleEdit = (event: ChurchEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleDuplicate = (event: ChurchEvent) => {
    createEvent({
      ...event,
      title: `${event.title} (Cópia)`,
      status: "draft",
      start_datetime: new Date().toISOString(),
    });
  };

  if (isLoading) return <div className="flex items-center justify-center p-12"><LoadingSpinner size="lg" /></div>;

  return (
    <>
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Todos os Eventos</CardTitle>
              <CardDescription>{filtered.length} evento(s)</CardDescription>
            </div>
            <Button onClick={() => { setSelectedEvent(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo Evento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar evento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ministério</TableHead>
                  <TableHead>Vagas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum evento encontrado</TableCell></TableRow>
                ) : (
                  filtered.map(event => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{event.title}</p>
                          {event.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {event.location}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(parseISO(event.start_datetime), "dd/MM/yyyy", { locale: ptBR })}</p>
                          {!event.all_day && (
                            <p className="text-xs text-muted-foreground">{format(parseISO(event.start_datetime), "HH:mm")}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{EVENT_TYPE_LABELS[event.event_type] || event.event_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[event.status] || "outline"}>{STATUS_LABELS[event.status] || event.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event.ministry?.name || "Geral"}
                      </TableCell>
                      <TableCell>
                        {event.max_capacity ? (
                          <span className="text-sm">{event.max_capacity}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Ilimitado</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(event)}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(event)}><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem>
                            {event.registration_required && (
                              <DropdownMenuItem onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/inscricao/${event.id}`);
                                toast.success("Link copiado!");
                              }}>
                                <Eye className="h-4 w-4 mr-2" /> Copiar Link Inscrição
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { setEventToDelete(event.id); setDeleteDialogOpen(true); }} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ChurchEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        onSubmit={(data) => {
          if (selectedEvent) {
            updateEvent({ id: selectedEvent.id, data });
          } else {
            createEvent(data);
          }
          setDialogOpen(false);
        }}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Evento</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Todas as inscrições serão removidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (eventToDelete) deleteEvent(eventToDelete); setDeleteDialogOpen(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
