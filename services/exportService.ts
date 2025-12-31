import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from 'docx';
import saveAs from 'file-saver';
import { Training, Response } from '../types';
import { getResponses } from './storageService';

// Utility untuk memproses data mentah menjadi statistik untuk ekspor
const processDataForExport = (training: Training, responses: Response[]) => {
  const result: any = {
    facilitators: {},
    process: {
      responses: [],
      averages: {},
      comments: {}
    }
  };

  // Group Facilitators
  responses.filter(r => r.type === 'facilitator').forEach(r => {
    const name = r.targetName || 'Unknown';
    if (!result.facilitators[name]) {
      result.facilitators[name] = {
        responses: [],
        averages: {},
        comments: {},
        subject: r.targetSubject
      };
    }
    result.facilitators[name].responses.push(r);
  });

  // Calculate averages for each facilitator
  Object.keys(result.facilitators).forEach(name => {
    const data = result.facilitators[name];
    training.facilitatorQuestions.forEach(q => {
      if (q.type === 'text') {
        data.comments[q.id] = data.responses.map((r: any) => r.answers[q.id]).filter((a: any) => a && a.trim() !== '');
      } else {
        const scores = data.responses.map((r: any) => r.answers[q.id]).filter((v: any) => typeof v === 'number');
        const avg = scores.length ? scores.reduce((a: any, b: any) => a + b, 0) / scores.length : 0;
        data.averages[q.id] = avg.toFixed(2);
      }
    });
  });

  // Process Penyelenggaraan
  const procResponses = responses.filter(r => r.type === 'process');
  result.process.responses = procResponses;
  training.processQuestions.forEach(q => {
    if (q.type === 'text') {
      result.process.comments[q.id] = procResponses.map((r: any) => r.answers[q.id]).filter((a: any) => a && a.trim() !== '');
    } else {
      const scores = procResponses.map((r: any) => r.answers[q.id]).filter((v: any) => typeof v === 'number');
      const avg = scores.length ? scores.reduce((a: any, b: any) => a + b, 0) / scores.length : 0;
      result.process.averages[q.id] = avg.toFixed(2);
    }
  });

  return result;
};

export const exportToPDF = (training: Training) => {
  const responses = getResponses(training.id);
  const data = processDataForExport(training, responses);
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleDateString('id-ID');

  doc.setFontSize(18);
  doc.text('Laporan Rekapitulasi Evaluasi Pelatihan', 14, 20);
  doc.setFontSize(12);
  doc.text(`Judul: ${training.title}`, 14, 28);
  doc.text(`Periode: ${training.startDate} s/d ${training.endDate}`, 14, 34);
  doc.text(`Dicetak pada: ${timestamp}`, 14, 40);

  let y = 50;

  // A. Fasilitator
  doc.setFontSize(14);
  doc.text('A. Evaluasi Fasilitator', 14, y);
  y += 7;

  Object.entries(data.facilitators).forEach(([name, fData]: [string, any]) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.text(`Fasilitator: ${name} (${fData.subject || ''})`, 14, y);
    y += 5;

    const tableRows = training.facilitatorQuestions
      .filter(q => q.type !== 'text')
      .map(q => [q.label, fData.averages[q.id] || '0.00']);

    autoTable(doc, {
      startY: y,
      head: [['Variabel Penilaian', 'Rata-rata Nilai']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
  });

  // B. Penyelenggaraan
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFontSize(14);
  doc.text('B. Evaluasi Penyelenggaraan', 14, y);
  y += 7;

  const procRows = training.processQuestions
    .filter(q => q.type !== 'text')
    .map(q => [q.label, data.process.averages[q.id] || '0.00']);

  autoTable(doc, {
    startY: y,
    head: [['Variabel Penilaian', 'Rata-rata Nilai']],
    body: procRows,
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] }
  });

  doc.save(`Laporan_SIMEP_${training.title.replace(/\s+/g, '_')}.pdf`);
};

export const exportToExcel = (training: Training) => {
  const responses = getResponses(training.id);
  const data = processDataForExport(training, responses);
  const wb = XLSX.utils.book_new();

  // Fasilitator Sheet
  const facData = [['Fasilitator', 'Materi', ...training.facilitatorQuestions.map(q => q.label)]];
  Object.entries(data.facilitators).forEach(([name, fData]: [string, any]) => {
    const row = [name, fData.subject || ''];
    training.facilitatorQuestions.forEach(q => {
      row.push(fData.averages[q.id] || '0');
    });
    facData.push(row);
  });
  const facWs = XLSX.utils.aoa_to_sheet(facData);
  XLSX.utils.book_append_sheet(wb, facWs, 'Fasilitator');

  // Penyelenggaraan Sheet
  const procData = [['Variabel Penyelenggaraan', 'Rata-rata']];
  training.processQuestions.forEach(q => {
    procData.push([q.label, data.process.averages[q.id] || '0']);
  });
  const procWs = XLSX.utils.aoa_to_sheet(procData);
  XLSX.utils.book_append_sheet(wb, procWs, 'Penyelenggaraan');

  XLSX.writeFile(wb, `Laporan_SIMEP_${training.title.replace(/\s+/g, '_')}.xlsx`);
};

export const exportToWord = async (training: Training) => {
  const responses = getResponses(training.id);
  const data = processDataForExport(training, responses);

  const sections: any[] = [];

  // Title
  sections.push(new Paragraph({
    text: "Laporan Rekapitulasi Evaluasi Pelatihan",
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
  }));

  sections.push(new Paragraph({
    children: [
      new TextRun({ text: `Judul Pelatihan: ${training.title}`, bold: true }),
      new TextRun({ text: `\nPeriode: ${training.startDate} - ${training.endDate}`, break: 1 }),
      new TextRun({ text: `\nJumlah Responden: ${responses.length}`, break: 1 }),
    ],
    spacing: { after: 400 },
  }));

  // Facilitators
  sections.push(new Paragraph({ text: "A. Evaluasi Fasilitator", heading: HeadingLevel.HEADING_2 }));
  
  Object.entries(data.facilitators).forEach(([name, fData]: [string, any]) => {
    sections.push(new Paragraph({ text: `Fasilitator: ${name}`, bold: true, spacing: { before: 200 } }));
    
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: "Variabel", bold: true })], width: { size: 70, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: "Nilai", bold: true })], width: { size: 30, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ];

    training.facilitatorQuestions.filter(q => q.type !== 'text').forEach(q => {
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(q.label)] }),
          new TableCell({ children: [new Paragraph(fData.averages[q.id] || "0.00")] }),
        ],
      }));
    });

    sections.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows,
    }));
  });

  const doc = new Document({
    sections: [{ children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Laporan_SIMEP_${training.title.replace(/\s+/g, '_')}.docx`);
};