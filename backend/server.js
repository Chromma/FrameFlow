/**
 * FrameFlow — Servidor logístico audiovisual
 * API REST con persistencia local en archivos JSON.
 *
 * Entidades: proyectos, crew, listas_interes, mensajes (chat)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuración del servidor
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT) || 3000;

/** Orígenes habituales del frontend local (Live Server, Vite, etc.) */
const CORS_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // Peticiones sin origen (Postman, curl, apps nativas)
      if (!origin || CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Frontend estático (carpeta ../frontend)
// ---------------------------------------------------------------------------

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ---------------------------------------------------------------------------
// Persistencia en archivos JSON (fs)
// ---------------------------------------------------------------------------

const DATA_DIR = __dirname;
const FILE_PROYECTOS = path.join(DATA_DIR, 'proyectos.json');
const FILE_CREW = path.join(DATA_DIR, 'crew.json');
const FILE_MENSAJES = path.join(DATA_DIR, 'mensajes.json');

/**
 * Crea un archivo JSON con estructura vacía si aún no existe en disco.
 * @param {string} ruta - Ruta absoluta del archivo
 */
function asegurarArchivo(ruta) {
  if (!fs.existsSync(ruta)) {
    fs.writeFileSync(ruta, '[]\n', 'utf8');
  }
}

/** Inicializa los archivos de datos al arrancar el servidor */
function inicializarArchivos() {
  asegurarArchivo(FILE_PROYECTOS);
  asegurarArchivo(FILE_CREW);
  asegurarArchivo(FILE_MENSAJES);
}

/** Lee un array JSON desde disco; si falla el parseo devuelve fallback */
function leerJsonArray(ruta) {
  try {
    const raw = fs.readFileSync(ruta, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Escribe un array en disco con formato legible */
function escribirJsonArray(ruta, data) {
  fs.writeFileSync(ruta, JSON.stringify(data, null, 2), 'utf8');
}

function leerProyectos() {
  return leerJsonArray(FILE_PROYECTOS);
}

function guardarProyectos(data) {
  escribirJsonArray(FILE_PROYECTOS, data);
}

function leerCrew() {
  return leerJsonArray(FILE_CREW);
}

function guardarCrew(data) {
  escribirJsonArray(FILE_CREW, data);
}

function leerMensajes() {
  return leerJsonArray(FILE_MENSAJES);
}

function guardarMensajes(data) {
  escribirJsonArray(FILE_MENSAJES, data);
}

inicializarArchivos();

// ---------------------------------------------------------------------------
// Base de datos (caché en memoria sincronizada con JSON)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Tarea
 * @property {string} id
 * @property {string} text
 * @property {boolean} done
 */

/**
 * @typedef {Object} Proyecto
 * @property {string} id
 * @property {string} nombre
 * @property {string} cliente
 * @property {'comercial'|'cine'|'web'} tipoProduccion
 * @property {number} colorAsignado - Índice de la paleta de colores (0-5)
 * @property {number} presupuestoBase
 * @property {string} fechaInicioRodaje - ISO date (YYYY-MM-DD)
 * @property {string} fechaFinRodaje - ISO date (YYYY-MM-DD)
 * @property {Tarea[]} tareas
 * @property {string[]} locacionesVinculadas - IDs del catálogo de locaciones
 * @property {string[]} castingVinculado - IDs del catálogo de actores
 * @property {string} [descripcion]
 * @property {'planificacion'|'produccion'|'finalizado'|'archivado'} [estado]
 * @property {number} [progreso]
 * @property {string} creadoEn
 */

/**
 * @typedef {Object} CrewMember
 * @property {string} id
 * @property {string} nombre
 * @property {string} rol
 * @property {'planta'|'freelancer'} tipoContrato
 * @property {number|null} tarifa - Tarifa por jornada (solo freelancers)
 * @property {string} creadoEn
 */

/**
 * @typedef {Object} MensajeChat
 * @property {string} id
 * @property {string} proyectoId
 * @property {string} emisorId
 * @property {string} receptorId
 * @property {string} texto
 * @property {string} creadoEn
 */

/**
 * @typedef {Object} ListaInteresItem
 * @property {string} id
 * @property {'locacion'|'casting'} tipo
 * @property {string} nombre
 * @property {string} agregadoEn
 */

/**
 * @typedef {Object} ListaInteres
 * @property {string} id
 * @property {string} nombre
 * @property {ListaInteresItem[]} items
 * @property {string} [creadoEn]
 */

/** @type {Proyecto[]} */
let proyectos = leerProyectos();

/** @type {CrewMember[]} */
let crew = leerCrew();

/** @type {MensajeChat[]} */
let mensajes = leerMensajes();

/** @type {ListaInteres[]} */
const listas_interes = [
  {
    id: 'list-urdesa',
    nombre: 'Locaciones de Lujo Urdesa',
    items: [],
    creadoEn: new Date().toISOString(),
  },
  {
    id: 'list-voces',
    nombre: 'Casting Voces Juveniles',
    items: [],
    creadoEn: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/** Genera un identificador único con prefijo legible */
function generarId(prefijo) {
  return `${prefijo}-${Date.now()}`;
}

/** Busca un proyecto por ID o devuelve null */
function buscarProyecto(id) {
  return proyectos.find((p) => p.id === id) || null;
}

/** Normaliza el tipo de recurso recibido en la petición de vinculación */
function normalizarTipoRecurso(valor) {
  const tipo = String(valor || '').toLowerCase().trim();
  if (['locacion', 'locación', 'location'].includes(tipo)) return 'locacion';
  if (['actor', 'casting', 'actores'].includes(tipo)) return 'actor';
  return null;
}

/** Calcula el progreso a partir de las tareas completadas */
function calcularProgreso(tareas) {
  if (!tareas || tareas.length === 0) return 0;
  const completadas = tareas.filter((t) => t.done).length;
  return Math.round((completadas / tareas.length) * 100);
}

/** RegEx estrictas: correos, teléfonos (7+ dígitos) y redes externas */
const RE_CONTACTO_EXTERNO = [
  /[^\s@]+@[^\s@]+\.[^\s@]+/i,
  /\d{7,}/,
  /whatsapp/i,
  /instagram/i,
];

/** Devuelve true si el texto contiene datos de contacto externo prohibidos */
function contieneContactoExterno(texto) {
  const valor = String(texto || '');
  return RE_CONTACTO_EXTERNO.some((re) => re.test(valor));
}

// ---------------------------------------------------------------------------
// Rutas: Proyectos
// ---------------------------------------------------------------------------

/**
 * GET /api/proyectos
 * Devuelve la lista completa de proyectos almacenados en proyectos.json.
 * Incluye metadatos de conteo para facilitar la paginación futura en el frontend.
 */
app.get('/api/proyectos', (_req, res) => {
  proyectos = leerProyectos();
  res.json({
    ok: true,
    total: proyectos.length,
    data: proyectos,
  });
});

/**
 * POST /api/proyectos
 * Crea un proyecto nuevo a partir de los datos enviados en el cuerpo JSON.
 *
 * Campos esperados:
 * - nombre (requerido)
 * - cliente (requerido)
 * - tipoProduccion: 'comercial' | 'cine' | 'web'
 * - colorAsignado: número 0-5
 * - presupuestoBase: número
 * - fechaInicioRodaje / fechaFinRodaje: strings ISO date
 * - tareas: array opcional de { id, text, done }
 * - descripcion, estado, progreso: opcionales
 *
 * También acepta alias en inglés (name, client, type, budget, start, end)
 * para compatibilidad con el frontend FrameFlowDB.
 */
app.post('/api/proyectos', (req, res) => {
  const body = req.body || {};

  const nombre = String(body.nombre || body.name || '').trim();
  const cliente = String(body.cliente || body.client || '').trim();

  if (!nombre || !cliente) {
    return res.status(400).json({
      ok: false,
      error: 'Los campos "nombre" y "cliente" son obligatorios.',
    });
  }

  const tareas = Array.isArray(body.tareas)
    ? body.tareas
    : Array.isArray(body.tasks)
      ? body.tasks
      : [];

  const proyecto = {
    id: generarId('p'),
    nombre,
    cliente,
    tipoProduccion: body.tipoProduccion || body.type || 'comercial',
    colorAsignado: Number(body.colorAsignado ?? body.colorIndex ?? 0),
    presupuestoBase: Number(body.presupuestoBase ?? body.budget ?? 0),
    fechaInicioRodaje: body.fechaInicioRodaje || body.start || '',
    fechaFinRodaje: body.fechaFinRodaje || body.end || '',
    tareas,
    locacionesVinculadas: [],
    castingVinculado: [],
    descripcion: body.descripcion || body.description || '',
    estado: body.estado || body.status || 'planificacion',
    progreso: body.progreso ?? body.progress ?? calcularProgreso(tareas),
    creadoEn: new Date().toISOString(),
  };

  proyectos = leerProyectos();
  proyectos.unshift(proyecto);
  guardarProyectos(proyectos);

  return res.status(201).json({
    ok: true,
    message: 'Proyecto creado correctamente.',
    data: proyecto,
  });
});

/**
 * POST /api/proyectos/:id/vincular
 * Agrega un ID de locación o actor al array de recursos del proyecto indicado.
 *
 * Cuerpo JSON esperado:
 * - tipo / resourceType: 'locacion' | 'actor'
 * - recursoId / resourceId: string con el ID del catálogo
 *
 * Evita duplicados y responde si el recurso ya estaba vinculado.
 */
app.post('/api/proyectos/:id/vincular', (req, res) => {
  const { id } = req.params;
  proyectos = leerProyectos();
  const proyecto = buscarProyecto(id);

  if (!proyecto) {
    return res.status(404).json({
      ok: false,
      error: `Proyecto con id "${id}" no encontrado.`,
    });
  }

  const tipoRecurso = normalizarTipoRecurso(
    req.body.tipo || req.body.resourceType || req.body.tipoRecurso
  );
  const recursoId = String(
    req.body.recursoId || req.body.resourceId || req.body.id || ''
  ).trim();

  if (!tipoRecurso) {
    return res.status(400).json({
      ok: false,
      error: 'El campo "tipo" debe ser "locacion" o "actor".',
    });
  }

  if (!recursoId) {
    return res.status(400).json({
      ok: false,
      error: 'El campo "recursoId" es obligatorio.',
    });
  }

  const campo = tipoRecurso === 'locacion' ? 'locacionesVinculadas' : 'castingVinculado';
  const lista = proyecto[campo];
  const yaVinculado = lista.includes(recursoId);

  if (!yaVinculado) {
    lista.push(recursoId);
    guardarProyectos(proyectos);
  }

  return res.json({
    ok: true,
    message: yaVinculado
      ? 'El recurso ya estaba vinculado a este proyecto.'
      : 'Recurso vinculado correctamente.',
    yaVinculado,
    data: proyecto,
  });
});

// ---------------------------------------------------------------------------
// Rutas: Crew técnico recurrente
// ---------------------------------------------------------------------------

/**
 * GET /api/crew
 * Obtiene el equipo técnico recurrente registrado en la productora.
 * Útil para autocompletar asignaciones en hojas de llamado y configuración.
 */
app.get('/api/crew', (_req, res) => {
  crew = leerCrew();
  res.json({
    ok: true,
    total: crew.length,
    data: crew,
  });
});

/**
 * POST /api/crew
 * Registra un nuevo miembro del equipo técnico.
 *
 * Campos esperados:
 * - nombre (requerido)
 * - rol: cargo técnico (ej. Fotografía, Sonido)
 * - tipoContrato / contrato: 'planta' | 'freelancer'
 * - tarifa / tarifaJornada: número (requerido si es freelancer)
 */
app.post('/api/crew', (req, res) => {
  const body = req.body || {};
  const nombre = String(body.nombre || '').trim();

  if (!nombre) {
    return res.status(400).json({
      ok: false,
      error: 'El campo "nombre" es obligatorio.',
    });
  }

  const tipoContrato =
    body.tipoContrato === 'freelancer' || body.contrato === 'freelancer'
      ? 'freelancer'
      : 'planta';

  const tarifa =
    tipoContrato === 'freelancer'
      ? Number(body.tarifa ?? body.tarifaJornada ?? 0)
      : null;

  const miembro = {
    id: generarId('crew'),
    nombre,
    rol: body.rol || 'Dirección',
    tipoContrato,
    tarifa,
    creadoEn: new Date().toISOString(),
  };

  crew = leerCrew();
  crew.unshift(miembro);
  guardarCrew(crew);

  return res.status(201).json({
    ok: true,
    message: 'Miembro del crew registrado correctamente.',
    data: miembro,
  });
});

// ---------------------------------------------------------------------------
// Rutas: Chat interno
// ---------------------------------------------------------------------------

/**
 * POST /api/chats/enviar
 * Registra un mensaje del chat interno vinculado a una campaña/proyecto.
 *
 * Cuerpo JSON esperado:
 * - proyectoId (requerido)
 * - emisorId (requerido)
 * - receptorId (requerido)
 * - texto / mensaje (requerido)
 *
 * Aplica filtro de seguridad: bloquea correos, teléfonos largos,
 * WhatsApp e Instagram antes de persistir en mensajes.json.
 */
app.post('/api/chats/enviar', (req, res) => {
  const body = req.body || {};
  const proyectoId = String(body.proyectoId || '').trim();
  const emisorId = String(body.emisorId || '').trim();
  const receptorId = String(body.receptorId || '').trim();
  const texto = String(body.texto || body.mensaje || '').trim();

  if (!proyectoId || !emisorId || !receptorId || !texto) {
    return res.status(400).json({
      ok: false,
      error: 'Los campos proyectoId, emisorId, receptorId y texto son obligatorios.',
    });
  }

  if (contieneContactoExterno(texto)) {
    return res.status(400).json({
      ok: false,
      error: 'Contacto externo restringido',
    });
  }

  proyectos = leerProyectos();
  if (!buscarProyecto(proyectoId)) {
    return res.status(404).json({
      ok: false,
      error: `Proyecto con id "${proyectoId}" no encontrado.`,
    });
  }

  const mensaje = {
    id: generarId('msg'),
    proyectoId,
    emisorId,
    receptorId,
    texto,
    creadoEn: new Date().toISOString(),
  };

  mensajes = leerMensajes();
  mensajes.push(mensaje);
  guardarMensajes(mensajes);

  return res.status(201).json({
    ok: true,
    message: 'Mensaje enviado correctamente.',
    data: mensaje,
  });
});

/**
 * GET /api/chats/:proyectoId
 * Recupera el historial de mensajes de una campaña ordenado cronológicamente.
 */
app.get('/api/chats/:proyectoId', (req, res) => {
  const { proyectoId } = req.params;
  mensajes = leerMensajes();

  const historial = mensajes
    .filter((m) => m.proyectoId === proyectoId)
    .sort((a, b) => new Date(a.creadoEn) - new Date(b.creadoEn));

  return res.json({
    ok: true,
    total: historial.length,
    data: historial,
  });
});

// ---------------------------------------------------------------------------
// Ruta de salud y manejo de errores
// ---------------------------------------------------------------------------

/** Verificación rápida de que el API responde */
app.get('/api/health', (_req, res) => {
  proyectos = leerProyectos();
  crew = leerCrew();
  mensajes = leerMensajes();

  res.json({
    ok: true,
    servicio: 'FrameFlow Logística Audiovisual',
    entidades: {
      proyectos: proyectos.length,
      crew: crew.length,
      mensajes: mensajes.length,
      listas_interes: listas_interes.length,
    },
  });
});

/** Respuesta estándar para rutas no definidas */
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Ruta no encontrada.' });
});

/** Manejo centralizado de errores (incluye fallos de CORS) */
app.use((err, _req, res, _next) => {
  const status = err.message?.includes('CORS') ? 403 : 500;
  res.status(status).json({
    ok: false,
    error: err.message || 'Error interno del servidor.',
  });
});

// ---------------------------------------------------------------------------
// Arranque del servidor
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Servidor logístico audiovisual corriendo en http://localhost:${PORT}`);
});

module.exports = {
  app,
  proyectos,
  crew,
  mensajes,
  listas_interes,
  leerProyectos,
  guardarProyectos,
  leerCrew,
  guardarCrew,
  leerMensajes,
  guardarMensajes,
  contieneContactoExterno,
};
