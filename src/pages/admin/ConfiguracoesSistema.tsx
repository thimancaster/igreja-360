import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, History, RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useSyncHistory, SyncHistoryEntry } from '@/hooks/useSyncHistory';
import { format, formatDistanceToNow, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { pageVariants, pageTransition } from '@/lib/pageAnimations';

const INTERVAL_OPTIONS = [
  { value: 1, label: '1 hora' },
  { value: 3, label: '3 horas' },
  { value: 6, label: '6 horas' },
  { value: 12, label: '12 horas' },
  { value: 24, label: '24 horas' },
];

export default function ConfiguracoesSistema() {
  const { settings, isLoading: settingsLoading, updateSettings, isUpdating } = useAppSettings();
  const [syncTypeFilter, setSyncTypeFilter] = useState<'all' | 'manual' | 'automatic'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error' | 'partial'>('all');
  
  const { history, isLoading: historyLoading, totals, refetch } = useSyncHistory({
    limit: 100,
    syncType: syncTypeFilter,
    status: statusFilter,
  });

  const handleSyncEnabledChange = async (enabled: boolean) => {
    await updateSettings({ sync_enabled: enabled });
  };

  const handleIntervalChange = async (value: string) => {
    await updateSettings({ sync_interval_hours: parseInt(value, 10) });
  };

  const getNextSyncTime = () => {
    if (!settings.sync_enabled || !settings.last_auto_sync) {
      return 'Não agendada';
    }
    const lastSync = new Date(settings.last_auto_sync);
    const nextSync = addHours(lastSync, settings.sync_interval_hours);
    return format(nextSync, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertCircle className="h-3 w-3 mr-1" />Parcial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSyncTypeBadge = (type: string) => {
    return type === 'automatic' 
      ? <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Automático</Badge>
      : <Badge variant="outline"><RefreshCw className="h-3 w-3 mr-1" />Manual</Badge>;
  };

  const getIntegrationTypeBadge = (type: string) => {
    return type === 'google' 
      ? <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Google Sheets</Badge>
      : <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Planilha Pública</Badge>;
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex-1 space-y-6 p-6"
    >
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          <Settings className="h-8 w-8" />
          Configurações do Sistema
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure a sincronização automática e visualize o histórico de sincronizações
        </p>
      </div>

      <Tabs defaultValue="sync" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sync" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Sincronização
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sincronização Automática</CardTitle>
              <CardDescription>
                Configure o intervalo de sincronização automática com as planilhas integradas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sync-enabled" className="text-base font-medium">
                        Sincronização Automática Ativa
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Quando ativada, o sistema sincronizará automaticamente no intervalo configurado
                      </p>
                    </div>
                    <Switch
                      id="sync-enabled"
                      checked={settings.sync_enabled}
                      onCheckedChange={handleSyncEnabledChange}
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">Intervalo de Sincronização</Label>
                    <div className="flex flex-wrap gap-2">
                      {INTERVAL_OPTIONS.map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.sync_interval_hours === option.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleIntervalChange(String(option.value))}
                          disabled={isUpdating}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Última sincronização automática</p>
                      <p className="text-lg font-semibold">
                        {settings.last_auto_sync
                          ? formatDistanceToNow(new Date(settings.last_auto_sync), { locale: ptBR, addSuffix: true })
                          : 'Nunca'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Próxima sincronização</p>
                      <p className="text-lg font-semibold">{getNextSyncTime()}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Histórico de Sincronizações</CardTitle>
                  <CardDescription>
                    Veja todas as sincronizações realizadas e seus resultados
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={syncTypeFilter} onValueChange={(v: any) => setSyncTypeFilter(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatic">Automático</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="error">Erro</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Summary */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{totals.totalSyncs}</p>
                  <p className="text-xs text-muted-foreground">Total de Syncs</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{totals.inserted}</p>
                  <p className="text-xs text-muted-foreground">Inseridas</p>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{totals.updated}</p>
                  <p className="text-xs text-muted-foreground">Atualizadas</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{totals.skipped}</p>
                  <p className="text-xs text-muted-foreground">Ignoradas</p>
                </div>
              </div>

              {/* Table */}
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma sincronização encontrada</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Integração</TableHead>
                        <TableHead className="text-center">Inseridas</TableHead>
                        <TableHead className="text-center">Atualizadas</TableHead>
                        <TableHead className="text-center">Ignoradas</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((entry: SyncHistoryEntry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="space-y-0.5">
                              <p className="font-medium">
                                {format(new Date(entry.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(entry.created_at), 'HH:mm', { locale: ptBR })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getSyncTypeBadge(entry.sync_type)}</TableCell>
                          <TableCell>{getIntegrationTypeBadge(entry.integration_type)}</TableCell>
                          <TableCell className="text-center font-medium text-green-600">
                            {entry.records_inserted}
                          </TableCell>
                          <TableCell className="text-center font-medium text-blue-600">
                            {entry.records_updated}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {entry.records_skipped}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(entry.status)}
                            {entry.error_message && (
                              <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={entry.error_message}>
                                {entry.error_message}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
