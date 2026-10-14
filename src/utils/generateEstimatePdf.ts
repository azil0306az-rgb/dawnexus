import { jsPDF } from 'jspdf';
import { CalculationResult } from '../types';

export function generateEstimatePdf(estimate: CalculationResult, customerName?: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Background Header
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Neon accent strip
  doc.setFillColor(199, 255, 77); // #C7FF4D
  doc.rect(0, 42, pageWidth, 2, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('DAWNEXUS', margin, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(165, 165, 165);
  doc.text('Digital Marketing & AI Creative Engineering', margin, 27);
  doc.text('https://dawnexus.in  •  hello@dawnexus.in', margin, 34);

  // Document Badge (Right aligned)
  doc.setFillColor(28, 28, 28);
  doc.roundedRect(pageWidth - margin - 60, 12, 60, 22, 2, 2, 'F');
  doc.setTextColor(199, 255, 77);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PROJECT ESTIMATE', pageWidth - margin - 55, 20);
  doc.setTextColor(220, 220, 220);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(estimate.referenceId, pageWidth - margin - 55, 28);

  let y = 56;

  // Metadata Card
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('DATE GENERATED', margin + 6, y + 8);
  doc.text('PRIMARY SERVICE', margin + 55, y + 8);
  doc.text('PREPARED FOR', margin + 115, y + 8);

  const formattedDate = new Date(estimate.calculatedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.text(formattedDate, margin + 6, y + 16);
  doc.text(estimate.websiteType.name, margin + 55, y + 16);
  doc.text(customerName && customerName.trim() ? customerName.trim() : 'Prospective Client', margin + 115, y + 16);

  y += 32;

  // Section Header: Project Specification
  doc.setFontSize(12);
  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Parameters & Specifications', margin, y);

  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, margin + contentWidth, y);
  y += 7;

  // Spec Grid (2 Columns)
  const leftColX = margin + 2;
  const rightColX = margin + contentWidth / 2 + 2;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  doc.text('Website Type:', leftColX, y);
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.text(estimate.websiteType.name, leftColX + 35, y);

  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Design Preference:', rightColX, y);
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.text(estimate.designTier.name, rightColX + 35, y);

  y += 6;

  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Page Volume:', leftColX, y);
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${estimate.pageCount} Pages (${estimate.includedPages} base + ${estimate.additionalPages} extra)`, leftColX + 35, y);

  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Estimated Delivery:', rightColX, y);
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${estimate.estimatedDeliveryWeeks.min}–${estimate.estimatedDeliveryWeeks.max} Business Weeks`, rightColX + 35, y);

  y += 12;

  // Itemized Cost Breakdown Table
  doc.setFontSize(12);
  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'bold');
  doc.text('Itemized Cost Breakdown', margin, y);

  y += 5;

  // Table Header
  doc.setFillColor(242, 242, 242);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.setFont('helvetica', 'bold');
  doc.text('SCOPE ITEM / DELIVERABLE', margin + 4, y + 5);
  doc.text('ESTIMATED AMOUNT (INR)', pageWidth - margin - 45, y + 5);

  y += 8;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  for (const item of estimate.items) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(9);
    doc.setTextColor(25, 25, 25);
    doc.text(item.label, margin + 4, y + 4);

    const priceText = `${estimate.currencySymbol}${item.amount.toLocaleString('en-IN')}`;
    doc.setFont('helvetica', 'bold');
    doc.text(priceText, pageWidth - margin - 4, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    if (item.description) {
      y += 5;
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      const lines = doc.splitTextToSize(item.description, contentWidth - 45);
      doc.text(lines, margin + 4, y + 3);
      y += lines.length * 3.5;
    } else {
      y += 6;
    }

    doc.setDrawColor(240, 240, 240);
    doc.line(margin, y + 1, margin + contentWidth, y + 1);
    y += 3;
  }

  y += 4;

  // One-time Total Card
  doc.setFillColor(15, 15, 15);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ESTIMATED ONE-TIME PROJECT INVESTMENT', margin + 6, y + 13);

  const totalText = estimate.isCustomQuoteRequired
    ? 'Custom Quote Required'
    : `${estimate.currencySymbol}${estimate.subtotalOneTime.toLocaleString('en-IN')}`;

  doc.setTextColor(199, 255, 77); // Neon highlight
  doc.setFontSize(14);
  doc.text(totalText, pageWidth - margin - 6, y + 13, { align: 'right' });

  y += 26;

  // Recurring Maintenance Plan (if selected)
  if (estimate.recurringMaintenance.amount > 0) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F');
    doc.setDrawColor(220, 230, 240);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'S');

    doc.setFontSize(8.5);
    doc.setTextColor(70, 80, 95);
    doc.setFont('helvetica', 'bold');
    doc.text(`OPTIONAL ONGOING MAINTENANCE: ${estimate.recurringMaintenance.name.toUpperCase()}`, margin + 5, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text('Uptime monitoring, regular security patches, automated backups & priority updates', margin + 5, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(
      `${estimate.currencySymbol}${estimate.recurringMaintenance.amount.toLocaleString('en-IN')} / ${estimate.recurringMaintenance.period}`,
      pageWidth - margin - 5,
      y + 10,
      { align: 'right' }
    );

    y += 22;
  }

  // Assumptions & Exclusions
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('KEY ASSUMPTIONS & CONDITIONS', margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 110);

  const bullets = [
    ...estimate.assumptions.slice(0, 2),
    ...estimate.exclusions.slice(0, 2)
  ];

  for (const b of bullets) {
    doc.text(`• ${b}`, margin + 2, y);
    y += 3.5;
  }

  // Footer Disclaimer
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, pageHeight - 16, margin + contentWidth, pageHeight - 16);
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text(
    'IMPORTANT NOTICE: This estimate is indicative based on selected parameters and does not constitute a binding legal contract. Dawnexus (https://dawnexus.in) confirms final quotes upon technical scoping.',
    margin,
    pageHeight - 11,
    { maxWidth: contentWidth }
  );

  // Trigger browser download
  const safeRef = estimate.referenceId.toLowerCase().replace(/[^a-z0-9-]/g, '');
  doc.save(`Dawnexus-Estimate-${safeRef}.pdf`);
}

