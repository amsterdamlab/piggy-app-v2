/* ============================================
   PIGGY APP — Contract Service
   Handles base PDF loading, digital signature stamping,
   metadata embedding (IP, timestamp, hash) and Supabase Storage upload.
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';

/**
 * Ensure PDF-Lib is loaded and return { PDFDocument, rgb, StandardFonts }.
 * Uses npm bundle if available, otherwise window.PDFLib or dynamic CDN loading with retries.
 */
export async function getPDFLib() {
    if (typeof window !== 'undefined' && window.PDFLib) {
        return window.PDFLib;
    }

    // Try dynamic import (bundled by Vite)
    try {
        const mod = await import('pdf-lib');
        if (mod && (mod.PDFDocument || mod.default?.PDFDocument)) {
            return mod.PDFDocument ? mod : mod.default;
        }
    } catch (e) {
        console.warn('[ContractService] Dynamic import failed, attempting CDN fallback:', e);
    }

    // Fallback: Dynamically load script from reliable CDNs
    const cdns = [
        'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.9/dist/pdf-lib.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.9/pdf-lib.min.js',
        'https://unpkg.com/pdf-lib@1.17.9/dist/pdf-lib.min.js'
    ];

    for (const cdn of cdns) {
        try {
            await new Promise((resolve, reject) => {
                const existing = document.querySelector(`script[src="${cdn}"]`);
                if (existing && window.PDFLib) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = cdn;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Failed to load ${cdn}`));
                document.head.appendChild(script);
            });

            if (window.PDFLib) {
                return window.PDFLib;
            }
        } catch {
            console.warn(`[ContractService] Failed to load from ${cdn}, trying next...`);
        }
    }

    if (window.PDFLib) return window.PDFLib;

    throw new Error('La librería PDF-Lib no se pudo cargar. Por favor verifica tu conexión a internet.');
}

/**
 * Preload PDF-Lib in background when contract view mounts.
 */
export function preloadPDFLib() {
    getPDFLib().catch(err => console.warn('[ContractService] Preload warning:', err));
}

/**
 * Fetch the client's public IP address for audit purposes.
 * @returns {Promise<string>}
 */
export async function getClientIp() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            return data.ip || '127.0.0.1';
        }
    } catch {
        // Fallback gracefully if IP service fails or is blocked
    }
    return '127.0.0.1';
}

/**
 * Generate a unique transaction verification hash.
 */
export function generateTransactionHash(userId = 'USR', piggyName = 'PGY') {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timeHex = Date.now().toString(36).substring(4).toUpperCase();
    return `PGY-TX-${timeHex}-${randomHex}`;
}

/**
 * Load the base PDF bytes from the public folder.
 * @returns {Promise<ArrayBuffer>}
 */
export async function loadBasePdfBytes() {
    const urls = [
        '/contracts/contrato_base.pdf',
        './contracts/contrato_base.pdf',
        'https://raw.githubusercontent.com/amsterdamlab/piggy-app-v2/main/public/contracts/contrato_base.pdf'
    ];

    for (const url of urls) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                return await res.arrayBuffer();
            }
        } catch {
            console.warn(`[ContractService] Failed to load from ${url}, trying next...`);
        }
    }

    throw new Error('No se pudo cargar la plantilla del contrato base (contrato_base.pdf).');
}

/**
 * Stamp the buyer's digital signature and audit metadata onto the base PDF.
 * Uploads the resulting PDF to Supabase Storage in the 'contracts' bucket.
 * 
 * @param {Object} params
 * @param {string} params.signatureDataUrl - Base64 PNG signature from Canvas
 * @param {string} params.userName - Full name of the user
 * @param {string} params.userCedula - ID/CC of the user
 * @param {string} params.piggyName - Name given to the piggy
 * @param {number} params.investmentAmount - Purchase amount (COP)
 * @param {string} [params.userId] - Supabase User UUID
 * @returns {Promise<{ success: boolean, contractUrl: string, pdfBlob: Blob, hash: string }>}
 */
export async function stampAndUploadContract({
    signatureDataUrl,
    userName,
    userCedula,
    piggyName,
    investmentAmount = 1000000,
    userId = null
}) {
    // 1. Ensure PDFLib is loaded
    const PDFLib = await getPDFLib();
    const { PDFDocument, rgb, StandardFonts } = PDFLib;

    // 2. Fetch Base PDF
    const basePdfBytes = await loadBasePdfBytes();
    const pdfDoc = await PDFDocument.load(basePdfBytes);

    // 3. Prepare Audit Info
    const ipAddress = await getClientIp();
    const transaccionHash = generateTransactionHash(userId, piggyName);
    const nowBogota = new Date().toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // 4. Get Target Page (Page 15 = index 14)
    const pages = pdfDoc.getPages();
    const pageIndex = Math.min(14, pages.length - 1);
    const targetPage = pages[pageIndex];

    // 5. Embed Signature Image (PNG)
    let signatureImage = null;
    try {
        signatureImage = await pdfDoc.embedPng(signatureDataUrl);
    } catch (e) {
        console.error('Error embedding PNG signature:', e);
        throw new Error('Formato de firma no válido.');
    }

    // 6. Embed Fonts
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 7. Draw Signature and User Audit Details on Page 15
    // Coordinates calibrated for page 15 under "EL USUARIO" section
    const sigX = 85;
    const sigY = 160;
    const sigWidth = 140;
    const sigHeight = 55;

    // Draw user signature image
    targetPage.drawImage(signatureImage, {
        x: sigX,
        y: sigY,
        width: sigWidth,
        height: sigHeight,
    });

    // Draw text info under signature
    const textStartY = sigY - 14;
    const lineHeight = 11;
    const fontSize = 8.5;

    targetPage.drawText(`NOMBRE: ${userName.toUpperCase()}`, {
        x: sigX,
        y: textStartY,
        size: fontSize,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
    });

    targetPage.drawText(`C.C. / DNI: ${userCedula}`, {
        x: sigX,
        y: textStartY - lineHeight,
        size: fontSize,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
    });

    targetPage.drawText(`PIGGY: "${piggyName.toUpperCase()}" ($ ${investmentAmount.toLocaleString('es-CO')})`, {
        x: sigX,
        y: textStartY - (lineHeight * 2),
        size: 7.5,
        font: helvetica,
        color: rgb(0.25, 0.25, 0.25),
    });

    targetPage.drawText(`FIRMADO ELECTRÓNICAMENTE: ${nowBogota} (UTC-5)`, {
        x: sigX,
        y: textStartY - (lineHeight * 3),
        size: 6.8,
        font: helvetica,
        color: rgb(0.35, 0.35, 0.35),
    });

    targetPage.drawText(`IP: ${ipAddress} | HASH: ${transaccionHash}`, {
        x: sigX,
        y: textStartY - (lineHeight * 4),
        size: 6.5,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
    });

    // 8. Save modified PDF bytes
    const modifiedPdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

    // 9. If Mock data, return local object URL
    if (isUsingMockData() || !userId) {
        const localUrl = URL.createObjectURL(pdfBlob);
        return {
            success: true,
            contractUrl: localUrl,
            pdfBlob,
            hash: transaccionHash
        };
    }

    // 10. Upload to Supabase Storage 'contracts' bucket
    const client = getClient();
    const fileName = `contratos/${userId}/contrato_${Date.now()}_${transaccionHash}.pdf`;

    const { error: uploadError } = await client.storage
        .from('contracts')
        .upload(fileName, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
        });

    let contractUrl = '';
    if (uploadError) {
        console.warn('[ContractService] Storage upload error:', uploadError);
        // Fallback to local Blob URL if storage upload failed
        contractUrl = URL.createObjectURL(pdfBlob);
    } else {
        const { data: publicData } = client.storage
            .from('contracts')
            .getPublicUrl(fileName);
        contractUrl = publicData?.publicUrl || URL.createObjectURL(pdfBlob);
    }

    return {
        success: true,
        contractUrl,
        pdfBlob,
        hash: transaccionHash
    };
}
