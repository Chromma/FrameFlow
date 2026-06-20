/**
 * FrameFlow — Capa de persistencia LocalStorage
 * Centraliza proyectos, alertas, perfil y catálogo de referencia.
 */
(function (global) {
  'use strict';

  const KEYS = {
    projects: 'ff_projects',
    alerts: 'ff_alerts',
    clients: 'ff_clients',
    user: 'ff_user',
    initialized: 'ff_db_initialized_v1',
  };

  const COLOR_PALETTE = [
    { bar: 'from-cyan-500 to-cyan-400', badge: 'bg-cyan-500/15 text-cyan-400', border: 'border-cyan-500/30' },
    { bar: 'from-violet-500 to-violet-400', badge: 'bg-violet-500/15 text-violet-400', border: 'border-violet-500/30' },
    { bar: 'from-emerald-500 to-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400', border: 'border-emerald-500/30' },
    { bar: 'from-amber-500 to-amber-400', badge: 'bg-amber-500/15 text-amber-400', border: 'border-amber-500/30' },
    { bar: 'from-rose-500 to-rose-400', badge: 'bg-rose-500/15 text-rose-400', border: 'border-rose-500/30' },
    { bar: 'from-fuchsia-500 to-fuchsia-400', badge: 'bg-fuchsia-500/15 text-fuchsia-400', border: 'border-fuchsia-500/30' },
  ];

  const TYPE_LABELS = { comercial: 'Comercial', cine: 'Cine', web: 'Web' };

  const STATUS_META = {
    planificacion: { label: 'Planificación', badge: 'bg-violet-500/15 text-violet-400' },
    produccion: { label: 'En Producción', badge: 'bg-cyan-500/15 text-cyan-400' },
    finalizado: { label: 'Finalizado', badge: 'bg-zinc-600/30 text-zinc-400' },
  };

  /** Catálogo estático de referencia (ids usados en asignaciones) */
  const CATALOGO = {
    locaciones: [
      { id: 'loc-001', nombre: 'Estudio Ciclorama Blanco', precioJornada: 680, imagen: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=400&fit=crop', ubicacion: { ciudad: 'Guayaquil', sector: 'Urdesa' } },
      { id: 'loc-002', nombre: 'Apartamento Minimalista', precioJornada: 920, imagen: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&h=400&fit=crop', ubicacion: { ciudad: 'Guayaquil', sector: 'Puerto Santa Ana' } },
      { id: 'loc-003', nombre: 'Hacienda Rústica', precioJornada: 1450, imagen: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=400&fit=crop', ubicacion: { ciudad: 'Guayaquil', sector: 'Samborondón' } },
      { id: 'loc-004', nombre: 'Casona Colonial', precioJornada: 1100, imagen: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=400&fit=crop', ubicacion: { ciudad: 'Guayaquil', sector: 'Centro Histórico' } },
      { id: 'loc-005', nombre: 'Loft Creativo Vía a la Costa', precioJornada: 780, imagen: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop', ubicacion: { ciudad: 'Guayaquil', sector: 'Vía a la Costa' } },
      { id: 'loc-006', nombre: 'Terraza Skyline Urdesa', precioJornada: 540, imagen: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=400&fit=crop', ubicacion: { ciudad: 'Guayaquil', sector: 'Urdesa' } },
    ],
    actores: [
      { id: 'a1', nombre: 'Valentina Ríos', tipo: 'cine', edad: 28, imagen: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces', ubicacion: { ciudad: 'Guayaquil', sector: 'Urdesa' } },
      { id: 'a2', nombre: 'Mateo Duarte', tipo: 'teatro', edad: 34, imagen: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces', ubicacion: { ciudad: 'Guayaquil', sector: 'Samborondón' } },
      { id: 'a3', nombre: 'Lucía Navarro', tipo: 'voz', edad: 24, imagen: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=faces', ubicacion: { ciudad: 'Guayaquil', sector: 'Centro Histórico' } },
      { id: 'a4', nombre: 'Diego Salinas', tipo: 'cine', edad: 41, imagen: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces', ubicacion: { ciudad: 'Guayaquil', sector: 'Puerto Santa Ana' } },
    ],
  };

  const TIPO_ACTOR_LABELS = { voz: 'Voz', teatro: 'Teatro', cine: 'Cine' };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function formatBudget(amount) {
    const n = Number(amount) || 0;
    return '$' + n.toLocaleString('en-US') + ' USD';
  }

  function seedIfNeeded() {
    if (localStorage.getItem(KEYS.initialized)) return;

    const projects = [
      { id: 'p1', name: 'Campaña Verano 2026', client: 'Marca Sol', type: 'comercial', status: 'planificacion', progress: 35, budget: 48200, description: 'Campaña multiplataforma verano con rodajes en locación costera y estudio.', start: '2026-05-15', end: '2026-07-30', colorIndex: 1, locaciones: [], actores: [], tareas: [{ id: 't1', text: 'Scouting locaciones costa', done: true }, { id: 't2', text: 'Casting protagonista', done: false }] },
      { id: 'p2', name: 'Spot Banco Atlas', client: 'Banco Atlas', type: 'comercial', status: 'produccion', progress: 68, budget: 92500, description: 'Comercial institucional 30s y versiones 15s para TV y digital.', start: '2026-05-01', end: '2026-06-15', colorIndex: 0, locaciones: ['loc-001'], actores: ['a2'], tareas: [{ id: 't1', text: 'Rodaje principal', done: false }] },
      { id: 'p3', name: 'Documental Costa', client: 'Canal Documental+', type: 'cine', status: 'produccion', progress: 52, budget: 210000, description: 'Documental largometraje sobre comunidades pesqueras.', start: '2026-04-10', end: '2026-08-20', colorIndex: 0, locaciones: ['loc-003'], actores: [], tareas: [] },
      { id: 'p4', name: 'Lanzamiento Q3', client: 'TechNova Inc.', type: 'web', status: 'produccion', progress: 81, budget: 35800, description: 'Piezas web y social para lanzamiento de producto.', start: '2026-03-20', end: '2026-06-10', colorIndex: 3, locaciones: [], actores: ['a1'], tareas: [] },
      { id: 'p5', name: 'Corto Indie «Luz»', client: 'Producción Propia', type: 'cine', status: 'planificacion', progress: 18, budget: 12000, description: 'Cortometraje de ficción — preproducción y casting.', start: '2026-07-01', end: '2026-11-15', colorIndex: 1, locaciones: [], actores: [], tareas: [] },
      { id: 'p6', name: 'Webinar Series EP.4', client: 'EduStream', type: 'web', status: 'finalizado', progress: 100, budget: 8400, description: 'Episodio 4 entregado y archivado.', start: '2026-02-01', end: '2026-05-28', colorIndex: 2, locaciones: [], actores: [], tareas: [] },
    ];

    const alerts = [
      { id: 'a1', severity: 'medio', category: 'Precio', message: 'Estudio Norte +12% tarifa — proyecto Verano 2026', time: '23 min', read: false, projectId: 'p1' },
      { id: 'a2', severity: 'critico', category: 'Luz Verde', message: 'Rodaje en 48h — Lanzamiento Q3, permisos pendientes', time: 'Urgente', read: false, projectId: 'p4' },
      { id: 'a3', severity: 'medio', category: 'Luz Verde', message: 'Pre-producción — Spot Banco Atlas, scout en 6 días', time: '1 h', read: false, projectId: 'p2' },
      { id: 'a4', severity: 'info', category: 'Luz Verde', message: 'Calendario actualizado — Documental Costa, día 3 al 12 Jun', time: '2 h', read: false, projectId: 'p3' },
      { id: 'a5', severity: 'info', category: 'Comentario', message: 'Marcos G.: moodboard Campaña Verano — aprobación viernes', time: '45 min', read: true, projectId: 'p1' },
    ];

    write(KEYS.projects, projects);
    write(KEYS.alerts, alerts);
    write(KEYS.clients, ['Marca Sol', 'Banco Atlas', 'Canal Documental+', 'TechNova Inc.', 'Producción Propia', 'EduStream', 'Agencia Norte', 'Studio Live']);
    write(KEYS.user, {
      name: 'Ana Rodríguez',
      role: 'Productora Ejecutiva',
      email: 'ana.rodriguez@frameflow.app',
      phone: '+593 99 000 0000',
      portfolio: 'https://portfolio.frameflow.app/ana',
      avatarInitials: 'AR',
      avatarUrl: '',
    });
    localStorage.setItem(KEYS.initialized, '1');
  }

  function getProjects() {
    seedIfNeeded();
    return read(KEYS.projects, []);
  }

  function saveProjects(list) {
    write(KEYS.projects, list);
  }

  function getProject(id) {
    return getProjects().find((p) => p.id === id) || null;
  }

  function createProject(data) {
    const list = getProjects();
    const project = {
      id: 'p' + Date.now(),
      name: data.name,
      client: data.client,
      type: data.type,
      status: data.status || 'planificacion',
      progress: data.progress ?? 0,
      budget: Number(data.budget) || 0,
      description: data.description || '',
      start: data.start,
      end: data.end,
      colorIndex: Number(data.colorIndex) || 0,
      locaciones: [],
      actores: [],
      tareas: data.tareas || [],
    };
    list.unshift(project);
    saveProjects(list);
    return project;
  }

  function updateProject(id, patch) {
    const list = getProjects();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    saveProjects(list);
    return list[idx];
  }

  function assignResource(projectId, resourceType, resourceId) {
    const p = getProject(projectId);
    if (!p) return false;
    const key = resourceType === 'locacion' ? 'locaciones' : 'actores';
    const arr = [...(p[key] || [])];
    if (!arr.includes(resourceId)) arr.push(resourceId);
    updateProject(projectId, { [key]: arr });
    return true;
  }

  function getAlerts() {
    seedIfNeeded();
    return read(KEYS.alerts, []);
  }

  function saveAlerts(list) {
    write(KEYS.alerts, list);
  }

  function markAlertRead(id) {
    const list = getAlerts().map((a) => (a.id === id ? { ...a, read: true } : a));
    saveAlerts(list);
  }

  function getClients() {
    seedIfNeeded();
    return read(KEYS.clients, []);
  }

  function addClient(name) {
    const list = getClients();
    if (!list.includes(name)) {
      list.push(name);
      write(KEYS.clients, list);
    }
  }

  function getUser() {
    seedIfNeeded();
    return read(KEYS.user, {});
  }

  function saveUser(data) {
    write(KEYS.user, { ...getUser(), ...data });
  }

  function getLocacion(id) {
    return CATALOGO.locaciones.find((l) => l.id === id) || null;
  }

  function getActor(id) {
    return CATALOGO.actores.find((a) => a.id === id) || null;
  }

  function getColor(idx) {
    return COLOR_PALETTE[idx % COLOR_PALETTE.length];
  }

  function catalogBackUrl(view) {
    const v = view || 'locaciones';
    return `catalogo.html?vista=${encodeURIComponent(v)}`;
  }

  /** Calendario: dos clics → rango ordenado en inputs start/end */
  function applyCalendarRangeClick(iso, state, startInput, endInput) {
    const next = { ...state };
    if (!next.anchor) {
      next.anchor = iso;
      next.end = null;
      if (startInput) startInput.value = iso;
      if (endInput) endInput.value = '';
    } else {
      const a = next.anchor;
      const b = iso;
      const min = a <= b ? a : b;
      const max = a <= b ? b : a;
      next.anchor = min;
      next.end = max;
      if (startInput) startInput.value = min;
      if (endInput) endInput.value = max;
      next.anchor = null;
    }
    return next;
  }

  seedIfNeeded();

  global.FrameFlowDB = {
    KEYS,
    COLOR_PALETTE,
    TYPE_LABELS,
    STATUS_META,
    CATALOGO,
    TIPO_ACTOR_LABELS,
    getProjects,
    saveProjects,
    getProject,
    createProject,
    updateProject,
    assignResource,
    getAlerts,
    saveAlerts,
    markAlertRead,
    getClients,
    addClient,
    getUser,
    saveUser,
    getLocacion,
    getActor,
    getColor,
    formatBudget,
    catalogBackUrl,
    applyCalendarRangeClick,
  };
})(typeof window !== 'undefined' ? window : globalThis);
