// ============================================================
//  UTILIDADES BÁSICAS
// ============================================================

const $ = (selector, ctx=document) => ctx.querySelector(selector);
const porId = (id) => document.getElementById(id);

// ============================================================
//  REFERENCIAS A ELEMENTOS DEL DOM
// ============================================================

const tarjeta = porId('tarjeta');

const pestanaInicio    = porId('pestana-inicio');
const pestanaRegistro  = porId('pestana-registro');

const pestanaInicioAtras   = porId('pestana-inicio-atras');
const pestanaRegistroAtras = porId('pestana-registro-atras');

const enlaceIrARegistro = porId('ir-a-registro');
const enlaceIrAInicio   = porId('ir-a-inicio');

const formularioInicio   = porId('formulario-inicio');
const formularioRegistro = porId('formulario-registro');

// ============================================================
//  FUNCIÓN PRINCIPAL: mostrar(vista)
// ============================================================

function mostrar(vista){
    const esInicio = (vista === 'inicio');
    tarjeta.classList.toggle('tarjeta--volteada', !esInicio);
    pestanaInicio.setAttribute('aria-selected', String(esInicio));
    pestanaRegistro.setAttribute('aria-selected', String(!esInicio));
    pestanaInicioAtras.setAttribute('aria-selected', String(esInicio));
    pestanaRegistroAtras.setAttribute('aria-selected', String(!esInicio));
}

mostrar('inicio');

// ============================================================
//  MANEJADORES DE EVENTOS - PESTAÑAS Y ENLACES
// ============================================================

pestanaInicio.addEventListener('click',  () => mostrar('inicio'));
pestanaRegistro.addEventListener('click', () => mostrar('registro'));

pestanaInicioAtras.addEventListener('click',  () => mostrar('inicio'));
pestanaRegistroAtras.addEventListener('click', () => mostrar('registro'));

enlaceIrARegistro.addEventListener('click', (ev) => {
    ev.preventDefault();
    mostrar('registro');
});

enlaceIrAInicio.addEventListener('click', (ev) => {
    ev.preventDefault();
    mostrar('inicio');
});

// ============================================================
//  VER / OCULTAR CONTRASEÑA
// ============================================================

document.querySelectorAll('.ojo').forEach(btn => {
    btn.addEventListener('click', function() {
        const input = this.previousElementSibling;
        if (input.type === 'password') {
            input.type = 'text';
            this.textContent = '-👁';
        } else {
            input.type = 'password';
            this.textContent = '👁';
        }
    });
});

// ============================================================
//  VALIDACIONES - FORMULARIO LOGIN
// ============================================================

formularioInicio.addEventListener('submit', (ev) => {
    ev.preventDefault();
    
    if (!formularioInicio.reportValidity()) return;

    const datos = Object.fromEntries(new FormData(formularioInicio).entries());
    
    fetch('/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: datos.correo, Password_hash: datos.clave })
    })
    .then(res => res.json())
    .then(data => {
        if (data.token) {
            window._token = data.token;
            window._usuario = data.usuario;
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('usuario', JSON.stringify(data.usuario));
            
            if(data.usuario.rol === 1){
                window.location.href = '/html/dashboard-admin.html';
            } else if(data.usuario.rol === 30002){
                window.location.href = '/html/dashboard-medico.html';
            } else if(data.usuario.rol === 30003){
                window.location.href = '/html/dashboard-recepcionista.html';
            } else {
                window.location.href = '/html/dashboard-paciente.html';
            }
        } else {
            alert(data.message || 'Error al iniciar sesión');
        }
    })
    .catch(() => alert('Error de conexión'));
});

// ============================================================
//  VALIDACIONES - FORMULARIO REGISTRO
// ============================================================

formularioRegistro.addEventListener('submit', (ev) => {
    ev.preventDefault();
    
    if (!formularioRegistro.reportValidity()) return;

    const pass    = porId('clave-registro').value;
    const confirm = porId('confirmar-registro').value;
    
    if (pass !== confirm) {
        porId('confirmar-registro').focus();
        alert('Las contraseñas no coinciden.');
        return;
    }

    const sexo           = porId('sexo-registro')?.value;
    const fechaNacimiento = porId('fecha-nacimiento-registro')?.value;
    const telefono       = porId('telefono-registro')?.value.trim();
    const direccion      = porId('direccion-registro')?.value.trim();

    if (sexo !== undefined && sexo === "") {
        alert("Seleccione el sexo.");
        porId('sexo-registro').focus();
        return;
    }

    if (fechaNacimiento !== undefined && fechaNacimiento === "") {
        alert("Ingrese la fecha de nacimiento.");
        porId('fecha-nacimiento-registro').focus();
        return;
    }

    if (telefono !== undefined) {
        const regexTelefono = /^[0-9]{8,15}$/;
        if (!regexTelefono.test(telefono)) {
            alert("Ingrese un teléfono válido.");
            porId('telefono-registro').focus();
            return;
        }
    }

    if (direccion !== undefined && direccion.length < 5) {
        alert("Ingrese una dirección válida.");
        porId('direccion-registro').focus();
        return;
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
        idRol:            30001
    };

    console.log("Enviando al servidor:", payload);

    fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.id) {
            alert('Cuenta creada exitosamente');
            mostrar('inicio');
        } else {
            alert(data.message || 'Error al registrarse');
        }
    })
    .catch(() => alert('Error de conexión'));
});