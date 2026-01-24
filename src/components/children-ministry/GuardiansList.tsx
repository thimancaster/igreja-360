import { useState } from "react";
import { useGuardians, useChildMutations, Guardian, RELATIONSHIPS } from "@/hooks/useChildrenMinistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Users, Phone, Mail } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { GuardianDialog } from "./GuardianDialog";

export function GuardiansList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);

  const { data: guardians, isLoading } = useGuardians();

  const filteredGuardians = guardians?.filter((guardian) =>
    guardian.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guardian.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guardian.phone?.includes(searchTerm)
  );

  const handleEdit = (guardian: Guardian) => {
    setSelectedGuardian(guardian);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedGuardian(null);
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
              <Users className="h-6 w-6" />
              <div>
                <CardTitle>Responsáveis Cadastrados</CardTitle>
                <CardDescription>
                  {guardians?.length || 0} responsáveis no sistema
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setDialogOpen(true)} className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Novo Responsável
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredGuardians && filteredGuardians.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Parentesco</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Vinculado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuardians.map((guardian) => (
                    <TableRow 
                      key={guardian.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEdit(guardian)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={guardian.photo_url || undefined} />
                            <AvatarFallback>
                              {guardian.full_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-medium">{guardian.full_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{guardian.relationship}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {guardian.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {guardian.phone}
                            </div>
                          )}
                          {guardian.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {guardian.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {guardian.profile_id ? (
                          <Badge variant="default">Com acesso</Badge>
                        ) : (
                          <Badge variant="secondary">Sem acesso</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum responsável cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Cadastre o primeiro responsável
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Responsável
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <GuardianDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        guardian={selectedGuardian}
      />
    </>
  );
}
