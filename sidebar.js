/**
 * FrameFlow — Sidebar compartido con submenú Catálogo y enlace a Perfil
 */
(function (global) {
  'use strict';

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  function renderSidebarHTML(activePage) {
    const user = global.FrameFlowDB ? global.FrameFlowDB.getUser() : { name: 'Usuario', role: '', avatarInitials: 'U' };
    const isCatalog = activePage === 'catalogo';
    const catalogOpen = isCatalog ? 'open' : '';

    return `
    <style>
      html.ff-sidebar-collapsed #sidebar { width: 0; min-width: 0; overflow: hidden; border-width: 0; opacity: 0; pointer-events: none; }
      @media (min-width: 1024px) {
        html.ff-sidebar-collapsed #sidebar { position: fixed; }
        html.ff-sidebar-collapsed #sidebar-overlay { display: none !important; }
      }
      html.ff-sidebar-collapsed .detail-page-inner { max-width: min(96vw, 1320px); }
      html.ff-sidebar-collapsed .detail-main-col { max-width: none !important; flex: 1.85 1 0% !important; }
      html.ff-sidebar-collapsed .detail-form-aside { width: auto !important; max-width: 420px; flex: 1 1 380px !important; }
      html.ff-sidebar-collapsed #sidebar-expand-fab { display: flex !important; }
    </style>
    <aside id="sidebar" class="fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-900/95 backdrop-blur-xl transition-all duration-300 lg:static lg:translate-x-0 -translate-x-full" aria-label="Navegación">
      <div class="flex h-16 items-center gap-3 border-b border-zinc-800/80 px-5">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/20">
          <i data-lucide="clapperboard" class="h-5 w-5 text-zinc-950"></i>
        </div>
        <div class="sidebar-brand-text min-w-0 flex-1">
          <p class="text-sm font-semibold text-white">FrameFlow</p>
          <p class="text-[10px] uppercase tracking-widest text-zinc-500">Producción SaaS</p>
        </div>
        <button type="button" id="sidebar-collapse-toggle" class="hidden lg:flex shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors" aria-label="Colapsar menú lateral" title="Colapsar menú">
          <i data-lucide="panel-left-close" class="h-4 w-4 sidebar-collapse-icon"></i>
        </button>
      </div>
      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <a href="index.html" data-nav="dashboard" class="nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors">
          <i data-lucide="layout-dashboard" class="h-[18px] w-[18px]"></i> Dashboard
        </a>
        <a href="proyectos.html" data-nav="proyectos" class="nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors">
          <i data-lucide="film" class="h-[18px] w-[18px]"></i> Proyectos
        </a>
        <div class="catalog-nav-group ${catalogOpen}" data-nav-group="catalogo">
          <div class="flex items-center gap-0.5 rounded-lg ${isCatalog ? 'bg-cyan-500/10 border border-cyan-500/20' : ''}">
            <a href="catalogo.html?vista=locaciones" data-nav="catalogo" class="nav-link flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-w-0">
              <i data-lucide="library" class="h-[18px] w-[18px] shrink-0"></i>
              <span class="truncate">Catálogo</span>
            </a>
            <button type="button" id="catalog-nav-toggle" class="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors" aria-expanded="${isCatalog ? 'true' : 'false'}" aria-label="Expandir submenú catálogo">
              <i data-lucide="chevron-down" class="catalog-chevron h-4 w-4 transition-transform ${isCatalog ? 'rotate-180' : ''}"></i>
            </button>
          </div>
          <div id="catalog-subnav" class="catalog-subnav ${isCatalog ? '' : 'hidden'} mt-0.5 ml-4 space-y-0.5 border-l border-zinc-800 pl-3">
            <a href="catalogo.html?vista=locaciones" data-nav="catalogo-loc" class="nav-sublink block rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 transition-colors">Locaciones</a>
            <a href="catalogo.html?vista=casting" data-nav="catalogo-cast" class="nav-sublink block rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 transition-colors">Casting / Actores</a>
          </div>
        </div>
        <a href="chat.html" data-nav="chat" class="nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors">
          <i data-lucide="messages-square" class="h-[18px] w-[18px]"></i> Chat / Bandeja
        </a>
        <a href="listas-interes.html" data-nav="listas" class="nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors">
          <i data-lucide="bookmark" class="h-[18px] w-[18px]"></i> Listas de Interés
        </a>
        <a href="configuracion.html" data-nav="configuracion" class="nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors">
          <i data-lucide="settings" class="h-[18px] w-[18px]"></i> Configuración
        </a>
      </nav>
      <div class="border-t border-zinc-800/80 p-4">
        <a href="perfil.html" class="flex items-center gap-3 rounded-lg bg-zinc-800/40 px-3 py-2.5 hover:bg-zinc-800/70 transition-colors group" id="sidebar-profile-link">
          <div id="sidebar-avatar" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold overflow-hidden">${user.avatarUrl ? `<img src="${escapeHtml(user.avatarUrl)}" alt="" class="h-full w-full object-cover" />` : escapeHtml(user.avatarInitials || 'U')}</div>
          <div class="min-w-0 flex-1">
            <p id="sidebar-user-name" class="truncate text-sm font-medium text-zinc-200 group-hover:text-white">${escapeHtml(user.name)}</p>
            <p id="sidebar-user-role" class="truncate text-xs text-zinc-500">${escapeHtml(user.role)}</p>
          </div>
          <i data-lucide="chevron-right" class="h-4 w-4 text-zinc-600 group-hover:text-cyan-400"></i>
        </a>
      </div>
    </aside>
    <div id="sidebar-overlay" class="fixed inset-0 z-30 hidden bg-black/60 backdrop-blur-sm lg:hidden"></div>
    <button type="button" id="sidebar-expand-fab" class="fixed left-3 top-[4.25rem] z-30 hidden h-9 w-9 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/95 text-zinc-400 shadow-lg backdrop-blur-sm hover:border-cyan-500/40 hover:text-cyan-400 transition-colors" aria-label="Expandir menú lateral" title="Expandir menú">
      <i data-lucide="panel-left-open" class="h-4 w-4"></i>
    </button>
    `;
  }

  function initNavActive(activePage) {
    document.querySelectorAll('.nav-link[data-nav]').forEach((link) => {
      const nav = link.dataset.nav;
      const isActive = nav === activePage || (activePage === 'catalogo' && nav === 'catalogo');
      link.classList.toggle('text-cyan-400', isActive);
      link.classList.toggle('bg-cyan-500/10', isActive);
      link.classList.toggle('border', isActive);
      link.classList.toggle('border-cyan-500/20', isActive);
      link.classList.toggle('text-zinc-400', !isActive);
      if (!isActive) link.classList.add('hover:bg-zinc-800/60', 'hover:text-zinc-100');
    });

    if (activePage === 'catalogo') {
      const params = new URLSearchParams(location.search);
      const vista = params.get('vista') || params.get('view') || 'locaciones';
      document.querySelectorAll('.nav-sublink').forEach((link) => {
        const isLoc = link.dataset.nav === 'catalogo-loc' && vista === 'locaciones';
        const isCast = link.dataset.nav === 'catalogo-cast' && vista === 'casting';
        const on = isLoc || isCast;
        link.classList.toggle('text-cyan-400', on);
        link.classList.toggle('bg-cyan-500/10', on);
        link.classList.toggle('text-zinc-400', !on);
      });
    }

    if (activePage === 'perfil') {
      document.getElementById('sidebar-profile-link')?.classList.add('ring-1', 'ring-cyan-500/30');
    }
  }

  function bindSidebarMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;
    const close = () => {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    };
    const open = () => {
      sidebar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    };
    document.getElementById('menu-toggle')?.addEventListener('click', open);
    overlay.addEventListener('click', close);
    window.addEventListener('resize', () => { if (window.innerWidth >= 1024) close(); });
  }

  function bindSidebarCollapse() {
    const btn = document.getElementById('sidebar-collapse-toggle');
    if (!btn) return;
    const KEY = 'ff_sidebar_collapsed';
    const icon = btn.querySelector('.sidebar-collapse-icon');

    function apply(collapsed) {
      document.documentElement.classList.toggle('ff-sidebar-collapsed', collapsed);
      btn.setAttribute('aria-label', collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral');
      btn.setAttribute('title', collapsed ? 'Expandir menú' : 'Colapsar menú');
      if (icon) icon.setAttribute('data-lucide', collapsed ? 'panel-left-open' : 'panel-left-close');
      try { localStorage.setItem(KEY, collapsed ? '1' : '0'); } catch (_) { /* ignore */ }
      if (global.lucide) global.lucide.createIcons();
      global.dispatchEvent(new Event('ff-sidebar-toggle'));
    }

    try {
      apply(localStorage.getItem(KEY) === '1');
    } catch (_) {
      apply(false);
    }

    btn.addEventListener('click', () => {
      apply(!document.documentElement.classList.contains('ff-sidebar-collapsed'));
    });

    document.getElementById('sidebar-expand-fab')?.addEventListener('click', () => apply(false));
  }

  function bindCatalogToggle() {
    const btn = document.getElementById('catalog-nav-toggle');
    const sub = document.getElementById('catalog-subnav');
    const chevron = document.querySelector('.catalog-chevron');
    if (!btn || !sub) return;
    btn.addEventListener('click', () => {
      const hidden = sub.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', String(!hidden));
      chevron?.classList.toggle('rotate-180', !hidden);
    });
  }

  function mount(containerId, activePage) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = renderSidebarHTML(activePage);
    initNavActive(activePage);
    bindSidebarMobile();
    bindSidebarCollapse();
    bindCatalogToggle();
    if (global.lucide) global.lucide.createIcons();
  }

  global.FrameFlowSidebar = { mount, initNavActive, bindSidebarMobile };
})(typeof window !== 'undefined' ? window : globalThis);
