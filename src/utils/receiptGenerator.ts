import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Contribution } from '@/hooks/useContributions';

interface ReceiptData {
  contribution: Contribution;
  churchName: string;
  churchCnpj?: string;
  churchAddress?: string;
  memberName: string;
}

export function generateContributionReceipt(data: ReceiptData): void {
  const { contribution, churchName, churchCnpj, churchAddress, memberName } = data;
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(churchName.toUpperCase(), pageWidth / 2, 25, { align: 'center' });
  
  if (churchCnpj) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`CNPJ: ${churchCnpj}`, pageWidth / 2, 32, { align: 'center' });
  }

  if (churchAddress) {
    doc.setFontSize(10);
    doc.text(churchAddress, pageWidth / 2, 38, { align: 'center' });
  }

  // Divider
  doc.setLineWidth(0.5);
  doc.line(margin, 45, pageWidth - margin, 45);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE CONTRIBUIÇÃO', pageWidth / 2, 55, { align: 'center' });

  // Receipt number
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº ${contribution.receipt_number}`, pageWidth / 2, 63, { align: 'center' });

  // Content box
  const boxY = 75;
  const boxHeight = 80;
  doc.setLineWidth(0.3);
  doc.rect(margin, boxY, pageWidth - (margin * 2), boxHeight);

  // Content
  let y = boxY + 12;
  const leftCol = margin + 5;
  const rightCol = pageWidth / 2;

  doc.setFontSize(11);
  
  // Member name
  doc.setFont('helvetica', 'bold');
  doc.text('Recebemos de:', leftCol, y);
  doc.setFont('helvetica', 'normal');
  doc.text(memberName || 'Anônimo', leftCol + 45, y);

  y += 12;
  
  // Amount
  const amount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(contribution.amount));
  
  doc.setFont('helvetica', 'bold');
  doc.text('A importância de:', leftCol, y);
  doc.setFont('helvetica', 'normal');
  doc.text(amount, leftCol + 50, y);

  y += 12;

  // Type
  const typeLabels: Record<string, string> = {
    dizimo: 'Dízimo',
    oferta: 'Oferta',
    campanha: 'Campanha',
    voto: 'Voto',
    outro: 'Outro',
  };
  doc.setFont('helvetica', 'bold');
  doc.text('Referente a:', leftCol, y);
  doc.setFont('helvetica', 'normal');
  doc.text(typeLabels[contribution.contribution_type] || contribution.contribution_type, leftCol + 38, y);

  if (contribution.campaign_name) {
    doc.text(` - ${contribution.campaign_name}`, leftCol + 55, y);
  }

  y += 12;

  // Date
  doc.setFont('helvetica', 'bold');
  doc.text('Data:', leftCol, y);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(contribution.contribution_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }), leftCol + 17, y);

  // Notes
  if (contribution.notes) {
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', leftCol, y);
    doc.setFont('helvetica', 'normal');
    doc.text(contribution.notes.substring(0, 60), leftCol + 38, y);
  }

  // Footer section
  const signatureY = boxY + boxHeight + 30;
  
  // Signature line
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 50, signatureY, pageWidth / 2 + 50, signatureY);
  
  doc.setFontSize(10);
  doc.text('Tesoureiro(a) / Responsável', pageWidth / 2, signatureY + 6, { align: 'center' });

  // Date footer
  const footerY = signatureY + 25;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Emitido em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Legal notice
  doc.setFontSize(8);
  doc.text(
    'Este recibo é válido como comprovante de contribuição para fins de declaração do Imposto de Renda.',
    pageWidth / 2,
    footerY + 8,
    { align: 'center' }
  );

  // Save
  doc.save(`recibo-${contribution.receipt_number}.pdf`);
}

export function generateAnnualReport(
  contributions: Contribution[],
  memberName: string,
  churchName: string,
  churchCnpj?: string,
  year?: number
): void {
  const targetYear = year || new Date().getFullYear();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(churchName.toUpperCase(), pageWidth / 2, 25, { align: 'center' });
  
  if (churchCnpj) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`CNPJ: ${churchCnpj}`, pageWidth / 2, 32, { align: 'center' });
  }

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`DECLARAÇÃO DE CONTRIBUIÇÕES - ${targetYear}`, pageWidth / 2, 45, { align: 'center' });

  // Member info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Contribuinte: ${memberName}`, margin, 60);

  // Table data
  const tableData = contributions.map(c => [
    format(new Date(c.contribution_date), 'dd/MM/yyyy'),
    c.receipt_number || '-',
    c.contribution_type === 'dizimo' ? 'Dízimo' :
    c.contribution_type === 'oferta' ? 'Oferta' :
    c.contribution_type === 'campanha' ? 'Campanha' :
    c.contribution_type === 'voto' ? 'Voto' : 'Outro',
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.amount)),
  ]);

  // Total
  const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
  tableData.push([
    '',
    '',
    'TOTAL',
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total),
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['Data', 'Nº Recibo', 'Tipo', 'Valor']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
    footStyles: { fontStyle: 'bold' },
    margin: { left: margin, right: margin },
  });

  // Legal text
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Declaramos que as contribuições acima descritas foram realizadas de forma espontânea',
    pageWidth / 2,
    finalY + 15,
    { align: 'center' }
  );
  doc.text(
    'e estão de acordo com os registros desta instituição religiosa.',
    pageWidth / 2,
    finalY + 20,
    { align: 'center' }
  );

  // Signature
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 50, finalY + 45, pageWidth / 2 + 50, finalY + 45);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Responsável Legal', pageWidth / 2, finalY + 52, { align: 'center' });

  // Date
  doc.text(
    format(new Date(), "'Emitido em' dd/MM/yyyy", { locale: ptBR }),
    pageWidth / 2,
    finalY + 65,
    { align: 'center' }
  );

  doc.save(`contribuicoes-${memberName.replace(/\s+/g, '-').toLowerCase()}-${targetYear}.pdf`);
}
