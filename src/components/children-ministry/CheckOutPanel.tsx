import { useState, useEffect, useRef } from "react";
import { usePresentChildren, useChildMutations, useChildWithGuardians, useAuthorizedPickups } from "@/hooks/useChildrenMinistry";
import { useValidPickupAuthorizations, usePickupAuthorizationMutations } from "@/hooks/useParentData";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Search, Camera, AlertTriangle, Check, Shield, Users, Key, UserX } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { LeaderOverrideDialog } from "./LeaderOverrideDialog";

type PickupPerson = {
  id: string;
  name: string;
  type: "guardian" | "authorized" | "temporary";
  relationship?: string;
  requiresPin: boolean;
  pin?: string | null;
  authorizationId?: string; // For temporary authorizations
};

export function CheckOutPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<any>(null);
  const [pickupPersonId, setPickupPersonId] = useState("");
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const { isAdmin, isPastor, isTesoureiro, isLider } = useRole();
  const canOverride = isAdmin || isPastor || isTesoureiro || isLider;

  const { data: presentChildren, isLoading } = usePresentChildren();
  const { checkOut, findCheckInByQR } = useChildMutations();
  const { markAsUsed } = usePickupAuthorizationMutations();

  // Fetch guardians, authorized pickups, and temporary authorizations for selected child
  const childId = selectedCheckIn?.child_id;
  const { data: childWithGuardians } = useChildWithGuardians(childId);
  const { data: authorizedPickups } = useAuthorizedPickups(childId);
  const { data: tempAuthorizations } = useValidPickupAuthorizations(childId);

  // Build list of valid pickup people
  const pickupPeople: PickupPerson[] = [
    // Guardians who can pickup
    ...(childWithGuardians?.guardians?.filter(g => g.can_pickup).map(g => ({
      id: `guardian-${g.id}`,
      name: g.full_name,
      type: "guardian" as const,
      relationship: g.relationship,
      requiresPin: !!g.access_pin,
      pin: g.access_pin,
    })) || []),
    // Authorized pickups (permanent)
    ...(authorizedPickups?.filter(a => a.is_active).map(a => ({
      id: `authorized-${a.id}`,
      name: a.authorized_name,
      type: "authorized" as const,
      relationship: a.relationship || undefined,
      requiresPin: true,
      pin: a.pickup_pin,
    })) || []),
    // Temporary authorizations from parents
    ...(tempAuthorizations?.map(a => ({
      id: `temp-${a.id}`,
      name: a.authorized_person_name,
      type: "temporary" as const,
      relationship: a.authorization_type === 'one_time' ? 'Uso Único' : 'Autorização Temporária',
      requiresPin: true,
      pin: a.security_pin,
      authorizationId: a.id,
    })) || []),
  ];

  const selectedPerson = pickupPeople.find(p => p.id === pickupPersonId);

  const filteredChildren = presentChildren?.filter((record: any) =>
    record.children?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.label_number?.includes(searchTerm)
  );

  const startScanner = async () => {
    try {
      setScanning(true);
      setScannerReady(false);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await stopScanner();
          await handleQRScan(decodedText);
        },
        (errorMessage) => {
          // QR code not found - ignore
        }
      );
      setScannerReady(true);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      toast.error("Não foi possível iniciar a câmera. Verifique as permissões.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setScanning(false);
    setScannerReady(false);
  };

  const handleQRScan = async (qrCode: string) => {
    try {
      const checkInRecord = await findCheckInByQR(qrCode);
      if (checkInRecord) {
        setSelectedCheckIn(checkInRecord);
        setConfirmDialogOpen(true);
      }
    } catch (err) {
      toast.error("QR Code não encontrado ou criança já foi retirada");
    }
  };

  const handleManualSelect = (record: any) => {
    setSelectedCheckIn(record);
    setConfirmDialogOpen(true);
  };

  const resetDialog = () => {
    setConfirmDialogOpen(false);
    setSelectedCheckIn(null);
    setPickupPersonId("");
    setEnteredPin("");
    setPinError("");
  };

  const handleConfirmCheckOut = async () => {
    if (!selectedCheckIn || !pickupPersonId) {
      toast.error("Selecione quem está retirando");
      return;
    }

    const person = pickupPeople.find(p => p.id === pickupPersonId);
    if (!person) {
      toast.error("Pessoa não encontrada");
      return;
    }

    // Validate PIN if required
    if (person.requiresPin && person.pin) {
      if (!enteredPin) {
        setPinError("Digite o PIN de segurança");
        return;
      }
      if (enteredPin !== person.pin) {
        setPinError("PIN incorreto");
        return;
      }
    }

    try {
      // If it's a temporary authorization, mark it as used
      if (person.type === "temporary" && person.authorizationId) {
        await markAsUsed.mutateAsync({
          id: person.authorizationId,
          checkInId: selectedCheckIn.id,
        });
      }

      await checkOut.mutateAsync({
        checkInId: selectedCheckIn.id,
        pickupPersonName: person.name,
        pickupMethod: person.type === "guardian" ? "Responsável" : 
                      person.type === "temporary" ? "Autorização Temporária" : "Autorizado",
      });
      resetDialog();
    } catch (err) {
      // Error handled in mutation
    }
  };

  const handleLeaderOverride = () => {
    setConfirmDialogOpen(false);
    setOverrideDialogOpen(true);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Reset PIN error when person changes
  useEffect(() => {
    setPinError("");
    setEnteredPin("");
  }, [pickupPersonId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner Panel */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Camera className="h-6 w-6" />
              <div>
                <CardTitle>Scanner QR Code</CardTitle>
                <CardDescription>
                  Escaneie o QR Code para check-out
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scanning ? (
                <div className="relative">
                  <div
                    id="qr-reader"
                    className="w-full aspect-square rounded-lg overflow-hidden bg-muted"
                  />
                  {!scannerReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <LoadingSpinner />
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    className="w-full mt-4"
                    onClick={stopScanner}
                  >
                    Parar Scanner
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Camera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Clique para ativar a câmera e escanear o QR Code
                  </p>
                  <Button onClick={startScanner}>
                    <Camera className="h-4 w-4 mr-2" />
                    Ativar Câmera
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Present Children List */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <LogOut className="h-6 w-6" />
                <div>
                  <CardTitle>Crianças Presentes</CardTitle>
                  <CardDescription>
                    {presentChildren?.length || 0} aguardando retirada
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {filteredChildren && filteredChildren.length > 0 ? (
                filteredChildren.map((record: any) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleManualSelect(record)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={record.children?.photo_url || undefined} />
                        <AvatarFallback>
                          {record.children?.full_name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{record.children?.full_name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {record.children?.classroom}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Entrada: {format(new Date(record.checked_in_at), "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono text-lg">
                      #{record.label_number}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma criança presente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Checkout Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={(open) => !open && resetDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Check-out</DialogTitle>
            <DialogDescription>
              Selecione quem está retirando a criança
            </DialogDescription>
          </DialogHeader>
          {selectedCheckIn && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedCheckIn.children?.photo_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {selectedCheckIn.children?.full_name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{selectedCheckIn.children?.full_name}</p>
                  <p className="text-muted-foreground">{selectedCheckIn.children?.classroom}</p>
                  <Badge variant="secondary" className="font-mono mt-1">
                    #{selectedCheckIn.label_number}
                  </Badge>
                </div>
              </div>

              {selectedCheckIn.children?.emergency_contact && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Contato de Emergência:</p>
                    <p>{selectedCheckIn.children.emergency_contact}</p>
                    <p>{selectedCheckIn.children.emergency_phone}</p>
                  </div>
                </div>
              )}

              {/* Pickup Person Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Quem está retirando? *
                </label>
                {pickupPeople.length > 0 ? (
                  <Select value={pickupPersonId} onValueChange={setPickupPersonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma pessoa autorizada" />
                    </SelectTrigger>
                    <SelectContent>
                      {pickupPeople.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          <div className="flex items-center gap-2">
                            {person.type === "guardian" ? (
                              <Users className="h-4 w-4 text-primary" />
                            ) : person.type === "temporary" ? (
                              <Shield className="h-4 w-4 text-green-500" />
                            ) : (
                              <Shield className="h-4 w-4 text-amber-500" />
                            )}
                            <span>{person.name}</span>
                            {person.relationship && (
                              <span className="text-muted-foreground text-xs">
                                ({person.relationship})
                              </span>
                            )}
                            {person.type === "temporary" && (
                              <Badge variant="outline" className="text-xs ml-1">Temporário</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-center py-4 text-muted-foreground border rounded-lg">
                    <p className="text-sm">Nenhum responsável ou autorizado cadastrado</p>
                    <p className="text-xs mt-1">Cadastre responsáveis na ficha da criança</p>
                  </div>
                )}
              </div>

              {/* PIN Validation */}
              {selectedPerson?.requiresPin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    PIN de Segurança *
                  </label>
                  <Input
                    type="password"
                    placeholder="Digite o PIN"
                    value={enteredPin}
                    onChange={(e) => {
                      setEnteredPin(e.target.value);
                      setPinError("");
                    }}
                    maxLength={6}
                    className={pinError ? "border-destructive" : ""}
                  />
                  {pinError && (
                    <p className="text-sm text-destructive">{pinError}</p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetDialog}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirmCheckOut}
                  disabled={checkOut.isPending || !pickupPersonId}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirmar Saída
                </Button>
              </div>

              {/* Leader Override Option */}
              {canOverride && (
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    onClick={handleLeaderOverride}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Liberar sem autorização (Emergência)
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    Use apenas em casos de emergência. Esta ação será registrada.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leader Override Dialog */}
      {selectedCheckIn && (
        <LeaderOverrideDialog
          open={overrideDialogOpen}
          onOpenChange={setOverrideDialogOpen}
          checkInId={selectedCheckIn.id}
          childName={selectedCheckIn.children?.full_name || ""}
          onSuccess={resetDialog}
        />
      )}
    </>
  );
}
