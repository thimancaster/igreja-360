import * as XLSX from 'xlsx';

/**
 * Exports an array of objects to an Excel file.
 * @param data The array of data to export.
 * @param fileName The desired name for the file (without extension).
 * @param sheetName The name for the worksheet inside the Excel file.
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert the array of objects to a worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Generate the file and trigger the download
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    // Optionally, you can throw the error or handle it with a toast notification from the calling component.
    throw new Error("Não foi possível exportar para Excel.");
  }
};

/**
 * Downloads a standardized import template for transactions.
 */
export const downloadImportTemplate = () => {
  try {
    const wb = XLSX.utils.book_new();
    
    // Define template headers and example data
    const templateData = [
      {
        "Descrição": "Dízimo Mensal",
        "Valor": 1500.00,
        "Tipo": "Receita",
        "Status": "Pago",
        "Data de Vencimento": "2026-01-15",
        "Data de Pagamento": "2026-01-10",
        "Nº Parcela": 1,
        "Total Parcelas": 1,
        "Notas": "Dízimo do mês de janeiro"
      },
      {
        "Descrição": "Aluguel do Salão",
        "Valor": 2000.00,
        "Tipo": "Despesa",
        "Status": "Pendente",
        "Data de Vencimento": "2026-01-20",
        "Data de Pagamento": "",
        "Nº Parcela": 1,
        "Total Parcelas": 1,
        "Notas": ""
      },
      {
        "Descrição": "Compra de Equipamentos de Som",
        "Valor": 500.00,
        "Tipo": "Despesa",
        "Status": "Pago",
        "Data de Vencimento": "2026-01-25",
        "Data de Pagamento": "2026-01-25",
        "Nº Parcela": 1,
        "Total Parcelas": 12,
        "Notas": "Parcela 1 de 12 - Caixa de som"
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 35 }, // Descrição
      { wch: 12 }, // Valor
      { wch: 10 }, // Tipo
      { wch: 12 }, // Status
      { wch: 18 }, // Data de Vencimento
      { wch: 18 }, // Data de Pagamento
      { wch: 12 }, // Nº Parcela
      { wch: 14 }, // Total Parcelas
      { wch: 40 }, // Notas
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Modelo de Importação");

    // Add instructions sheet
    const instructionsData = [
      { "Instruções para Importação": "" },
      { "Instruções para Importação": "1. Preencha os dados nas colunas correspondentes" },
      { "Instruções para Importação": "2. Mantenha os cabeçalhos exatamente como estão" },
      { "Instruções para Importação": "" },
      { "Instruções para Importação": "CAMPOS OBRIGATÓRIOS:" },
      { "Instruções para Importação": "- Descrição: Texto descritivo da transação" },
      { "Instruções para Importação": "- Valor: Número positivo (ex: 1500.00)" },
      { "Instruções para Importação": "- Tipo: 'Receita' ou 'Despesa'" },
      { "Instruções para Importação": "- Status: 'Pendente', 'Pago' ou 'Vencido'" },
      { "Instruções para Importação": "" },
      { "Instruções para Importação": "CAMPOS OPCIONAIS:" },
      { "Instruções para Importação": "- Data de Vencimento: Formato AAAA-MM-DD (ex: 2026-01-15)" },
      { "Instruções para Importação": "- Data de Pagamento: Formato AAAA-MM-DD (obrigatório se status = 'Pago')" },
      { "Instruções para Importação": "- Nº Parcela: Número da parcela atual (padrão: 1)" },
      { "Instruções para Importação": "- Total Parcelas: Total de parcelas (padrão: 1)" },
      { "Instruções para Importação": "- Notas: Observações adicionais" },
      { "Instruções para Importação": "" },
      { "Instruções para Importação": "DICAS:" },
      { "Instruções para Importação": "- Para compras parceladas, crie uma linha para cada parcela" },
      { "Instruções para Importação": "- A categoria e ministério são definidos durante a importação" },
    ];

    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instruções");

    XLSX.writeFile(wb, "modelo_importacao_igreja360.xlsx");
  } catch (error) {
    console.error("Error generating import template:", error);
    throw new Error("Não foi possível gerar o modelo de importação.");
  }
};