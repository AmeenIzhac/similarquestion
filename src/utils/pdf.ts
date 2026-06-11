import jsPDF from 'jspdf';
import type { PdfMode, Qualification, ExamBoard } from '../types/index';
import { assetUrl } from './assets';

type PdfImageFormat = 'PNG' | 'JPEG';

interface PdfImage {
    dataUrl: string;
    width: number;
    height: number;
    format: PdfImageFormat;
    element: HTMLImageElement;
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function requestBlob(src: string): Promise<{ blob: Blob; contentType: string | null }> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('GET', src, true);
        request.responseType = 'blob';
        request.onload = () => {
            if (request.status >= 200 && request.status < 300) {
                resolve({
                    blob: request.response,
                    contentType: request.getResponseHeader('content-type'),
                });
            } else {
                reject(new Error(`HTTP ${request.status}`));
            }
        };
        request.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        request.send();
    });
}

function loadImage(src: string, useCrossOrigin = false): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (useCrossOrigin) {
            img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

function imageToPngDataUrl(img: HTMLImageElement): string {
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Could not prepare image for PDF');
    }

    context.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
}

function getImageFormat(contentType: string | null, dataUrl: string): PdfImageFormat {
    const value = `${contentType ?? ''} ${dataUrl.slice(0, 32)}`.toLowerCase();
    return value.includes('jpeg') || value.includes('jpg') ? 'JPEG' : 'PNG';
}

async function pdfImageFromBlob(blob: Blob, contentType: string | null): Promise<PdfImage> {
    const dataUrl = await blobToDataUrl(blob);
    const img = await loadImage(dataUrl);

    return {
        dataUrl,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        format: getImageFormat(contentType || blob.type, dataUrl),
        element: img,
    };
}

async function loadPdfImage(path: string): Promise<PdfImage> {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        return await pdfImageFromBlob(blob, response.headers.get('content-type'));
    } catch {
        try {
            const { blob, contentType } = await requestBlob(path);
            return await pdfImageFromBlob(blob, contentType);
        } catch {
            // Fall through to the browser image loader below.
        }

        let img: HTMLImageElement;
        try {
            img = await loadImage(path, true);
        } catch {
            img = await loadImage(path);
        }
        return {
            dataUrl: imageToPngDataUrl(img),
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            format: 'PNG',
            element: img,
        };
    }
}

function cropImageToJpegDataUrl(img: HTMLImageElement, sourceY: number, sourceHeight: number): string {
    const width = img.naturalWidth || img.width;
    const height = Math.max(1, Math.ceil(sourceHeight));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Could not prepare image section for PDF');
    }

    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(img, 0, sourceY, width, sourceHeight, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.92);
}

function addNewPage(pdf: jsPDF): void {
    if (pdf.getNumberOfPages() === 0) return;
    pdf.addPage();
}

function renderImageAtPageWidth(
    pdf: jsPDF,
    image: PdfImage,
    currentY: number,
    pageWidth: number,
    pageHeight: number
): number {
    const gap = 4;
    const overlap = 14;
    const pageEpsilon = 0.1;
    const scale = pageWidth / image.width;
    const renderHeight = image.height * scale;
    const remainingHeight = pageHeight - currentY;

    if (currentY > pageEpsilon && renderHeight > remainingHeight + pageEpsilon) {
        addNewPage(pdf);
        currentY = 0;
    }

    if (renderHeight <= pageHeight - currentY + pageEpsilon) {
        pdf.addImage(image.dataUrl, image.format, 0, currentY, pageWidth, renderHeight);
        return currentY + renderHeight + gap;
    }

    let sourceY = 0;
    while (sourceY < image.height) {
        const availableHeight = pageHeight - currentY;
        const sourceHeightForPage = Math.min(image.height - sourceY, Math.floor(availableHeight / scale));

        if (sourceHeightForPage <= 0) {
            addNewPage(pdf);
            currentY = 0;
            continue;
        }

        const sliceDataUrl = cropImageToJpegDataUrl(image.element, sourceY, sourceHeightForPage);
        const sliceHeight = sourceHeightForPage * scale;
        pdf.addImage(sliceDataUrl, 'JPEG', 0, currentY, pageWidth, sliceHeight);

        if (sourceY + sourceHeightForPage >= image.height - 1) {
            return sliceHeight + gap;
        }

        const overlapInSourcePixels = Math.min(
            Math.floor(overlap / scale),
            Math.floor(sourceHeightForPage / 3)
        );
        sourceY += Math.max(1, sourceHeightForPage - overlapInSourcePixels);
        addNewPage(pdf);
        currentY = 0;
    }

    return currentY;
}

export async function generatePdf(
    selectedQuestions: string[],
    pdfMode: PdfMode,
    filenamePrefix: string,
    qualification: Qualification,
    boardByLabel?: Record<string, ExamBoard>
): Promise<void> {
    if (selectedQuestions.length === 0) return;

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let currentY = 0;

    const renderItems = selectedQuestions.flatMap((labelId) => {
        const questionPath = assetUrl(qualification, 'questions', labelId, boardByLabel?.[labelId]);
        const answerPath = assetUrl(qualification, 'answers', labelId, boardByLabel?.[labelId]);

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

        let image: PdfImage;
        try {
            image = await loadPdfImage(path);
        } catch {
            throw new Error(`Failed to load ${type} image: ${labelId}`);
        }

        currentY = renderImageAtPageWidth(pdf, image, currentY, pageWidth, pageHeight);

        if (index < renderItems.length - 1 && currentY >= pageHeight) {
            pdf.addPage();
            currentY = 0;
        }
    }

    const fileSuffix = pdfMode === 'questions' ? 'questions' : pdfMode === 'answers' ? 'answers' : 'interleaved';
    pdf.save(`${filenamePrefix}-${fileSuffix}.pdf`);
}
