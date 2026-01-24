import { useState } from "react";
import { useChildren, useChildMutations, Child, CLASSROOMS } from "@/hooks/useChildrenMinistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Pencil, Trash2, Baby, AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ChildDialog } from "./ChildDialog";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ChildrenList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [childToDelete, setChildToDelete] = useState<Child | null>(null);

  const { data: children, isLoading } = useChildren();
  const { deleteChild } = useChildMutations();

  const filteredChildren = children?.filter((child) =>
    child.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    child.classroom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const years = differenceInYears(new Date(), birth);
    if (years < 1) {
      const months = differenceInMonths(new Date(), birth);
      return `${months} meses`;
    }
    return `${years} anos`;
  };

  const handleEdit = (child: Child) => {
    setSelectedChild(child);
    setDialogOpen(true);
  };

  const handleDelete = (child: Child) => {
    setChildToDelete(child);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (childToDelete) {
      await deleteChild.mutateAsync(childToDelete.id);
      setDeleteDialogOpen(false);
      setChildToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedChild(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Baby className="h-6 w-6" />
              <div>
                <CardTitle>Crianças Cadastradas</CardTitle>
                <CardDescription>
                  {children?.length || 0} crianças no ministério infantil
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar criança..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setDialogOpen(true)} className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Nova Criança
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredChildren && filteredChildren.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criança</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Alertas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChildren.map((child) => (
                    <TableRow key={child.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={child.photo_url || undefined} />
                            <AvatarFallback>
                              {child.full_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{child.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(child.birth_date), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getAge(child.birth_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{child.classroom}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {child.allergies && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Alergia
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{child.allergies}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {child.medications && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="secondary">Medicação</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{child.medications}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {child.special_needs && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="secondary">Necessidades</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{child.special_needs}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={child.status === "active" ? "default" : "secondary"}>
                          {child.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(child)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(child)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Baby className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma criança cadastrada</h3>
              <p className="text-muted-foreground mb-4">
                Cadastre a primeira criança do ministério infantil
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Criança
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ChildDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        child={selectedChild}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Criança</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{childToDelete?.full_name}" do ministério infantil?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
