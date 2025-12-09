import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
}

interface CashFlowItem {
  date: string;
  description: string;
  type: string;
  amount: number;
  balance: number;
}

interface ExpenseCategory {
  category: string;
  total: number;
  color: string;
}

interface RevenueMinistry {
  ministry: string;
  total: number;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const addHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  doc.setFillColor(37, 99, 235); // Primary blue
  doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 20);
  
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 20, 32);
  }
  
  doc.setTextColor(0, 0, 0);
};

const addFooter = (doc: jsPDF) => {
  const pageCount = doc.internal.pages.length - 1;
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')}`,
      20,
      doc.internal.pageSize.height - 10
    );
  }
};

export const exportFinancialSummaryPDF = (
  summary: FinancialSummary,
  dateRange: { start: string; end: string }
) => {
  const doc = new jsPDF();
  
  addHeader(doc, 'Resumo Financeiro', `Período: ${dateRange.start} a ${dateRange.end}`);
  
  const startY = 55;
  
  // Summary cards
  const cardWidth = 55;
  const cardHeight = 35;
  const cardGap = 10;
  const startX = 20;
  
  // Revenue card
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(startX, startY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(10);
  doc.text('Receitas', startX + 5, startY + 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(summary.totalRevenue), startX + 5, startY + 26);
  
  // Expenses card
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(startX + cardWidth + cardGap, startY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Despesas', startX + cardWidth + cardGap + 5, startY + 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(summary.totalExpenses), startX + cardWidth + cardGap + 5, startY + 26);
  
  // Balance card
  const balanceColor = summary.balance >= 0 ? [220, 252, 231] : [254, 226, 226];
  const textColor = summary.balance >= 0 ? [22, 163, 74] : [220, 38, 38];
  doc.setFillColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.roundedRect(startX + (cardWidth + cardGap) * 2, startY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Saldo', startX + (cardWidth + cardGap) * 2 + 5, startY + 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(summary.balance), startX + (cardWidth + cardGap) * 2 + 5, startY + 26);
  
  addFooter(doc);
  doc.save(`resumo-financeiro-${dateRange.start}-${dateRange.end}.pdf`);
};

export const exportCashFlowPDF = (
  cashFlow: CashFlowItem[],
  dateRange: { start: string; end: string }
) => {
  const doc = new jsPDF();
  
  addHeader(doc, 'Fluxo de Caixa', `Período: ${dateRange.start} a ${dateRange.end}`);
  
  autoTable(doc, {
    startY: 50,
    head: [['Data', 'Descrição', 'Tipo', 'Valor', 'Saldo']],
    body: cashFlow.map(item => [
      item.date,
      item.description,
      item.type === 'receita' ? 'Receita' : 'Despesa',
      formatCurrency(item.amount),
      formatCurrency(item.balance),
    ]),
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 60 },
      2: { cellWidth: 25 },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
  });
  
  addFooter(doc);
  doc.save(`fluxo-caixa-${dateRange.start}-${dateRange.end}.pdf`);
};

export const exportExpensesByCategoryPDF = (
  expenses: ExpenseCategory[],
  dateRange: { start: string; end: string }
) => {
  const doc = new jsPDF();
  
  addHeader(doc, 'Despesas por Categoria', `Período: ${dateRange.start} a ${dateRange.end}`);
  
  const total = expenses.reduce((sum, e) => sum + e.total, 0);
  
  autoTable(doc, {
    startY: 50,
    head: [['Categoria', 'Valor', '% do Total']],
    body: expenses.map(item => [
      item.category,
      formatCurrency(item.total),
      `${((item.total / total) * 100).toFixed(1)}%`,
    ]),
    foot: [['Total', formatCurrency(total), '100%']],
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 50, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
    },
  });
  
  addFooter(doc);
  doc.save(`despesas-categoria-${dateRange.start}-${dateRange.end}.pdf`);
};

export const exportRevenueByMinistryPDF = (
  revenue: RevenueMinistry[],
  dateRange: { start: string; end: string }
) => {
  const doc = new jsPDF();
  
  addHeader(doc, 'Receitas por Ministério', `Período: ${dateRange.start} a ${dateRange.end}`);
  
  const total = revenue.reduce((sum, r) => sum + r.total, 0);
  
  autoTable(doc, {
    startY: 50,
    head: [['Ministério', 'Valor', '% do Total']],
    body: revenue.map(item => [
      item.ministry,
      formatCurrency(item.total),
      `${((item.total / total) * 100).toFixed(1)}%`,
    ]),
    foot: [['Total', formatCurrency(total), '100%']],
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 50, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
    },
  });
  
  addFooter(doc);
  doc.save(`receitas-ministerio-${dateRange.start}-${dateRange.end}.pdf`);
};

