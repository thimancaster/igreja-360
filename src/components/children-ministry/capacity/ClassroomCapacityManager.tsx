import { useState } from "react";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useClassroomSettings, useDeleteClassroomSettings, ClassroomSettings } from "@/hooks/useCapacityManagement";
import { ClassroomDialog } from "./ClassroomDialog";
import { CapacityIndicator } from "./CapacityIndicator";

export function ClassroomCapacityManager() {
  const { data: classrooms, isLoading } = useClassroomSettings();
  const deleteMutation = useDeleteClassroomSettings();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomSettings | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classroomToDelete, setClassroomToDelete] = useState<ClassroomSettings | null>(null);

  const handleEdit = (classroom: ClassroomSettings) => {
    setSelectedClassroom(classroom);
    setDialogOpen(true);
  };

  const handleDelete = (classroom: ClassroomSettings) => {
    setClassroomToDelete(classroom);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (classroomToDelete) {
      await deleteMutation.mutateAsync(classroomToDelete.id);
      setDeleteDialogOpen(false);
      setClassroomToDelete(null);
    }
  };

  const formatAge = (months: number | null) => {
    if (months === null) return "-";
    if (months < 12) return `${months}m`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 ? `${years}a ${remainingMonths}m` : `${years}a`;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração de Salas
            </CardTitle>
            <CardDescription>
              Gerencie a capacidade e faixa etária de cada sala
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              setSelectedClassroom(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Sala
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando salas...
            </div>
          ) : classrooms && classrooms.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sala</TableHead>
                  <TableHead>Faixa Etária</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Ocupação Atual</TableHead>
                  <TableHead>Razão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classrooms.map((classroom) => (
                  <TableRow key={classroom.id}>
                    <TableCell className="font-medium">
                      {classroom.classroom_name}
                    </TableCell>
                    <TableCell>
                      {formatAge(classroom.min_age_months)} - {formatAge(classroom.max_age_months)}
                    </TableCell>
                    <TableCell>{classroom.max_capacity}</TableCell>
                    <TableCell>
                      <CapacityIndicator 
                        classroom={classroom.classroom_name} 
                        showText={false}
                      />
                    </TableCell>
                    <TableCell>
                      {classroom.ratio_children_per_adult ? `${classroom.ratio_children_per_adult}:1` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={classroom.is_active ? "default" : "secondary"}>
                        {classroom.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(classroom)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(classroom)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma sala configurada. Clique em "Nova Sala" para adicionar.
            </div>
          )}
        </CardContent>
      </Card>

      <ClassroomDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        classroom={selectedClassroom}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a sala "{classroomToDelete?.classroom_name}"?
              Esta ação não pode ser desfeita.
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
