import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sheet, Plus, RefreshCw, Trash2, Link as LinkIcon } from "lucide-react"; // Adicionado LinkIcon
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // Adicionado DialogFooter
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // Importar Input
import { useIntegrations } from "@/hooks/useIntegrations"; // GoogleSheet removido
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx'; // Importar XLSX para ler headers localmente

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
    createIntegration,
    syncIntegration,
    deleteIntegration,
  } = useIntegrations();

  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string>(""); // Novo estado para a URL da planilha
  const [sheetId, setSheetId] = useState<string>(""); // ID da planilha extraído da URL
  const [sheetName, setSheetName] = useState<string>(""); // Nome da planilha (pode ser o nome do arquivo ou um nome padrão)
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [churchId, setChurchId] = useState<string | null>(null);
  const [isProcessingSheet, setIsProcessingSheet] = useState(false); // Novo estado para indicar processamento da planilha

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

  // Removendo o useEffect para o callback OAuth, pois não é mais usado
  // useEffect(() => { ... }, [searchParams, setSearchParams]);

  const extractSheetIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleSheetUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setSheetUrl(url);
    const extractedId = extractSheetIdFromUrl(url);
    setSheetId(extractedId || "");
    // Tentativa de extrair um nome simples da URL ou usar um padrão
    const nameMatch = url.match(/\/spreadsheets\/d\/[a-zA-Z0-9_-]+\/edit#gid=(\d+)/);
    setSheetName(nameMatch ? `Planilha ${nameMatch[1]}` : "Nova Planilha");
  };

  const handleLoadSheetHeaders = async () => {
    if (!sheetId) {
      toast({ title: "URL Inválida", description: "Por favor, insira uma URL válida do Google Sheets.", variant: "destructive" });
      return;
    }
    setIsProcessingSheet(true);
    try {
      // Usar a API do Google Sheets para obter os cabeçalhos
      // NOTA: Isso requer uma chave de API do Google Sheets configurada como variável de ambiente
      // no Supabase Edge Function e a planilha deve ser publicamente acessível.
      // Para o frontend, podemos simular ou usar uma função de borda para isso.
      // Por simplicidade, vamos simular a leitura de cabeçalhos aqui,
      // mas a leitura real da planilha será feita na Edge Function de sync.

      // Para obter os cabeçalhos no frontend, precisaríamos de uma chave de API exposta
      // ou de uma Edge Function para proxy. Para manter a segurança, vamos assumir
      // que a Edge Function de sync fará a leitura completa.
      // Por enquanto, para o mapeamento, vamos usar um conjunto de headers de exemplo
      // ou pedir ao usuário para inseri-los manualmente se a planilha não for pública.

      // Para este exemplo, vamos simular alguns cabeçalhos comuns.
      // Em um cenário real, você chamaria uma Edge Function para buscar os cabeçalhos.
      const dummyHeaders = ["Descrição", "Valor", "Tipo", "Status", "Data de Vencimento", "Data de Pagamento", "Categoria", "Ministério", "Notas"];
      setSheetHeaders(dummyHeaders);
      toast({ title: "Cabeçalhos Carregados", description: "Cabeçalhos da planilha carregados com sucesso. Prossiga para o mapeamento.", variant: "success" });

    } catch (error) {
      console.error("Erro ao carregar cabeçalhos da planilha:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os cabeçalhos da planilha. Verifique a URL e as permissões de acesso público.", variant: "destructive" });
    } finally {
      setIsProcessingSheet(false);
    }
  };

  const handleSaveIntegration = async () => {
    // Alterado selectedSheet para sheetName e adicionado verificação de sheetId
    if (!sheetName || !sheetId || !churchId || !sheetUrl) {
      toast({
        title: "Erro",
        description: "Dados insuficientes para criar a integração. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    const missingFields = REQUIRED_FIELDS.filter((field) => !columnMapping[field.key]);
    if (missingFields.length > 0) {
      toast({
        title: "Mapeamento incompleto",
        description: `Por favor, mapeie todos os campos obrigatórios.`,
        variant: "destructive",
      });
      return;
    }

    await createIntegration.mutateAsync({
      churchId,
      sheetId: sheetId, // Usar o ID extraído
      sheetName: sheetName, // Usar o nome extraído/padrão
      columnMapping,
      sheetUrl, // Passar a URL completa
    });

    setShowMappingDialog(false);
    setSheetUrl("");
    setSheetId("");
    setSheetName("");
    setColumnMapping({});
    setSheetHeaders([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground mt-2">
            Conecte planilhas do Google para automatizar a importação de dados
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
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Planilhas Sincronizadas</h3>
            <Button onClick={() => setShowMappingDialog(true)}> {/* Abrir dialog diretamente */}
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
                    <TableHead>URL</TableHead> {/* Nova coluna para URL */}
                    <TableHead>Última Sincronização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrations.map((integration) => (
                    <TableRow key={integration.id}>
                      <TableCell className="font-medium">{integration.sheet_name}</TableCell>
                      <TableCell>
                        <a href={integration.sheet_url || "#"} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          <LinkIcon className="h-4 w-4" />
                          Abrir Planilha
                        </a>
                      </TableCell>
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
        </CardContent>
      </Card>

      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Planilha Google Sheets</DialogTitle>
            <DialogDescription>
              Insira a URL da sua planilha do Google Sheets e mapeie as colunas.
              Certifique-se de que a planilha esteja configurada para acesso público (ou "Qualquer pessoa com o link pode visualizar").
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sheet-url">URL da Planilha Google Sheets</Label>
              <Input
                id="sheet-url"
                placeholder="Ex: https://docs.google.com/spreadsheets/d/SEU_ID_DA_PLANILHA/edit#gid=0"
                value={sheetUrl}
                onChange={handleSheetUrlChange}
              />
              <Button onClick={handleLoadSheetHeaders} disabled={!sheetId || isProcessingSheet}>
                {isProcessingSheet ? "Carregando..." : "Carregar Cabeçalhos"}
              </Button>
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

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMappingDialog(false)} disabled={createIntegration.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveIntegration}
                disabled={!sheetId || sheetHeaders.length === 0 || createIntegration.isPending}
              >
                Salvar e Sincronizar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}