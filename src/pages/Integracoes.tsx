import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sheet, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useIntegrations, GoogleSheet } from "@/hooks/useIntegrations";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

const REQUIRED_FIELDS = [
  { key: "amount", label: "Valor da Transação" },
  { key: "description", label: "Descrição" },
  { key: "type", label: "Tipo (Receita/Despesa)" },
  { key: "due_date", label: "Data de Vencimento" },
  { key: "status", label: "Status" },
];

export default function Integracoes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    integrations,
    isLoading,
    startOAuth,
    listSheets,
    createIntegration,
    syncIntegration,
    deleteIntegration,
  } = useIntegrations();

  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<GoogleSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<GoogleSheet | null>(null);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [churchId, setChurchId] = useState<string | null>(null);

  // Fetch user's church_id from profile
  useEffect(() => {
    const fetchChurchId = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setChurchId(data.church_id);
      }
    };

    fetchChurchId();
  }, [user?.id]);

  // Handle OAuth callback - session is now managed via cookies
  useEffect(() => {
    const auth = searchParams.get("auth");
    const message = searchParams.get("message");

    if (auth === "success") {
      // Session is automatically available via cookies
      if (user?.email) {
        setIsConnected(true);
        setUserEmail(user.email);
        toast({
          title: "Conectado com sucesso",
          description: `Autenticado como ${user.email}. Sessão segura estabelecida.`,
        });
      }
      // Clean URL
      setSearchParams({});
    } else if (auth === "error") {
      toast({
        title: "Erro ao conectar",
        description: message || "Falha na autenticação com o Google",
        variant: "destructive",
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, user]);

  const handleConnect = () => {
    startOAuth.mutate();
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setUserEmail("");
    setAccessToken("");
    setRefreshToken("");
  };

  const handleAddSheet = async () => {
    // Fetch access token from integrations if available
    if (integrations && integrations.length > 0 && !accessToken) {
      setAccessToken(integrations[0].access_token);
      setRefreshToken(integrations[0].refresh_token);
    }

    const tokenToUse = accessToken || integrations?.[0]?.access_token;

    if (!tokenToUse) {
      toast({
        title: "Erro",
        description: "Token de acesso não encontrado. Reconecte sua conta.",
        variant: "destructive",
      });
      return;
    }

    try {
      const sheets = await listSheets.mutateAsync(tokenToUse);
      setAvailableSheets(sheets);
      setShowMappingDialog(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível listar as planilhas",
        variant: "destructive",
      });
    }
  };

  const handleSheetSelect = async (sheetId: string) => {
    const sheet = availableSheets.find((s) => s.id === sheetId);
    if (!sheet) return;

    setSelectedSheet(sheet);

    // Fetch sheet headers (first row)
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:ZZ1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      if (data.values && data.values[0]) {
        setSheetHeaders(data.values[0]);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os cabeçalhos da planilha",
        variant: "destructive",
      });
    }
  };

  const handleSaveIntegration = async () => {
    if (!selectedSheet || !churchId) {
      toast({
        title: "Erro",
        description: "Igreja não identificada. Por favor, faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    // Validate that all required fields are mapped
    const missingFields = REQUIRED_FIELDS.filter((field) => !columnMapping[field.key]);
    if (missingFields.length > 0) {
      toast({
        title: "Mapeamento incompleto",
        description: `Por favor, mapeie todos os campos obrigatórios`,
        variant: "destructive",
      });
      return;
    }

    await createIntegration.mutateAsync({
      churchId,
      sheetId: selectedSheet.id,
      sheetName: selectedSheet.name,
      columnMapping,
      accessToken,
      refreshToken,
    });

    setShowMappingDialog(false);
    setSelectedSheet(null);
    setColumnMapping({});
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground mt-2">
            Conecte serviços externos para automatizar a importação de dados
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sheet className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>Google Sheets</CardTitle>
              <CardDescription>
                Conecte planilhas do Google para sincronizar automaticamente suas transações
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Clique no botão abaixo para autorizar o acesso às suas planilhas do Google Sheets
              </p>
              <Button onClick={handleConnect} disabled={startOAuth.isPending}>
                <Sheet className="mr-2 h-4 w-4" />
                Conectar com Google Sheets
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sheet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Conectado</p>
                    <p className="text-sm text-muted-foreground">{userEmail}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Desconectar
                </Button>
              </div>

              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Planilhas Sincronizadas</h3>
                <Button onClick={handleAddSheet} disabled={listSheets.isPending}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Planilha
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : integrations && integrations.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome da Planilha</TableHead>
                        <TableHead>Última Sincronização</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {integrations.map((integration) => (
                        <TableRow key={integration.id}>
                          <TableCell className="font-medium">{integration.sheet_name}</TableCell>
                          <TableCell>
                            {integration.last_sync_at
                              ? format(new Date(integration.last_sync_at), "dd/MM/yyyy 'às' HH:mm", {
                                  locale: ptBR,
                                })
                              : "Nunca sincronizado"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => syncIntegration.mutate(integration.id)}
                                disabled={syncIntegration.isPending}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteIntegration.mutate(integration.id)}
                                disabled={deleteIntegration.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma planilha conectada ainda
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mapear Colunas da Planilha</DialogTitle>
            <DialogDescription>
              Selecione a planilha e mapeie as colunas para os campos do sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Selecionar Planilha</Label>
              <Select onValueChange={handleSheetSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma planilha" />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map((sheet) => (
                    <SelectItem key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sheetHeaders.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Mapeamento de Campos</h4>
                {REQUIRED_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    <Select
                      value={columnMapping[field.key] || ""}
                      onValueChange={(value) =>
                        setColumnMapping((prev) => ({ ...prev, [field.key]: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        {sheetHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMappingDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveIntegration}
                disabled={!selectedSheet || createIntegration.isPending}
              >
                Salvar e Sincronizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}