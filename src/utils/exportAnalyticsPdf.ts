import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export interface ExportPdfKpis {
  totalRevenue: number;
  totalOrders: number;
  totalItemsSold: number;
  avgOrderValue: number;
}

export interface ExportPdfOptions {
  scope: 'all' | 'current';
  currentSection: 'all' | 'movement' | 'distribution' | 'trends' | 'cancellations';
  sectionLabel: string;
  timeRangeLabel: string;
  dateRangeText?: string;
  kpis: ExportPdfKpis;
  onProgress?: (message: string) => void;
}

interface ChartItemConfig {
  id: string;
  title: string;
  section: 'distribution' | 'movement' | 'trends' | 'cancellations';
}

const ALL_CHART_CONFIGS: ChartItemConfig[] = [
  { id: 'chart-card-category-share', title: 'Category Sales Share', section: 'distribution' },
  { id: 'chart-card-best-sellers', title: 'Best Sellers Distribution', section: 'distribution' },
  { id: 'chart-card-cancellation-reasons', title: 'Order Cancellation & Void Reasons', section: 'cancellations' },
  { id: 'chart-card-fast-moving', title: 'Fast Moving Items (High Velocity)', section: 'movement' },
  { id: 'chart-card-slow-moving', title: 'Slow Moving Items (Turnover Alert)', section: 'movement' },
  { id: 'chart-card-hourly-trend', title: 'Hourly Sales Velocity & Rush', section: 'trends' },
  { id: 'chart-card-top-products', title: 'Top Selling Products Leaderboard', section: 'trends' },
];

/**
 * Captures an HTML element as high-resolution canvas
 */
