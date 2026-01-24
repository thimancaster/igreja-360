import { useState, useEffect, useRef } from "react";
import { usePresentChildren, useChildMutations } from "@/hooks/useChildrenMinistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Search, Camera, AlertTriangle, Check } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

export function CheckOutPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<any>(null);
  const [pickupName, setPickupName] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const { data: presentChildren, isLoading } = usePresentChildren();
  const { checkOut, findCheckInByQR } = useChildMutations();

  const filteredChildren = presentChildren?.filter((record: any) =>
    record.children?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.label_number?.includes(searchTerm)
  );

  const startScanner = async () => {
    try {
      setScanning(true);
      setScannerReady(false);
      
      // Wait for DOM element to be ready
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
          // QR code found
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

  const handleConfirmCheckOut = async () => {
    if (!selectedCheckIn || !pickupName.trim()) {
      toast.error("Informe o nome de quem está retirando");
      return;
    }

    try {
      await checkOut.mutateAsync({
        checkInId: selectedCheckIn.id,
        pickupPersonName: pickupName,
        pickupMethod: "Manual",
      });
      setConfirmDialogOpen(false);
      setSelectedCheckIn(null);
      setPickupName("");
    } catch (err) {
      // Error handled in mutation
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

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
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Check-out</DialogTitle>
            <DialogDescription>
              Confirme a retirada da criança
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

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Quem está retirando? *
                </label>
                <Input
                  placeholder="Nome completo"
                  value={pickupName}
                  onChange={(e) => setPickupName(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setConfirmDialogOpen(false);
                    setSelectedCheckIn(null);
                    setPickupName("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirmCheckOut}
                  disabled={checkOut.isPending || !pickupName.trim()}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirmar Saída
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
