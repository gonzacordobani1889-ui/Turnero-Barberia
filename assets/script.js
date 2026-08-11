const WEBHOOK_URL = "https://cot98.app.n8n.cloud/webhook/turnero-nuevo-turno";

// Estado de la reserva
const state = {
  servicio: null,
  precio: null,
  dia: null, // Formato YYYY-MM-DD
  hora: null,
  nombre: "",
  telefono: "",
  mail: ""
};

// Servicios y Precios alineados con la constante del nodo "Validar datos"
const SERVICIOS = {
  "Corte": "$12.000",
  "Corte + barba": "$16.000",
  "Barba": "$4.000"
};

// Horarios alineados con el array del nodo "Validar datos"
const HORARIOS_VALIDOS = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", 
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", 
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", 
  "19:00", "19:30", "20:00", "20:30", "21:00"
];

// 1. GENERACIÓN DE DÍAS (Envía ISO YYYY-MM-DD)
function cargarDias(cantidad = 7) {
  const cont = document.getElementById("days");
  if (!cont) return;
  cont.innerHTML = "";

  const hoy = new Date();
  let agregados = 0;
  let offset = 1;

  const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  while (agregados < cantidad) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + offset);
    offset++;

    if (fecha.getDay() === 0) continue; // Saltea domingos

    // Genera string ISO YYYY-MM-DD en horario local
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd = String(fecha.getDate()).padStart(2, "0");
    const isoDate = `${yyyy}-${mm}-${dd}`;

    const btn = document.createElement("button");
    btn.className = "btn-dia";
    btn.dataset.val = isoDate;
    btn.innerHTML = `<span>${DIAS_SEMANA[fecha.getDay()]}</span> <strong>${fecha.getDate()}</strong>`;
    
    btn.addEventListener("click", () => seleccionarDia(isoDate, btn));
    cont.appendChild(btn);
    agregados++;
  }
}

// 2. CONSULTAR HORARIOS OCUPADOS (GET)
async function seleccionarDia(fechaIso, btnElemento) {
  state.dia = fechaIso;
  state.hora = null;

  document.querySelectorAll(".btn-dia").forEach(b => b.classList.remove("selected"));
  btnElemento.classList.add("selected");

  renderizarHorarios([], true);

  try {
    // El nodo "¿Es GET o POST?" detecta el método GET y ejecuta "Filtrar Ocupados"
    const response = await fetch(`${WEBHOOK_URL}?dia=${encodeURIComponent(fechaIso)}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    const data = await response.json();
    const ocupados = data.ocupados || [];
    
    renderizarHorarios(ocupados, false);
  } catch (err) {
    console.error("Error al consultar disponibilidad:", err);
    renderizarHorarios([], false);
  }
}

// 3. DIBUJAR HORARIOS Y DESHABILITAR OCUPADOS
function renderizarHorarios(ocupados = [], cargando = false) {
  const cont = document.getElementById("times");
  if (!cont) return;
  cont.innerHTML = "";

  if (cargando) {
    cont.innerHTML = "<p>Cargando horarios disponibles...</p>";
    return;
  }

  HORARIOS_VALIDOS.forEach(hora => {
    const btn = document.createElement("button");
    btn.className = "btn-hora";
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

// 4. ENVÍO DEL TURNO (POST)
async function enviarReserva() {
  state.nombre = document.getElementById("input-nombre")?.value.trim() || "";
  state.telefono = document.getElementById("input-telefono")?.value.trim() || "";
  state.mail = document.getElementById("input-mail")?.value.trim() || "";

  if (state.servicio && SERVICIOS[state.servicio]) {
    state.precio = SERVICIOS[state.servicio];
  }

  // Payload estructurado según la lectura del nodo "Validar datos"
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
      alert(`¡Reserva confirmada! ${data.clienteFrecuente ? "¡Gracias por elegirnos nuevamente!" : ""}`);
      location.reload();
    } else {
      // Muestra el mensaje devuelto por los nodos "Error - rate limit", "Error - datos inválidos" o "Error - ocupado"
      alert(`No se pudo reservar: ${data.mensaje || "Ocurrió un problema."}`);
    }
  } catch (error) {
    console.error("Error en el envío:", error);
    alert("Error de conexión al procesar la reserva.");
  }
}
