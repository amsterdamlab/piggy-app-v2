/* ============================================
   PIGGY APP — Contrato View
   Displays full 28-clause purchase contract, captures
   buyer identity & digital signature, stamps PDF and uploads.
   ============================================ */

import { renderIcon } from '../icons.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';
import { adoptPiggy } from '../services/piggiesService.js';
import { deductWalletBalance } from '../services/walletService.js';
import { openSignatureModal } from '../components/SignatureModal.js';
import { stampAndUploadContract } from '../services/contractService.js';
import { formatCOP } from '../services/mockData.js';
import { getClient, isUsingMockData } from '../services/supabase.js';

// Legal clauses text from the official contract
const CLAUSES = [
    {
        num: "1",
        title: "PARTES",
        text: "1.1. GRANJA VILLA MORALES DEL VALLE S.A.S., sociedad legalmente constituida conforme a las leyes de la República de Colombia, identificada con NIT No. 900.860.384-7, representada legalmente por OSCAR IVÁN MÁRQUEZ MORALES, identificado con cédula de ciudadanía No. 14.590.206, quien para efectos del presente contrato actuará en calidad de operadora de la plataforma digital PIGGY APP y de comercializadora del producto agropecuario derivado de la operación, denominándose en adelante LA PLATAFORMA y 1.2. EL USUARIO, entendido como la persona natural o jurídica que acepta electrónicamente los términos del presente contrato mediante la plataforma digital PIGGY APP; quienes conjuntamente podrán denominarse las “PARTES”, celebran el presente CONTRATO MARCO DE OPERACIÓN AGROPRODUCTIVA DIGITAL, CUSTODIA, TRAZABILIDAD Y COMERCIALIZACIÓN, el cual se regirá por las cláusulas que a continuación se expresan y en general por las disposiciones aplicables a la materia que trata este contrato."
    },
    {
        num: "2",
        title: "CONSIDERACIONES",
        text: "2.1. Que LA PLATAFORMA Y COMERCIALIZADORA administra una plataforma digital denominada “PIGGY APP”, orientada a la gestión, seguimiento y trazabilidad de operaciones agroproductivas relacionadas con procesos de crianza, engorde y comercialización de porcinos. 2.2 Que EL OPERADOR PRODUCTIVO desarrolla actividades agropecuarias relacionadas con la custodia, alimentación, manejo técnico, control sanitario y desarrollo productivo de porcinos dentro de predios destinados a la actividad agropecuaria. 2.3. Que el modelo desarrollado mediante la plataforma digital se encuentra respaldado en activos agropecuarios reales, individualizables y sometidos a procesos productivos verificables y trazables. 2.4. Que EL USUARIO manifiesta su interés en vincularse al modelo agroproductivo mediante la adquisición de un activo agropecuario real vinculado a un ciclo productivo y comercial administrado a través de la plataforma digital. 2.5 Que las PARTES reconocen expresamente que el presente modelo corresponde a una operación agrocomercial sustentada en activos reales y procesos productivos verificables, y que cualquier resultado económico derivado de la operación dependerá del comportamiento real de la actividad agropecuaria y de las condiciones del mercado. 2.6 Que las PARTES reconocen igualmente que la actividad agropecuaria se encuentra expuesta a riesgos propios del sector, incluyendo contingencias sanitarias, fluctuaciones comerciales, variabilidad de precios, mortalidad animal y demás factores inherentes a la actividad productiva. 2.7. Que las PARTES manifiestan que el presente contrato tiene como finalidad regular las condiciones operativas, productivas, comerciales y de trazabilidad aplicables al funcionamiento del modelo agroproductivo digital desarrollado mediante la plataforma PIGGY APP."
    },
    {
        num: "3",
        title: "DEFINICIONES",
        text: "Para efectos del presente contrato las partes aceptan los términos, definiciones, condiciones y especificaciones establecidas a continuación: 3.1. Activo Agroproductivo: Corresponde al porcino individualizable y trazable que hace parte del proceso productivo desarrollado por EL OPERADOR PRODUCTIVO, respaldado en registros técnicos, sanitarios y operativos verificables. 3.2. Ciclo Productivo: Periodo durante el cual el Activo Agroproductivo se encuentra vinculado a procesos de crianza, custodia, alimentación, engorde, manejo sanitario y posterior comercialización dentro de la operación agroproductiva. 3.3. Plataforma Digital: Corresponde a la aplicación tecnológica denominada PIGGY APP, administrada por LA PLATAFORMA Y COMERCIALIZADORA, mediante la cual se gestiona la vinculación de usuarios, trazabilidad operativa, seguimiento del proceso productivo y administración general de la operación agrocomercial. 3.4. Resultado Económico: Corresponde al valor variable derivado del proceso de comercialización del Activo Agroproductivo, calculado conforme a las condiciones reales de producción, costos operativos, comportamiento del mercado y demás variables asociadas a la actividad agropecuaria. El Resultado Económico no constituye rentabilidad fija, rendimiento garantizado ni utilidad previamente asegurada."
    },
    {
        num: "4",
        title: "OBJETO",
        text: "El presente contrato tiene por objeto regular la vinculación de EL USUARIO a la operación agrocomercial desarrollada mediante la plataforma digital PIGGY APP, administrada por LA PLATAFORMA Y COMERCIALIZADORA, a través de la adquisición de un Activo Agroproductivo real, individualizable y trazable, vinculado a un proceso de crianza, custodia, alimentación, manejo sanitario, engorde y posterior comercialización desarrollado por EL OPERADOR PRODUCTIVO. Para el cumplimiento del objeto contractual, LA PLATAFORMA Y COMERCIALIZADORA, EL OPERADOR PRODUCTIVO y EL USUARIO actuarán con autonomía técnica, administrativa y operativa dentro de las funciones que les corresponden conforme a la naturaleza del modelo agroproductivo y de acuerdo con las obligaciones establecidas en el presente contrato. PARÁGRAFO PRIMERO. Las PARTES reconocen expresamente que el presente modelo corresponde a una operación agroproductiva respaldada en activos reales y procesos productivos verificables, y no constituye actividad financiera, mecanismo de captación de recursos, inversión colectiva ni esquema de rentabilidad garantizada. PARÁGRAFO SEGUNDO. EL USUARIO declara conocer y aceptar que cualquier Resultado Económico derivado de la operación dependerá exclusivamente del comportamiento real del proceso productivo, los costos operativos, las condiciones del mercado y los riesgos propios de la actividad agropecuaria."
    },
    {
        num: "5",
        title: "OBLIGACIONES DE LA PLATAFORMA Y COMERCIALIZADORA",
        text: "LA PLATAFORMA Y COMERCIALIZADORA se obliga para con EL USUARIO y EL OPERADOR PRODUCTIVO a administrar la plataforma digital PIGGY APP, gestionar la vinculación de usuarios, mantener mecanismos razonables de identificación, registro y trazabilidad, facilitar al usuario acceso a la información del ciclo productivo, gestionar operativamente la comercialización del producto y realizar la liquidación económica conforme a las condiciones reales del mercado y costos operativos."
    },
    {
        num: "6",
        title: "OBLIGACIONES DEL OPERADOR PRODUCTIVO",
        text: "EL OPERADOR PRODUCTIVO se obliga a desarrollar el proceso agroproductivo de crianza, custodia, alimentación, manejo técnico, control sanitario y engorde, mantener los activos dentro de predios aptos con protocolos veterinarios y de bioseguridad, llevar registros del ciclo productivo y cumplir con todas las disposiciones sanitarias y regulatorias aplicables."
    },
    {
        num: "7",
        title: "OBLIGACIONES DEL USUARIO",
        text: "EL USUARIO se obliga a suministrar información veraz y actualizada, cumplir los procedimientos de validación e identificación, utilizar la plataforma conforme a la ley y las condiciones pactadas, y reconocer expresamente que el modelo corresponde a una actividad agroproductiva real sujeta a las variables y riesgos propios del sector agropecuario."
    },
    {
        num: "8",
        title: "TRAZABILIDAD DEL ACTIVO AGROPRODUCTIVO",
        text: "Las PARTES reconocen que la trazabilidad del Activo Agroproductivo constituye un elemento esencial del modelo. EL OPERADOR PRODUCTIVO y LA PLATAFORMA implementarán mecanismos razonables de identificación, control y seguimiento sobre la evolución del ciclo de engorde."
    },
    {
        num: "9",
        title: "COMERCIALIZACIÓN Y LIQUIDACIÓN ECONÓMICA",
        text: "La comercialización del producto derivado del proceso será gestionada por LA PLATAFORMA conforme a las condiciones reales del mercado y la liquidación económica se calculará con base en precios reales de venta menos costos operativos y sanitarios. No constituye rentabilidad fija ni rendimiento garantizado."
    },
    {
        num: "10 - 22",
        title: "ADMINISTRACIÓN, RIESGOS, CUMPLIMIENTO Y CONFIDENCIALIDAD",
        text: "Se regulan los mecanismos de administración de recursos, aceptación informada de los riesgos biológicos y comerciales del sector porcino, controles de prevención de lavado de activos (SARLAFT/SAGRILAFT), tratamiento de datos personales (Ley 1581 de 2012), reglas de publicidad y reserva estricta de confidencialidad entre las partes."
    },
    {
        num: "23",
        title: "ACEPTACIÓN ELECTRÓNICA Y VIGENCIA",
        text: "Las PARTES reconocen expresamente la validez jurídica de la aceptación electrónica del presente contrato mediante los mecanismos digitales implementados en la plataforma PIGGY APP, de plena conformidad con la Ley 527 de 1999 sobre comercio electrónico y mensajes de datos. Entra en vigencia desde el momento de su firma electrónica."
    },
    {
        num: "24 - 27",
        title: "NOTIFICACIONES, MODIFICACIONES Y LEGISLACIÓN APLICABLE",
        text: "Las partes aceptan notificaciones electrónicas en los canales registrados. El contrato se rige e interpreta bajo las leyes de la República de Colombia, con domicilio contractual fijado en la República de Colombia."
    },
    {
        num: "28",
        title: "PERFECCIONAMIENTO Y ACEPTACIÓN",
        text: "El presente contrato se entenderá perfeccionado con la aceptación y firma electrónica realizada por EL USUARIO mediante la plataforma digital PIGGY APP y producirá plenos efectos jurídicos."
    }
];

