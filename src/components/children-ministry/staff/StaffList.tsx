import { useState } from "react";
import { Plus, Edit, Trash2, Users, Mail, Phone, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useMinistryStaff, useDeleteMinistryStaff, MinistryStaff } from "@/hooks/useMinistryStaff";
import { StaffDialog } from "./StaffDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function StaffList() {
  const { data: staffList, isLoading } = useMinistryStaff();
  const deleteMutation = useDeleteMinistryStaff();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<MinistryStaff | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<MinistryStaff | null>(null);

  const handleEdit = (staff: MinistryStaff) => {
    setSelectedStaff(staff);
    setDialogOpen(true);
  };

  const handleDelete = (staff: MinistryStaff) => {
    setStaffToDelete(staff);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (staffToDelete) {
      await deleteMutation.mutateAsync(staffToDelete.id);
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "coordinator":
        return <Badge className="bg-purple-600">Coordenador(a)</Badge>;
      case "teacher":
        return <Badge className="bg-blue-600">Professor(a)</Badge>;
      case "assistant":
        return <Badge variant="secondary">Auxiliar</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipe de Voluntários
            </CardTitle>
            <CardDescription>
              Gerencie professores e auxiliares do ministério
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              setSelectedStaff(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Voluntário
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando equipe...
            </div>
          ) : staffList && staffList.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {staffList.map((staff) => (
                <Card key={staff.id} className={!staff.is_active ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{getInitials(staff.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{staff.full_name}</h4>
                          {!staff.is_active && (
                            <Badge variant="outline" className="text-xs">Inativo</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {getRoleBadge(staff.role)}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          {staff.email && (
                            <div className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{staff.email}</span>
                            </div>
                          )}
                          {staff.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {staff.phone}
                            </div>
                          )}
                        </div>

                        {staff.trained_classrooms && staff.trained_classrooms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {staff.trained_classrooms.map((classroom) => (
                              <Badge key={classroom} variant="outline" className="text-xs">
                                {classroom}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {staff.certifications && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Award className="h-3 w-3" />
                            {staff.certifications}
                          </div>
                        )}

                        {staff.background_check_date && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Background check: {format(new Date(staff.background_check_date), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(staff)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(staff)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum voluntário cadastrado. Clique em "Novo Voluntário" para adicionar.
            </div>
          )}
        </CardContent>
      </Card>

      <StaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        staff={selectedStaff}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o voluntário "{staffToDelete?.full_name}"?
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
