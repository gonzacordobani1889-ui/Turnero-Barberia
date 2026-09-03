// ==========================================
// CONFIGURACIÓN (REEMPLAZA CON TU WEBHOOK DE N8N)
// ==========================================
const WEBHOOK_URL = "https://tu-url-de-n8n.com/webhook/turnos"; 

const state = { servicio: null, precio: null, duracion: null, barbero: null, diaIso: null, fechaDisplay: null, hora: null };
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();

function goToStep(step) {
  document.querySelectorAll('.wizard-step').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
  document.getElementById(`step-${step}`).classList.remove('hidden');
  document.getElementById(`step-${step}`).classList.add('active');
  
  if(step === 3) generarCalendario(mesActual, anioActual);
  if(step === 4) actualizarResumen();
}

document.querySelectorAll('.opt-list-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.opt-list-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    
    state.servicio = btn.querySelector('.srv-name').textContent;
    state.precio = btn.dataset.price;
    // 🐛 BUG 1 CORREGIDO: Capturamos duración
    state.duracion = btn.dataset.duration; 
    
    setTimeout(() => goToStep(2), 200);
  });
});

document.querySelectorAll('.agent-card').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.agent-card').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.barbero = btn.dataset.val;
    setTimeout(() => goToStep(3), 200);
  });
});

// Lógica de Calendario
document.getElementById('prev-month').addEventListener('click', () => { mesActual--; siPasaDeAnio(); generarCalendario(mesActual, anioActual); });
document.getElementById('next-month').addEventListener('click', () => { mesActual++; siPasaDeAnio(); generarCalendario(mesActual, anioActual); });

function siPasaDeAnio() {
  if (mesActual < 0) { mesActual = 11; anioActual--; }
  else if (mesActual > 11) { mesActual = 0; anioActual++; }
}

function generarCalendario(mes, anio) {
  const grid = document.getElementById("calendar-grid");
  const headers = grid.innerHTML.match(/<div class="day-name">.*?<\/div>/g).join('');
  grid.innerHTML = headers;
  
  document.getElementById("current-month-display").textContent = `${MESES[mes]} ${anio}`;
  
  const primerDia = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const hoyMidnight = new Date(); hoyMidnight.setHours(0,0,0,0);

  for (let i = 0; i < primerDia; i++) grid.appendChild(document.createElement("div"));

  for (let i = 1; i <= diasEnMes; i++) {
    const fecha = new Date(anio, mes, i);
    const div = document.createElement("div");
    div.className = "cal-day";
    div.textContent = i;
    
    const isoDate = `${anio}-${String(mes+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const displayStr = `${i} de ${MESES[mes]}`;

    if (fecha < hoyMidnight || fecha.getDay() === 0) {
      div.classList.add("disabled");
    } else {
      div.addEventListener("click", () => {
        document.querySelectorAll(".cal-day").forEach(d => d.classList.remove("selected"));
        div.classList.add("selected");
        
        state.diaIso = isoDate; 
        state.fechaDisplay = displayStr; 
        state.hora = null;
        
        document.getElementById("btn-next-step3").disabled = true;
        document.getElementById("selected-date-display").textContent = displayStr;
        document.getElementById("time-selection-container").classList.remove("hidden");
        
        // 🐛 BUG 3 y 4 CORREGIDOS: Llamamos a la función asíncrona real
        cargarHorariosReales(isoDate);
      });
    }
    grid.appendChild(div);
  }
}

// 🐛 BUGS 3 y 4 CORREGIDOS: Fetch real a n8n y uso de estado "Loading"
async function cargarHorariosReales(isoDate) {
  const loader = document.getElementById("loading-times");
  const timesContainer = document.getElementById("times-container");
  const mContainer = document.getElementById("times-morning");
  const aContainer = document.getElementById("times-afternoon");
  const eContainer = document.getElementById("times-evening");

  // Mostramos el loader y ocultamos los horarios viejos
  loader.classList.remove("hidden");
  timesContainer.classList.add("hidden");
  mContainer.innerHTML = "";
  aContainer.innerHTML = "";
  eContainer.innerHTML = "";

  // Horarios de trabajo base de la barbería
  const horariosBase = ["09:00", "09:40", "10:20", "11:00", "11:40", "12:20", "15:00", "15:40", "16:20", "17:00", "17:40", "18:20", "19:00", "19:40"];
  let ocupados = [];

  try {
    // Consulta GET a n8n (asegurate que tu webhook GET devuelva un JSON: { "ocupados": ["09:00", "11:00"] })
    const res = await fetch(`${WEBHOOK_URL}?dia=${encodeURIComponent(isoDate)}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    
    if(res.ok) {
        const data = await res.json();
        if(Array.isArray(data.ocupados)) ocupados = data.ocupados;
    }
  } catch(e) {
    console.error("Error cargando horarios de n8n:", e);
    // Si la API falla, el código sigue y asume todo libre (es preferible rebotar en la confirmación que dejar colgada la app)
  }

  // Renderizar y deshabilitar horarios ocupados
  horariosBase.forEach(h => {
    const btn = document.createElement("button");
    btn.className = "time-btn"; 
    btn.textContent = h;
    
    // Validar contra lo que trajo el Sheets vía n8n
    if(ocupados.includes(h)) {
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.hora = h;
        document.getElementById("btn-next-step3").disabled = false; // Habilita ir al Paso 4
      });
    }

    // Clasificar en contenedores (Mañana, Tarde, Noche)
    const horaNum = parseInt(h.split(":")[0]);
    if (horaNum < 12) mContainer.appendChild(btn);
    else if (horaNum < 18) aContainer.appendChild(btn);
    else eContainer.appendChild(btn);
  });

  // Ocultamos el loader y mostramos la grilla generada
  loader.classList.add("hidden");
  timesContainer.classList.remove("hidden");
}

function actualizarResumen() {
  // Ahora el resumen muestra también la duración
  document.getElementById("sum-service").textContent = `${state.servicio} (${state.duracion})`;
  document.getElementById("sum-date").textContent = `📅 ${state.fechaDisplay} - ${state.hora} hs`;
  document.getElementById("sum-barber").textContent = `💈 Profesional: ${state.barbero}`;
  document.getElementById("sum-price").textContent = `Total: ${state.precio}`;
}

document.getElementById("confirm").addEventListener("click", async () => {
  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;
  
  if(!name || !phone) return alert("Por favor, completá tu Nombre y Teléfono");
  
  const payload = { ...state, nombre: name, telefono: phone };
  const msgEl = document.getElementById("summary");
  
  msgEl.textContent = "Procesando..."; 
  msgEl.style.color = "#fff";
  
  try {
    // 🐛 BUG 2 CORREGIDO: Agregado Content-Type: application/json
    const res = await fetch(WEBHOOK_URL, { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload) 
    });
    
    if(res.ok) {
      msgEl.textContent = "¡Turno confirmado con éxito!";
      msgEl.style.color = "#4ade80";
      document.querySelector(".field-group").style.display = "none";
    } else {
      throw new Error("Respuesta no válida del servidor");
    }
  } catch(e) {
    msgEl.textContent = "Error de conexión. Intentá de nuevo.";
    msgEl.style.color = "var(--danger)";
  }
});
