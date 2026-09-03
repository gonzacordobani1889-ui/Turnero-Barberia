console.log("¡El motor del turnero está conectado y funcionando, Gonza!");
// Variable para ir guardando lo que elige el cliente
let reserva = {
    servicio: '',
    precio: '',
    barbero: '',
    fecha: '',
    hora: ''
};

// Función maestra para cambiar de paso
function goToStep(numeroPaso) {
    // Escondemos todos los pasos
    document.querySelectorAll('.wizard-step').forEach(paso => {
        paso.classList.remove('active');
        paso.classList.add('hidden');
    });
    
    // Mostramos solo el paso que necesitamos
    const pasoActual = document.getElementById('step-' + numeroPaso);
    pasoActual.classList.remove('hidden');
    pasoActual.classList.add('active');

    // Si llegamos al último paso, actualizamos la cajita de resumen
    if (numeroPaso === 4) {
        actualizarResumen();
    }
}

// PASO 1: Elegir Servicio
document.querySelectorAll('.opt-list-btn').forEach(boton => {
    boton.addEventListener('click', function() {
        // Despintar los otros botones y pintar este
        document.querySelectorAll('.opt-list-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        
        // Guardar la data
        reserva.servicio = this.getAttribute('data-val');
        reserva.precio = this.getAttribute('data-price');
        
        // Avanzar al Paso 2 automáticamente con un micro-retraso para que se vea el clic
        setTimeout(() => goToStep(2), 350);
    });
});

// PASO 2: Elegir Barbero
document.querySelectorAll('.agent-card').forEach(tarjeta => {
    tarjeta.addEventListener('click', function() {
        // Despintar y pintar
        document.querySelectorAll('.agent-card').forEach(t => t.classList.remove('selected'));
        this.classList.add('selected');
        
        // Guardar la data
        reserva.barbero = this.getAttribute('data-val');
        
        // Avanzar al Paso 3 automáticamente
        setTimeout(() => goToStep(3), 350);
    });
});

// PASO 3: Calendario y Horarios (Simulación para que funcione la interfaz)
const grillaCalendario = document.getElementById('calendar-grid');

// Generamos 30 días visuales para que el cliente pueda clickear
for(let i = 1; i <= 30; i++) {
    let diaDiv = document.createElement('div');
    diaDiv.classList.add('cal-day');
    diaDiv.innerText = i;
    
    // Deshabilitamos los primeros días para simular que ya pasaron
    if(i < 5) {
        diaDiv.classList.add('disabled');
    } else {
        diaDiv.addEventListener('click', function() {
            document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
            this.classList.add('selected');
            reserva.fecha = i + ' de Septiembre'; // Mes estático por ahora
            
            // Mostrar los horarios
            document.getElementById('time-selection-container').classList.remove('hidden');
            document.getElementById('selected-date-display').innerText = reserva.fecha;
            
            chequearPaso3();
        });
    }
    grillaCalendario.appendChild(diaDiv);
}

// Configurar clics de los botones de horarios (que están en el HTML)
function configurarHorarios(contenedorId, horarios) {
    const contenedor = document.getElementById(contenedorId);
    horarios.forEach(hora => {
        let btn = document.createElement('button');
        btn.classList.add('time-btn');
        btn.innerText = hora;
        btn.addEventListener('click', function() {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            reserva.hora = hora;
            chequearPaso3();
        });
        contenedor.appendChild(btn);
    });
}

// Inyectamos horarios de prueba
configurarHorarios('times-morning', ['10:00', '10:30', '11:00']);
configurarHorarios('times-afternoon', ['16:00', '16:30', '17:00']);
configurarHorarios('times-evening', ['18:00', '19:00', '19:30']);

// Habilitar botón "Siguiente" solo si eligió Día Y Hora
function chequearPaso3() {
    const btnSiguiente = document.getElementById('btn-next-step3');
    if (reserva.fecha !== '' && reserva.hora !== '') {
        btnSiguiente.disabled = false;
    } else {
        btnSiguiente.disabled = true;
    }
}

// PASO 4: Resumen Final
function actualizarResumen() {
    document.getElementById('sum-service').innerText = reserva.servicio;
    document.getElementById('sum-date').innerText = reserva.fecha + ' a las ' + reserva.hora + ' hs';
    document.getElementById('sum-barber').innerText = 'Con: ' + reserva.barbero;
    document.getElementById('sum-price').innerText = reserva.precio;
}

// Botón de Confirmar (CONECTADO A N8N - CORREGIDO)
document.getElementById('confirm').addEventListener('click', function() {
    const nombre = document.getElementById('name').value;
    const telefono = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    
    if(nombre === '' || telefono === '' || email === '') {
        alert('Por favor, completá todos tus datos para confirmar tu turno.');
        return;
    }
    
    const boton = this;
    const msjFinal = document.getElementById('summary');
    msjFinal.style.color = "var(--accent-mav)";
    msjFinal.innerText = "Enviando reserva al sistema...";
    boton.disabled = true;
    
    // Pegá acá tu URL (Fijate el detalle de test vs producción abajo)
    const webhookUrl = 'https://cot98.app.n8n.cloud/webhook/turnero-nuevo-turno'; 

    // 1. AHORA LOS NOMBRES COINCIDEN EXACTAMENTE CON LOS DE N8N
    const datosTurno = {
        nombre: nombre,
        telefono: telefono,
        mail: email,
        servicio: reserva.servicio,
        precio: reserva.precio,
        dia: reserva.fecha,
        hora: reserva.hora
    };

    // 2. Hacemos el disparo
    fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosTurno)
    })
    .then(response => response.json()) // Transformamos la respuesta de n8n a código
    .then(data => {
        // 3. LEEMOS EL "ok" QUE DEVUELVE N8N EN SU RESPUESTA
        if(data.ok === true) {
            msjFinal.style.color = "#4CAF50"; 
            msjFinal.innerText = "¡Turno confirmado, " + nombre + "! Te esperamos.";
            boton.innerText = "Reserva Exitosa";
            boton.style.background = "#4CAF50";
        } else {
            // Si n8n lo rechaza (ej. "Demasiados intentos" o "Ese horario ya fue reservado")
            msjFinal.style.color = "var(--danger-mav)";
            msjFinal.innerText = data.mensaje; // Muestra el mensaje real que armaste en n8n
            boton.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error al conectar con n8n:', error);
        msjFinal.style.color = "var(--danger-mav)";
        msjFinal.innerText = "Hubo un error al procesar el turno. Intentá de nuevo.";
        boton.disabled = false; 
    });
});
