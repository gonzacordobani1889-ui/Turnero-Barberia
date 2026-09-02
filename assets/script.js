// URL de tu Webhook en n8n
const WEBHOOK_URL = "https://cot98.app.n8n.cloud/webhook/turnero-nuevo-turno";

// Estado de la reserva
const state = {
  servicio: null,
  precio: null,
  dia: null, // Formato ISO: YYYY-MM-DD
  hora: null,
  nombre: "",
  telefono: "",
  mail: ""
};

const SERVICIOS = {
  "Corte": "$12.000",
  "Corte + barba": "$16.000",
  "Barba": "$4.000",
  "Mechitas": "$50.000"
};

// Horarios válidos
const HORARIOS_VALIDOS = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", 
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", 
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", 
  "19:00", "19:30", "20:00", "20:30", "21:00"
];

// Nombres de días
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Inicialización cuando carga la página
document.addEventListener("DOMContentLoaded", () => {
  cargarDias(7);
  configurarServicios();
  configurarFormulario();
});

// 1. GENERAR BOTONES DE DÍAS (Envía YYYY-MM-DD a n8n)
function cargarDias(cantidad = 7) {
  const cont = document.getElementById("days");
  if (!cont) return;
  cont.innerHTML = "";

  const hoy = new Date();
  let agregados = 0;
  let offset = 1;

  while (agregados < cantidad) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + offset);
    offset++;

    // Saltear domingos
    if (fecha.getDay() === 0) continue;

    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd = String(fecha.getDate()).padStart(2, "0");
    const isoDate = `${yyyy}-${mm}-${dd}`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "opt-btn btn-dia";
    btn.dataset.val = isoDate;
    btn.innerHTML = `<span class="day-name">${DIAS_SEMANA[fecha.getDay()]}</span> <span class="day-num">${fecha.getDate()}</span>`;
    
    btn.addEventListener("click", () => seleccionarDia(isoDate, btn));
    cont.appendChild(btn);
    agregados++;
  }
}

// 2. SELECCIONAR DÍA Y CONSULTAR OCUPADOS (Petición GET al flujo inferior de n8n)
async function seleccionarDia(fechaIso, btnElemento) {
  state.dia = fechaIso;
  state.hora = null;

  document.querySelectorAll(".btn-dia").forEach(b => b.classList.remove("selected"));
  btnElemento.classList.add("selected");

  renderizarHorarios([], true);

  try {
    const response = await fetch(`${WEBHOOK_URL}?dia=${encodeURIComponent(fechaIso)}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    const data = await response.json();
    const ocupados = Array.isArray(data.ocupados) ? data.ocupados : [];
    
    renderizarHorarios(ocupados, false);
  } catch (err) {
    console.error("Error al consultar disponibilidad:", err);
    renderizarHorarios([], false);
  }
}

// 3. RENDERIZAR BOTONES DE HORARIOS Y DESHABILITAR OCUPADOS
function renderizarHorarios(ocupados = [], cargando = false) {
  const cont = document.getElementById("times");
  if (!cont) return;
  cont.innerHTML = "";

  if (cargando) {
    cont.innerHTML = "<p class='loading-text' style='grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 13px;'>Cargando horarios disponibles...</p>";
    return;
  }

  HORARIOS_VALIDOS.forEach(hora => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "opt-btn btn-hora";
    btn.textContent = hora;
    
    const estaOcupado = ocupados.includes(hora);
    if (estaOcupado) {
      btn.disabled = true;
      btn.classList.add("occupied");
    } else {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".btn-hora").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.hora = hora;
      });
    }
    cont.appendChild(btn);
  });
}

// 4. SELECCIÓN DE SERVICIO (Sincronizado con tus botones HTML #services .opt-btn)
function configurarServicios() {
  const botonesServicio = document.querySelectorAll("#services .opt-btn");
  botonesServicio.forEach(btn => {
    btn.addEventListener("click", () => {
      botonesServicio.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      
      const nombreServicio = btn.dataset.val;
      if (SERVICIOS[nombreServicio]) {
        state.servicio = nombreServicio;
        state.precio = btn.dataset.price || SERVICIOS[nombreServicio];
      }
    });
  });
}

// 5. CONFIGURAR EVENTO DE ENVÍO (Escucha el botón #confirm)
function configurarFormulario() {
  const btnConfirmar = document.getElementById("confirm");
  if (!btnConfirmar) return;

  btnConfirmar.addEventListener("click", async () => {
    await enviarReserva();
  });
}

// 6. ENVIAR RESERVA (Petición POST a n8n y tarjeta interactiva de confirmación)
async function enviarReserva() {
  state.nombre = document.getElementById("name")?.value.trim() || "";
  state.telefono = document.getElementById("phone")?.value.trim() || "";
  state.mail = document.getElementById("mail")?.value.trim() || "";

  if (!state.servicio) return mostrarMensaje("Por favor, elegí un servicio.", "error");
  if (!state.dia) return mostrarMensaje("Por favor, elegí un día.", "error");
  if (!state.hora) return mostrarMensaje("Por favor, elegí un horario.", "error");
  if (!state.nombre) return mostrarMensaje("Por favor, ingresá tu nombre y apellido.", "error");
  if (!state.telefono) return mostrarMensaje("Por favor, ingresá tu teléfono.", "error");

  const btnConfirm = document.getElementById("confirm");
  if (btnConfirm) btnConfirm.disabled = true;

  mostrarMensaje("Procesando reserva...", "");

  const payload = {
    servicio: state.servicio,
    precio: state.precio,
    dia: state.dia,
    hora: state.hora,
    nombre: state.nombre,
    telefono: state.telefono,
    mail: state.mail
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      const summary = document.getElementById("summary");
      if (summary) {
        summary.className = "summary ok";
        summary.innerHTML = `
          <div style="background: #1e1e1e; border: 1px solid #22c55e; padding: 18px; border-radius: 12px; text-align: center; margin-top: 15px; color: white;">
            <h3 style="color: #4ade80; margin: 0 0 8px 0; font-size: 18px;">¡Reserva Confirmada! 🎉</h3>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Turno:</strong> ${state.dia} a las ${state.hora} hs</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Servicio:</strong> ${state.servicio} (${state.precio})</p>
            <p style="margin: 4px 0; font-size: 12px; color: #aaa;">Código de reserva: <strong>${data.id || 'N/A'}</strong></p>
            
            <a href="cancelar.html?id=${encodeURIComponent(data.id || '')}&tel=${encodeURIComponent(state.telefono)}" 
               style="display: inline-block; margin-top: 14px; padding: 10px 16px; background: #ef444422; border: 1px solid #ef4444; color: #f87171; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold;">
               ❌ Cancelar o modificar esta reserva
            </a>
          </div>
        `;
      }
    } else {
      mostrarMensaje(`No se pudo realizar la reserva: ${data.mensaje || "Horario no disponible."}`, "error");
      
      if (state.dia) {
        const btnDiaActual = document.querySelector(`.btn-dia[data-val="${state.dia}"]`);
        if (btnDiaActual) seleccionarDia(state.dia, btnDiaActual);
      }
    }
  } catch (error) {
    console.error("Error al enviar reserva:", error);
    mostrarMensaje("Error de conexión al procesar la reserva. Intentá de nuevo.", "error");
  } finally {
    if (btnConfirm) btnConfirm.disabled = false;
  }
}

// Función auxiliar para mostrar mensajes sencillos
function mostrarMensaje(texto, tipo) {
  const summary = document.getElementById("summary");
  if (!summary) return;
  summary.className = `summary ${tipo}`;
  summary.textContent = texto;
}
