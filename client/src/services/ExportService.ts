import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export interface ProjectDossierData {
  title: string;
  synopsis?: string;
  directorProposal?: string;
  script?: string;
  characters?: Array<{ name: string; description: string; imageUrl?: string }>;
  sets?: Array<{ name: string; description: string; imageUrl?: string }>;
  storyboard?: Array<{ shotNumber: number; imageUrl?: string; visualDescription?: string }>;
}

export class ExportService {
  static async exportToPDF(data: ProjectDossierData) {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let yPos = margin;

    // Helper to add a new page if needed
    const checkNewPage = (neededHeight: number) => {
      if (yPos + neededHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // --- COVER PAGE ---
    doc.setFillColor(10, 10, 15);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(40);
    doc.setFont("helvetica", "bold");
    doc.text(data.title.toUpperCase(), pageWidth / 2, pageHeight / 3, { align: "center" });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("PROJECT DOSSIER", pageWidth / 2, pageHeight / 3 + 15, { align: "center" });
    
    doc.setDrawColor(59, 130, 246); // Primary color
    doc.setLineWidth(1);
    doc.line(pageWidth / 2 - 20, pageHeight / 3 + 25, pageWidth / 2 + 20, pageHeight / 3 + 25);

    // --- SYNOPSIS ---
    if (data.synopsis) {
      doc.addPage();
      yPos = margin;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("SYNOPSIS", margin, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(data.synopsis, contentWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 6 + 10;
    }

    // --- DIRECTOR PROPOSAL ---
    if (data.directorProposal) {
      checkNewPage(40);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("DIRECTOR'S PROPOSAL", margin, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(data.directorProposal, contentWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 6 + 10;
    }

    // --- CHARACTERS ---
    if (data.characters && data.characters.length > 0) {
      doc.addPage();
      yPos = margin;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("CHARACTERS", margin, yPos);
      yPos += 15;

      for (const char of data.characters) {
        checkNewPage(40);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(char.name, margin, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(char.description, contentWidth);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 5 + 10;
      }
    }

    // --- SETS ---
    if (data.sets && data.sets.length > 0) {
      checkNewPage(40);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("SETS & LOCATIONS", margin, yPos);
      yPos += 15;

      for (const set of data.sets) {
        checkNewPage(40);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(set.name, margin, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(set.description, contentWidth);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 5 + 10;
      }
    }

    // --- SCRIPT ---
    if (data.script) {
      doc.addPage();
      yPos = margin;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("SCREENPLAY", margin, yPos);
      yPos += 15;
      
      doc.setFont("courier", "normal");
      doc.setFontSize(12);
      const scriptLines = doc.splitTextToSize(data.script, contentWidth - 20);
      
      // Courier font often needs more space, so we paginate manually
      for (let i = 0; i < scriptLines.length; i++) {
        if (yPos > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(scriptLines[i], margin + 10, yPos);
        yPos += 6;
      }
    }

    // --- STORYBOARD ---
    if (data.storyboard && data.storyboard.length > 0) {
      doc.addPage();
      doc.setPage(doc.internal.getNumberOfPages());
      yPos = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text("STORYBOARD", margin, yPos);
      yPos += 15;

      const imgWidth = 80;
      const imgHeight = 45;
      const gap = 10;
      
      for (let i = 0; i < data.storyboard.length; i++) {
        const shot = data.storyboard[i];
        
        // Check if we need a new page (2 shots per row, 3 rows per page)
        if (yPos + imgHeight + 20 > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }

        const xPos = (i % 2 === 0) ? margin : margin + imgWidth + gap;
        
        // Placeholder for image (since we can't easily fetch and convert all images to base64 synchronously here without more complex logic)
        doc.setDrawColor(200, 200, 200);
        doc.rect(xPos, yPos, imgWidth, imgHeight);
        doc.setFontSize(8);
        doc.text(`SHOT ${shot.shotNumber}`, xPos, yPos - 2);
        
        if (shot.visualDescription) {
          const descLines = doc.splitTextToSize(shot.visualDescription, imgWidth);
          doc.setFont("helvetica", "italic");
          doc.text(descLines, xPos, yPos + imgHeight + 5);
        }

        if (i % 2 !== 0 || i === data.storyboard.length - 1) {
          yPos += imgHeight + 30;
        }
      }
    }

    doc.save(`${data.title.replace(/\s+/g, "_")}_Dossier.pdf`);
  }

  // Specialized method for exporting just the storyboard with images
  static async exportStoryboard(title: string, storyboardElementId: string) {
    const element = document.getElementById(storyboardElementId);
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#000000",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${title.replace(/\s+/g, "_")}_Storyboard.pdf`);
  }
}
