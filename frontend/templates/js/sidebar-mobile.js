/* ============================================================
   sidebar-mobile.js
   Agregar en dashboard-utils.js al final, O incluir como
   <script src="/js/sidebar-mobile.js"></script> en cada HTML
   antes de cerrar </body>
   ============================================================ */

(function () {
  // ── Inyectar botón hamburguesa y overlay ──────────────────
  function inyectarHamburguesa() {
    // Si el botón ya existe (p. ej. fue insertado en la plantilla),
    // no lo recreamos, pero sí nos aseguramos de que tenga el
    // listener y que exista el overlay.
    var existingBtn = document.getElementById('_menuToggle');
    if (existingBtn) {
      // Asegurar clases y HTML mínimo
      existingBtn.classList.add('menu-toggle');
      if (!existingBtn.querySelector('span')) existingBtn.innerHTML = '<span></span><span></span><span></span>';
      // Evitar añadir múltiples listeners
      if (!existingBtn.__hamburgerBound) {
        existingBtn.addEventListener('click', toggleSidebar);
        existingBtn.__hamburgerBound = true;
      }
      // Crear overlay si no existe
      var existingOverlay = document.getElementById('_sidebarOverlay');
      if (!existingOverlay) {
        var overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = '_sidebarOverlay';
        overlay.addEventListener('click', cerrarSidebar);
        document.body.insertAdjacentElement('afterbegin', overlay);
      }
      bindMobileNavClicks();
      return;
    }

    var btn = document.createElement('button');
    btn.className = 'menu-toggle';
    btn.id = '_menuToggle';
    btn.setAttribute('aria-label', 'Abrir menú');
    btn.innerHTML = '<span></span><span></span><span></span>';
    btn.addEventListener('click', toggleSidebar);

    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = '_sidebarOverlay';
    overlay.addEventListener('click', cerrarSidebar);

    document.body.insertAdjacentElement('afterbegin', overlay);
    document.body.insertAdjacentElement('afterbegin', btn);
    bindMobileNavClicks();
  }

  // ── Toggle sidebar ────────────────────────────────────────
  function toggleSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var btn     = document.getElementById('_menuToggle');
    var overlay = document.getElementById('_sidebarOverlay');
    if (!sidebar) return;

    var abierto = sidebar.classList.toggle('open');
    if (btn) btn.classList.toggle('open', abierto);
    if (overlay) overlay.classList.toggle('active', abierto);
    document.body.style.overflow = abierto ? 'hidden' : '';
  }

  function cerrarSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var btn     = document.getElementById('_menuToggle');
    var overlay = document.getElementById('_sidebarOverlay');
    if (!sidebar) return;

    sidebar.classList.remove('open');
    if (btn) btn.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function bindMobileNavClicks() {
    document.querySelectorAll('.nav-item').forEach(function (item) {
      if (item.__mobileNavBound) return;
      item.addEventListener('click', function () {
        if (window.innerWidth <= 768) {
          setTimeout(cerrarSidebar, 180);
        }
      });
      item.__mobileNavBound = true;
    });
  }

  // Cerrar con Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cerrarSidebar();
  });

  // Cerrar al hacer click en nav-item (móvil)
  document.addEventListener('click', function (e) {
    if (e.target.closest('.nav-item') && window.innerWidth <= 768) {
      setTimeout(cerrarSidebar, 180);
    }
  });

  // ── Animación de secciones al navegar ─────────────────────
  // Parchea la función nav() global para agregar animación
  document.addEventListener('DOMContentLoaded', function () {
    inyectarHamburguesa();

    var navOriginal = window.nav;
    if (typeof navOriginal === 'function') {
      window.nav = function (seccion, linkEl) {
        navOriginal(seccion, linkEl);
        var sec = document.getElementById('sec-' + seccion);
        if (sec) {
          sec.classList.remove('sec-animada');
          // Forzar reflow para reiniciar animación
          void sec.offsetWidth;
          sec.classList.add('sec-animada');
        }
      };
    }
    bindMobileNavClicks();
  });

  // Si el DOM ya cargó (script al final del body)
  if (document.readyState !== 'loading') {
    inyectarHamburguesa();

    // También parchear nav si ya existe
    var navOriginal = window.nav;
    if (typeof navOriginal === 'function') {
      window.nav = function (seccion, linkEl) {
        navOriginal(seccion, linkEl);
        var sec = document.getElementById('sec-' + seccion);
        if (sec) {
          sec.classList.remove('sec-animada');
          void sec.offsetWidth;
          sec.classList.add('sec-animada');
        }
      };
    }
  }
})();