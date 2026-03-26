# 🏙️ Liberty County RP — Bot de Verificaciones

Bot de Discord para el sistema de whitelist/verificación de la comunidad Liberty County RP.

---

## 📁 Estructura del proyecto

```
lcrp-bot/
├── index.js                  ← Archivo principal
├── package.json
├── .env                      ← ⚠️ AQUÍ VAN TUS IDs (no se sube a GitHub)
├── .gitignore
├── commands/
│   └── verificarme.js        ← Comando /verificarme
├── events/
│   ├── ready.js              ← Evento de inicio
│   └── interactionCreate.js  ← Maneja botones y modales
├── utils/
│   ├── storage.js            ← Lectura/escritura de JSON
│   └── deploy-commands.js    ← Registra comandos slash
└── data/
    └── pendientes.json       ← Guarda verificaciones pendientes y cooldowns
```

---

## ⚙️ Configuración — Dónde colocar los IDs

Abre el archivo **`.env`** y reemplaza cada valor:

```env
BOT_TOKEN=TOKEN_DEL_BOT
CLIENT_ID=ID_DE_LA_APLICACION
GUILD_ID=ID_DEL_SERVIDOR
ROL_CIUDADANO=ID_DEL_ROL_CIUDADANO
ROL_NO_VERIFICADO=ID_DEL_ROL_NO_VERIFICADO
CANAL_VERIFICACIONES=ID_CANAL_DONDE_STAFF_VE_SOLICITUDES
CANAL_COMANDO=ID_CANAL_DONDE_USUARIOS_EJECUTAN_VERIFICARME
```

> ⚠️ El archivo `.env` está en `.gitignore` — nunca se sube a GitHub automáticamente.
> En Railway, debes agregar estas variables en la sección **Variables** del proyecto.

---

## 🚀 Instalación local (para probar)

```bash
npm install
node utils/deploy-commands.js   # Registra los comandos slash (solo una vez)
node index.js                   # Inicia el bot
```

---

## 🌐 Deploy en Railway

1. Sube el proyecto a GitHub (sin el `.env`)
2. En Railway → **New Project** → **Deploy from GitHub Repo**
3. Selecciona el repositorio
4. Ve a **Variables** y agrega todas las del `.env`
5. Railway iniciará el bot automáticamente con `npm start`

---

## 🔄 Flujo del sistema

```
Usuario: /verificarme
    ↓
Mensaje privado (ephemeral) con botón "Iniciar Verificación"
    ↓
Modal Sección 1 — Identidad (5 preguntas)
    ↓
Modal Sección 2 — Conocimientos RP (5 preguntas)
    ↓
Modal Sección 3 — RP Avanzado + Ingreso (5 preguntas)
    ↓
Embed enviado al canal de verificaciones con botones [✅ Aceptar] [❌ Rechazar]
    ↓
Staff acepta → rol Ciudadano agregado + rol No Verificado removido + DM al usuario
Staff rechaza → modal con razón → DM al usuario con la razón
```
