import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ColumnMapping, ImportPreviewRow, ProcessedTransaction } from "@/types/import";
import { readSpreadsheet, parseAmount, parseDate, normalizeType, normalizeStatus } from "@/utils/importHelpers";
import { z } from "zod";

const transactionSchema = z.object({
  description: z.string().trim().min(1, "Descrição é obrigatória").max(500, "Descrição muito longa"),
  amount: z.number().positive("Valor deve ser positivo").max(999999999, "Valor muito alto"),
  type: z.enum(["Receita", "Despesa"], { required_error: "Tipo é obrigatório" }),
  status: z.enum(["Pendente", "Pago", "Vencido"], { required_error: "Status é obrigatório" }),
  due_date: z.string().nullable(),
  payment_date: z.string().nullable(),
  notes: z.string().nullable(),
  category_id: z.string().nullable(),
  ministry_id: z.string().nullable(),
  church_id: z.string().uuid(),
  created_by: z.string().uuid(),
  origin: z.string(),
});

export default function Importacao() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<any[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    description: "",
    amount: "",
    type: "",
    status: "",
  });
  const [previewData, setPreviewData] = useState<ImportPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tamanho (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleProcessFile = async () => {
    if (!file) return;

    try {
      toast({ title: "A processar ficheiro..." });
      const { headers: fileHeaders, rows } = await readSpreadsheet(file);

      if (rows.length === 0) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo não contém dados para importar",
          variant: "destructive",
        });
        return;
      }

      if (rows.length > 1000) {
        toast({
          title: "Muitos registos",
          description: "O arquivo pode ter no máximo 1000 transações",
          variant: "destructive",
        });
        return;
      }

      setHeaders(fileHeaders);
      setDataRows(rows);
      setStep(2);
      toast({ title: "Ficheiro processado com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao processar ficheiro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePreview = () => {
    // Validar campos obrigatórios
    if (!columnMapping.description || !columnMapping.amount || !columnMapping.type || !columnMapping.status) {
      toast({
        title: "Mapeamento incompleto",
        description: "Por favor, mapeie todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Processar primeiras 5 linhas para preview
    const preview: ImportPreviewRow[] = [];
    const previewRows = dataRows.slice(0, 5);

    previewRows.forEach((row) => {
      const descIndex = headers.indexOf(columnMapping.description);
      const amountIndex = headers.indexOf(columnMapping.amount);
      const typeIndex = headers.indexOf(columnMapping.type);
      const statusIndex = headers.indexOf(columnMapping.status);

      preview.push({
        description: row[descIndex] || "",
        amount: parseAmount(row[amountIndex]) || 0,
        type: normalizeType(row[typeIndex]) || "",
        status: normalizeStatus(row[statusIndex]) || "",
      });
    });

    setPreviewData(preview);
    setStep(3);
  };

  const handleImport = async () => {
    if (!user) {
      toast({ title: "Erro", description: "Utilizador não autenticado", variant: "destructive" });
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      // 1. Obter church_id
      const { data: profile } = await supabase.from("profiles").select("church_id").eq("id", user.id).single();

      if (!profile?.church_id) {
        throw new Error("Igreja não encontrada no perfil do utilizador");
      }

      // 2. Processar todas as linhas
      const transactions: ProcessedTransaction[] = [];
      const errors: { row: number; error: string }[] = [];

      dataRows.forEach((row, index) => {
        try {
          const descIndex = headers.indexOf(columnMapping.description);
          const amountIndex = headers.indexOf(columnMapping.amount);
          const typeIndex = headers.indexOf(columnMapping.type);
          const statusIndex = headers.indexOf(columnMapping.status);
          const dueDateIndex = columnMapping.due_date ? headers.indexOf(columnMapping.due_date) : -1;
          const paymentDateIndex = columnMapping.payment_date ? headers.indexOf(columnMapping.payment_date) : -1;
          const notesIndex = columnMapping.notes ? headers.indexOf(columnMapping.notes) : -1;

          // Ignorar linhas vazias
          if (!row[descIndex] && !row[amountIndex]) return;

          const mapped = {
            description: String(row[descIndex] || "").trim(),
            amount: parseAmount(row[amountIndex]),
            type: normalizeType(row[typeIndex]),
            status: normalizeStatus(row[statusIndex]),
            due_date: dueDateIndex >= 0 ? parseDate(row[dueDateIndex]) : null,
            payment_date: paymentDateIndex >= 0 ? parseDate(row[paymentDateIndex]) : null,
            notes: notesIndex >= 0 ? String(row[notesIndex] || "").trim() || null : null,
            category_id: null,
            ministry_id: null,
            church_id: profile.church_id,
            created_by: user.id,
            origin: "Importação",
          };

          // Validar
          const validated = transactionSchema.parse(mapped) as ProcessedTransaction;
          transactions.push(validated);
        } catch (error) {
          errors.push({
            row: index + 2,
            error: error instanceof z.ZodError ? error.errors[0].message : "Erro de validação",
          });
        }
      });

      setProgress(50);

      // 3. Verificar erros
      if (errors.length > 0) {
        toast({
          title: "Erros de Validação",
          description: `${errors.length} linha(s) com erro. Primeira: Linha ${errors[0].row} - ${errors[0].error}`,
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      if (transactions.length === 0) {
        toast({
          title: "Nenhuma transação válida",
          description: "Não foram encontradas transações válidas para importar",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      // 4. Insert em massa
      const { error: insertError } = await supabase.from("transactions").insert(transactions);

      if (insertError) throw insertError;

      setProgress(100);

      // 5. Sucesso
      toast({
        title: "Importação concluída!",
        description: `${transactions.length} transações importadas com sucesso!`,
      });

      // 6. Invalidar cache e redirecionar
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erro na Importação",
        description: error.message || "Ocorreu um erro ao importar as transações",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  const getBadgeVariant = (status: string) => {
    if (status === "Pago") return "default";
    if (status === "Pendente") return "secondary";
    return "destructive";
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Importação de Planilhas</h1>
        <p className="text-muted-foreground mt-1">Importe dados de Excel ou CSV em 3 passos simples</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Passo 1: Envie a sua Planilha</CardTitle>
                <CardDescription>Selecione um ficheiro .xlsx ou .csv contendo as suas transações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-smooth">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-sm text-muted-foreground">
                      {file ? file.name : "Clique para selecionar um ficheiro"}
                    </span>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Tamanho máximo: 5MB | Máximo 1000 transações</p>
              </CardContent>
              <CardFooter>
                <Button onClick={handleProcessFile} disabled={!file} className="ml-auto">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Passo 2: Mapeie as Colunas</CardTitle>
                <CardDescription>Corresponda as colunas da planilha com os campos do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      Descrição da Transação <span className="text-destructive">*</span>
                    </Label>
                    <Select value={columnMapping.description} onValueChange={(v) => setColumnMapping({ ...columnMapping, description: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Valor (Amount) <span className="text-destructive">*</span>
                    </Label>
                    <Select value={columnMapping.amount} onValueChange={(v) => setColumnMapping({ ...columnMapping, amount: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Tipo (Receita/Despesa) <span className="text-destructive">*</span>
                    </Label>
                    <Select value={columnMapping.type} onValueChange={(v) => setColumnMapping({ ...columnMapping, type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Status <span className="text-destructive">*</span>
                    </Label>
                    <Select value={columnMapping.status} onValueChange={(v) => setColumnMapping({ ...columnMapping, status: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Vencimento (Opcional)</Label>
                    <Select value={columnMapping.due_date || "NONE"} onValueChange={(v) => setColumnMapping({ ...columnMapping, due_date: v === "NONE" ? undefined : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Não mapear" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Não mapear</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Pagamento (Opcional)</Label>
                    <Select value={columnMapping.payment_date || "NONE"} onValueChange={(v) => setColumnMapping({ ...columnMapping, payment_date: v === "NONE" ? undefined : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Não mapear" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Não mapear</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Observações (Opcional)</Label>
                    <Select value={columnMapping.notes || "NONE"} onValueChange={(v) => setColumnMapping({ ...columnMapping, notes: v === "NONE" ? undefined : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Não mapear" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Não mapear</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={handlePreview}>
                  Pré-visualizar Dados <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Passo 3: Confirme os Dados</CardTitle>
                <CardDescription>
                  Verifique se os dados foram mapeados corretamente. A mostrar 5 de {dataRows.length} transações.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.description}</TableCell>
                          <TableCell>€{Number(row.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={row.type === "Receita" ? "default" : "secondary"}>{row.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant(String(row.status))}>{row.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {importing && (
                  <div className="mt-4 space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-muted-foreground text-center">A importar transações...</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} disabled={importing}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {importing ? "A Importar..." : "Importar Transações"}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Google Sheets
            </CardTitle>
            <CardDescription>Sincronize automaticamente com o Google</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Já tem as suas transações numa planilha do Google? Configure uma sincronização automática.
            </p>
            <Button variant="outline" onClick={() => navigate("/integracoes")} className="w-full">
              Conectar Google Sheets
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
