import ExcelJS from 'exceljs';

/**
 * Exports an array of objects to an Excel file.
 * @param data The array of data to export.
 * @param fileName The desired name for the file (without extension).
 * @param sheetName The name for the worksheet inside the Excel file.
 */
export const exportToExcel = async (data: any[], fileName: string, sheetName: string) => {
  try {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    
    // Add a worksheet
    const worksheet = workbook.addWorksheet(sheetName);
    
    // Get headers from the first data object
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.columns = headers.map(header => ({
        header,
        key: header,
        width: 15
      }));
      
      // Add rows
      data.forEach(row => {
        worksheet.addRow(row);
      });
    }
    
    // Generate the file and trigger the download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw new Error("Não foi possível exportar para Excel.");
  }
};

/**
 * Downloads a standardized import template for transactions.
 */
export const downloadImportTemplate = async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // Add main data sheet
    const dataSheet = workbook.addWorksheet("Modelo de Importação");
    
    // Define columns
    dataSheet.columns = [
      { header: "Descrição", key: "descricao", width: 35 },
      { header: "Valor", key: "valor", width: 12 },
      { header: "Tipo", key: "tipo", width: 10 },
      { header: "Status", key: "status", width: 12 },
      { header: "Data de Vencimento", key: "vencimento", width: 18 },
      { header: "Data de Pagamento", key: "pagamento", width: 18 },
      { header: "Nº Parcela", key: "parcela", width: 12 },
      { header: "Total Parcelas", key: "totalParcelas", width: 14 },
      { header: "Notas", key: "notas", width: 40 },
    ];
    
    // Add sample data rows
    dataSheet.addRow({
      descricao: "Dízimo Mensal",
      valor: 1500.00,
      tipo: "Receita",
      status: "Pago",
      vencimento: "2026-01-15",
      pagamento: "2026-01-10",
      parcela: 1,
      totalParcelas: 1,
      notas: "Dízimo do mês de janeiro"
    });
    
    dataSheet.addRow({
      descricao: "Aluguel do Salão",
      valor: 2000.00,
      tipo: "Despesa",
      status: "Pendente",
      vencimento: "2026-01-20",
      pagamento: "",
      parcela: 1,
      totalParcelas: 1,
      notas: ""
    });
    
    dataSheet.addRow({
      descricao: "Compra de Equipamentos de Som",
      valor: 500.00,
      tipo: "Despesa",
      status: "Pago",
      vencimento: "2026-01-25",
      pagamento: "2026-01-25",
      parcela: 1,
      totalParcelas: 12,
      notas: "Parcela 1 de 12 - Caixa de som"
    });

    // Add instructions sheet
    const instructionsSheet = workbook.addWorksheet("Instruções");
    instructionsSheet.columns = [{ header: "Instruções para Importação", key: "instrucao", width: 70 }];
    
    const instructions = [
      "",
      "1. Preencha os dados nas colunas correspondentes",
      "2. Mantenha os cabeçalhos exatamente como estão",
      "",
      "CAMPOS OBRIGATÓRIOS:",
      "- Descrição: Texto descritivo da transação",
      "- Valor: Número positivo (ex: 1500.00)",
      "- Tipo: 'Receita' ou 'Despesa'",
      "- Status: 'Pendente', 'Pago' ou 'Vencido'",
      "",
      "CAMPOS OPCIONAIS:",
      "- Data de Vencimento: Formato AAAA-MM-DD (ex: 2026-01-15)",
      "- Data de Pagamento: Formato AAAA-MM-DD (obrigatório se status = 'Pago')",
      "- Nº Parcela: Número da parcela atual (padrão: 1)",
      "- Total Parcelas: Total de parcelas (padrão: 1)",
      "- Notas: Observações adicionais",
      "",
      "DICAS:",
      "- Para compras parceladas, crie uma linha para cada parcela",
      "- A categoria e ministério são definidos durante a importação"
    ];
    
    instructions.forEach(instruction => {
      instructionsSheet.addRow({ instrucao: instruction });
    });

    // Generate and download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "modelo_importacao_igreja360.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generating import template:", error);
    throw new Error("Não foi possível gerar o modelo de importação.");
  }
};