let currentSignatureDataUrl = null;
let currentPiggyName = 'Mi Piggy';
const ITEM_PRICE = 1000000;

export function renderContratoView() {
    const app = document.getElementById('app');
    const profile = AppState.get('profile') || {};
    const user = AppState.get('currentUser') || {};

    // Get Piggy Name from query param or session
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    currentPiggyName = urlParams.get('name') || sessionStorage.getItem('pending_piggy_name') || 'Bacon';
    currentSignatureDataUrl = null;

    const initialFullName = profile.full_name || user.user_metadata?.full_name || '';
    const initialCedula = profile.cedula || profile.document_id || '';

    app.innerHTML = `
    <div class="page contrato-page animate-fade-in">
        
        <!-- Header -->
        <header class="contrato-header">
            <button class="btn btn--ghost btn--sm" id="btn-back-contrato">
                ${renderIcon('arrowRight', '', '16')} Volver
            </button>
            <div style="font-weight:800; font-size:0.95rem; color:var(--color-primary);">
                Piggy App Legal
            </div>
        </header>

        <div class="contrato-content">
            
            <!-- Hero / Header Card -->
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
                    <div>💰 <strong>Inversión:</strong> ${formatCOP(ITEM_PRICE)}</div>
                    <div>🏢 <strong>Operador:</strong> Granja Villa Morales del Valle S.A.S.</div>
                </div>
            </div>

            <!-- Full Legal Text Accordion / Body -->
            <div class="contrato-legal-body animate-fade-in-up">
                <div style="margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:800; color:#0f172a; font-size:0.95rem;">Cláusulas del Contrato</span>
                    <span style="font-size:0.75rem; color:#64748b;">16 páginas estándar</span>
                </div>

                ${CLAUSES.map(c => `
                    <div class="contrato-clause">
                        <div class="contrato-clause__title">
                            <span style="color:var(--color-primary);">${c.num}.</span> ${c.title}
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
                <div style="font-size:0.78rem; color:#64748b;">OSCAR IVÁN MÁRQUEZ MORALES &bull; C.C. 14.590.206</div>
            </div>

            <!-- Buyer Identity & Signature Form Section -->
            <div class="contrato-sign-card animate-fade-in-up" id="seccion-firma">
                <h3 style="margin:0 0 4px 0; font-size:1.1rem; font-weight:800; color:#0f172a;">
                    Firma Electrónica del Comprador
                </h3>
                <p style="margin:0 0 16px 0; font-size:0.82rem; color:#64748b;">
                    Confirma tus datos personales y dibuja tu firma para vincular legalmente tu Piggy.
                </p>

                <!-- Inputs -->
                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
                    <div>
                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:4px;">
                            Nombre Completo del Comprador:
                        </label>
                        <input 
                            type="text" 
                            id="contrato-user-name" 
                            class="input-wrapper__field" 
                            style="width:100%; box-sizing:border-box;"
                            value="${initialFullName}" 
                            placeholder="Ej: Carlos Andrés Pérez Gómez" 
                        />
                    </div>

                    <div>
                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:4px;">
                            Cédula de Ciudadanía / Documento de Identidad:
                        </label>
                        <input 
                            type="text" 
                            id="contrato-user-cedula" 
                            class="input-wrapper__field" 
                            style="width:100%; box-sizing:border-box;"
                            value="${initialCedula}" 
                            placeholder="Ej: 1023456789" 
                        />
                    </div>
                </div>

                <!-- Signature Trigger / Preview -->
                <div id="signature-preview-box" class="contrato-signature-preview">
                    <div id="signature-empty-state" style="padding: 10px 0;">
                        <span style="font-size:28px;">✍️</span>
                        <div style="font-weight:700; font-size:0.9rem; color:var(--color-primary); margin-top:4px;">
                            Toca aquí para dibujar tu firma
                        </div>
                        <div style="font-size:0.75rem; color:#94a3b8;">
                            Usa tu dedo en celular o cursor en laptop
                        </div>
                    </div>
                    <div id="signature-filled-state" style="display:none;">
                        <img id="signature-preview-img" class="contrato-signature-preview__img" alt="Firma del comprador" />
                        <div style="font-size:0.75rem; color:var(--color-primary); font-weight:600; margin-top:6px;">
                            ✎ Toca para cambiar la firma
                        </div>
                    </div>
                </div>

                <!-- Legal Terms Checkbox -->
                <label style="display:flex; align-items:flex-start; gap:8px; font-size:0.8rem; color:#475569; margin-bottom:20px; cursor:pointer;">
                    <input type="checkbox" id="contrato-agree-check" style="margin-top:3px; accent-color:var(--color-primary);" checked />
                    <span>
                        He leído, entiendo y acepto expresamente las 28 cláusulas del Contrato Marco y autorizo el estampado de mi firma electrónica en el documento oficial.
                    </span>
                </label>

                <!-- Submit Button -->
                <button type="button" id="btn-finalizar-contrato" class="btn btn--primary btn--block btn--lg" style="
                    background: linear-gradient(135deg, var(--color-primary, #b80049), #db2777);
                    font-weight:800;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    gap:8px;
                ">
                    <span>Piggy</span>
                    <span>Firmar y Confirmar Compra (${formatCOP(ITEM_PRICE)})</span>
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
        navigateTo('adopcion');
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
            const user = AppState.get('currentUser');
            const userId = user?.id || null;

            // 1. Stamp and Upload PDF to Supabase Storage
            const contractResult = await stampAndUploadContract({
                signatureDataUrl: currentSignatureDataUrl,
                userName,
                userCedula,
                piggyName: currentPiggyName,
                investmentAmount: ITEM_PRICE,
                userId
            });

            // 2. Register Piggy in DB
            const newPiggy = await adoptPiggy(currentPiggyName, contractResult?.contractUrl);

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

            // 4. Deduct Wallet Balance
            const deductResult = await deductWalletBalance(ITEM_PRICE);
            if (!deductResult.success) {
                console.warn('[WALLET] Deduct balance warning:', deductResult.reason);
            }

            // 5. Render Success Screen
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
            finalizeBtn.innerHTML = `<span>Firmar y Confirmar Compra (${formatCOP(ITEM_PRICE)})</span>`;
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