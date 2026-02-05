import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserPlus, MoreHorizontal, Search, Mail, Phone, Check, X, Clock } from "lucide-react";
import { DepartmentVolunteer } from "@/hooks/useDepartmentVolunteers";
import { Skeleton } from "@/components/ui/skeleton";

interface VolunteerListProps {
  volunteers: DepartmentVolunteer[];
  isLoading: boolean;
  onInvite: () => void;
  onEdit?: (volunteer: DepartmentVolunteer) => void;
  onDeactivate?: (volunteerId: string) => void;
  onReactivate?: (volunteerId: string) => void;
  canEdit?: boolean;
}

export function VolunteerList({
  volunteers,
  isLoading,
  onInvite,
  onEdit,
  onDeactivate,
  onReactivate,
  canEdit = false,
}: VolunteerListProps) {
  const [search, setSearch] = useState("");

  const filteredVolunteers = volunteers.filter((v) =>
    v.full_name.toLowerCase().includes(search.toLowerCase()) ||
    v.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: 'pending' | 'active' | 'inactive') => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Ativo</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="gap-1"><X className="h-3 w-3" /> Inativo</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'coordenador':
        return <Badge variant="default">Coordenador</Badge>;
      case 'líder':
        return <Badge variant="default">Líder</Badge>;
      default:
        return <Badge variant="outline">Membro</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Voluntários</CardTitle>
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Voluntários ({volunteers.length})</CardTitle>
        {canEdit && (
          <Button onClick={onInvite} size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Convidar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar voluntário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredVolunteers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? "Nenhum voluntário encontrado" : "Nenhum voluntário cadastrado"}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVolunteers.map((volunteer) => (
                  <TableRow key={volunteer.id}>
                    <TableCell className="font-medium">
                      {volunteer.full_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        {volunteer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {volunteer.email}
                          </span>
                        )}
                        {volunteer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {volunteer.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(volunteer.role)}</TableCell>
                    <TableCell>{getStatusBadge(volunteer.status)}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit?.(volunteer)}>
                              Editar
                            </DropdownMenuItem>
                            {volunteer.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => onDeactivate?.(volunteer.id)}
                                className="text-destructive"
                              >
                                Desativar
                              </DropdownMenuItem>
                            )}
                            {volunteer.status === 'inactive' && (
                              <DropdownMenuItem onClick={() => onReactivate?.(volunteer.id)}>
                                Reativar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
