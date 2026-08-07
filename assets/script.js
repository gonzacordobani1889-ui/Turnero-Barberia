// Webhook de n8n para crear un turno
const WEBHOOK_URL = "https://cot98.app.n8n.cloud/webhook/turnero-nuevo-turno";

// Horarios base de atención
const HORARIOS = ["10:00", "10:30", "11:00", "11:30" , "12:00" , "12:30" , "13:00" , "13:30" , "14:00", "14:30", "15:00", "15:30", "16:00", "16:30" , "17:00" , "17:30" , "18:00" , "18:30" , "19:00" , "19:30" , "20:00" , "20:30" , "21:00" ];

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIA_NO_LABORAL = 0; // Domingo cerrado

const state = { service: null, price: null, day: null, time: null };

function buildDays(cantidad) {
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

    if (fecha.getDay() === DIA_NO_LABORAL) continue;

    const btn = document.createElement("button");
    btn.className = "opt-btn";
    const label = `${DIAS_SEMANA[fecha.getDay()]} ${fecha.getDate()}`;
    btn.dataset.val = label;
    btn.innerHTML = `<span class="day-name">${DIAS_SEMANA[fecha.getDay()]}</span><span class="day-num">${fecha.getDate()}</span>`;
    cont.appendChild(btn);
    agregados++;
  }
}

function buildTimes(ocupadosDelDia) {
  const cont = document.getElementById("times");
  if (!cont) return;
  cont.innerHTML = "";
  
  HORARIOS.forEach((hora) => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.dataset.val = hora;
    btn.textContent = hora;
    
    if (ocupadosDelDia && ocupadosDelDia.includes(hora)) {
      btn.disabled = true;
    }
    cont.appendChild(btn);
  });
}

function selectInGroup(containerId, key, priceKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".opt-btn");
    if (!btn || btn.disabled) return;

    container.querySelectorAll(".opt-btn").forEach((el) => el.classList.remove("selected"));
    btn.classList.add("selected");

    state[key] = btn.dataset.val;
    if (priceKey) state[priceKey] = btn.dataset.price;

    if (key === "day") {
      state.time = null;
      // Reconstruye horarios al cambiar de día
      buildTimes([]); 
    }
  });
}

function showSummary(text, type) {
  const el = document.getElementById("summary");
  if (!el) return;
  el.textContent = text;
  el.className = "summary" + (type ? " " + type : "");
}

async function confirmarTurno() {
  const nameInput = document.getElementById("name");
  const phoneInput = document.getElementById("phone");

  const name = nameInput ? nameInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";

  if (!state.service || !state.day || !state.time) {
    showSummary("Falta elegir servicio, día u horario.", "error");
    return;
  }
  if (!name || !phone) {
    showSummary("Falta el nombre o el teléfono.", "error");
    return;
  }

  const turno = {
    servicio: state.service,
    precio: state.price,
    dia: state.day,
    hora: state.time,
    nombre: name,
    telefono: phone,
  };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(turno),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      // Muestra el mensaje exacto enviado por n8n (ej: "Ese horario ya fue reservado")
      showSummary(data.mensaje || "Ocurrió un error al procesar la reserva.", "error");
      return;
    }

    let msg = `¡Turno confirmado para ${turno.nombre}! ${turno.servicio} el ${turno.dia} a las ${turno.hora}.`;
    if (data.clienteFrecuente) {
      msg += " ¡Gracias por elegirnos siempre (Cliente Frecuente)!";
    }

    showSummary(msg, "ok");

  } catch (err) {
    showSummary("No se pudo conectar con el servidor. Probá de nuevo más tarde.", "error");
  }
}

// Inicialización
buildDays(6);
buildTimes(null);
selectInGroup("services", "service", "price");
selectInGroup("days", "day");
selectInGroup("times", "time");

const confirmBtn = document.getElementById("confirm");
if (confirmBtn) {
  confirmBtn.addEventListener("click", confirmarTurno);
}
