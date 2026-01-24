import { useChildren, usePresentChildren, useTodayCheckIns, CLASSROOMS } from "@/hooks/useChildrenMinistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Baby, Users, LogIn, LogOut, AlertTriangle, Clock } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

export function MinistryDashboard() {
  const { data: children, isLoading: loadingChildren } = useChildren();
  const { data: presentChildren, isLoading: loadingPresent } = usePresentChildren();
  const { data: todayCheckIns, isLoading: loadingCheckIns } = useTodayCheckIns();

  if (loadingChildren || loadingPresent || loadingCheckIns) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalChildren = children?.length || 0;
  const activeChildren = children?.filter((c) => c.status === "active").length || 0;
  const presentCount = presentChildren?.length || 0;
  const checkedOutCount = (todayCheckIns?.filter((c: any) => c.checked_out_at)?.length || 0);
  const totalTodayCheckIns = todayCheckIns?.length || 0;

  const childrenWithAllergies = children?.filter((c) => c.allergies)?.length || 0;
  const childrenWithMedications = children?.filter((c) => c.medications)?.length || 0;
  const childrenWithSpecialNeeds = children?.filter((c) => c.special_needs)?.length || 0;

  // Group by classroom
  const classroomStats = CLASSROOMS.map((classroom) => {
    const total = children?.filter((c) => c.classroom === classroom && c.status === "active").length || 0;
    const present = presentChildren?.filter((c: any) => c.children?.classroom === classroom).length || 0;
    return { classroom, total, present };
  }).filter((s) => s.total > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Crianças</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChildren}</div>
            <p className="text-xs text-muted-foreground">
              {activeChildren} ativas
            </p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presentes Agora</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{presentCount}</div>
            <p className="text-xs text-muted-foreground">
              crianças no momento
            </p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins Hoje</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTodayCheckIns}</div>
            <p className="text-xs text-muted-foreground">
              {checkedOutCount} já saíram
            </p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{childrenWithAllergies + childrenWithMedications + childrenWithSpecialNeeds}</div>
            <p className="text-xs text-muted-foreground">
              crianças com observações
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Classroom Distribution */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Distribuição por Turma</CardTitle>
            <CardDescription>
              Crianças cadastradas e presentes por turma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {classroomStats.map((stat) => (
                <div key={stat.classroom} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{stat.classroom}</span>
                    <span className="text-muted-foreground">
                      {stat.present}/{stat.total}
                    </span>
                  </div>
                  <Progress
                    value={stat.total > 0 ? (stat.present / stat.total) * 100 : 0}
                    className="h-2"
                  />
                </div>
              ))}
              {classroomStats.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma criança cadastrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimos check-ins e check-outs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {todayCheckIns && todayCheckIns.length > 0 ? (
                todayCheckIns.slice(0, 10).map((record: any) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {record.checked_out_at ? (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <LogOut className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <LogIn className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{record.children?.full_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {record.checked_out_at
                            ? `Saiu ${format(new Date(record.checked_out_at), "HH:mm", { locale: ptBR })}`
                            : `Entrada ${format(new Date(record.checked_in_at), "HH:mm", { locale: ptBR })}`
                          }
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {record.children?.classroom}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma atividade hoje
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Alerts */}
      {(childrenWithAllergies > 0 || childrenWithMedications > 0 || childrenWithSpecialNeeds > 0) && (
        <Card variant="glass" className="border-amber-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle>Alertas de Saúde</CardTitle>
            </div>
            <CardDescription>
              Crianças que requerem atenção especial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {childrenWithAllergies > 0 && (
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                  <Badge variant="destructive">Alergias</Badge>
                  <span className="text-sm">{childrenWithAllergies} crianças</span>
                </div>
              )}
              {childrenWithMedications > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg">
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">
                    Medicações
                  </Badge>
                  <span className="text-sm">{childrenWithMedications} crianças</span>
                </div>
              )}
              {childrenWithSpecialNeeds > 0 && (
                <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg">
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-700">
                    Necessidades Especiais
                  </Badge>
                  <span className="text-sm">{childrenWithSpecialNeeds} crianças</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
