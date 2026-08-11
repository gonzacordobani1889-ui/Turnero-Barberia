const WEBHOOK_ADMIN = "https://cot98.app.n8n.cloud/webhook/turnero-admin";

document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toISOString().split("T")[0];
  const inputFecha = document.getElementById("filtro-fecha");
  if (inputFecha) inputFecha.value = hoy;

  document.getElementById("btn-cargar")?.addEventListener("click", cargarAgenda);

  if (sessionStorage.getItem("barbero_user") && sessionStorage.getItem("barbero_pass")) {
    cargarAgenda();
  } else {
    mostrarPantallaLogin();
  }
});

function mostrarPantallaLogin() {
  let modal = document.getElementById("login-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "login-modal";
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.88); display: flex; align-items: center;
      justify-content: center; z-index: 9999; backdrop-filter: blur(5px);
    `;

    modal.innerHTML = `
      <div style="background: #1e1e1e; padding: 25px; border-radius: 12px; width: 88%; max-width: 340px; text-align: center; border: 1px solid #333; color: white;">
        <h2 style="margin-top: 0; color: #f39c12;">Panel Barbero</h2>
        <p style="font-size: 13px; color: #aaa; margin-bottom: 18px;">Ingresá con tus credenciales</p>
        
        <input type="text" id="auth-user" placeholder="Usuario" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white; box-sizing: border-box; font-size: 16px;">
        <input type="password" id="auth-pass" placeholder="Contraseña" style="width: 100%; padding: 12px; margin-bottom: 18px; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white; box-sizing: border-box; font-size: 16px;">
        
        <button id="btn-login" style="width: 100%; padding: 12px; border-radius: 6px; border: none; background: #f39c12; color: black; font-weight: bold; font-size: 16px; cursor: pointer;">Ingresar</button>
        <p id="login-error" style="color: #f87171; font-size: 12px; margin-top: 10px; display: none;"></p>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("btn-login").addEventListener("click", ejecutarLogin);
  } else {
    modal.style.display = "flex";
  }
}

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
    const textData = await res.text();
    
    if (!textData) return false;
    const data = JSON.parse(textData);

    if (data.error || res.status === 401) return false;

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
    card.style.cssText = "background: #242424; border-radius: 10px; padding: 14px; margin-bottom: 12px; border: 1px solid #333;";

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <strong style="font-size: 18px; color: #f39c12;">${t.hora} hs</strong>
          <span style="font-size: 11px; color: #888; margin-left: 6px;">ID: ${t.id || 'N/A'}</span>
          <h4 style="margin: 4px 0 2px; font-size: 16px; color: #fff;">${t.nombre}</h4>
          <p style="margin: 0; font-size: 13px; color: #aaa;">${t.servicio} (${t.precio})</p>
          <p style="margin: 2px 0 0; font-size: 13px; color: #aaa;">📱 ${t.telefono}</p>
        </div>
        <div style="text-align: right;">
          <span style="padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${esCancelado ? '#ef444422' : '#22c55e22'}; color: ${esCancelado ? '#f87171' : '#4ade80'};">
            ${(t.estado || 'confirmado').toUpperCase()}
          </span>
          <div style="margin-top: 6px; font-size: 11px; color: #888;">
            Asistencias: <strong>${t.visitasPrevias || 0}</strong> | Cancelados: <span style="color: ${t.cancelacionesPrevias > 0 ? '#f87171' : 'inherit'};">${t.cancelacionesPrevias || 0}</span>
          </div>
        </div>
      </div>

      ${!esCancelado ? `
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #333;">
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #aaa;">⏳ Notificar demora al cliente:</p>
          <div style="display: flex; gap: 6px; margin-bottom: 8px;">
            <button onclick="avisarDemora('${t.id}', '${t.telefono}', '${t.nombre}', '${t.hora}', 10)" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #f39c12; background: transparent; color: #f39c12; font-size: 12px; font-weight: bold; cursor: pointer;">+10 min</button>
            <button onclick="avisarDemora('${t.id}', '${t.telefono}', '${t.nombre}', '${t.hora}', 15)" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #f39c12; background: transparent; color: #f39c12; font-size: 12px; font-weight: bold; cursor: pointer;">+15 min</button>
            <button onclick="avisarDemora('${t.id}', '${t.telefono}', '${t.nombre}', '${t.hora}', 20)" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #f39c12; background: transparent; color: #f39c12; font-size: 12px; font-weight: bold; cursor: pointer;">+20 min</button>
          </div>
          <button onclick="cancelarTurnoBarbero('${t.id}')" style="width: 100%; padding: 8px; border-radius: 6px; border: none; background: #ef444422; color: #f87171; font-size: 12px; font-weight: bold; cursor: pointer;">❌ Cancelar Turno</button>
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

// Envío inmediato de demora con botón
async function avisarDemora(id, telefono, nombre, hora, minutos) {
  if (!confirm(`¿Avisar a ${nombre} que vas ${minutos} minutos demorado?`)) return;

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
    alert(data.mensaje || `Aviso de ${minutos} min de demora enviado.`);
  } catch (err) {
    alert("Error al enviar la notificación de demora.");
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
