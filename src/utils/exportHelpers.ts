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