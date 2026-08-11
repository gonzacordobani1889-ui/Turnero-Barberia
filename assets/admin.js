// URL del Webhook Admin en n8n
const WEBHOOK_ADMIN = "https://cot98.app.n8n.cloud/webhook/turnero-admin";

document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toISOString().split("T")[0];
  const inputFecha = document.getElementById("filtro-fecha");
  if (inputFecha) inputFecha.value = hoy;

  document.getElementById("btn-cargar")?.addEventListener("click", cargarAgenda);

  // Verificar si hay credenciales guardadas en la sesión
  if (sessionStorage.getItem("barbero_user") && sessionStorage.getItem("barbero_pass")) {
    cargarAgenda();
  } else {
    mostrarPantallaLogin();
  }
});

// Muestra el formulario de Login sobre la pantalla
function mostrarPantallaLogin() {
  let modal = document.getElementById("login-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "login-modal";
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.85); display: flex; align-items: center;
      justify-content: center; z-index: 9999; backdrop-filter: blur(5px);
    `;

    modal.innerHTML = `
      <div style="background: #1e1e1e; padding: 30px; border-radius: 12px; width: 90%; max-width: 350px; text-align: center; border: 1px solid #333; color: white; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <h2 style="margin-top: 0; color: var(--accent, #f39c12);">Panel Barbero</h2>
        <p style="font-size: 13px; color: #aaa; margin-bottom: 20px;">Ingresá tus credenciales para continuar</p>
        
        <input type="text" id="auth-user" placeholder="Usuario" style="width: 100%; padding: 10px; margin-bottom: 12px; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white; box-sizing: border-box;">
        <input type="password" id="auth-pass" placeholder="Contraseña" style="width: 100%; padding: 10px; margin-bottom: 20px; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white; box-sizing: border-box;">
        
        <button id="btn-login" style="width: 100%; padding: 12px; border-radius: 6px; border: none; background: var(--accent, #f39c12); color: black; font-weight: bold; cursor: pointer;">Ingresar</button>
        <p id="login-error" style="color: #f87171; font-size: 12px; margin-top: 12px; display: none;"></p>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("btn-login").addEventListener("click", ejecutarLogin);
  } else {
    modal.style.display = "flex";
  }
}

// Procesa el formulario de login
async function ejecutarLogin() {
  const user = document.getElementById("auth-user").value.trim();
  const pass = document.getElementById("auth-pass").value.trim();
  const errorLbl = document.getElementById("login-error");

  if (!user || !pass) {
    errorLbl.textContent = "Completá usuario y contraseña.";
    errorLbl.style.display = "block";
    return;
  }

  sessionStorage.setItem("barbero_user", user);
  sessionStorage.setItem("barbero_pass", pass);

  errorLbl.style.display = "none";
  const exito = await cargarAgenda();

  if (exito) {
    document.getElementById("login-modal").style.display = "none";
  } else {
    sessionStorage.removeItem("barbero_user");
    sessionStorage.removeItem("barbero_pass");
    errorLbl.textContent = "Usuario o contraseña incorrectos.";
    errorLbl.style.display = "block";
  }
}

// Obtiene la agenda desde n8n validando credenciales
async function cargarAgenda() {
  const fecha = document.getElementById("filtro-fecha").value;
  const user = sessionStorage.getItem("barbero_user");
  const pass = sessionStorage.getItem("barbero_pass");
  const cont = document.getElementById("lista-turnos");

  if (!user || !pass) {
    mostrarPantallaLogin();
    return false;
  }

  if (cont) cont.innerHTML = "<p style='text-align:center; color:var(--text-muted);'>Cargando agenda...</p>";

  try {
    const res = await fetch(`${WEBHOOK_ADMIN}?accion=obtener&dia=${fecha}&usuario=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
    const data = await res.json();

    if (data.error || res.status === 401) {
      return false;
    }

    if (!data.turnos || data.turnos.length === 0) {
      if (cont) cont.innerHTML = "<p style='text-align:center; color:var(--text-muted);'>No hay turnos registrados para este día.</p>";
      actualizarStats([], 0, 0);
      return true;
    }

    renderizarTurnos(data.turnos);
    return true;
  } catch (err) {
    console.error(err);
    if (cont) cont.innerHTML = "<p style='text-align:center; color:var(--danger);'>Error al cargar la agenda.</p>";
    return false;
  }
}

// Dibuja las tarjetas de turnos e historial
function renderizarTurnos(turnos) {
  const cont = document.getElementById("lista-turnos");
  if (!cont) return;
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
  if (document.getElementById("stat-total")) document.getElementById("stat-total").textContent = total;
  if (document.getElementById("stat-caja")) document.getElementById("stat-caja").textContent = `$${caja.toLocaleString("es-AR")}`;
  if (document.getElementById("stat-cancelados")) document.getElementById("stat-cancelados").textContent = cancelados;
}

// Acciones con credenciales adjuntas
async function avisarDemora(id, telefono, nombre, hora) {
  const minutos = prompt(`¿Cuántos minutos de demora querés avisarle a ${nombre}? (ej: 15)`, "15");
  if (!minutos) return;

  const user = sessionStorage.getItem("barbero_user");
  const pass = sessionStorage.getItem("barbero_pass");

  try {
    const res = await fetch(WEBHOOK_ADMIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "avisar_demora",
        usuario: user,
        password: pass,
        id, telefono, nombre, hora, minutos
      })
    });
    
    const data = await res.json();
    alert(data.mensaje || "Aviso de demora enviado correctamente.");
  } catch (err) {
    alert("Error al enviar el aviso de demora.");
  }
}

async function cancelarTurnoBarbero(id) {
  if (!confirm("¿Seguro que querés cancelar este turno?")) return;

  const user = sessionStorage.getItem("barbero_user");
  const pass = sessionStorage.getItem("barbero_pass");

  try {
    const res = await fetch(WEBHOOK_ADMIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "cancelar",
        usuario: user,
        password: pass,
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