export const exportFullReportPDF = (
  summary: FinancialSummary,
  cashFlow: CashFlowItem[],
  expenses: ExpenseCategory[],
  revenue: RevenueMinistry[],
  dateRange: { start: string; end: string }
) => {
  const doc = new jsPDF();
  
  // Page 1: Summary
  addHeader(doc, 'Relatório Financeiro Completo', `Período: ${dateRange.start} a ${dateRange.end}`);
  
  const startY = 55;
  const cardWidth = 55;
  const cardHeight = 35;
  const cardGap = 10;
  const startX = 20;
  
  // Summary cards
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(startX, startY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(10);
  doc.text('Receitas', startX + 5, startY + 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(summary.totalRevenue), startX + 5, startY + 26);
  
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(startX + cardWidth + cardGap, startY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Despesas', startX + cardWidth + cardGap + 5, startY + 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(summary.totalExpenses), startX + cardWidth + cardGap + 5, startY + 26);
  
  const balanceColor = summary.balance >= 0 ? [220, 252, 231] : [254, 226, 226];
  const textColor = summary.balance >= 0 ? [22, 163, 74] : [220, 38, 38];
  doc.setFillColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.roundedRect(startX + (cardWidth + cardGap) * 2, startY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Saldo', startX + (cardWidth + cardGap) * 2 + 5, startY + 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(summary.balance), startX + (cardWidth + cardGap) * 2 + 5, startY + 26);
  
  // Expenses by category
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Despesas por Categoria', 20, 110);
  
  const expenseTotal = expenses.reduce((sum, e) => sum + e.total, 0);
  autoTable(doc, {
    startY: 115,
    head: [['Categoria', 'Valor', '%']],
    body: expenses.slice(0, 5).map(item => [
      item.category,
      formatCurrency(item.total),
      `${((item.total / expenseTotal) * 100).toFixed(1)}%`,
    ]),
    headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
    },
  });
  
  // Revenue by ministry
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Receitas por Ministério', 20, 180);
  
  const revenueTotal = revenue.reduce((sum, r) => sum + r.total, 0);
  autoTable(doc, {
    startY: 185,
    head: [['Ministério', 'Valor', '%']],
    body: revenue.slice(0, 5).map(item => [
      item.ministry,
      formatCurrency(item.total),
      `${((item.total / revenueTotal) * 100).toFixed(1)}%`,
    ]),
    headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
    },
  });
  
  // Page 2: Cash Flow
  doc.addPage();
  addHeader(doc, 'Fluxo de Caixa', `Período: ${dateRange.start} a ${dateRange.end}`);
  
  autoTable(doc, {
    startY: 50,
    head: [['Data', 'Descrição', 'Tipo', 'Valor', 'Saldo']],
    body: cashFlow.map(item => [
      item.date,
      item.description.substring(0, 30),
      item.type === 'receita' ? 'Receita' : 'Despesa',
      formatCurrency(item.amount),
      formatCurrency(item.balance),
    ]),
    headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  });
  
  addFooter(doc);
  doc.save(`relatorio-completo-${dateRange.start}-${dateRange.end}.pdf`);
};
