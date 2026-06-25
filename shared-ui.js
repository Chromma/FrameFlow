/**
 * FrameFlow — UI compartida: lightbox, chat interno, calendario compacto
 */
(function (global) {
  'use strict';

  let lightboxImages = [];
  let lightboxIndex = 0;
  let chatContext = null;

  function ensureShell() {
    if (document.getElementById('ff-lightbox')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="ff-lightbox" class="fixed inset-0 z-[100] hidden items-center justify-center bg-black/95 p-4" role="dialog" aria-modal="true" aria-label="Galería">
        <button type="button" id="ff-lightbox-close" class="absolute top-4 right-4 z-10 rounded-full border border-zinc-700 bg-zinc-900/80 p-2.5 text-zinc-300 hover:text-white" aria-label="Cerrar">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <button type="button" id="ff-lightbox-prev" class="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-zinc-700 bg-zinc-900/80 p-2 text-zinc-300 hover:text-white" aria-label="Anterior">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button type="button" id="ff-lightbox-next" class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-zinc-700 bg-zinc-900/80 p-2 text-zinc-300 hover:text-white" aria-label="Siguiente">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <img id="ff-lightbox-img" src="" alt="" class="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl" />
        <p id="ff-lightbox-caption" class="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-zinc-400"></p>
      </div>
      <div id="ff-chat-modal" class="fixed inset-0 z-[100] hidden items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Chat interno">
        <div id="ff-chat-backdrop" class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative flex h-[min(520px,90vh)] w-full max-w-md flex-col rounded-t-2xl sm:rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">Cotizar / Contactar</p>
              <p id="ff-chat-title" class="text-sm font-semibold text-white"></p>
            </div>
            <button type="button" id="ff-chat-close" class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Cerrar">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="ff-chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3 text-sm"></div>
          <form id="ff-chat-form" class="flex gap-2 border-t border-zinc-800 p-3">
            <input id="ff-chat-input" type="text" placeholder="Escribe tu consulta..." class="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" autocomplete="off" />
            <button type="submit" class="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-cyan-400">Enviar</button>
          </form>
        </div>
      </div>
    `);

    document.getElementById('ff-lightbox-close').addEventListener('click', closeLightbox);
    document.getElementById('ff-lightbox-prev').addEventListener('click', () => stepLightbox(-1));
    document.getElementById('ff-lightbox-next').addEventListener('click', () => stepLightbox(1));
    document.getElementById('ff-lightbox').addEventListener('click', (e) => {
      if (e.target.id === 'ff-lightbox') closeLightbox();
    });
    document.getElementById('ff-chat-close').addEventListener('click', closeChat);
    document.getElementById('ff-chat-backdrop').addEventListener('click', closeChat);
    document.getElementById('ff-chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('ff-chat-input');
      const text = input.value.trim();
      if (!text || !chatContext) return;
      if (global.FrameFlowChat) {
        const conv = global.FrameFlowChat.getOrCreateConversation(chatContext);
        const result = global.FrameFlowChat.sendMessage(conv.id, text, 'user');
        if (!result.success) {
          showChatSecurityAlert(result.alert);
          return;
        }
        closeChat();
        global.FrameFlowChat.openChatPage(conv.id);
        return;
      }
      appendChatMessage('user', text);
      input.value = '';
      setTimeout(() => {
        appendChatMessage('agent', 'Gracias por tu consulta. Un representante de FrameFlow revisará disponibilidad y tarifas en las próximas horas.');
      }, 700);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
        closeChat();
      }
      if (!document.getElementById('ff-lightbox').classList.contains('hidden')) {
        if (e.key === 'ArrowLeft') stepLightbox(-1);
        if (e.key === 'ArrowRight') stepLightbox(1);
      }
    });
  }

  function openLightbox(images, startIndex, caption) {
    ensureShell();
    lightboxImages = images.map((img) => (typeof img === 'string' ? { src: img, label: '' } : img));
    lightboxIndex = startIndex || 0;
    updateLightbox(caption);
    const el = document.getElementById('ff-lightbox');
    el.classList.remove('hidden');
    el.classList.add('flex');
    document.body.classList.add('overflow-hidden');
  }

  function updateLightbox(fallbackCaption) {
    const item = lightboxImages[lightboxIndex];
    if (!item) return;
    document.getElementById('ff-lightbox-img').src = item.src;
    document.getElementById('ff-lightbox-img').alt = item.label || fallbackCaption || '';
    document.getElementById('ff-lightbox-caption').textContent =
      item.label ? `${item.label} · ${lightboxIndex + 1}/${lightboxImages.length}` : `${lightboxIndex + 1}/${lightboxImages.length}`;
    document.getElementById('ff-lightbox-prev').classList.toggle('hidden', lightboxImages.length <= 1);
    document.getElementById('ff-lightbox-next').classList.toggle('hidden', lightboxImages.length <= 1);
  }

  function stepLightbox(delta) {
    if (!lightboxImages.length) return;
    lightboxIndex = (lightboxIndex + delta + lightboxImages.length) % lightboxImages.length;
    updateLightbox();
  }

  function closeLightbox() {
    const el = document.getElementById('ff-lightbox');
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }

  function bindLightbox(selector, getImages) {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest(selector);
      if (!trigger) return;
      e.preventDefault();
      e.stopPropagation();
      const images = getImages(trigger);
      if (!images?.length) return;
      const idx = Number(trigger.dataset.lightboxIndex) || 0;
      openLightbox(images, idx, trigger.dataset.lightboxCaption || '');
    });
  }

  /**
   * Abre la bandeja de chat con conversación del recurso.
   * Preferencia: navegar a chat.html (persistencia LocalStorage).
   * Fallback: modal embebido si chat.js no está cargado.
   */
  function openChat(payload) {
    const {
      resourceId, resourceType, type, name, avatar, roleBadge, price,
    } = payload;
    const rType = resourceType || (type === 'actor' ? 'actor' : type === 'casting' ? 'actor' : 'locacion');
    const rId = resourceId || payload.id;

    if (global.FrameFlowChat && rId) {
      global.FrameFlowChat.startConversationFromResource({
        resourceId: rId,
        resourceType: rType,
        name,
        avatar,
        roleBadge,
        price,
      });
      return;
    }

    ensureShell();
    chatContext = { resourceId: rId, resourceType: rType, name, avatar, roleBadge, price };
    document.getElementById('ff-chat-title').textContent = name;
    const msgs = document.getElementById('ff-chat-messages');
    const priceLine = price ? ` Tarifa referencial: ${price}.` : '';
    msgs.innerHTML = `
      <div class="rounded-xl border border-zinc-800 bg-zinc-800/40 px-3 py-2 text-zinc-400">
        Chat interno FrameFlow — consulta sobre <span class="text-zinc-200">${name}</span>.${priceLine}
      </div>
      <div class="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-zinc-300 mr-8">
        Hola, ¿en qué fechas necesitas el recurso y cuántas jornadas estimas?
      </div>`;
    hideChatSecurityAlert();
    const modal = document.getElementById('ff-chat-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('ff-chat-input').focus();
  }

  function showChatSecurityAlert(msg) {
    ensureShell();
    let alert = document.getElementById('ff-chat-security-alert');
    if (!alert) {
      const form = document.getElementById('ff-chat-form');
      form.insertAdjacentHTML('beforebegin', `<p id="ff-chat-security-alert" class="hidden mx-3 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300" role="alert"></p>`);
      alert = document.getElementById('ff-chat-security-alert');
    }
    alert.textContent = msg || (global.FrameFlowChat?.SECURITY_ALERT ?? 'Contenido restringido por seguridad.');
    alert.classList.remove('hidden');
  }

  function hideChatSecurityAlert() {
    document.getElementById('ff-chat-security-alert')?.classList.add('hidden');
  }

  function appendChatMessage(role, text) {
    const msgs = document.getElementById('ff-chat-messages');
    const cls = role === 'user'
      ? 'rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-zinc-200 ml-8'
      : 'rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-zinc-300 mr-8';
    msgs.insertAdjacentHTML('beforeend', `<div class="${cls}">${text}</div>`);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function closeChat() {
    const modal = document.getElementById('ff-chat-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  /** Calendario compacto unificado */
  function mountCompactCalendar(opts) {
    const {
      monthLabelId, weekdaysId, daysId, prevBtnId, nextBtnId,
      busyDays = [], startInput, endInput, onRender,
    } = opts;
    let calView = opts.initialDate ? new Date(opts.initialDate) : new Date();
    let rangeState = { anchor: null, end: null };
    const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

    function isoDay(y, m, d) {
      return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    function render() {
      const y = calView.getFullYear();
      const m = calView.getMonth();
      document.getElementById(monthLabelId).textContent =
        calView.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      document.getElementById(weekdaysId).innerHTML =
        WEEKDAYS.map((d) => `<span class="py-0.5">${d}</span>`).join('');
      const first = new Date(y, m, 1);
      const startPad = (first.getDay() + 6) % 7;
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const busy = new Set(busyDays || []);
      const desde = startInput?.value || '';
      const hasta = endInput?.value || '';
      const rangeStart = desde && hasta ? (desde <= hasta ? desde : hasta) : (rangeState.anchor || desde || '');
      const rangeEnd = desde && hasta ? (desde <= hasta ? hasta : desde) : (rangeState.end || '');
      let html = '';
      for (let i = 0; i < startPad; i++) html += '<span class="ff-cal-day other-month"></span>';
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = isoDay(y, m, d);
        const isBusy = busy.has(iso);
        const inRange = rangeStart && rangeEnd && iso >= rangeStart && iso <= rangeEnd;
        const isAnchor = rangeState.anchor === iso || (rangeStart && !rangeEnd && rangeStart === iso);
        let cls = 'ff-cal-day ';
        cls += isBusy ? 'busy' : 'free';
        if (inRange || isAnchor) cls += ' selected';
        html += `<button type="button" class="${cls}" data-iso="${iso}" ${isBusy ? 'disabled' : ''}>${d}</button>`;
      }
      const grid = document.getElementById(daysId);
      grid.innerHTML = html;
      grid.querySelectorAll('.ff-cal-day[data-iso]:not([disabled])').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (global.FrameFlowDB) {
            rangeState = global.FrameFlowDB.applyCalendarRangeClick(btn.dataset.iso, rangeState, startInput, endInput);
          }
          render();
          onRender?.();
        });
      });
    }

    document.getElementById(prevBtnId)?.addEventListener('click', () => {
      calView.setMonth(calView.getMonth() - 1);
      render();
    });
    document.getElementById(nextBtnId)?.addEventListener('click', () => {
      calView.setMonth(calView.getMonth() + 1);
      render();
    });
    render();
    return { rerender: render };
  }

  function showBudgetAlert(summary, container) {
    if (!container || !summary) return;
    const over = summary.remaining < 0;
    container.classList.toggle('hidden', !over);
    if (over) {
      container.innerHTML = `
        <div class="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span class="shrink-0 mt-0.5">⚠</span>
          <div>
            <p class="font-semibold text-red-200">Presupuesto excedido</p>
            <p class="text-xs mt-0.5 text-red-300/90">Comprometido: ${global.FrameFlowDB.formatBudget(summary.spent)} de ${global.FrameFlowDB.formatBudget(summary.total)}. Restante: ${global.FrameFlowDB.formatBudget(summary.remaining)}</p>
          </div>
        </div>`;
    }
  }

  global.FrameFlowUI = {
    openLightbox,
    closeLightbox,
    bindLightbox,
    openChat,
    closeChat,
    mountCompactCalendar,
    showBudgetAlert,
    ensureShell,
  };
})(typeof window !== 'undefined' ? window : globalThis);
