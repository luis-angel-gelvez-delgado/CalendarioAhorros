// script.js — Calendario de Ahorro 2026
// Versión corregida y completa: calcula totales mensuales, metas acumulativas,
// actualiza barras, suma anual y guarda/recupera en localStorage.

// ---------- Utilidades ----------
const MONTHS_MAP = {
    enero: 1, ene: 1,
    febrero: 2, feb: 2,
    marzo: 3, mar: 3,
    abril: 4, abr: 4,
    mayo: 5,
    junio: 6, jun: 6,
    julio: 7, jul: 7,
    agosto: 8, ago: 8,
    septiembre: 9, sept: 9, sep: 9,
    octubre: 10, oct: 10,
    noviembre: 11, nov: 11,
    diciembre: 12, dic: 12
  };
  
  const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
  
  const toMonthIndex = (text) => {
    if (!text) return null;
    const clean = String(text).trim().toLowerCase();
    return MONTHS_MAP[clean] || null;
  };
  
  // ---------- Selecciones globales ----------
  const monthNodes = Array.from(document.querySelectorAll(".month"));
  const btnCalcAnnual = document.getElementById("calc-annual");
  const totalAnualDisplay = document.getElementById("total-anual");
  
  // ---------- LocalStorage keys ----------
  const STORAGE_KEY = "calendarioAhorro2026_v1";
  
  // ---------- Lectura y escritura del DOM por mes ----------
  function readWeeklySumForMonth(monthNode) {
    // Suma las 4 inputs de semana dentro del mes (clase .week-input)
    const weekInputs = Array.from(monthNode.querySelectorAll(".week-input"));
    return weekInputs
      .map(i => parseFloat(i.value) || 0)
      .reduce((a, b) => a + b, 0);
  }
  
  function readMetaMensualForMonth(monthNode) {
    const v = parseFloat(monthNode.querySelector(".meta-mensual")?.value);
    return isNaN(v) ? 0 : v;
  }
  
  function readMetaAcumulativaForMonth(monthNode) {
    const name = (monthNode.querySelector(".meta-name")?.value || "").trim();
    const value = parseFloat(monthNode.querySelector(".meta-value")?.value);
    const until = (monthNode.querySelector(".meta-until")?.value || "").trim();
    return {
      name,
      value: isNaN(value) ? 0 : value,
      until
    };
  }
  
  function writeTotalMes(monthNode, total) {
    const el = monthNode.querySelector(".total-mes");
    if (el) el.textContent = `Total mes: ${formatMoney(total)}`;
  }
  
  function updateEstadoMetaAndProgress(monthNode, cumulativeSumForMeta, metaValue) {
    const estado = monthNode.querySelector(".estado-meta");
    const progresoFill = monthNode.querySelector(".progreso-fill");
    const wrapper = monthNode.querySelector(".acumulativa") || monthNode;
  
    if (!estado || !progresoFill) return;
  
    if (!metaValue || metaValue <= 0) {
      progresoFill.style.width = `0%`;
      estado.textContent = "Sin meta";
      wrapper.classList.remove("meta-alcanzada");
      progresoFill.style.boxShadow = ""; // remove special glow
      return;
    }
  
    const percent = Math.min(100, (cumulativeSumForMeta / metaValue) * 100);
    progresoFill.style.width = `${percent}%`;
  
    if (cumulativeSumForMeta >= metaValue) {
      estado.textContent = `Meta alcanzada 🎉`;
      wrapper.classList.add("meta-alcanzada");
      // small visual pulse via box-shadow (kept via class/meta CSS)
      progresoFill.style.boxShadow = "0 0 18px var(--neon), 0 0 30px var(--neon)";
    } else {
      const faltante = (metaValue - cumulativeSumForMeta);
      estado.textContent = `Faltan ${formatMoney(faltante)}`;
      wrapper.classList.remove("meta-alcanzada");
      progresoFill.style.boxShadow = "0 0 10px rgba(0,0,0,0)"; // neutral
    }
  }
  
  // ---------- Cálculo de metas acumulativas (global) ----------
  function calculateCumulativeSumUpTo(targetMonthIndex) {
    // Devuelve array 1..12 con acumulados por mes (suma de semanas de enero..mesN)
    const monthlySums = monthNodes.map(node => readWeeklySumForMonth(node)); // index 0 => enero
    const cumulative = [];
    let running = 0;
    for (let i = 0; i < 12; i++) {
      running += (monthlySums[i] || 0);
      cumulative[i + 1] = running; // cumulative[1] = suma hasta enero, etc.
    }
    if (targetMonthIndex == null) return 0;
    return cumulative[targetMonthIndex] || 0;
  }
  
  function updateAllMetaProgresses() {
    // Para cada mes, lee su meta acumulativa y actualiza barra comparando
    // la suma desde enero hasta el mes objetivo indicado en meta-until.
    monthNodes.forEach((monthNode, idx) => {
      const { value: metaValue, until } = readMetaAcumulativaForMonth(monthNode);
      if (!until) {
        // Sin mes objetivo -> consideramos inactiva
        updateEstadoMetaAndProgress(monthNode, 0, 0);
        return;
      }
      const targetIdx = toMonthIndex(until);
      if (!targetIdx) {
        // Si no reconoce el mes objetivo, mostrar aviso en estado
        const estado = monthNode.querySelector(".estado-meta");
        const progresoFill = monthNode.querySelector(".progreso-fill");
        if (estado) estado.textContent = "Mes objetivo no reconocido";
        if (progresoFill) progresoFill.style.width = "0%";
        monthNode.querySelector(".acumulativa")?.classList.remove("meta-alcanzada");
        return;
      }
      // Calcular cumulativeSumForMeta = suma de semanas desde Enero (1) hasta targetIdx
      const cumulativeSumForMeta = calculateCumulativeSumUpTo(targetIdx);
      updateEstadoMetaAndProgress(monthNode, cumulativeSumForMeta, metaValue);
    });
  }
  
  // ---------- Cálculo total mensual (por botón) ----------
  function calcularTotalMensualDesde(monthNode) {
    // Suma semanas del mes actual
    const totalMes = readWeeklySumForMonth(monthNode);
    writeTotalMes(monthNode, totalMes);
  
    // Comparar con meta mensual
    const metaMensual = readMetaMensualForMonth(monthNode);
    const estadoMensualEl = monthNode.querySelector(".estado-mensual");
    // mostrador simple: si no existe, crearlo (para accesibilidad/feedback)
    if (estadoMensualEl) {
      // no-op
    } else {
      // crear un pequeño span debajo del total-mes para mensajes de meta mensual
      const cont = monthNode.querySelector(".actions");
      if (cont) {
        const span = document.createElement("div");
        span.className = "estado-mensual";
        span.setAttribute("aria-live", "polite");
        cont.appendChild(span);
      }
    }
    const estadoMensual = monthNode.querySelector(".estado-mensual");
    if (!metaMensual || metaMensual <= 0) {
      if (estadoMensual) estadoMensual.textContent = "Meta mensual sin definir";
    } else if (totalMes >= metaMensual) {
      if (estadoMensual) estadoMensual.textContent = `Meta mensual alcanzada (${formatMoney(totalMes)} ≥ ${formatMoney(metaMensual)})`;
    } else {
      if (estadoMensual) estadoMensual.textContent = `Faltan ${formatMoney(metaMensual - totalMes)} para la meta mensual`;
    }
  
    // Tras calcular un mes, actualizar todas las metas acumulativas (en tiempo real)
    updateAllMetaProgresses();
  
    // Guardar estado
    saveStateToLocalStorage();
  }
  
  // ---------- Cálculo total anual ----------
  function calcularTotalAnual() {
    let suma = 0;
    monthNodes.forEach((node) => {
      suma += readWeeklySumForMonth(node);
    });
    totalAnualDisplay.textContent = `Total anual: ${formatMoney(suma)}`;
    totalAnualDisplay.setAttribute("aria-live", "polite");
    // Al calcular anual también actualizamos metas por si hace falta
    updateAllMetaProgresses();
    saveStateToLocalStorage();
  }
  
  // ---------- Guardado y recuperación (localStorage) ----------
  function saveStateToLocalStorage() {
    const state = monthNodes.map((node, idx) => {
      const metaMensual = node.querySelector(".meta-mensual")?.value || "";
      const weeks = Array.from(node.querySelectorAll(".week-input")).map(i => i.value || "");
      const metaName = node.querySelector(".meta-name")?.value || "";
      const metaValue = node.querySelector(".meta-value")?.value || "";
      const metaUntil = node.querySelector(".meta-until")?.value || "";
      return { metaMensual, weeks, metaName, metaValue, metaUntil };
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Si falla el localStorage, no bloqueamos la aplicación
      console.warn("No se pudo guardar en localStorage:", e);
    }
  }
  
  function restoreStateFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!Array.isArray(state)) return;
      state.forEach((s, idx) => {
        const node = monthNodes[idx];
        if (!node) return;
        if (s.metaMensual !== undefined) node.querySelector(".meta-mensual").value = s.metaMensual;
        if (Array.isArray(s.weeks)) {
          const weekInputs = node.querySelectorAll(".week-input");
          weekInputs.forEach((w, i) => { w.value = s.weeks[i] || ""; });
        }
        if (s.metaName !== undefined) node.querySelector(".meta-name").value = s.metaName;
        if (s.metaValue !== undefined) node.querySelector(".meta-value").value = s.metaValue;
        if (s.metaUntil !== undefined) node.querySelector(".meta-until").value = s.metaUntil;
      });
    } catch (e) {
      console.warn("No se pudo leer el estado del localStorage:", e);
    }
  }
  
  // ---------- Event listeners ----------
  
  // Botones "Calcular total mensual" por cada mes
  monthNodes.forEach((monthNode) => {
    const btn = monthNode.querySelector(".calc-month");
    if (btn) {
      btn.addEventListener("click", () => {
        calcularTotalMensualDesde(monthNode);
      });
    }
  
    // Guardado automático cuando cambian inputs relevantes (debounced muy simple)
    const inputs = monthNode.querySelectorAll("input");
    inputs.forEach(input => {
      input.addEventListener("input", () => {
        // Guardar en cada input change (sencillo y confiable)
        saveStateToLocalStorage();
      });
    });
  });
  
  // Botón anual
  if (btnCalcAnnual) {
    btnCalcAnnual.addEventListener("click", () => {
      calcularTotalAnual();
    });
  }
  
  // ---------- Inicialización al cargar la página ----------
  function init() {
    // Restaurar valores del storage si existen
    restoreStateFromLocalStorage();
  
    // Mostrar totales mensuales (si había valores guardados)
    monthNodes.forEach(node => {
      // Actualiza el Total mes visual en base a semanas ya cargadas
      const total = readWeeklySumForMonth(node);
      writeTotalMes(node, total);
    });
  
    // Actualizar metas acumulativas con el estado restaurado
    updateAllMetaProgresses();
  
    // Actualizar total anual (cero o valor actual)
    calcularTotalAnual();
  }
  
  // Ejecutar init
  init();
  
  // Export minimal functions para debugging si se necesita (no obligatorio)
  window.__calendarioAhorro = {
    calcularTotalAnual,
    updateAllMetaProgresses,
    saveStateToLocalStorage,
    restoreStateFromLocalStorage
  };
  