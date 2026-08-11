// URL del Webhook Admin en n8n
const WEBHOOK_ADMIN = "https://cot98.app.n8n.cloud/webhook/turnero-admin";

// Clave de acceso requerida para el barbero
const CLAVE_SECRETA = "1234"; 

document.addEventListener("DOMContentLoaded", () => {
  if (!verificarAcceso()) return;

  const hoy = new Date().toISOString().split("T")[0];
  const inputFecha = document.getElementById("filtro-fecha");
  if (inputFecha) inputFecha.value = hoy;

  document.getElementById("btn-cargar")?.addEventListener("click", cargarAgenda);
  
  cargarAgenda();
});

// Autenticación con PIN persistente por sesión
function verificarAcceso() {
  let pinGuardado = sessionStorage.getItem("barbero_pin");

  if (pinGuardado !== CLAVE_SECRETA) {
    const pinIngresado = prompt("🔐 Ingresá la clave de acceso del barbero:");
    
    if (pinIngresado === CLAVE_SECRETA) {
      sessionStorage.setItem("barbero_pin", pinIngresado);
      return true;
    } else {
      alert("Clave incorrecta. Acceso denegado.");
      document.body.innerHTML = "<h2 style='color: white; text-align: center; margin-top: 50px;'>Acceso no autorizado</h2>";
      return false;
    }
  }
  return true;
}

// Obtiene la agenda del día desde n8n enviando el PIN
async function cargarAgenda() {
  const fecha = document.getElementById("filtro-fecha").value;
  const pin = sessionStorage.getItem("barbero_pin");
  const cont = document.getElementById("lista-turnos");
  cont.innerHTML = "<p style='text-align:center; color:var(--text-muted);'>Cargando agenda...</p>";

  try {
    const res = await fetch(`${WEBHOOK_ADMIN}?accion=obtener&dia=${fecha}&token=${encodeURIComponent(pin)}`);
    const data = await res.json();

    if (data.error || res.status === 401) {
      alert("Sesión no autorizada o PIN incorrecto.");
      sessionStorage.removeItem("barbero_pin");
      location.reload();
      return;
    }

    if (!data.turnos || data.turnos.length === 0) {
      cont.innerHTML = "<p style='text-align:center; color:var(--text-muted);'>No hay turnos registrados para este día.</p>";
      actualizarStats([], 0, 0);
      return;
    }

    renderizarTurnos(data.turnos);
  } catch (err) {
    console.error(err);
    cont.innerHTML = "<p style='text-align:center; color:var(--danger);'>Error al cargar la agenda.</p>";
  }
}

// Dibuja las tarjetas de turnos e historial
function renderizarTurnos(turnos) {
  const cont = document.getElementById("lista-turnos");
  cont.innerHTML = "";

  let totalCaja = 0;
  let cancelados = 0;

  turnos.forEach(t => {
    const esCancelado = t.estado === "cancelado";
    if (esCancelado) {
      cancelados++;
    } else {
      const numPrecio = parseInt((t.precio || "0").replace(/[^0-9]/g, "")) || 0;
      totalCaja += numPrecio;
    }

    const card = document.createElement("div");
    card.className = `admin-card ${esCancelado ? "cancelado" : ""}`;
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <strong style="font-size: 16px; color: var(--accent);">${t.hora} hs</strong>
          <span style="font-size: 12px; color: var(--text-muted); margin-left: 8px;">ID: ${t.id || 'N/A'}</span>
          <h4 style="margin: 4px 0 2px; font-size: 15px;">${t.nombre}</h4>
          <p style="margin: 0; font-size: 12px; color: var(--text-muted);">${t.servicio} (${t.precio})</p>
          <p style="margin: 2px 0 0; font-size: 12px; color: var(--text-muted);">📱 ${t.telefono}</p>
        </div>
        <div style="text-align: right;">
          <span class="badge ${esCancelado ? 'badge-warn' : 'badge-ok'}">${(t.estado || 'confirmado').toUpperCase()}</span>
          <div style="margin-top: 6px; font-size: 11px; color: var(--text-muted);">
            Historial:<br>
            <strong>${t.visitasPrevias || 0} asistencias</strong> | 
            <span style="color: ${t.cancelacionesPrevias > 0 ? '#f87171' : 'inherit'};">${t.cancelacionesPrevias || 0} cancelados</span>
          </div>
        </div>
      </div>

      ${!esCancelado ? `
        <div class="card-actions">
          <button class="btn-action" onclick="avisarDemora('${t.id}', '${t.telefono}', '${t.nombre}', '${t.hora}')">⏳ Avisar Demora</button>
          <button class="btn-action btn-danger" onclick="cancelarTurnoBarbero('${t.id}')">❌ Cancelar</button>
        </div>
      ` : ''}
    `;

    cont.appendChild(card);
  });

  actualizarStats(turnos.length, totalCaja, cancelados);
}

function actualizarStats(total, caja, cancelados) {
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-caja").textContent = `$${caja.toLocaleString("es-AR")}`;
  document.getElementById("stat-cancelados").textContent = cancelados;
}

// Acción 1: Enviar aviso de retraso al cliente
async function avisarDemora(id, telefono, nombre, hora) {
  const minutos = prompt(`¿Cuántos minutos de demora querés avisarle a ${nombre}? (ej: 15)`, "15");
  if (!minutos) return;

  const pin = sessionStorage.getItem("barbero_pin");

  try {
    const res = await fetch(WEBHOOK_ADMIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "avisar_demora",
        token: pin,
        id,
        telefono,
        nombre,
        hora,
        minutos
      })
    });
    
    const data = await res.json();
    alert(data.mensaje || "Aviso de demora enviado correctamente.");
  } catch (err) {
    alert("Error al enviar el aviso de demora.");
  }
}

// Acción 2: Cancelar turno desde el panel del barbero
async function cancelarTurnoBarbero(id) {
  if (!confirm("¿Seguro que querés cancelar este turno?")) return;

  const pin = sessionStorage.getItem("barbero_pin");

  try {
    const res = await fetch(WEBHOOK_ADMIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "cancelar",
        token: pin,
        id,
        canceladoPor: "barbero"
      })
    });

    const data = await res.json();
    alert(data.mensaje || "Turno cancelado.");
    cargarAgenda();
  } catch (err) {
    alert("Error al cancelar el turno.");
  }
}
