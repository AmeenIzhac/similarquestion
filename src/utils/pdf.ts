import jsPDF from 'jspdf';
import { PdfMode } from '../types/index';

export async function generatePdf(
    selectedQuestions: string[],
    pdfMode: PdfMode,
    filenamePrefix: string
): Promise<void> {
    if (selectedQuestions.length === 0) return;

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

    const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    let currentY = margin;
    let atPageStart = true;

    const renderItems = selectedQuestions.flatMap((labelId) => {
        const questionPath = `/edexcel-gcse-maths-questions/${labelId}`;
        const answerPath = `/edexcel-gcse-maths-answers/${labelId}`;

        if (pdfMode === 'questions') {
            return [{ labelId, path: questionPath, type: 'question' as const }];
        }
        if (pdfMode === 'answers') {
            return [{ labelId, path: answerPath, type: 'answer' as const }];
        }
        return [
            { labelId, path: questionPath, type: 'question' as const },
            { labelId, path: answerPath, type: 'answer' as const }
        ];
    });

    for (let index = 0; index < renderItems.length; index += 1) {
        const { labelId, path, type } = renderItems[index];

        if (type === 'question') {
            if (!atPageStart) {
                pdf.addPage();
                currentY = margin;
                atPageStart = true;
            }
        }

        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load ${type} image: ${labelId}`);
        }

        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        const { width: imageWidth, height: imageHeight } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = reject;
            img.src = dataUrl;
        });

        let renderWidth = maxWidth;
        let renderHeight = (imageHeight * renderWidth) / imageWidth;

        if (renderHeight > maxHeight) {
            renderHeight = maxHeight;
            renderWidth = (imageWidth * renderHeight) / imageHeight;
        }

        if (currentY + renderHeight > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
        }

        const x = (pageWidth - renderWidth) / 2;
        const imageType = labelId.toLowerCase().endsWith('.jpg') || labelId.toLowerCase().endsWith('.jpeg') ? 'JPEG' : 'PNG';

        pdf.addImage(dataUrl, imageType as 'PNG' | 'JPEG', x, currentY, renderWidth, renderHeight);
        atPageStart = false;

        currentY += renderHeight + 5;

        if (index < renderItems.length - 1 && currentY > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
            atPageStart = true;
        }
    }

    const fileSuffix = pdfMode === 'questions' ? 'questions' : pdfMode === 'answers' ? 'answers' : 'interleaved';
    pdf.save(`${filenamePrefix}-${fileSuffix}.pdf`);
}
