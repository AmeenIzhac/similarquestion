import jsPDF from 'jspdf';
import type { PdfMode, Qualification } from '../types/index';
import { assetUrl } from './assets';

type PdfImageFormat = 'PNG' | 'JPEG';

interface PdfImage {
    dataUrl: string;
    width: number;
    height: number;
    format: PdfImageFormat;
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
        };
    }
}

export async function generatePdf(
    selectedQuestions: string[],
    pdfMode: PdfMode,
    filenamePrefix: string,
    qualification: Qualification
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
        const questionPath = assetUrl(qualification, 'questions', labelId);
        const answerPath = assetUrl(qualification, 'answers', labelId);

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

        let image: PdfImage;
        try {
            image = await loadPdfImage(path);
        } catch {
            throw new Error(`Failed to load ${type} image: ${labelId}`);
        }

        let renderWidth = maxWidth;
        let renderHeight = (image.height * renderWidth) / image.width;

        if (renderHeight > maxHeight) {
            renderHeight = maxHeight;
            renderWidth = (image.width * renderHeight) / image.height;
        }

        if (currentY + renderHeight > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
        }

        const x = (pageWidth - renderWidth) / 2;

        pdf.addImage(image.dataUrl, image.format, x, currentY, renderWidth, renderHeight);
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
