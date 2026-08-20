/* ============================================
   PIGGY APP — Contrato View
   Displays full 28-clause purchase contract, captures
   buyer identity & digital signature, stamps PDF and uploads.
   ============================================ */

import { renderIcon } from '../icons.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';
import { adoptPiggy, buyMarketplaceItem } from '../services/piggiesService.js';
import { deductWalletBalance, getWalletBalance } from '../services/walletService.js';
import { openSignatureModal } from '../components/SignatureModal.js';
import { stampAndUploadContract, preloadPDFLib } from '../services/contractService.js';
import { formatCOP } from '../services/mockData.js';
import { getClient, isUsingMockData } from '../services/supabase.js';
import { CONTRACT_CLAUSES } from '../data/contractClauses.js';

let currentSignatureDataUrl = null;
let currentPiggyName = 'Mi Piggy';
let currentItemPrice = 1000000;
let currentMarketplaceItem = null;

export function renderContratoView() {
    preloadPDFLib();
    const app = document.getElementById('app');
    const profile = AppState.get('profile') || {};
    const user = AppState.get('currentUser') || {};

    // Get Piggy Name and item from query param or session
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    
    const savedItemStr = sessionStorage.getItem('pending_marketplace_item');
    currentMarketplaceItem = null;
    if (savedItemStr) {
        try {
            currentMarketplaceItem = JSON.parse(savedItemStr);
        } catch (e) {
            console.warn('Error parsing pending_marketplace_item:', e);
        }
    }

    currentPiggyName = urlParams.get('name') || sessionStorage.getItem('pending_piggy_name') || currentMarketplaceItem?.item_name || 'Bacon';
    
    const rawPrice = urlParams.get('price') || currentMarketplaceItem?.price;
    currentItemPrice = rawPrice ? parseFloat(rawPrice) : 1000000;
    if (isNaN(currentItemPrice) || currentItemPrice <= 0) currentItemPrice = 1000000;

    currentSignatureDataUrl = null;

    const initialFullName = profile.full_name || user.user_metadata?.full_name || '';
    const initialCedula = profile.cedula || profile.document_id || '';

    app.innerHTML = `
    <div class="page contrato-page animate-fade-in">
        
        <!-- Header matching Tu Cuenta Agro structure -->
        <div style="padding: 20px 20px 0 20px; background: white; flex-shrink: 0; position: sticky; top: 0; z-index: 50; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <button id="btn-back-contrato" style="background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 0.9rem; font-weight: 600; font-family: inherit; margin-bottom: 12px; transition: color 0.2s;" onmouseover="this.style.color='var(--color-primary, #E91E63)'" onmouseout="this.style.color='#64748b'">
                ${renderIcon('arrowLeft', '', '18')} Volver
            </button>
            <h2 style="margin: 0 0 6px 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">Contrato de Compra</h2>
            <p style="margin: 0 0 14px 0; font-size: 0.88rem; color: #475569; line-height: 1.4;">Documento oficial de vinculación y operación agroproductiva.</p>
            <div style="height: 1px; background: #e2e8f0; width: 100%;"></div>
        </div>

        <div class="contrato-content">
            
            <!-- Hero / Summary Card -->
            <div class="contrato-hero animate-scale-in">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                    <span style="background:rgba(255,255,255,0.15); padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">
                        Documento Oficial
                    </span>
                    <span style="font-size:0.8rem; opacity:0.8;">Ley 527 de 1999</span>
                </div>
                <h1 class="contrato-hero__title">
                    CONTRATO MARCO DE OPERACIÓN AGROPRODUCTIVA DIGITAL, CUSTODIA, TRAZABILIDAD Y COMERCIALIZACIÓN
                </h1>
                <div class="contrato-hero__meta">
                    <div>🐖 <strong>Piggy a vincular:</strong> "${currentPiggyName}"</div>
                    <div>💰 <strong>Inversión:</strong> ${formatCOP(currentItemPrice)}</div>
                    <div>🏢 <strong>Operador:</strong> Granja Villa Morales del Valle S.A.S.</div>
                </div>
            </div>

            <!-- Full Legal Text Accordion / Body (All 28 Clauses) -->
            <div class="contrato-legal-body animate-fade-in-up">
                <div style="margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:800; color:#0f172a; font-size:0.95rem;">Cláusulas del Contrato</span>
                    <span style="font-size:0.75rem; color:#64748b;">28 Cláusulas</span>
                </div>

                ${CONTRACT_CLAUSES.map(c => `
                    <div class="contrato-clause">
                        <div class="contrato-clause__title">
                            <span style="color:var(--color-primary, #ec4899);">${c.num}.</span> ${c.title}
                        </div>
                        <p class="contrato-clause__text">${c.text}</p>
                    </div>
                `).join('')}
            </div>

            <!-- Representative Legal Stamped Card -->
            <div class="contrato-rep-card animate-fade-in-up">
                <div class="contrato-rep-card__title">✍️ Firma del Representante Legal (Pre-firmado)</div>
                <div><strong>LA PLATAFORMA Y COMERCIALIZADORA</strong></div>
                <div>GRANJA VILLA MORALES DEL VALLE S.A.S. &bull; NIT: 900.860.384-7</div>
                <div style="font-size:0.78rem; color:#64748b; margin-top:2px;">OSCAR IVÁN MÁRQUEZ MORALES &bull; C.C. 14.590.206</div>
            </div>

            <!-- Buyer Identity & Signature Form Section -->
            <div class="contrato-sign-card animate-fade-in-up" id="seccion-firma">
                <h3 style="margin:0 0 4px 0; font-size:1.1rem; font-weight:800; color:#0f172a;">
                    Firma Electrónica del Comprador
                </h3>
                <p style="margin:0 0 16px 0; font-size:0.82rem; color:#64748b;">
                    Confirma tus datos personales y dibuja tu firma para vincular legalmente tu Piggy.
                </p>

                <!-- Editable Form Text Boxes -->
                <div class="contrato-input-group">
                    <label class="contrato-input-label" for="contrato-user-name">
                        Nombre Completo del Comprador
                    </label>
                    <input 
                        type="text" 
                        id="contrato-user-name" 
                        class="contrato-input-field" 
                        value="${initialFullName}" 
                        placeholder="Ingresa tu nombre completo" 
                        autocomplete="name"
                    />
                </div>

                <div class="contrato-input-group" style="margin-bottom: 18px;">
                    <label class="contrato-input-label" for="contrato-user-cedula">
                        Número de Cédula / C.C
                    </label>
                    <input 
                        type="text" 
                        inputmode="numeric"
                        pattern="[0-9]*"
                        id="contrato-user-cedula" 
                        class="contrato-input-field" 
                        value="${initialCedula}" 
                        placeholder="Ingresa tu número de documento" 
                        autocomplete="off"
                    />
                </div>

                <!-- Signature Trigger / Preview -->
                <div id="signature-preview-box" class="contrato-signature-preview">
                    <div id="signature-empty-state" style="padding: 10px 0;">
                        <span style="font-size:28px;">✍️</span>
                        <div style="font-weight:700; font-size:0.9rem; color:var(--color-primary, #ec4899); margin-top:4px;">
                            Toca aquí para dibujar tu firma
                        </div>
                        <div style="font-size:0.75rem; color:#94a3b8;">
                            Usa tu dedo en celular o cursor en laptop
                        </div>
                    </div>
                    <div id="signature-filled-state" style="display:none;">
                        <img id="signature-preview-img" class="contrato-signature-preview__img" alt="Firma del comprador" />
                        <div style="font-size:0.75rem; color:var(--color-primary, #ec4899); font-weight:600; margin-top:6px;">
                            ✎ Toca para cambiar la firma
                        </div>
                    </div>
                </div>

                <!-- Legal Terms Checkbox -->
                <label style="display:flex; align-items:flex-start; gap:8px; font-size:0.82rem; color:#475569; margin-bottom:20px; cursor:pointer; line-height:1.4;">
                    <input type="checkbox" id="contrato-agree-check" style="margin-top:2px; accent-color:var(--color-primary, #ec4899);" checked />
                    <span>
                        He leído, entiendo y acepto expresamente este contrato y autorizo anexar mi firma electrónica en el documento oficial.
                    </span>
                </label>

                <!-- Submit Button with Pulse & Glow Effect -->
                <button type="button" id="btn-finalizar-contrato" class="btn-pulse-glow-7s" style="
                    width: 100%;
                    background: linear-gradient(135deg, #ec4899, #db2777);
                    color: white;
                    border: none;
                    padding: 14px 20px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 6px 20px -4px rgba(236,72,153,0.4);
                    transition: all 0.2s;
                ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/></svg>
                    <span>Confirmar Compra</span>
                </button>
            </div>

        </div>

        <!-- Sticky Floating Scroll Button -->
        <div class="contrato-sticky-bar" id="contrato-sticky-bar">
            <button class="contrato-sticky-btn" id="btn-scroll-to-sign">
                <span>✍️ He leído el contrato &bull; Ir a firmar</span>
            </button>
        </div>

    </div>
    `;

    attachContratoListeners();

    return () => { };
}

