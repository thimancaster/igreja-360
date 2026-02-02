import { useState } from "react";
import { Clock, UserPlus, Check, X, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWaitlist, useUpdateWaitlistStatus, useRemoveFromWaitlist, useClassroomSettings } from "@/hooks/useCapacityManagement";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export function WaitlistPanel() {
  const [selectedClassroom, setSelectedClassroom] = useState<string>("all");
  const { data: classrooms } = useClassroomSettings();
  const { data: waitlist, isLoading } = useWaitlist(
    selectedClassroom === "all" ? undefined : selectedClassroom
  );
  const updateStatusMutation = useUpdateWaitlistStatus();
  const removeMutation = useRemoveFromWaitlist();

  const handleNotify = async (id: string) => {
    await updateStatusMutation.mutateAsync({
      id,
      status: "notified",
      notified_at: new Date().toISOString(),
    });
  };

  const handleEnroll = async (id: string) => {
    await updateStatusMutation.mutateAsync({
      id,
      status: "enrolled",
    });
  };

  const handleCancel = async (id: string) => {
    await removeMutation.mutateAsync(id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "waiting":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Aguardando</Badge>;
      case "notified":
        return <Badge variant="outline" className="bg-yellow-100"><Bell className="h-3 w-3 mr-1" />Notificado</Badge>;
      case "enrolled":
        return <Badge variant="default" className="bg-green-600"><Check className="h-3 w-3 mr-1" />Matriculado</Badge>;
      case "expired":
        return <Badge variant="destructive">Expirado</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateAge = (birthDate: string) => {
    const months = differenceInMonths(new Date(), new Date(birthDate));
    if (months < 12) return `${months} meses`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 ? `${years}a ${remainingMonths}m` : `${years} anos`;
  };

  const activeWaitlist = waitlist?.filter(w => w.status === "waiting" || w.status === "notified") || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lista de Espera
          </CardTitle>
          <CardDescription>
            Gerencie crianças aguardando vaga nas salas
          </CardDescription>
        </div>
        <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por sala" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as salas</SelectItem>
            {classrooms?.map((classroom) => (
              <SelectItem key={classroom.id} value={classroom.classroom_name}>
                {classroom.classroom_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando lista de espera...
          </div>
        ) : activeWaitlist.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead>Criança</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Sala</TableHead>
                <TableHead>Data Solicitação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeWaitlist.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      #{entry.position}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.child?.full_name || "—"}
                  </TableCell>
                  <TableCell>
                    {entry.child?.birth_date ? calculateAge(entry.child.birth_date) : "—"}
                  </TableCell>
                  <TableCell>{entry.classroom}</TableCell>
                  <TableCell>
                    {entry.requested_at
                      ? format(new Date(entry.requested_at), "dd/MM/yyyy", { locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(entry.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {entry.status === "waiting" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNotify(entry.id)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Bell className="h-4 w-4 mr-1" />
                          Notificar
                        </Button>
                      )}
                      {(entry.status === "waiting" || entry.status === "notified") && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleEnroll(entry.id)}
                            disabled={updateStatusMutation.isPending}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Matricular
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(entry.id)}
                            disabled={removeMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma criança na lista de espera
            {selectedClassroom !== "all" && ` para ${selectedClassroom}`}.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
