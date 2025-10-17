import * as XLSX from "xlsx";

export async function readSpreadsheet(
  file: File
): Promise<{ headers: string[]; rows: any[][] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!jsonData || jsonData.length === 0) {
          reject(new Error("Arquivo vazio ou inválido"));
          return;
        }

        const headers = (jsonData[0] as any[]).map((h) => String(h || "").trim());
        const rows = jsonData.slice(1) as any[][];

        resolve({ headers, rows });
      } catch (error) {
        reject(new Error("Erro ao ler o arquivo. Verifique se é um arquivo Excel ou CSV válido."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler o arquivo"));
    };

    reader.readAsBinaryString(file);
  });
}

export function parseAmount(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  // Se já for número
  if (typeof value === "number") return value;

  // Converter para string e limpar
  let cleanValue = String(value)
    .trim()
    .replace(/[R$\s]/g, "")
    .replace(/\./g, ""); // Remove pontos de milhar

  // Substituir vírgula por ponto decimal
  cleanValue = cleanValue.replace(",", ".");

  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? null : parsed;
}

export function parseDate(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;

  // Se for número (Excel serial date)
  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split("T")[0];
  }

  // Se for string
  if (typeof value === "string") {
    const dateString = value.trim();

    // Tentar formato DD/MM/YYYY
    const ddmmyyyyMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }

    // Tentar formato DD-MM-YYYY
    const ddmmyyyyDashMatch = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyyDashMatch) {
      const [, day, month, year] = ddmmyyyyDashMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }

    // Tentar formato ISO
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate.toISOString().split("T")[0];
    }
  }

  return null;
}

export function normalizeType(value: any): "Receita" | "Despesa" | null {
  if (!value) return null;

  const normalized = String(value).toLowerCase().trim();

  if (
    normalized.includes("receita") ||
    normalized.includes("entrada") ||
    normalized.includes("crédito") ||
    normalized.includes("credito") ||
    normalized.includes("recebimento")
  ) {
    return "Receita";
  }

  if (
    normalized.includes("despesa") ||
    normalized.includes("saída") ||
    normalized.includes("saida") ||
    normalized.includes("débito") ||
    normalized.includes("debito") ||
    normalized.includes("pagamento")
  ) {
    return "Despesa";
  }

  return null;
}

export function normalizeStatus(value: any): "Pendente" | "Pago" | "Vencido" | null {
  if (!value) return null;

  const normalized = String(value).toLowerCase().trim();

  if (normalized.includes("pago") || normalized.includes("paga")) {
    return "Pago";
  }

  if (normalized.includes("pendente") || normalized.includes("aberto")) {
    return "Pendente";
  }

  if (normalized.includes("vencido") || normalized.includes("atrasado")) {
    return "Vencido";
  }

  return null;
}
