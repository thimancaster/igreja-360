import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Download, Trash2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchName: string;
  actionType: string;
  requireTyping?: boolean;
  onConfirm: (exportBackup: boolean) => void;
  isLoading?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  churchName,
  actionType,
  requireTyping = false,
  onConfirm,
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  const [typedName, setTypedName] = useState("");
  const [exportBackup, setExportBackup] = useState(true);

  useEffect(() => {
    if (!open) {
      setTypedName("");
      setExportBackup(true);
    }
  }, [open]);

  const isNameMatch = typedName.trim().toLowerCase() === churchName.trim().toLowerCase();
  const canConfirm = requireTyping ? isNameMatch : true;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm(exportBackup);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Ação Irreversível
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p className="font-medium">
              Você está prestes a <span className="text-destructive">{actionType}</span>.
            </p>
            <p>
              Esta ação <strong>NÃO pode ser desfeita</strong>. Todos os dados selecionados 
              serão permanentemente removidos do sistema.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Backup option */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
            <Checkbox
              id="exportBackup"
              checked={exportBackup}
              onCheckedChange={(checked) => setExportBackup(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="exportBackup" className="cursor-pointer flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar backup antes de excluir
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Recomendado: Baixe uma cópia dos dados antes da exclusão
              </p>
            </div>
          </div>

          {/* Typing confirmation for dangerous actions */}
          {requireTyping && (
            <div className="space-y-2">
              <Label htmlFor="churchName" className="text-sm">
                Para confirmar, digite o nome da sua igreja:
              </Label>
              <div className="p-2 bg-muted rounded text-center font-mono text-sm">
                "{churchName}"
              </div>
              <Input
                id="churchName"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Digite o nome da igreja"
                className={typedName && !isNameMatch ? "border-destructive" : ""}
              />
              {typedName && !isNameMatch && (
                <p className="text-xs text-destructive">
                  O nome digitado não corresponde ao nome da igreja.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
          >
            {isLoading ? (
              "Processando..."
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Confirmar Exclusão
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
