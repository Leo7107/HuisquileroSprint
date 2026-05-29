// ═══════════════════════════════════════════════════════════════════
//  dashboard-utils.js — Utilidades compartidas para todos los dashboards
//  Debe cargarse ANTES del script específico de cada dashboard
// ═══════════════════════════════════════════════════════════════════

// ── ROLES ────────────────────────────────────────────────────────────────────
var ROLES = { ADMIN: 1, PACIENTE: 30001, MEDICO: 30002, RECEPCIONISTA: 30003 };

// ── AUTH HEADERS ─────────────────────────────────────────────────────────────
// Usamos window.H para que sea accesible globalmente en todos los scripts
window.H = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + localStorage.getItem('token'),
};

// ── ESCAPE HTML ───────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── TOAST UNIFICADO ───────────────────────────────────────────────────────────
// Maneja: 'success', 'ok', 'info', 'error', 'warning', 'warn'
var _toastTimer = null;
function toast(msg, tipo = 'success') {
  var el = document.getElementById('_toast_notif');
  if (!el) {
    el = document.createElement('div');
    el.id = '_toast_notif';
    Object.assign(el.style, {
      position:'fixed', bottom:'24px', right:'24px', padding:'13px 22px',
      borderRadius:'12px', fontSize:'14px', fontWeight:'600', zIndex:'9999',
      display:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.15)', maxWidth:'380px', lineHeight:'1.4',
    });
    document.body.appendChild(el);
  }
  var paleta = {
    success: { bg:'#e8f5e9', color:'#2e7d32' },
    ok:      { bg:'#e8f5e9', color:'#2e7d32' },
    info:    { bg:'#e3f2fd', color:'#1a5276' },
    error:   { bg:'#ffebee', color:'#c62828' },
    warning: { bg:'#fff8e1', color:'#b07800' },
    warn:    { bg:'#fff8e1', color:'#b07800' },
  };
  var c = paleta[tipo] || paleta.success;
  el.style.background = c.bg;
  el.style.color      = c.color;
  el.textContent      = msg;
  el.style.display    = 'block';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.style.display = 'none'; }, 3500);
}

// ── CERRAR SESIÓN ─────────────────────────────────────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/';
}
