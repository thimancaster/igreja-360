import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { UploadCloud, FileText, ChevronRight, ChevronLeft, Check, Loader2, Download } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ColumnMapping, ImportPreviewRow, ProcessedTransaction } from "@/types/import";
import { 
  readSpreadsheet, 
  parseAmount, 
  parseDate, 
  normalizeType, 
  normalizeStatus, 
  validateTransaction,
  createImportExternalId,
  buildDeduplicationSets,
  filterDuplicateTransactions,
  type ExistingTransactionForDupe
} from "@/utils/importHelpers";
import { downloadImportTemplate } from "@/utils/exportHelpers";
import { useRole } from "@/hooks/useRole";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useCategoriesAndMinistries } from "@/hooks/useCategoriesAndMinistries";
import { CategoryMinistryMapper } from "@/components/import/CategoryMinistryMapper";
import { ImportHistory } from "@/components/import/ImportHistory";

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ["description", "amount", "type", "status"];
const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  description: "Descrição",
  amount: "Valor",
  type: "Tipo (Receita/Despesa)",
  status: "Status (Pendente/Pago/Vencido)",
  due_date: "Data de Vencimento",
  payment_date: "Data de Pagamento",
  category_id: "Categoria",
  ministry_id: "Ministério",
  notes: "Notas",
  installment_number: "Nº Parcela",
  total_installments: "Total de Parcelas",
};

