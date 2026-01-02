import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sheet, Plus, RefreshCw, Trash2, Link as LinkIcon, CheckCircle, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useRole } from "@/hooks/useRole";

const REQUIRED_FIELDS = [
  { key: "amount", label: "Valor da Transação" },
  { key: "description", label: "Descrição" },
  { key: "type", label: "Tipo (Receita/Despesa)" },
  { key: "due_date", label: "Data de Vencimento" },
  { key: "status", label: "Status" },
];

export default function Integracoes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { isAdmin, isTesoureiro, isLoading: roleLoading } = useRole();
  const {
    integrations,
    isLoading,
    createIntegration,
    syncIntegration,
    deleteIntegration,
  } = useIntegrations();

  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [sheetId, setSheetId] = useState<string>("");
  const [sheetName, setSheetName] = useState<string>("");
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isProcessingSheet, setIsProcessingSheet] = useState(false);
  const [isStartingOAuth, setIsStartingOAuth] = useState(false);
  const [showOAuth403Instructions, setShowOAuth403Instructions] = useState(false);
  
  // SECURITY FIX: Store OAuth tokens in React state instead of sessionStorage
  const [oauthTokens, setOauthTokens] = useState<{
    accessToken: string;
    refreshToken: string | null;
  } | null>(null);

  const canManageIntegrations = isAdmin || isTesoureiro;
  const hasOAuthTokens = oauthTokens?.accessToken != null;

  // Handle OAuth callback with secure session
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const sessionId = searchParams.get('oauth_session');
      const oauthError = searchParams.get('oauth_error');

      if (oauthError) {
        const decodedError = decodeURIComponent(oauthError);
        
        // Detectar erro 403 (access_denied, Access blocked, etc.)
        const is403Error = 
          decodedError.includes('403') || 
          decodedError.includes('access_denied') || 
          decodedError.includes('Access blocked') ||
          decodedError.includes('access blocked') ||
          decodedError.includes('not authorized') ||
          decodedError.includes('Access denied');
        
        if (is403Error) {
          setShowOAuth403Instructions(true);
          toast({
            title: "Acesso Bloqueado pelo Google",
            description: "O aplicativo está em modo de teste. Veja as instruções abaixo.",
            variant: "destructive",
            duration: 10000,
          });
        } else {
          toast({
            title: "Erro na autenticação",
            description: decodedError,
            variant: "destructive",
          });
        }
        setSearchParams({});
        return;
      }

      if (sessionId && user) {
        // First check if session exists and is not expired
        const { data: session, error: sessionCheckError } = await supabase
          .from('oauth_sessions')
          .select('id, expires_at')
          .eq('id', sessionId)
          .single();

        if (sessionCheckError || !session) {
          toast({
            title: "Erro",
            description: "Não foi possível recuperar a sessão OAuth. Tente novamente.",
            variant: "destructive",
          });
          setSearchParams({});
          return;
        }

        // Check if session expired
        if (new Date(session.expires_at) < new Date()) {
          toast({
            title: "Sessão expirada",
            description: "A sessão OAuth expirou. Por favor, tente novamente.",
            variant: "destructive",
          });
          // Clean up expired session
          await supabase.from('oauth_sessions').delete().eq('id', sessionId);
          setSearchParams({});
          return;
        }

        // Fetch decrypted tokens using secure RPC function
        const { data: decryptedTokens, error: decryptError } = await supabase.rpc(
          'get_decrypted_oauth_session',
          { session_id: sessionId }
        );

        if (decryptError || !decryptedTokens || decryptedTokens.length === 0) {
          console.error('Failed to decrypt OAuth tokens:', decryptError);
          toast({
            title: "Erro",
            description: "Não foi possível recuperar os tokens OAuth. Tente novamente.",
            variant: "destructive",
          });
          setSearchParams({});
          return;
        }

        // SECURITY: Store tokens in React state (memory only)
        // Tokens are encrypted at rest in database and decrypted only when needed
        setOauthTokens({
          accessToken: decryptedTokens[0].access_token,
          refreshToken: decryptedTokens[0].refresh_token || null,
        });

        // Delete session from database after retrieving tokens
        await supabase.from('oauth_sessions').delete().eq('id', sessionId);

        // Clear URL params
        setSearchParams({});
        
        // Show the mapping dialog
        setShowMappingDialog(true);
        
        toast({
          title: "Autenticação concluída",
          description: "Agora você pode configurar a integração com o Google Sheets.",
        });
      }
    };

    handleOAuthCallback();
  }, [searchParams, user, setSearchParams]);

  const extractSheetIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleSheetUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setSheetUrl(url);
    const extractedId = extractSheetIdFromUrl(url);
    setSheetId(extractedId || "");
    const nameMatch = url.match(/\/spreadsheets\/d\/[a-zA-Z0-9_-]+\/edit#gid=(\d+)/);
    setSheetName(nameMatch ? `Planilha ${nameMatch[1]}` : "Nova Planilha");
  };

  const handleLoadSheetHeaders = async () => {
    if (!canManageIntegrations) return;
    if (!sheetId) {
      toast({ title: "URL Inválida", description: "Por favor, insira uma URL válida do Google Sheets.", variant: "destructive" });
      return;
    }
    
    if (!oauthTokens?.accessToken) {
      toast({ 
        title: "Autenticação necessária", 
        description: "Por favor, autentique-se com o Google primeiro clicando em 'Adicionar Planilha'.", 
        variant: "destructive" 
      });
      return;
    }

    setIsProcessingSheet(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('get-sheet-headers', {
        body: {
          sheetId,
          accessToken: oauthTokens.accessToken,
          refreshToken: oauthTokens.refreshToken,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao carregar cabeçalhos');
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido');
      }

      setSheetHeaders(data.headers);
      if (data.sheetName) {
        setSheetName(data.sheetName);
      }

      // Update access token if it was refreshed
      if (data.newAccessToken) {
        setOauthTokens(prev => prev ? { ...prev, accessToken: data.newAccessToken } : null);
      }

      toast({ 
        title: "Cabeçalhos Carregados", 
        description: `${data.headers.length} colunas encontradas na planilha "${data.sheetName}".`
      });

    } catch (error: any) {
      console.error('Error loading sheet headers:', error);
      toast({ 
        title: "Erro", 
        description: error.message || "Não foi possível carregar os cabeçalhos da planilha.", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessingSheet(false);
    }
  };

  const handleSaveIntegration = async () => {
    if (!canManageIntegrations) return;
    if (!sheetName || !sheetId || !profile?.church_id || !sheetUrl) {
      toast({
        title: "Erro",
        description: "Dados insuficientes para criar a integração. Certifique-se de que a URL da planilha é válida e que sua igreja está associada ao seu perfil.",
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

    // SECURITY FIX: Get OAuth tokens from React state (memory) instead of sessionStorage
    if (!oauthTokens?.accessToken) {
      toast({
        title: "Erro de OAuth",
        description: "Tokens de acesso não encontrados. Por favor, autentique novamente.",
        variant: "destructive",
      });
      return;
    }

    await createIntegration.mutateAsync({
      churchId: profile.church_id,
      sheetId: sheetId,
      sheetName: sheetName,
      columnMapping,
      accessToken: oauthTokens.accessToken,
      refreshToken: oauthTokens.refreshToken || '',
    });

    // Clear tokens from memory after successful integration creation
    setOauthTokens(null);

    setShowMappingDialog(false);
    setSheetUrl("");
    setSheetId("");
    setSheetName("");
    setColumnMapping({});
    setSheetHeaders([]);
  };

  // Função para iniciar OAuth do Google
  const handleStartGoogleOAuth = async () => {
    if (!canManageIntegrations) return;
    
    // Se já tem tokens, apenas abre o dialog
    if (hasOAuthTokens) {
      setShowMappingDialog(true);
      return;
    }

    setIsStartingOAuth(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-auth-start');
      
      if (error) {
        throw new Error(error.message || 'Erro ao iniciar autenticação');
      }

      if (!data?.authUrl) {
        throw new Error('URL de autenticação não recebida');
      }

      // Redirecionar para Google OAuth
      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error('Error starting Google OAuth:', error);
      toast({
        title: "Erro ao iniciar autenticação",
        description: error.message || "Não foi possível iniciar o processo de autenticação com o Google.",
        variant: "destructive",
      });
    } finally {
      setIsStartingOAuth(false);
    }
  };

  const isAddSheetButtonDisabled = !profile?.church_id || !canManageIntegrations || isStartingOAuth; // Desabilitar se profile.church_id for nulo ou sem permissão

  if (isLoading || roleLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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

      {/* Alert de instruções para erro 403 do Google OAuth */}
      <AnimatePresence>
        {showOAuth403Instructions && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="destructive" className="relative">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Acesso Bloqueado pelo Google</AlertTitle>
              <AlertDescription className="mt-3 space-y-3">
                <p>
                  O aplicativo Google OAuth está em modo de teste. Para usar a integração com Google Sheets:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    Acesse o <strong>Google Cloud Console</strong> (
                    <a 
                      href="https://console.cloud.google.com/apis/credentials/consent" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-destructive-foreground"
                    >
                      console.cloud.google.com
                    </a>
                    )
                  </li>
                  <li>Vá em <strong>APIs e Serviços → Tela de Consentimento OAuth</strong></li>
                  <li>
                    Na seção <strong>Usuários de teste</strong>, adicione seu email Google Workspace
                  </li>
                  <li>
                    <strong>Importante:</strong> Como o app está configurado como "Interno (Workspace)", 
                    apenas usuários do seu domínio Google Workspace podem acessar
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2">
                  Nota: Apps internos do Workspace não precisam de verificação do Google, mas estão limitados aos usuários do domínio.
                </p>
              </AlertDescription>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setShowOAuth403Instructions(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sheet className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                Google Sheets
                <AnimatePresence>
                  {hasOAuthTokens && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: -10 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Badge className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Autenticado
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardTitle>
              <CardDescription>
                Conecte planilhas do Google para sincronizar automaticamente suas transações
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Planilhas Sincronizadas</h3>
            <Button onClick={handleStartGoogleOAuth} disabled={isAddSheetButtonDisabled}>
              {isStartingOAuth ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Autenticando...
                </>
              ) : hasOAuthTokens ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                  Configurar Planilha
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Planilha
                </>
              )}
            </Button>
          </div>
          {isAddSheetButtonDisabled && !canManageIntegrations && (
            <p className="text-sm text-destructive text-center">
              Você não tem permissão para adicionar planilhas.
            </p>
          )}
          {isAddSheetButtonDisabled && canManageIntegrations && !profile?.church_id && (
            <p className="text-sm text-destructive text-center">
              Você precisa ter uma igreja associada ao seu perfil para adicionar planilhas. Por favor, crie uma igreja primeiro.
            </p>
          )}

          {integrations && integrations.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Planilha</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Última Sincronização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrations.map((integration) => (
                    <TableRow key={integration.id}>
                      <TableCell className="font-medium">{integration.sheet_name}</TableCell>
                      <TableCell>
                        <a 
                          href={`https://docs.google.com/spreadsheets/d/${integration.sheet_id}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary hover:underline flex items-center gap-1"
                        >
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
                            disabled={syncIntegration.isPending || !canManageIntegrations}
                          >
                            {syncIntegration.isPending ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteIntegration.mutate(integration.id)}
                            disabled={deleteIntegration.isPending || !canManageIntegrations}
                          >
                            {deleteIntegration.isPending ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <AnimatePresence mode="wait">
                {hasOAuthTokens ? (
                  <motion.div
                    key="authenticated"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                    >
                      <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
                    </motion.div>
                    <p className="text-green-600 font-medium">Autenticado com Google</p>
                    <p>Clique em "Configurar Planilha" para adicionar sua primeira integração.</p>
                  </motion.div>
                ) : (
                  <motion.p
                    key="not-authenticated"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Nenhuma planilha conectada ainda
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Adicionar Planilha Google Sheets
              <AnimatePresence>
                {hasOAuthTokens && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </DialogTitle>
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
                disabled={!canManageIntegrations}
              />
              <Button onClick={handleLoadSheetHeaders} disabled={!sheetId || isProcessingSheet || !canManageIntegrations}>
                {isProcessingSheet ? <LoadingSpinner size="sm" className="mr-2" /> : null}
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
                      disabled={!canManageIntegrations}
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
              <Button type="button" variant="outline" onClick={() => setShowMappingDialog(false)} disabled={createIntegration.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveIntegration}
                disabled={!sheetId || sheetHeaders.length === 0 || createIntegration.isPending || !canManageIntegrations}
              >
                {createIntegration.isPending ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Salvar e Sincronizar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}