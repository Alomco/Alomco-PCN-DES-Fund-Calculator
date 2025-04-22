/**
 * Export PDF report with enhanced design for PCN DES Fund Calculator
 */
async function exportAsPdf({
    totalFundingSpan,
    monthlyFundingSpan,
    quarterlyFundingSpan,
    fundingComponentsTable,
    practiceBreakdownTable,
    fundingChart,
    pcnNameHidden,
    practiceListSizes
  }) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
  
        // Constants for layout
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 15;
        const contentWidth = pageWidth - 2 * margin;
        const lineHeight = 7;
        const smallLineHeight = 5;
        const fontRegular = 'Helvetica';
        const fontBold = 'Helvetica-Bold';
        const primaryColor = '#005eb8'; // NHS Blue
        const secondaryColor = '#003087'; // Darker Blue
        const accentColor = '#41b6e6'; // Light Blue
        const greyColor = '#666666';
  
        // Helper functions
        function addHeader(pageNumber) {
            doc.setFillColor(primaryColor);
            doc.rect(0, 0, pageWidth, 15, 'F');
            doc.setFont(fontRegular, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(255, 255, 255);
            doc.text(`PCN DES Fund Calculator 2025/26 - ${pcnNameHidden.value || 'Unnamed PCN'}`, margin, 10);
            doc.text(`Page ${pageNumber}`, pageWidth - margin - 10, 10, { align: 'right' });
        }
  
        function addFooter() {
            doc.setFillColor(secondaryColor);
            doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
            doc.setFont(fontRegular, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            doc.text(
                `Powered by www.pcnd.info | Alomco Ltd | Generated on ${new Date().toLocaleDateString('en-GB')}`,
                margin,
                pageHeight - 3
            );
        }
  
        function addSectionTitle(title, y) {
            doc.setFont(fontBold, 'normal');
            doc.setFontSize(16);
            doc.setTextColor(secondaryColor);
            doc.text(title, margin, y + 15);
            doc.setDrawColor(accentColor);
            doc.setLineWidth(0.5);
            doc.line(margin, y + 17, margin + contentWidth, y + 17);
            return y + 25;
        }
  
        function checkPageBreak(y, threshold = 70) {
            if (y > pageHeight - threshold) {
                doc.addPage();
                currentPage++;
                y = margin + 20; // Adjusted to account for header height
                addHeader(currentPage);
                addFooter();
            }
            return y;
        }
  
        // Cover Page
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setFont(fontBold, 'normal');
        doc.setFontSize(28);
        doc.setTextColor(primaryColor);
        doc.text('PCN DES Funding Report', pageWidth / 2, 80, { align: 'center' });
        doc.setFontSize(20);
        doc.text(pcnNameHidden.value || 'Unnamed PCN', pageWidth / 2, 100, { align: 'center' });
        doc.setFont(fontRegular, 'normal');
        doc.setFontSize(14);
        doc.text(`Fiscal Year 2025/26`, pageWidth / 2, 120, { align: 'center' });
        doc.text(`Generated on ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, 130, { align: 'center' });
        try {
            doc.addImage('/pcnd.info_logo.png', 'PNG', pageWidth / 2 - 15, pageHeight - 70, 30, 30, undefined, 'FAST');
        } catch (e) {
            console.warn('Failed to load logo (pcnd.info_logo.png):', e);
            doc.setFontSize(10);
            doc.setTextColor(greyColor);
            doc.text('[Logo: pcnd.info_logo.png]', pageWidth / 2, pageHeight - 55, { align: 'center' });
        }
        doc.setFontSize(12);
        doc.setTextColor(primaryColor);
        doc.text('Powered by www.pcnd.info', pageWidth / 2, pageHeight - 25, { align: 'center' });
        doc.setFontSize(8);
        doc.setTextColor(greyColor);
        doc.text('©Alomco Ltd | 2025 All Rights Reserved.', pageWidth / 2, pageHeight - 15, { align: 'center' });
  
        // Page 2: Population Table, Funding Totals
        doc.addPage();
        let currentPage = 2;
        let yPosition = margin;
        console.log(`Starting Page 2 on page ${currentPage}, yPosition: ${yPosition}`);
        addHeader(currentPage);
        addFooter();
        
        // Population Table
        yPosition = checkPageBreak(yPosition);
        console.log(`Starting Population Table, yPosition: ${yPosition}`);
        yPosition = addSectionTitle('PCN and Practice Population Data', yPosition);
        const listSizesData = practiceListSizes && practiceListSizes.length > 0
            ? practiceListSizes.map(item => [
                item.name,
                item.raw.toLocaleString(),
                item.adjusted.toLocaleString(),
              ])
            : [[
                'PCN Total',
                (parseFloat(rawListSizeInput.value) || 0).toLocaleString(),
                (parseFloat(adjustedListSizeInput.value) || 0).toLocaleString(),
                (parseFloat(weightedListSizeInput.value) || 0).toLocaleString()
              ]];
        console.log('listSizesData for Population Table:', listSizesData);
        doc.autoTable({
            startY: yPosition,
            head: [['Name', 'Raw List Size', 'Adjusted/Weighted Population']],
            body: listSizesData,
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                textColor: 255,
                fontSize: 10,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 9,
                textColor: greyColor
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            },
            margin: { left: margin, right: margin },
            styles: {
                cellPadding: 3,
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: contentWidth * 0.4 },
                1: { cellWidth: contentWidth * 0.2, halign: 'right' },
                2: { cellWidth: contentWidth * 0.2, halign: 'right' },
                3: { cellWidth: contentWidth * 0.2, halign: 'right' }
            }
        });
        yPosition = doc.lastAutoTable.finalY + 5;
        doc.setFontSize(8);
        doc.text('Data as of 1st January 2025', margin, yPosition, { maxWidth: contentWidth });
        if (listSizesData.length === 1) {
            yPosition += 5;
            doc.text('Note: No practice-level data available; showing PCN Total only.', margin, yPosition, { maxWidth: contentWidth });
        }
        yPosition += 10;
        console.log(`Population Table ended, yPosition: ${yPosition}`);
  
        // Funding Totals
        yPosition = checkPageBreak(yPosition);
        console.log(`Starting Funding Totals, yPosition: ${yPosition}`);
        doc.setFont(fontRegular, 'normal');
        doc.setTextColor(greyColor);
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition, contentWidth, 30, 'F');
        doc.setFont(fontBold, 'normal');
        doc.setFontSize(14);
        doc.setTextColor(secondaryColor);
        doc.text(`Total Annual Funding: ${totalFundingSpan.textContent}`, margin + 5, yPosition + 10);
        doc.setFont(fontRegular, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(greyColor);
        doc.text(`Monthly Payment: ${monthlyFundingSpan.textContent}`, margin + 5, yPosition + 18);
        doc.text(`Quarterly Payment: ${quarterlyFundingSpan.textContent}`, margin + 5, yPosition + 26);
        yPosition += 40;
        console.log(`Funding Totals ended, yPosition: ${yPosition}`);
  
        // Funding Components Table (Page 3)
        doc.addPage();
        currentPage++;
        yPosition = margin;
        console.log(`Starting Funding Components on page ${currentPage}, yPosition: ${yPosition}`);
        addHeader(currentPage);
        addFooter();
        yPosition = addSectionTitle('Funding Components', yPosition);
        const componentsData = [];
        Array.from(fundingComponentsTable.rows).forEach(row => {
            componentsData.push([
                row.cells[0].textContent,
                row.cells[1].textContent,
                row.cells[2].textContent
            ]);
        });
        doc.autoTable({
            startY: yPosition,
            head: [['Component', 'Amount', 'Calculation']],
            body: componentsData,
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                textColor: 255,
                fontSize: 10,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 9,
                textColor: greyColor
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            },
            margin: { left: margin, right: margin },
            styles: {
                cellPadding: 3,
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: contentWidth * 0.4 },
                1: { cellWidth: contentWidth * 0.2, halign: 'right' },
                2: { cellWidth: contentWidth * 0.4 }
            }
        });
        yPosition = doc.lastAutoTable.finalY + 10;
        console.log(`Funding Components ended, yPosition: ${yPosition}`);
  
        // Practice Breakdown Table (Page 4)
        yPosition = checkPageBreak(yPosition, 100);
        console.log(`Starting Practice Breakdown on page ${currentPage}, yPosition: ${yPosition}`);
        yPosition = addSectionTitle('Practice Breakdown', yPosition);
        const practiceData = [];
        Array.from(practiceBreakdownTable.rows).forEach(row => {
            const rowData = [];
            Array.from(row.cells).forEach(cell => rowData.push(cell.textContent));
            practiceData.push(rowData);
        });
        doc.autoTable({
            startY: yPosition,
            head: [Array.from(practiceBreakdownTable.closest('table').querySelector('thead tr').cells).map(cell => cell.textContent)],
            body: practiceData,
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                textColor: 255,
                fontSize: 10,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 9,
                textColor: greyColor
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            },
            margin: { left: margin, right: margin },
            styles: {
                cellPadding: 3,
                overflow: 'linebreak'
            }
        });
        yPosition = doc.lastAutoTable.finalY + 10;
        console.log(`Practice Breakdown ended, yPosition: ${yPosition}`);
  
        // Funding Chart (Page 5)
        yPosition = checkPageBreak(yPosition, 100);
        console.log(`Starting Funding Distribution on page ${currentPage}, yPosition: ${yPosition}`);
        yPosition = addSectionTitle('Funding Distribution', yPosition);
        try {
            const chartImg = fundingChart.toDataURL('image/png', 1.0);
            const imgWidth = contentWidth * 0.8;
            const imgHeight = imgWidth * (fundingChart.height / fundingChart.width);
            doc.addImage(chartImg, 'PNG', margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 10;
        } catch (error) {
            console.error('Error embedding chart:', error);
            doc.setFont(fontRegular, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(greyColor);
            doc.text('Chart unavailable in PDF export.', margin, yPosition);
            yPosition += 10;
        }
        console.log(`Funding Distribution ended, yPosition: ${yPosition}`);
  
        // Save the PDF
        doc.save(`PCN_Funding_Report_${pcnNameHidden.value || 'Unnamed'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error('PDF Export Error:', error);
        alert('Failed to generate PDF report. Please check the console for details.');
    }
  }
  
  window.exportAsPdf = exportAsPdf;
  
  /**
   * Export as CSV with comprehensive data matching PDF report
   */
  function exportAsCsv({
    totalFundingSpan,
    monthlyFundingSpan,
    quarterlyFundingSpan,
    fundingComponentsTable,
    practiceBreakdownTable,
    pcnNameHidden,
    practiceListSizes
  }) {
    try {
        let csvContent = 'data:text/csv;charset=utf-8,%EF%BB%BF'; // Add UTF-8 BOM
        
        // Helper function to clean and escape CSV values
        const escapeCsv = (value) => {
            let cleanedValue = String(value)
                .replace(/£/g, 'GBP') // Replace £ with GBP
                .replace(/×/g, 'x')   // Replace × with x
                .replace(/"/g, '""')  // Escape double quotes
                .replace(/\n/g, ' '); // Replace newlines with spaces
            return `"${cleanedValue}"`;
        };
  
        // Cover Page Information
        csvContent += 'PCN Funding Report\n';
        csvContent += `Title,${escapeCsv('PCN DES Funding Report')}\n`;
        csvContent += `PCN Name,${escapeCsv(pcnNameHidden.value || 'Unnamed PCN')}\n`;
        csvContent += `Fiscal Year,${escapeCsv('2025/26')}\n`;
        csvContent += `Generated,${escapeCsv(new Date().toLocaleDateString('en-GB'))}\n`;
        csvContent += `Powered by,${escapeCsv('www.pcnd.info')}\n`;
        csvContent += `Copyright,${escapeCsv('©Alomco Ltd 2025 All Rights Reserved.')}\n\n`;
  
        // Population Data
// Population Data
csvContent += 'PCN and Practice Population Data\n';
csvContent += 'Name,Raw List Size,Adjusted/Weighted Population\n';
const listSizesData = practiceListSizes.map(item => [
    item.name,
    item.raw.toLocaleString(),
    item.adjusted.toLocaleString()
]);
listSizesData.forEach(row => {
    csvContent += row.map(escapeCsv).join(',') + '\n';
});

        csvContent += `Note,${escapeCsv('Data as of 1st January 2025')}\n`;
        if (listSizesData.length === 1) {
            csvContent += `Additional Note,${escapeCsv('No practice-level data available; showing PCN Total only.')}\n`;
        }
        csvContent += '\n';
  
        // Funding Totals
        csvContent += 'Funding Totals\n';
        csvContent += `Total Annual Funding,${escapeCsv(totalFundingSpan.textContent)}\n`;
        csvContent += `Monthly Payment,${escapeCsv(monthlyFundingSpan.textContent)}\n`;
        csvContent += `Quarterly Payment,${escapeCsv(quarterlyFundingSpan.textContent)}\n\n`;
  
        // Funding Components
        csvContent += 'Funding Components\n';
        csvContent += 'Component,Amount,Calculation\n';
        const componentsData = Array.from(fundingComponentsTable.rows).map(row => [
            row.cells[0].textContent,
            row.cells[1].textContent,
            row.cells[2].textContent
        ]);
        componentsData.forEach(row => {
            csvContent += row.map(escapeCsv).join(',') + '\n';
        });
        csvContent += '\n';
  
        // Practice Breakdown
        csvContent += 'Practice Breakdown\n';
        const headers = Array.from(practiceBreakdownTable.closest('table').querySelector('thead tr').cells)
            .map(cell => cell.textContent);
        csvContent += headers.map(escapeCsv).join(',') + '\n';
        const practiceData = Array.from(practiceBreakdownTable.rows).map(row =>
            Array.from(row.cells).map(cell => cell.textContent)
        );
        practiceData.forEach(row => {
            csvContent += row.map(escapeCsv).join(',') + '\n';
        });
        csvContent += '\n';
  
        // Funding Components (Static Table)
        csvContent += 'Funding Components (Rates and Calculations)\n';
        csvContent += 'Component,Rate,Calculation\n';
        const fundingComponents = [
            ['Core PCN Funding', 'GBP2.999 per patient', 'GBP2.266 x raw list size + GBP0.733 x adjusted population'],
            ['Enhanced Access', 'GBP8.427 per patient', 'GBP8.427 x adjusted population'],
            ['Care Home Premium', 'GBP130.253 per bed', 'GBP130.253 x number of beds per year'],
            ['Capacity and Access', 'GBP3.208 per patient', 'GBP2.246 x adjusted population (CASP) + GBP0.962 x adjusted population (CAIP)'],
            ['ARRS Funding', 'GBP26.631 per patient', 'GBP26.631 x weighted population'],
            ['IIF Funding', 'GBP198 per point', 'GBP198 x points achieved (max 58)'],
            ['Participation Fund', 'GBP1.761 per patient', 'GBP1.761 x weighted population']
        ];
        fundingComponents.forEach(row => {
            csvContent += row.map(escapeCsv).join(',') + '\n';
        });
        csvContent += '\n';
  
        // Footer
        csvContent += 'Footer\n';
        csvContent += `Note,${escapeCsv('Powered by www.pcnd.info | Alomco Ltd | Generated on ' + new Date().toLocaleDateString('en-GB'))}\n`;
  
        // Generate and download the CSV
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `PCN_Funding_Report_${pcnNameHidden.value || 'Unnamed'}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('CSV Export Error:', error);
        alert('Failed to generate CSV report. Please check the console for details.');
    }
  }
  
  window.exportAsCsv = exportAsCsv;