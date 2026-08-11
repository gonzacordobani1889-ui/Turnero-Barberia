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

// Servicios y precios sincronizados con n8n
const SERVICIOS = {
  "Corte": "$12.000",
  "Corte + barba": "$16.000",
  "Barba": "$4.000"
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

// Inicialización
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

    // Saltear domingos (si el negocio no abre)
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

// 2. SELECCIONAR DÍA Y CONSULTAR OCUPADOS (Petición GET)
async function seleccionarDia(fechaIso, btnElemento) {
  state.dia = fechaIso;
  state.hora = null;

  document.querySelectorAll(".btn-dia").forEach(b => b.classList.remove("selected"));
  btnElemento.classList.add("selected");

  renderizarHorarios([], true);

  try {
    // Consulta los horarios ocupados a n8n por GET
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
    cont.innerHTML = "<p class='loading-text'>Cargando horarios...</p>";
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

// 4. SELECCIÓN DE SERVICIO
function configurarServicios() {
  const botonesServicio = document.querySelectorAll(".btn-servicio");
  botonesServicio.forEach(btn => {
    btn.addEventListener("click", () => {
      botonesServicio.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      
      const nombreServicio = btn.dataset.servicio;
      if (SERVICIOS[nombreServicio]) {
        state.servicio = nombreServicio;
        state.precio = SERVICIOS[nombreServicio];
      }
    });
  });
}

// 5. CONFIGURAR EVENTO DE ENVÍO
function configurarFormulario() {
  const form = document.getElementById("form-reserva");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await enviarReserva();
  });
}

// 6. ENVIAR RESERVA (Petición POST)
async function enviarReserva() {
  state.nombre = document.getElementById("input-nombre")?.value.trim() || "";
  state.telefono = document.getElementById("input-telefono")?.value.trim() || "";
  state.mail = document.getElementById("input-mail")?.value.trim() || "";

  // Validaciones rápidas en cliente antes de enviar
  if (!state.servicio) return alert("Por favor, selecciona un servicio.");
  if (!state.dia) return alert("Por favor, selecciona un día.");
  if (!state.hora) return alert("Por favor, selecciona un horario.");
  if (!state.nombre) return alert("Por favor, ingresa tu nombre.");
  if (!state.telefono) return alert("Por favor, ingresa tu teléfono.");

  const btnSubmit = document.getElementById("btn-submit");
  if (btnSubmit) btnSubmit.disabled = true;

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
      const mensajeFinal = data.clienteFrecuente 
        ? "¡Reserva confirmada! Gracias por elegirnos nuevamente."
        : "¡Reserva confirmada con éxito!";
      alert(mensajeFinal);
      location.reload();
    } else {
      alert(`No se pudo realizar la reserva: ${data.mensaje || "Horario no disponible."}`);
      if (state.dia) {
        // Recarga los horarios para reflejar los turnos tomados recientemente
        seleccionarDia(state.dia, document.querySelector(`.btn-dia[data-val="${state.dia}"]`));
      }
    }
  } catch (error) {
    console.error("Error al enviar reserva:", error);
    alert("Ocurrió un error de conexión al procesar la reserva. Intenta de nuevo.");
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
  }
}