async function captureElementCanvas(elementId: string): Promise<{ canvas: HTMLCanvasElement; title: string } | null> {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`Element with ID #${elementId} not found in DOM.`);
    return null;
  }

  try {
    const canvas = await html2canvas(el, {
      scale: 2, // 2x Retina resolution for sharp text and charts
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    return { canvas, title: '' };
  } catch (err) {
    console.error(`Error capturing canvas for #${elementId}:`, err);
    return null;
  }
}

/**
 * Draws the standard page header on each page
 */
function drawPageHeader(
  pdf: jsPDF,
  pageWidth: number,
  margin: number,
  timeRangeLabel: string,
  formattedDate: string,
  pageSubtitle?: string
) {
  // Top Amber accent line
  pdf.setFillColor(245, 158, 11); // Amber 500
  pdf.rect(0, 0, pageWidth, 3.5, 'F');

  // Brand Name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(28, 25, 23); // stone-900
  pdf.text('Coffee at Yellow Hauz', margin, 11);

  // Subtitle / Report Info
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(120, 113, 108); // stone-500
  const subtitle = pageSubtitle
    ? `Sales & Analytics • ${pageSubtitle} • Range: ${timeRangeLabel}`
    : `Sales & Analytics Report • Range: ${timeRangeLabel}`;
  pdf.text(subtitle, margin, 16);

  // Generation timestamp on right
  pdf.setFontSize(7.5);
  pdf.setTextColor(168, 162, 158); // stone-400
  pdf.text(`Exported: ${formattedDate}`, pageWidth - margin, 16, { align: 'right' });

  // Divider line
  pdf.setDrawColor(231, 229, 228); // stone-200
  pdf.setLineWidth(0.3);
  pdf.line(margin, 18.5, pageWidth - margin, 18.5);
}

/**
 * Draws the KPI summary cards on Page 1
 */
function drawKpiSummary(
  pdf: jsPDF,
  kpis: ExportPdfKpis,
  startX: number,
  startY: number,
  contentWidth: number
): number {
  const cardGap = 3;
  const numCards = 4;
  const cardWidth = (contentWidth - cardGap * (numCards - 1)) / numCards;
  const cardHeight = 16.5;

  const items = [
    {
      label: 'GROSS REVENUE',
      value: `PHP ${kpis.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      isPrimary: true,
    },
    {
      label: 'COMPLETED ORDERS',
      value: `${kpis.totalOrders.toLocaleString('en-US')}`,
      isPrimary: false,
    },
    {
      label: 'TOTAL UNITS SOLD',
      value: `${kpis.totalItemsSold.toLocaleString('en-US')} items`,
      isPrimary: false,
    },
    {
      label: 'AVG ORDER VALUE',
      value: `PHP ${kpis.avgOrderValue.toFixed(2)}`,
      isPrimary: false,
    },
  ];

  items.forEach((item, index) => {
    const cardX = startX + index * (cardWidth + cardGap);

    // Card background & border
    pdf.setFillColor(250, 250, 249); // stone-50
    pdf.setDrawColor(231, 229, 228); // stone-200
    pdf.setLineWidth(0.3);
    pdf.roundedRect(cardX, startY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Label
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(120, 113, 108); // stone-500
    pdf.text(item.label, cardX + 3, startY + 5);

    // Value
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(item.isPrimary ? 10 : 9);
    if (item.isPrimary) {
      pdf.setTextColor(180, 83, 9); // amber-700
    } else {
      pdf.setTextColor(28, 25, 23); // stone-900
    }
    pdf.text(item.value, cardX + 3, startY + 12);
  });

  return startY + cardHeight + 4;
}

/**
 * Main export function
 */
export async function exportAnalyticsToPdf(options: ExportPdfOptions): Promise<boolean> {
  const { scope, currentSection, timeRangeLabel, kpis, onProgress } = options;

  onProgress?.('Preparing charts for export...');

  // Determine which charts to capture
  const targetCharts: ChartItemConfig[] =
    scope === 'all'
      ? ALL_CHART_CONFIGS
      : ALL_CHART_CONFIGS.filter(
          (c) => currentSection === 'all' || c.section === currentSection
        );

  if (targetCharts.length === 0) {
    throw new Error('No charts selected for export.');
  }

  // Allow DOM to settle before capturing
  await new Promise((resolve) => setTimeout(resolve, 250));

  // Capture each chart element into canvas
  const capturedCanvases: { canvas: HTMLCanvasElement; config: ChartItemConfig }[] = [];

  for (let i = 0; i < targetCharts.length; i++) {
    const chartConfig = targetCharts[i];
    onProgress?.(`Capturing chart ${i + 1} of ${targetCharts.length}: ${chartConfig.title}...`);
    const result = await captureElementCanvas(chartConfig.id);
    if (result) {
      capturedCanvases.push({ canvas: result.canvas, config: chartConfig });
    }
  }

  if (capturedCanvases.length === 0) {
    throw new Error('Could not capture any chart graphics. Please make sure charts are visible.');
  }

  onProgress?.('Generating PDF document...');

  // Initialize PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm
  const bottomFooterY = pageHeight - 8;

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Section grouping mapping
  const sectionHeaders: Record<string, string> = {
    distribution: 'Category Sales & Best Sellers Distribution',
    movement: 'Product Movement & Inventory Velocity',
    trends: 'Hourly Sales Velocity & Performance Leaderboard',
  };

  // Group captured charts by section or pairs (up to 2 charts per page)
  const pagesData: {
    subtitle: string;
    showKpi: boolean;
    charts: { canvas: HTMLCanvasElement; config: ChartItemConfig }[];
  }[] = [];

  if (scope === 'all') {
    // Page 1: Distribution (Category share & best sellers) + KPI Summary
    const distCharts = capturedCanvases.filter((c) => c.config.section === 'distribution');
    if (distCharts.length > 0) {
      pagesData.push({
        subtitle: sectionHeaders.distribution,
        showKpi: true,
        charts: distCharts,
      });
    }

    // Page 2: Movement (Fast & Slow moving items)
    const moveCharts = capturedCanvases.filter((c) => c.config.section === 'movement');
    if (moveCharts.length > 0) {
      pagesData.push({
        subtitle: sectionHeaders.movement,
        showKpi: pagesData.length === 0, // only show if page 1 didn't exist
        charts: moveCharts,
      });
    }

    // Page 3: Trends (Hourly rush & Top products)
    const trendCharts = capturedCanvases.filter((c) => c.config.section === 'trends');
    if (trendCharts.length > 0) {
      pagesData.push({
        subtitle: sectionHeaders.trends,
        showKpi: pagesData.length === 0,
        charts: trendCharts,
      });
    }
  } else {
    // Current view: chunk into 2 charts per page
    for (let i = 0; i < capturedCanvases.length; i += 2) {
      const slice = capturedCanvases.slice(i, i + 2);
      pagesData.push({
        subtitle: sectionHeaders[currentSection] || options.sectionLabel,
        showKpi: i === 0,
        charts: slice,
      });
    }
  }

  // Fallback if pagesData ended up empty
  if (pagesData.length === 0) {
    pagesData.push({
      subtitle: options.sectionLabel,
      showKpi: true,
      charts: capturedCanvases,
    });
  }

  const totalPages = pagesData.length;

  // Build each page
  pagesData.forEach((page, pageIndex) => {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    // Draw header
    drawPageHeader(pdf, pageWidth, margin, timeRangeLabel, formattedDate, page.subtitle);

    let currentY = 22;

    // Draw KPI Summary on Page 1
    if (page.showKpi) {
      currentY = drawKpiSummary(pdf, kpis, margin, currentY, contentWidth);
    }

    // Available vertical space for charts on this page
    const availableHeight = bottomFooterY - 4 - currentY;
    const chartCount = page.charts.length;
    const gapBetweenCharts = 4;
    const maxChartHeight = (availableHeight - gapBetweenCharts * (chartCount - 1)) / chartCount;

    // Add charts
    page.charts.forEach(({ canvas }) => {
      const aspect = canvas.width / canvas.height;
      let renderW = contentWidth;
      let renderH = contentWidth / aspect;

      if (renderH > maxChartHeight) {
        renderH = maxChartHeight;
        renderW = renderH * aspect;
      }

      // Center horizontally
      const renderX = margin + (contentWidth - renderW) / 2;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', renderX, currentY, renderW, renderH, undefined, 'FAST');

      currentY += renderH + gapBetweenCharts;
    });

    // Draw Page Footer
    pdf.setDrawColor(245, 245, 244); // stone-100
    pdf.setLineWidth(0.2);
    pdf.line(margin, bottomFooterY - 3, pageWidth - margin, bottomFooterY - 3);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(168, 162, 158); // stone-400
    pdf.text(
      'Coffee at Yellow Hauz • Management Analytics & Sales Report',
      margin,
      bottomFooterY
    );
    pdf.text(
      `Page ${pageIndex + 1} of ${totalPages}`,
      pageWidth - margin,
      bottomFooterY,
      { align: 'right' }
    );
  });

  onProgress?.('Saving PDF report...');

  // Download PDF file
  const safeTimeRange = timeRangeLabel.replace(/\s+/g, '-').toLowerCase();
  const fileDateStr = now.toISOString().split('T')[0];
  const fileName = `YellowHauz-Analytics-${safeTimeRange}-${fileDateStr}.pdf`;

  pdf.save(fileName);

  return true;
}