export default function Importacao() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<any[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    description: "", amount: "", type: "", status: "", due_date: "",
    payment_date: "", category_id: "", ministry_id: "", notes: "",
    installment_number: "", total_installments: "",
  });
  const [previewData, setPreviewData] = useState<ImportPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Category and Ministry mapping
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedMinistryId, setSelectedMinistryId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { isAdmin, isTesoureiro, isLoading: roleLoading } = useRole();
  const queryClient = useQueryClient();
  const { data: catMinData, isLoading: catMinLoading } = useCategoriesAndMinistries();

  const canImport = isAdmin || isTesoureiro;

  const onDrop = (acceptedFiles: File[]) => {
    if (!canImport) {
      toast({ title: "Permissão Negada", description: "Você não tem permissão para importar arquivos.", variant: "destructive" });
      return;
    }
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "O tamanho máximo do arquivo é 5MB.", variant: "destructive" });
        return;
      }
      setFile(selectedFile);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    disabled: !canImport,
  });

  const handleFileStep = async () => {
    if (!canImport) return;
    if (!file) return;
    try {
      const { headers, rows } = await readSpreadsheet(file);
      if (rows.length > 1000) {
        toast({ title: "Muitas linhas", description: "A importação está limitada a 1000 linhas por vez.", variant: "destructive" });
        return;
      }
      setHeaders(headers);
      setDataRows(rows);
      setStep(2);
    } catch (error) {
      toast({ title: "Erro ao ler arquivo", description: "Não foi possível processar o arquivo. Verifique o formato.", variant: "destructive" });
    }
  };

  const handleMappingStep = () => {
    if (!canImport) return;
    const missingMappings = REQUIRED_FIELDS.filter(field => !columnMapping[field]);
    if (missingMappings.length > 0) {
      toast({ title: "Mapeamento Incompleto", description: `Os seguintes campos obrigatórios não foram mapeados: ${missingMappings.map(f => FIELD_LABELS[f]).join(', ')}`, variant: "destructive" });
      return;
    }

    const preview = dataRows.slice(0, 5).map(row => {
      const rowData: ImportPreviewRow = {};
      Object.keys(columnMapping).forEach(key => {
        const fieldKey = key as keyof ColumnMapping;
        const header = columnMapping[fieldKey];
        if (header) {
          const cellValue = row[headers.indexOf(header)];
          if (fieldKey === 'due_date' || fieldKey === 'payment_date') {
            rowData[fieldKey] = parseDate(cellValue) || '-';
          } else if (fieldKey === 'amount') {
            const amount = parseAmount(cellValue);
            rowData[fieldKey] = amount !== null ? amount.toFixed(2) : '-';
          } else if (fieldKey === 'type') {
            rowData[fieldKey] = normalizeType(String(cellValue || '')) || String(cellValue || '-');
          } else if (fieldKey === 'status') {
            rowData[fieldKey] = normalizeStatus(String(cellValue || '')) || String(cellValue || '-');
          } else {
            rowData[fieldKey] = cellValue !== undefined && cellValue !== null ? String(cellValue) : '-';
          }
        }
      });
      return rowData;
    });
    setPreviewData(preview);
    setStep(3);
  };

  const handleImport = async () => {
    if (!canImport) return;
    if (!user || !profile?.church_id) {
      toast({ title: "Erro de Autenticação", description: "Usuário ou igreja não encontrados.", variant: "destructive" });
      return;
    }
    setImporting(true);
    setProgress(0);

    let uploadRecord: { id: string } | null = null;

    try {
      // Create upload record
      const { data: uploadData, error: uploadError } = await supabase
        .from("sheet_uploads")
        .insert({
          church_id: profile.church_id,
          user_id: user.id,
          filename: file?.name || "importacao.xlsx",
          file_size: file?.size || 0,
          status: "Processando",
          records_imported: 0,
        })
        .select("id")
        .single();

      if (uploadError) throw uploadError;
      uploadRecord = uploadData;

      // First, process all rows to get valid transactions
      const transactionsToValidate: Array<{
        transaction: Partial<ProcessedTransaction>;
        rowIndex: number;
      }> = [];
      const validationErrors: { row: number; error: string }[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const mappedRow: Record<string, unknown> = {};
        (Object.keys(columnMapping) as (keyof ColumnMapping)[]).forEach(key => {
          const header = columnMapping[key];
          if (header) mappedRow[key] = row[headers.indexOf(header)];
        });

        const type = normalizeType(String(mappedRow.type || '')) || "Despesa";
        const dueDate = parseDate(mappedRow.due_date);
        const paymentDate = parseDate(mappedRow.payment_date);

        const processed: Partial<ProcessedTransaction> = {
          description: String(mappedRow.description || '').trim(),
          amount: parseAmount(mappedRow.amount) || 0,
          type,
          status: type === 'Receita' ? 'Pago' : (normalizeStatus(String(mappedRow.status || '')) || "Pendente"),
          due_date: type === 'Receita' ? null : dueDate,
          payment_date: type === 'Receita' ? (dueDate || paymentDate || new Date().toISOString().split('T')[0]) : paymentDate,
          notes: mappedRow.notes ? String(mappedRow.notes) : null,
          category_id: selectedCategoryId,
          ministry_id: selectedMinistryId,
          church_id: profile.church_id,
          created_by: user.id,
          origin: 'Importação de Planilha',
        };

        // Add external_id for deduplication
        if (processed.description && processed.amount && processed.type) {
          (processed as Record<string, unknown>).external_id = createImportExternalId(
            processed.description,
            processed.amount,
            processed.due_date || null,
            processed.type
          );
        }

        const validation = validateTransaction(processed);
        if (validation.success) {
          transactionsToValidate.push({ 
            transaction: validation.data as ProcessedTransaction, 
            rowIndex: i + 2 
          });
        } else {
          validationErrors.push({ row: i + 2, error: validation.error?.errors[0].message || "Erro desconhecido" });
        }
        setProgress(((i + 1) / dataRows.length) * 30);
      }

      if (validationErrors.length > 0 && transactionsToValidate.length === 0) {
        throw new Error(`${validationErrors.length} linha(s) com erro. Primeira na Linha ${validationErrors[0].row}: ${validationErrors[0].error}`);
      }

      if (transactionsToValidate.length === 0) {
        throw new Error("Nenhuma transação válida para importar.");
      }

      setProgress(40);

      // Fetch ALL existing transactions for intelligent deduplication
      const { data: existingTransactions, error: fetchError } = await supabase
        .from("transactions")
        .select("id, description, amount, type, due_date, payment_date, external_id")
        .eq("church_id", profile.church_id);

      if (fetchError) throw fetchError;

      setProgress(50);

      // Build deduplication sets using content hash
      const { existingHashes, existingByExternalId } = buildDeduplicationSets(
        (existingTransactions || []) as ExistingTransactionForDupe[]
      );

      // Extract transactions for filtering
      const transactionsForFilter = transactionsToValidate.map(t => ({
        ...(t.transaction as ProcessedTransaction),
        due_date: (t.transaction as ProcessedTransaction).due_date || null
      }));

      // Filter duplicates using content hash
      const { toImport, duplicates, batchDuplicates } = filterDuplicateTransactions(
        transactionsForFilter,
        existingHashes,
        existingByExternalId
      );

      setProgress(60);

      if (toImport.length === 0) {
        const totalDupes = duplicates.length + batchDuplicates.length;
        throw new Error(`Todas as ${totalDupes} transações já existem no sistema ou são duplicadas. Nenhuma transação foi importada.`);
      }

      setProgress(75);

      // Insert non-duplicate transactions
      const { error: insertError } = await supabase.from("transactions").insert(toImport);
      if (insertError) throw insertError;

      // Update upload record with success
      await supabase
        .from("sheet_uploads")
        .update({
          status: "Concluído",
          records_imported: toImport.length,
        })
        .eq("id", uploadRecord.id);

      setProgress(100);

      const skippedCount = duplicates.length;
      const batchDupeCount = batchDuplicates.length;
      
      let message = `${toImport.length} transações importadas com sucesso.`;
      if (skippedCount > 0) {
        message += ` ${skippedCount} duplicatas ignoradas.`;
      }
      if (batchDupeCount > 0) {
        message += ` ${batchDupeCount} repetidas no arquivo.`;
      }
      if (validationErrors.length > 0) {
        message += ` ${validationErrors.length} com erro de validação.`;
      }
      
      toast({ title: "Sucesso!", description: message });

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
      queryClient.invalidateQueries({ queryKey: ["sheet-uploads"] });
      navigate("/app/dashboard");

    } catch (error: unknown) {
      // Update upload record with error
      if (uploadRecord) {
        await supabase
          .from("sheet_uploads")
          .update({
            status: "Erro",
            error_details: error instanceof Error ? error.message : 'Erro desconhecido',
          })
          .eq("id", uploadRecord.id);
      }
      toast({ title: "Erro na Importação", description: error instanceof Error ? error.message : 'Erro desconhecido', variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  if (roleLoading || catMinLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="max-w-4xl mx-auto">
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle>Passo 1: Upload do Arquivo</CardTitle>
              <CardDescription className="flex items-center justify-between">
                <span>Selecione ou arraste um arquivo .xlsx, .xls ou .csv para importar.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await downloadImportTemplate();
                      toast({ title: "Download concluído", description: "O modelo de importação foi baixado." });
                    } catch (error) {
                      toast({ title: "Erro", description: "Não foi possível baixar o modelo.", variant: "destructive" });
                    }
                  }}
                  className="ml-4"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Modelo
                </Button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer ${isDragActive ? 'border-primary' : 'border-border'} ${!canImport ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input {...getInputProps()} />
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  {isDragActive ? "Solte o arquivo aqui..." : "Arraste e solte o arquivo aqui, ou clique para selecionar"}
                </p>
              </div>
              {file && (
                <div className="mt-6 flex items-center justify-center space-x-3 p-3 bg-muted rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                  <span className="font-medium">{file.name}</span>
                </div>
              )}
              {!canImport && (
                <p className="text-sm text-destructive mt-4 text-center">
                  Você não tem permissão para importar arquivos.
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleFileStep} disabled={!file || !canImport} className="ml-auto">
                Próximo <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle>Passo 2: Mapeamento de Colunas</CardTitle>
              <CardDescription>Associe as colunas do seu arquivo aos campos de transação do sistema. Campos com * são obrigatórios.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[])
                  .filter(field => field !== 'category_id' && field !== 'ministry_id')
                  .map(field => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field}>
                      {FIELD_LABELS[field]}
                      {REQUIRED_FIELDS.includes(field) && <span className="text-destructive">*</span>}
                    </Label>
                    <Select value={columnMapping[field]} onValueChange={value => setColumnMapping(prev => ({ ...prev, [field]: value }))} disabled={!canImport}>
                      <SelectTrigger id={field}>
                        <SelectValue placeholder="Selecione uma coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Category and Ministry Mapper */}
              <CategoryMinistryMapper
                categories={catMinData?.categories || []}
                ministries={catMinData?.ministries || []}
                selectedCategoryId={selectedCategoryId}
                selectedMinistryId={selectedMinistryId}
                onCategoryChange={setSelectedCategoryId}
                onMinistryChange={setSelectedMinistryId}
                disabled={!canImport}
              />
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setStep(1)} disabled={!canImport}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleMappingStep} disabled={!canImport}>
                Pré-visualizar Dados <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle>Passo 3: Pré-visualização e Confirmação</CardTitle>
              <CardDescription>
                Confira as primeiras 5 linhas para garantir que o mapeamento está correto. 
                Um total de {dataRows.length} linhas serão importadas.
                {selectedCategoryId && (
                  <span className="block mt-1">
                    Categoria: <Badge variant="secondary">{catMinData?.categories.find(c => c.id === selectedCategoryId)?.name}</Badge>
                  </span>
                )}
                {selectedMinistryId && (
                  <span className="block mt-1">
                    Ministério: <Badge variant="secondary">{catMinData?.ministries.find(m => m.id === selectedMinistryId)?.name}</Badge>
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {importing ? (
                <div className="space-y-4 text-center">
                  <p>Importando... Por favor, aguarde.</p>
                  <Progress value={progress} className="w-full" />
                  <p>{Math.round(progress)}%</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(previewData[0] || {}).map(key => <TableHead key={key}>{FIELD_LABELS[key as keyof ColumnMapping]}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, index) => (
                        <TableRow key={index}>
                          {Object.entries(row).map(([key, value]) => (
                            <TableCell key={key}>
                              {key === 'status' ? <Badge>{String(value)}</Badge> : String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setStep(2)} disabled={importing || !canImport}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleImport} disabled={importing || !canImport}>
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Importar {dataRows.length} Transações
              </Button>
            </CardFooter>
          </>
        )}
      </Card>

      {/* Import History */}
      <div className="max-w-4xl mx-auto">
        <ImportHistory />
      </div>
    </div>
  );
}