function attachContratoListeners() {
    // Back button
    document.getElementById('btn-back-contrato')?.addEventListener('click', () => {
        if (currentMarketplaceItem) {
            navigateTo('mercado');
        } else {
            navigateTo('adopcion');
        }
    });

    // Scroll to sign section
    const scrollBtn = document.getElementById('btn-scroll-to-sign');
    const stickyBar = document.getElementById('contrato-sticky-bar');
    const signSection = document.getElementById('seccion-firma');

    scrollBtn?.addEventListener('click', () => {
        signSection?.scrollIntoView({ behavior: 'smooth' });
    });

    // Hide sticky bar when scrolled near bottom
    window.addEventListener('scroll', () => {
        if (!stickyBar || !signSection) return;
        const rect = signSection.getBoundingClientRect();
        if (rect.top <= window.innerHeight - 100) {
            stickyBar.style.opacity = '0';
            stickyBar.style.pointerEvents = 'none';
        } else {
            stickyBar.style.opacity = '1';
            stickyBar.style.pointerEvents = 'auto';
        }
    });

    // Open signature modal
    const previewBox = document.getElementById('signature-preview-box');
    const nameInput = document.getElementById('contrato-user-name');
    const cedulaInput = document.getElementById('contrato-user-cedula');

    // Only numbers in cedula
    cedulaInput?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    previewBox?.addEventListener('click', () => {
        const userName = nameInput?.value?.trim() || 'Comprador';
        const userCedula = cedulaInput?.value?.trim() || 'Sin registrar';

        openSignatureModal({
            userName,
            userCedula,
            onConfirm: (dataUrl) => {
                currentSignatureDataUrl = dataUrl;
                document.getElementById('signature-empty-state').style.display = 'none';
                const filledState = document.getElementById('signature-filled-state');
                const previewImg = document.getElementById('signature-preview-img');
                if (filledState && previewImg) {
                    previewImg.src = dataUrl;
                    filledState.style.display = 'block';
                }
            }
        });
    });

    // Finalize Contract and Purchase
    const finalizeBtn = document.getElementById('btn-finalizar-contrato');
    finalizeBtn?.addEventListener('click', async () => {
        const userName = nameInput?.value?.trim();
        const userCedula = cedulaInput?.value?.trim();
        const agreed = document.getElementById('contrato-agree-check')?.checked;

        if (!userName) {
            alert('Por favor ingresa tu nombre completo.');
            nameInput?.focus();
            return;
        }

        if (!userCedula) {
            alert('Por favor ingresa tu número de cédula o documento de identidad.');
            cedulaInput?.focus();
            return;
        }

        if (!currentSignatureDataUrl) {
            alert('Por favor dibuja tu firma en el recuadro antes de continuar.');
            previewBox?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        if (!agreed) {
            alert('Debes aceptar las cláusulas del contrato para continuar.');
            return;
        }

        // Set Loading state
        finalizeBtn.innerHTML = `
            <span class="spinner" style="width:20px;height:20px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span>
            Estampando firma y generando contrato...
        `;
        finalizeBtn.style.pointerEvents = 'none';

        try {
            // 0. Pre-validate wallet balance before executing contract or DB calls
            const currentWalletBal = await getWalletBalance();
            if (currentWalletBal < currentItemPrice) {
                throw new Error(`Saldo insuficiente en tu Wallet para realizar la compra (${formatCOP(currentItemPrice)}). Tu saldo actual es ${formatCOP(currentWalletBal)}.`);
            }

            const user = AppState.get('currentUser');
            const userId = user?.id || null;

            // 1. Stamp and Upload PDF to Supabase Storage
            const contractResult = await stampAndUploadContract({
                signatureDataUrl: currentSignatureDataUrl,
                userName,
                userCedula,
                piggyName: currentPiggyName,
                investmentAmount: currentItemPrice,
                userId
            });

            // 2. Register Piggy in DB
            let newPiggy;
            if (currentMarketplaceItem) {
                newPiggy = await buyMarketplaceItem(currentMarketplaceItem, currentPiggyName, contractResult?.contractUrl);
            } else {
                newPiggy = await adoptPiggy(currentPiggyName, contractResult?.contractUrl);
            }

            // 3. Update contract_url in piggies table & cedula in profiles table if DB active
            if (!isUsingMockData() && userId) {
                const client = getClient();
                try {
                    if (newPiggy?.id && contractResult?.contractUrl) {
                        await client
                            .from('piggies')
                            .update({ contract_url: contractResult.contractUrl })
                            .eq('id', newPiggy.id);
                    }
                } catch (piggyUpdateErr) {
                    console.warn('[ContratoView] Could not update contract_url in piggies table:', piggyUpdateErr);
                }

                try {
                    // Update profile cedula
                    await client
                        .from('profiles')
                        .update({ cedula: userCedula })
                        .eq('id', userId);
                    
                    const currentProfile = AppState.get('profile') || {};
                    AppState.set({ profile: { ...currentProfile, cedula: userCedula } });
                } catch (profileUpdateErr) {
                    console.warn('[ContratoView] Could not update cedula in profiles table:', profileUpdateErr);
                }
            } else if (isUsingMockData()) {
                const currentProfile = AppState.get('profile') || {};
                AppState.set({ profile: { ...currentProfile, cedula: userCedula } });
            }

            // 4. Deduct Wallet Balance — ONLY AFTER CONTRACT & PIGGY ARE SUCCESSFULLY PROCESSED
            const deductResult = await deductWalletBalance(currentItemPrice);
            if (!deductResult.success) {
                console.warn('[WALLET] Deduct balance warning:', deductResult.reason);
            }

            // 5. Clear pending session storage
            sessionStorage.removeItem('pending_marketplace_item');
            sessionStorage.removeItem('pending_piggy_name');

            // 6. Render Success Screen
            renderSuccessScreen({
                piggyName: currentPiggyName,
                contractUrl: contractResult.contractUrl,
                hash: contractResult.hash,
                userName,
                userCedula
            });

        } catch (error) {
            console.error('Error finalizando contrato:', error);
            alert('Hubo un error al procesar el contrato: ' + error.message);
            finalizeBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/></svg>
                <span>Confirmar Compra</span>
            `;
            finalizeBtn.style.pointerEvents = 'auto';
        }
    });
}

function renderSuccessScreen({ piggyName, contractUrl, hash, userName, userCedula }) {
    const app = document.getElementById('app');
    app.innerHTML = `
    <div class="page contrato-page animate-fade-in" style="display:flex; align-items:center; justify-content:center; padding: 24px 16px;">
        <div class="contrato-success-card animate-scale-in" style="max-width:480px; width:100%;">
            <div class="contrato-success-icon">
                ✓
            </div>
            
            <h2 style="font-size:1.4rem; font-weight:800; color:#0f172a; margin:0 0 8px 0;">
                ¡Felicidades por tu nuevo Piggy!
            </h2>
            <p style="color:#64748b; font-size:0.9rem; margin:0 0 20px 0; line-height:1.5;">
                El Piggy <strong>"${piggyName}"</strong> ya se encuentra en tu granja y el contrato ha sido firmado y almacenado legalmente.
            </p>

            <!-- Verification Badge -->
            <div style="
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 12px 16px;
                text-align: left;
                font-size: 0.78rem;
                color: #475569;
                margin-bottom: 24px;
                line-height: 1.5;
            ">
                <div><strong>Firmante:</strong> ${userName} (C.C. ${userCedula})</div>
                <div><strong>ID Transacción:</strong> <span style="font-family:monospace; color:var(--color-primary);">${hash}</span></div>
                <div><strong>Estado:</strong> Firmado con validez jurídica (Ley 527 de 1999)</div>
            </div>

            <!-- Action Buttons -->
            <div style="display:flex; flex-direction:column; gap:12px;">
                <a 
                    href="${contractUrl}" 
                    target="_blank" 
                    download="Contrato_Piggy_${piggyName}.pdf" 
                    class="btn btn--primary btn--block btn--lg"
                    style="background: linear-gradient(135deg, #10B981, #059669); text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px;"
                >
                    ${renderIcon('download', '', '20')}
                    Descargar Contrato Firmado (PDF)
                </a>

                <button class="btn btn--secondary btn--block btn--lg" id="btn-ir-granja">
                    🚜 Ir a Mi Granja
                </button>
            </div>
        </div>
    </div>
    `;

    document.getElementById('btn-ir-granja')?.addEventListener('click', () => {
        navigateTo('granja');
    });
}
