// Cuando esté listo el flujo de n8n, reemplazar por la URL del webhook real.
const WEBHOOK_URL = "";

// Horarios base de atención (fijo por ahora, después configurable por el barbero).
const HORARIOS = ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

// TODO: reemplazar por consulta real a n8n (turnos ya ocupados para el día elegido).
const OCUPADOS_MOCK = { };

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIA_NO_LABORAL = 0; // domingo cerrado

const state = { service: null, price: null, day: null, dayLabel: null, time: null };

function buildDays(cantidad) {
  const cont = document.getElementById("days");
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
  document.getElementById(containerId).addEventListener("click", (e) => {
    const btn = e.target.closest(".opt-btn");
    if (!btn || btn.disabled) return;

    document
      .getElementById(containerId)
      .querySelectorAll(".opt-btn")
      .forEach((el) => el.classList.remove("selected"));
    btn.classList.add("selected");

    state[key] = btn.dataset.val;
    if (priceKey) state[priceKey] = btn.dataset.price;

    // Si cambia el día, recalcular horarios ocupados para ese día.
    if (key === "day") {
      state.time = null;
      buildTimes(OCUPADOS_MOCK[btn.dataset.val] || []);
    }
  });
}

function showSummary(text, type) {
  const el = document.getElementById("summary");
  el.textContent = text;
  el.className = "summary" + (type ? " " + type : "");
}

async function confirmarTurno() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();

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

  if (!WEBHOOK_URL) {
    // Todavía no está conectado n8n: solo mostramos el resumen local.
    showSummary(`Turno confirmado: ${turno.servicio} el ${turno.dia} a las ${turno.hora}`, "ok");
    return;
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(turno),
    });
    if (!res.ok) throw new Error("respuesta no ok");
    showSummary(`Turno confirmado: ${turno.servicio} el ${turno.dia} a las ${turno.hora}`, "ok");
  } catch (err) {
    showSummary("No se pudo guardar el turno. Probá de nuevo.", "error");
  }
}

buildDays(6);
buildTimes(null);
selectInGroup("services", "service", "price");
selectInGroup("days", "day");
selectInGroup("times", "time");
document.getElementById("confirm").addEventListener("click", confirmarTurno);
