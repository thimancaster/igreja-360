import { useState } from "react";
import { useChildren, useChildMutations, useTodayCheckIns, Child, CLASSROOMS } from "@/hooks/useChildrenMinistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QrCode, Search, Check, Baby, Clock } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const EVENT_OPTIONS = [
  "Culto Matutino",
  "Culto Noturno",
  "EBD",
  "Culto de Quarta",
  "Evento Especial",
];

export function CheckInPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [eventName, setEventName] = useState("Culto Matutino");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [generatedCheckIn, setGeneratedCheckIn] = useState<any>(null);

  const { data: children, isLoading: loadingChildren } = useChildren();
  const { data: todayCheckIns, isLoading: loadingCheckIns } = useTodayCheckIns();
  const { checkIn } = useChildMutations();

  const checkedInIds = new Set(todayCheckIns?.map((c: any) => c.child_id));

  const availableChildren = children?.filter(
    (child) =>
      child.status === "active" &&
      !checkedInIds.has(child.id) &&
      (child.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        child.classroom.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCheckIn = async (child: Child) => {
    try {
      const result = await checkIn.mutateAsync({
        childId: child.id,
        eventName,
        classroom: child.classroom,
      });
      setGeneratedCheckIn({ ...result, child });
      setQrDialogOpen(true);
    } catch (error) {
      // Error handled in mutation
    }
  };

  if (loadingChildren || loadingCheckIns) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Check-in Panel */}
        <Card variant="glass" className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <QrCode className="h-6 w-6" />
                <div>
                  <CardTitle>Check-in</CardTitle>
                  <CardDescription>
                    Registre a entrada das crianças
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Select value={eventName} onValueChange={setEventName}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_OPTIONS.map((event) => (
                      <SelectItem key={event} value={event}>
                        {event}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar criança para check-in..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {availableChildren && availableChildren.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {availableChildren.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={child.photo_url || undefined} />
                        <AvatarFallback>
                          {child.full_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{child.full_name}</p>
                        <Badge variant="outline" className="text-xs">
                          {child.classroom}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(child)}
                      disabled={checkIn.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Check-in
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Baby className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Nenhuma criança encontrada"
                    : "Todas as crianças já fizeram check-in"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Check-ins */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5" />
              <div>
                <CardTitle className="text-lg">Presentes Hoje</CardTitle>
                <CardDescription>
                  {todayCheckIns?.length || 0} crianças
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {todayCheckIns && todayCheckIns.length > 0 ? (
                todayCheckIns.map((checkInRecord: any) => (
                  <div
                    key={checkInRecord.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={checkInRecord.children?.photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {checkInRecord.children?.full_name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{checkInRecord.children?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(checkInRecord.checked_in_at), "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {checkInRecord.checked_out_at ? (
                      <Badge variant="secondary">Saiu</Badge>
                    ) : (
                      <Badge variant="default">Presente</Badge>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum check-in hoje
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Check-in Realizado!</DialogTitle>
          </DialogHeader>
          {generatedCheckIn && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG
                    value={generatedCheckIn.qr_code}
                    size={200}
                    level="H"
                  />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">{generatedCheckIn.child?.full_name}</p>
                  <p className="text-muted-foreground">{generatedCheckIn.classroom}</p>
                  <div className="mt-2 inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                    <span className="text-2xl font-bold text-primary">
                      #{generatedCheckIn.label_number}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Apresente este QR Code ou o número da etiqueta para retirar a criança
              </p>
              <Button className="w-full" onClick={() => setQrDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
