const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/pendientes.json');

function leerDatos() {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { pendientes: {}, cooldowns: {} };
  }
}

function guardarDatos(datos) {
  fs.writeFileSync(filePath, JSON.stringify(datos, null, 2), 'utf-8');
}

function tienePendiente(userId) {
  const datos = leerDatos();
  return !!datos.pendientes[userId];
}

function getCooldown(userId) {
  const datos = leerDatos();
  return datos.cooldowns[userId] || null;
}

function setCooldown(userId) {
  const datos = leerDatos();
  datos.cooldowns[userId] = Date.now();
  guardarDatos(datos);
}

function guardarPendiente(userId, respuestas, messageId) {
  const datos = leerDatos();
  datos.pendientes[userId] = { respuestas, messageId, timestamp: Date.now() };
  guardarDatos(datos);
}

function eliminarPendiente(userId) {
  const datos = leerDatos();
  delete datos.pendientes[userId];
  guardarDatos(datos);
}

function getPendiente(userId) {
  const datos = leerDatos();
  return datos.pendientes[userId] || null;
}

module.exports = {
  tienePendiente,
  getCooldown,
  setCooldown,
  guardarPendiente,
  eliminarPendiente,
  getPendiente,
};
