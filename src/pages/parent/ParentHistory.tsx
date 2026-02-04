import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, LogIn, LogOut, User, Calendar, MapPin, AlertTriangle } from "lucide-react";
import { useParentChildren, useParentChildCheckIns } from "@/hooks/useParentData";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ParentHistory() {
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  const { data: children, isLoading: loadingChildren } = useParentChildren();
  const { data: checkIns, isLoading: loadingCheckIns } = useParentChildCheckIns(selectedChildId || undefined);

  if (loadingChildren) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 space-y-4 p-4"
    >
      <div>
        <h1 className="text-2xl font-bold">Histórico</h1>
        <p className="text-sm text-muted-foreground">
          Presenças dos seus filhos
        </p>
      </div>

      {/* Child selector */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm font-medium mb-2 block">Selecionar Filho</Label>
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha uma criança" />
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
            <div className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Últimas Presenças
              </h2>
              {checkIns.map((checkIn: any, index: number) => (
                <motion.div
                  key={checkIn.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        {/* Left side - Date and event */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(checkIn.event_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {checkIn.event_name}
                            </Badge>
                          </div>
                          
                          {checkIn.classroom && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              {checkIn.classroom}
                            </div>
                          )}
                        </div>

                        {/* Right side - Status */}
                        <div className="text-right space-y-1">
                          {checkIn.checked_out_at ? (
                            <Badge variant="secondary" className="gap-1">
                              <LogOut className="h-3 w-3" />
                              Saiu
                            </Badge>
                          ) : (
                            <Badge className="gap-1 bg-green-600">
                              <MapPin className="h-3 w-3" />
                              Presente
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Times */}
                      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <LogIn className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Entrada</p>
                            <p className="font-medium">
                              {format(new Date(checkIn.checked_in_at), "HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        {checkIn.checked_out_at && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <LogOut className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Saída</p>
                              <p className="font-medium">
                                {format(new Date(checkIn.checked_out_at), "HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        )}

                        {checkIn.pickup_person_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Retirado por</p>
                              <p className="font-medium truncate max-w-[120px]">
                                {checkIn.pickup_person_name}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Override warning */}
                      {checkIn.pickup_method === "LEADER_OVERRIDE" && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-xs font-medium">
                            Retirada de emergência autorizada por líder
                          </span>
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
                <Clock className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 font-medium">Nenhum histórico</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Os registros de presença aparecerão aqui
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}
