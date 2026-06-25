/**
 * FrameFlow — Chat interno (LocalStorage → futuro Node.js + Socket.io)
 *
 * Migración prevista:
 * - getConversations / getMessages → GET /api/conversations
 * - sendMessage → socket.emit('message:send') + validación server-side
 * - subscribeToConversation → socket.on('message:new')
 * - validateMessageSecurity → middleware Express reutilizando las mismas RegEx
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'ff_chat_conversations';

  const SECURITY_ALERT =
    'Por seguridad de tus contratos, mantén la comunicación dentro de la plataforma. El intercambio de contactos externos está restringido';

  /** Patrones anti-fuga de contactos (replicar en backend) */
  const CONTACT_PATTERNS = [
    { id: 'phone', regex: /\d{7,}/, label: 'teléfono' },
    { id: 'email', regex: /[^\s@]+@[^\s@]+\.[^\s@]+/i, label: 'correo electrónico' },
    { id: 'whatsapp', regex: /whatsapp/i, label: 'WhatsApp' },
    { id: 'insta', regex: /\binsta\b|\big\b/i, label: 'red social externa' },
    { id: 'llamame', regex: /ll[aá]mame/i, label: 'solicitud de llamada externa' },
  ];

  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function writeStore(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // Socket.io: no persistir aquí; el servidor emitirá el estado actualizado
    global.dispatchEvent(new CustomEvent('ff-chat-updated', { detail: { conversations: list } }));
  }

  function uid() {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function convId(resourceType, resourceId) {
    return `conv-${resourceType}-${resourceId}`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
  }

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  /**
   * Filtro de seguridad pre-envío (simula validación del backend).
   * @returns {{ ok: boolean, alert?: string }}
   */
  function validateMessageSecurity(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return { ok: false, alert: 'Escribe un mensaje antes de enviar.' };

    for (const rule of CONTACT_PATTERNS) {
      if (rule.regex.test(trimmed)) {
        return { ok: false, alert: SECURITY_ALERT };
      }
    }
    return { ok: true };
  }

  function sortConversations(list) {
    return [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function getConversations() {
    return sortConversations(readStore());
  }

  function getConversation(id) {
    return readStore().find((c) => c.id === id) || null;
  }

  function resolveResourceMeta(resourceType, resourceId, overrides) {
    const db = global.FrameFlowDB;
    const o = overrides || {};
    if (resourceType === 'locacion' && db) {
      const loc = db.getLocacion(resourceId);
      if (loc) {
        return {
          name: o.name || loc.nombre,
          avatar: o.avatar || loc.imagen,
          roleBadge: o.roleBadge || 'Locación',
          price: o.price != null ? o.price : loc.precioJornada,
        };
      }
    }
    if (resourceType === 'actor' && db) {
      const actor = db.getActor(resourceId);
      if (actor) {
        const tipo = db.TIPO_ACTOR_LABELS?.[actor.tipo] || actor.tipo;
        return {
          name: o.name || actor.nombre,
          avatar: o.avatar || actor.imagen,
          roleBadge: o.roleBadge || tipo,
          price: o.price != null ? o.price : actor.precioJornada,
        };
      }
    }
    return {
      name: o.name || 'Recurso',
      avatar: o.avatar || '',
      roleBadge: o.roleBadge || (resourceType === 'actor' ? 'Casting' : 'Locación'),
      price: o.price,
    };
  }

  /**
   * Crea o recupera una conversación por recurso del catálogo.
   * Socket.io: emit('conversation:open', { resourceType, resourceId })
   */
  function getOrCreateConversation({ resourceId, resourceType, name, avatar, roleBadge, price }) {
    const type = resourceType === 'casting' ? 'actor' : resourceType;
    const id = convId(type, resourceId);
    const store = readStore();
    const existing = store.find((c) => c.id === id);
    if (existing) {
      if (name || avatar || roleBadge) {
        existing.name = name || existing.name;
        existing.avatar = avatar || existing.avatar;
        existing.roleBadge = roleBadge || existing.roleBadge;
        if (price != null) existing.price = price;
        writeStore(store);
      }
      return existing;
    }

    const meta = resolveResourceMeta(type, resourceId, { name, avatar, roleBadge, price });
    const welcome = type === 'actor'
      ? `Hola, soy representante de ${meta.name}. ¿En qué fechas necesitas al talento y cuántas jornadas estimas?`
      : `Hola, gracias por tu interés en ${meta.name}. ¿Qué fechas y tipo de rodaje tienes planeado?`;

    const welcomeMsg = {
      id: uid(),
      text: welcome,
      sender: 'contact',
      at: nowIso(),
    };

    const conversation = {
      id,
      resourceId,
      resourceType: type,
      name: meta.name,
      avatar: meta.avatar,
      roleBadge: meta.roleBadge,
      price: meta.price,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastMessage: { text: welcomeMsg.text, at: welcomeMsg.at, sender: welcomeMsg.sender },
      messages: [welcomeMsg],
    };

    store.push(conversation);
    writeStore(store);
    return conversation;
  }

  /**
   * Persiste un mensaje tras pasar el filtro de seguridad.
   * Socket.io: socket.emit('message:send', { conversationId, text })
   */
  function sendMessage(conversationId, text, sender) {
    const validation = validateMessageSecurity(text);
    if (!validation.ok) {
      return { success: false, alert: validation.alert };
    }

    const store = readStore();
    const conv = store.find((c) => c.id === conversationId);
    if (!conv) return { success: false, alert: 'Conversación no encontrada.' };

    const msg = {
      id: uid(),
      text: text.trim(),
      sender: sender || 'user',
      at: nowIso(),
    };

    conv.messages.push(msg);
    conv.lastMessage = { text: msg.text, at: msg.at, sender: msg.sender };
    conv.updatedAt = msg.at;
    writeStore(store);

    // Simula respuesta automática del recurso (reemplazar por eventos Socket.io)
    if (sender === 'user') {
      scheduleAutoReply(conversationId);
    }

    return { success: true, message: msg };
  }

  function scheduleAutoReply(conversationId) {
    setTimeout(() => {
      const store = readStore();
      const conv = store.find((c) => c.id === conversationId);
      if (!conv) return;
      const reply = {
        id: uid(),
        text: 'Recibido. Revisaremos disponibilidad y te responderemos con una cotización formal dentro de la plataforma.',
        sender: 'contact',
        at: nowIso(),
      };
      conv.messages.push(reply);
      conv.lastMessage = { text: reply.text, at: reply.at, sender: reply.sender };
      conv.updatedAt = reply.at;
      writeStore(store);
    }, 900);
  }

  /**
   * Navega a la bandeja de chat y abre la conversación indicada.
   */
  function openChatPage(conversationId) {
    const url = conversationId
      ? `chat.html?c=${encodeURIComponent(conversationId)}`
      : 'chat.html';
    window.location.href = url;
  }

  /**
   * Punto de entrada desde catálogo / detalle (Cotizar / Contactar).
   */
  function startConversationFromResource(payload) {
    const conv = getOrCreateConversation(payload);
    openChatPage(conv.id);
    return conv;
  }

  global.FrameFlowChat = {
    STORAGE_KEY,
    SECURITY_ALERT,
    CONTACT_PATTERNS,
    validateMessageSecurity,
    getConversations,
    getConversation,
    getOrCreateConversation,
    sendMessage,
    startConversationFromResource,
    openChatPage,
    formatTime,
    escapeHtml,
  };
})(typeof window !== 'undefined' ? window : globalThis);
