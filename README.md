# Turnero Barbería

Sistema de reserva de turnos online para barbería. Sin WhatsApp, vía web.

## Estructura

```
turnero-barberia/
├── index.html          → página de reserva (cliente)
├── panel.html           → panel del barbero (a definir)
├── assets/
│   ├── styles.css        → estilos generales
│   └── script.js         → lógica de reserva (llama al webhook de n8n)
└── README.md
```

## Stack

- **Frontend**: HTML/CSS/JS plano, alojado en GitHub Pages
- **Backend/lógica**: n8n (self-hosted en DattaWeb) — recibe el turno vía webhook, valida disponibilidad y lo guarda
- **Base de datos**: Google Sheets (una fila por turno)

## Estado actual

- [x] Estructura del repo
- [x] Frontend de reserva (con datos de prueba, sin conectar)
- [ ] Webhook de n8n para guardar turnos
- [ ] Conectar frontend con el webhook real
- [ ] Panel del barbero
- [ ] Recordatorios por mail (n8n)

## Cómo publicar en GitHub Pages

1. Crear el repo en GitHub y subir estos archivos
2. Ir a Settings → Pages
3. Source: rama `main`, carpeta `/ (root)`
4. Guardar. La página queda en `https://<usuario>.github.io/turnero-barberia/`
