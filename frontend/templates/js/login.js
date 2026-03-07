// ============================================================
//  UTILIDADES BÁSICAS
// ============================================================
const $ = (selector, ctx=document) => ctx.querySelector(selector);
const porId = (id) => document.getElementById(id);

// ============================================================
//  REFERENCIAS A ELEMENTOS DEL DOM
// ============================================================
const tarjeta            = porId('tarjeta');
const pestanaInicio      = porId('pestana-inicio');
const pestanaRegistro    = porId('pestana-registro');
const pestanaInicioAtras   = porId('pestana-inicio-atras');
const pestanaRegistroAtras = porId('pestana-registro-atras');
const enlaceIrARegistro  = porId('ir-a-registro');
const enlaceIrAInicio    = porId('ir-a-inicio');
const formularioInicio   = porId('formulario-inicio');
const formularioRegistro = porId('formulario-registro');

// ============================================================
//  MAPA DE ROLES → VISTAS
//  Ajusta los idRol según tu tabla tbl_roles en la BD
// ============================================================
const VISTAS_POR_ROL = {
    1: 'dashboard-admin.html',          // Administrador
    2: 'dashboard-medico.html',         // Médico
    3: 'dashboard-recepcionista.html',  // Recepcionista
    4: 'dashboard-paciente.html'        // Paciente
};

/**
 * Redirige al dashboard según el rol del usuario
 * @param {object} usuario - Objeto con idRol devuelto por la API
 */
function redirigirPorRol(usuario) {
    const idRol  = usuario?.idRol;
    const vista  = VISTAS_POR_ROL[idRol];

    if (vista) {
        window.location.href = vista;
    } else {
        // Rol desconocido: mostrar error y limpiar sesión
        alert('Rol no reconocido. Contacta al administrador.');
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
    }
}

// ============================================================
//  FUNCIÓN PRINCIPAL: mostrar(vista)
// ============================================================
function mostrar(vista) {
    const esInicio = (vista === 'inicio');
    tarjeta.classList.toggle('tarjeta--volteada', !esInicio);
    pestanaInicio.setAttribute('aria-selected',      String(esInicio));
    pestanaRegistro.setAttribute('aria-selected',    String(!esInicio));
    pestanaInicioAtras.setAttribute('aria-selected', String(esInicio));
    pestanaRegistroAtras.setAttribute('aria-selected', String(!esInicio));
}

// Estado inicial
mostrar('inicio');

// ============================================================
//  MANEJADORES DE EVENTOS - Pestañas y enlaces
// ============================================================
pestanaInicio.addEventListener('click',       () => mostrar('inicio'));
pestanaRegistro.addEventListener('click',     () => mostrar('registro'));
pestanaInicioAtras.addEventListener('click',  () => mostrar('inicio'));
pestanaRegistroAtras.addEventListener('click',() => mostrar('registro'));

enlaceIrARegistro.addEventListener('click', (ev) => { ev.preventDefault(); mostrar('registro'); });
enlaceIrAInicio.addEventListener('click',   (ev) => { ev.preventDefault(); mostrar('inicio'); });

// ============================================================
//  FORMULARIO LOGIN - Con redirección por rol
// ============================================================
formularioInicio.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!formularioInicio.reportValidity()) return;

    const datos = Object.fromEntries(new FormData(formularioInicio).entries());

    // Feedback visual mientras carga
    const boton = formularioInicio.querySelector('.boton');
    boton.textContent = 'Verificando...';
    boton.disabled = true;

    fetch('/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: datos.correo, Password_hash: datos.clave })
    })
    .then(res => res.json())
    .then(data => {
        if (data.token) {
            // Guardar sesión en localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));

            // ← REDIRECCIÓN POR ROL
            redirigirPorRol(data.usuario);
        } else {
            alert(data.message || 'Correo o contraseña incorrectos.');
            boton.textContent = 'Login';
            boton.disabled = false;
        }
    })
    .catch(() => {
        alert('Error de conexión con el servidor.');
        boton.textContent = 'Login';
        boton.disabled = false;
    });
});

// ============================================================
//  FORMULARIO REGISTRO
// ============================================================
formularioRegistro.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!formularioRegistro.reportValidity()) return;

    // Verificar que contraseñas coincidan
    const pass    = porId('clave-registro').value;
    const confirm = porId('confirmar-registro').value;
    if (pass !== confirm) {
        porId('confirmar-registro').focus();
        alert('Las contraseñas no coinciden.');
        return;
    }

    // Validaciones adicionales
    const sexo           = porId('sexo-registro')?.value;
    const fechaNacimiento = porId('fecha-registro')?.value;
    const telefono       = porId('telefono-registro')?.value.trim();
    const direccion      = porId('direccion-registro')?.value.trim();

    if (!sexo) {
        alert('Seleccione el sexo.'); porId('sexo-registro').focus(); return;
    }
    if (!fechaNacimiento) {
        alert('Ingrese la fecha de nacimiento.'); porId('fecha-registro').focus(); return;
    }
    if (!/^[0-9]{8,15}$/.test(telefono)) {
        alert('Ingrese un teléfono válido (solo números, 8-15 dígitos).'); porId('telefono-registro').focus(); return;
    }
    if (direccion.length < 5) {
        alert('Ingrese una dirección válida.'); porId('direccion-registro').focus(); return;
    }

    const datos = Object.fromEntries(new FormData(formularioRegistro).entries());

    const payload = {
        Nombres:          datos.nombres,
        Apellidos:        datos.apellidos,
        Sexo:             datos.sexo,
        Fecha_nacimiento: datos.fecha_nacimiento,
        Telefono:         datos.telefono,
        Direccion:        datos.direccion,
        Email:            datos.correo,
        Password_hash:    datos.clave,
        Estado:           'ACTIVO',
        idRol:            4   // Por defecto: Paciente (ajusta según tu tbl_roles)
    };

    const boton = formularioRegistro.querySelector('.boton');
    boton.textContent = 'Creando cuenta...';
    boton.disabled = true;

    fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.id) {
            alert('¡Cuenta creada exitosamente! Ya puedes iniciar sesión.');
            formularioRegistro.reset();
            mostrar('inicio');
        } else {
            alert(data.message || 'Error al registrarse.');
        }
        boton.textContent = 'Crear cuenta';
        boton.disabled = false;
    })
    .catch(() => {
        alert('Error de conexión con el servidor.');
        boton.textContent = 'Crear cuenta';
        boton.disabled = false;
    });
});

// ============================================================
//  PROTECCIÓN DE RUTAS (para usar en los dashboards)
//  Exportamos una función que verifica si hay sesión activa
//  Copiar esto al inicio de cada dashboard JS si es necesario
// ============================================================

/**
 * Verifica que haya sesión activa y que el rol coincida.
 * Si no, redirige al login.
 * @param {number[]} rolesPermitidos - Array de idRol permitidos
 * 
 * Uso en cada dashboard:
 *   verificarSesion([1]);   // Solo Admin
 *   verificarSesion([2]);   // Solo Médico
 *   verificarSesion([3]);   // Solo Recepcionista
 *   verificarSesion([4]);   // Solo Paciente
 */
function verificarSesion(rolesPermitidos = []) {
    const token   = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

    if (!token || !usuario) {
        window.location.href = 'index.html';
        return null;
    }

    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(usuario.idRol)) {
        alert('No tienes permiso para acceder a esta sección.');
        window.location.href = 'index.html';
        return null;
    }

    return usuario;
}