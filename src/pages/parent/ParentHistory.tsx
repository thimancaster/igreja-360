import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, LogIn, LogOut, User } from "lucide-react";
import { useParentChildren, useParentChildCheckIns } from "@/hooks/useParentData";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { pageVariants, pageTransition } from "@/lib/pageAnimations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ParentHistory() {
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  const { data: children, isLoading: loadingChildren } = useParentChildren();
  const { data: checkIns, isLoading: loadingCheckIns } = useParentChildCheckIns(selectedChildId || undefined);

  if (loadingChildren) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex-1 space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Presenças</h1>
          <p className="text-muted-foreground">
            Veja o histórico de check-ins e check-outs dos seus filhos
          </p>
        </div>
      </div>

      {/* Child selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecionar Filho</CardTitle>
          <CardDescription>Escolha para qual filho deseja ver o histórico</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-full md:w-96">
              <SelectValue placeholder="Selecione um filho" />
            </SelectTrigger>
            <SelectContent>
              {children?.map((child: any) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.full_name} - {child.classroom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedChildId && (
        <>
          {loadingCheckIns ? (
            <div className="flex h-32 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : checkIns && checkIns.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Últimas Presenças
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead>Retirado Por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkIns.map((checkIn: any) => (
                      <TableRow key={checkIn.id}>
                        <TableCell>
                          {format(new Date(checkIn.event_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{checkIn.event_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-green-600">
                            <LogIn className="h-4 w-4" />
                            {format(new Date(checkIn.checked_in_at), "HH:mm", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {checkIn.checked_out_at ? (
                            <div className="flex items-center gap-1 text-blue-600">
                              <LogOut className="h-4 w-4" />
                              {format(new Date(checkIn.checked_out_at), "HH:mm", { locale: ptBR })}
                            </div>
                          ) : (
                            <Badge variant="secondary">Presente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {checkIn.pickup_person_name ? (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {checkIn.pickup_person_name}
                              {checkIn.pickup_method === "LEADER_OVERRIDE" && (
                                <Badge variant="destructive" className="ml-2">Override</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-16 w-16 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium">Nenhum histórico encontrado</p>
                <p className="text-muted-foreground">
                  Os registros de presença aparecerão aqui.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}
