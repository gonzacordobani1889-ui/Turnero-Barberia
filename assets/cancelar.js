const WEBHOOK_ADMIN = "https://cot98.app.n8n.cloud/webhook/turnero-admin";

document.addEventListener("DOMContentLoaded", () => {
  // Leer parámetros URL (?id=...&tel=...)
  const params = new URLSearchParams(window.location.search);
  const idUrl = params.get("id");
  const telUrl = params.get("tel");

  const inputId = document.getElementById("cancel-id");
  const inputPhone = document.getElementById("cancel-phone");

  if (inputId && idUrl) inputId.value = idUrl;
  if (inputPhone && telUrl) inputPhone.value = telUrl;

  const btnCancelar = document.getElementById("btn-cancelar-cliente");
  if (btnCancelar) {
    btnCancelar.addEventListener("click", procesarCancelacionCliente);
  }
});

async function procesarCancelacionCliente() {
  const idInput = document.getElementById("cancel-id");
  const phoneInput = document.getElementById("cancel-phone");

  const id = idInput ? idInput.value.trim() : "";
  const telefono = phoneInput ? phoneInput.value.trim() : "";

  if (!telefono && !id) {
    mostrarResumen("Por favor, ingresá tu número de teléfono para buscar tu reserva.", "error");
    return;
  }

  if (!confirm("¿Seguro que querés cancelar tu turno?")) return;

  mostrarResumen("Cancelando reserva...", "");

  try {
    const res = await fetch(WEBHOOK_ADMIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "cancelar_cliente",
        id: id,
        telefono: telefono
      })
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      mostrarResumen("¡Tu turno ha sido cancelado con éxito! Gracias por avisar.", "ok");
      if (idInput) idInput.value = "";
      if (phoneInput) phoneInput.value = "";
    } else {
      mostrarResumen(data.mensaje || "No encontramos una reserva activa con esos datos.", "error");
    }
  } catch (err) {
    console.error("Error en cancelación:", err);
    mostrarResumen("Error de conexión al intentar cancelar. Probá de nuevo.", "error");
  }
}

function mostrarResumen(mensaje, tipo) {
  const summary = document.getElementById("cancel-summary");
  if (!summary) return;
  summary.className = `summary ${tipo}`;
  summary.textContent = mensaje;
}
