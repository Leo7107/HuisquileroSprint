// ============================================================
//  UTILIDADES BÁSICAS - Explicación
// ============================================================

/**
 * Función $: Atajo para querySelector
 * @param {string} selector - Selector CSS
 * @param {Element} ctx - Contexto (por defecto document)
 * @returns {Element} Elemento encontrado
 * 
 * ¿Por qué? Nos ahorra escribir document.querySelector cada vez
 */
const $ = (selector, ctx=document) => ctx.querySelector(selector);

/**
 * Función porId: Atajo para getElementById
 * @param {string} id - ID del elemento
 * @returns {Element} Elemento con ese ID
 * 
 * getElementById es más rápido que querySelector para IDs
 */
const porId = (id) => document.getElementById(id);

// ============================================================
//  REFERENCIAS A ELEMENTOS DEL DOM
// ============================================================

// Tarjeta principal (la que gira)
const tarjeta = porId('tarjeta');

// Pestañas de la cara frontal
const pestanaInicio    = porId('pestana-inicio');
const pestanaRegistro  = porId('pestana-registro');

// Pestañas de la cara posterior (duplicadas para UI coherente)
const pestanaInicioAtras   = porId('pestana-inicio-atras');
const pestanaRegistroAtras = porId('pestana-registro-atras');

// Enlaces que también cambian de vista
const enlaceIrARegistro = porId('ir-a-registro');
const enlaceIrAInicio   = porId('ir-a-inicio');

// Formularios
const formularioInicio   = porId('formulario-inicio');
const formularioRegistro = porId('formulario-registro');

// ============================================================
// FUNCIÓN PRINCIPAL: mostrar(vista)
// ============================================================

/**
 * Cambia la vista de la tarjeta (frente/atrás)
 * @param {string} vista - 'inicio' o 'registro'
 * 
 * ¿Cómo funciona?
 * 1. tarjeta.classList.toggle() agrega o quita la clase que gira
 * 2. Si vista es 'inicio' → quitamos la clase (sin giro)
 * 3. Si vista es 'registro' → agregamos la clase (giro 180°)
 * 4. Actualizamos aria-selected en las pestañas para mantener UI
 */
function mostrar(vista){
    const esInicio = (vista === 'inicio');

    // Activa/desactiva la clase que gira la tarjeta 180° en Y
    tarjeta.classList.toggle('tarjeta--volteada', !esInicio);

    // Actualizamos el estado visual de TODAS las pestañas
    pestanaInicio.setAttribute('aria-selected', String(esInicio));
    pestanaRegistro.setAttribute('aria-selected', String(!esInicio));
    pestanaInicioAtras.setAttribute('aria-selected', String(esInicio));
    pestanaRegistroAtras.setAttribute('aria-selected', String(!esInicio));
}

// Estado inicial: mostramos la cara de “Iniciar sesión”
mostrar('inicio');

// ============================================================
//  MANEJADORES DE EVENTOS
// ============================================================

/**
 * Click en pestañas - Cambian la vista
 * 
 * addEventListener: registra una función que se ejecuta cuando
 * ocurre el evento especificado (en este caso 'click')
 */
pestanaInicio.addEventListener('click',  () => mostrar('inicio'));
pestanaRegistro.addEventListener('click', () => mostrar('registro'));

pestanaInicioAtras.addEventListener('click',  () => mostrar('inicio'));
pestanaRegistroAtras.addEventListener('click', () => mostrar('registro'));

/**
 * Click en enlaces - También cambian la vista
 * 
 * ev.preventDefault(): Evita el comportamiento por defecto
 * de los enlaces (que es navegar a otra página)
 */
enlaceIrARegistro.addEventListener('click', (ev) => {
    ev.preventDefault();   // Evita que el <a> navegue
    mostrar('registro');   // Cambia a la vista de Registro
});

enlaceIrAInicio.addEventListener('click', (ev) => {
    ev.preventDefault();
    mostrar('inicio');
});

// ============================================================
// VALIDACIONES DE FORMULARIOS
// ============================================================

/**
 * Formulario de Login
 * 
 * reportValidity(): Método nativo de HTML5 que muestra
 * los mensajes de validación según los atributos (required, type)
 * 
 * FormData: Objeto que captura todos los datos del formulario
 * Object.fromEntries(): Convierte FormData a objeto simple
 */
formularioInicio.addEventListener('submit', (ev) => {
    ev.preventDefault();                // Evita recargar la página
    
    // Validación nativa del navegador
    if (!formularioInicio.reportValidity()) return;

    // Capturar datos del formulario
    const datos = Object.fromEntries(new FormData(formularioInicio).entries());
    
    // Mostrar demo (en producción aquí iría el envío al servidor)
    fetch('/api/usuarios/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Email: datos.correo, Password_hash: datos.clave })
    })

    .then(res => res.json())

    .then(data => {
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            
            if(data.usuario.rol === 1){
                window.location.href = '/html/dashboard-admin.html'
            }else if(data.usuario.rol === 30002){
                window.location.href = '/html/dashboard-medico.html';
            }else{
                window.location.href = '/html/dashboard-paciente.html';
            }
        } else {
            alert(data.message || 'Error al iniciar sesión');
        }
    })
    .catch(() => alert('Error de conexión'));
});

/**
 * Formulario de Registro
 * 
 * Validación extra: Verificar que contraseñas coincidan
 * .value: propiedad que obtiene el valor actual del input
 */
formularioRegistro.addEventListener('submit', (ev) => {
    ev.preventDefault();
    
    // Validación nativa del navegador
    if (!formularioRegistro.reportValidity()) return;

    // Verificación adicional: coincidencia de contraseñas
    const pass = porId('clave-registro').value;
    const confirm = porId('confirmar-registro').value;
    
    if (pass !== confirm) {
        porId('confirmar-registro').focus();
        alert('Las contraseñas no coinciden.');
        return;
    }

    // ============================================================
    // NUEVAS VALIDACIONES PARA LOS CAMPOS DE LA CLÍNICA
    // ============================================================

    const sexo = porId('sexo-registro')?.value;
    const fechaNacimiento = porId('fecha-nacimiento-registro')?.value;
    const telefono = porId('telefono-registro')?.value.trim();
    const direccion = porId('direccion-registro')?.value.trim();

    // validar sexo
    if (sexo !== undefined && sexo === "") {
        alert("Seleccione el sexo.");
        porId('sexo-registro').focus();
        return;
    }

    // validar fecha
    if (fechaNacimiento !== undefined && fechaNacimiento === "") {
        alert("Ingrese la fecha de nacimiento.");
        porId('fecha-nacimiento-registro').focus();
        return;
    }

    // validar telefono
    if (telefono !== undefined) {
        const regexTelefono = /^[0-9]{8,15}$/;

        if (!regexTelefono.test(telefono)) {
            alert("Ingrese un teléfono válido.");
            porId('telefono-registro').focus();
            return;
        }
    }

    // validar direccion
    if (direccion !== undefined && direccion.length < 5) {
        alert("Ingrese una dirección válida.");
        porId('direccion-registro').focus();
        return;
    }

    // ============================================================

    const datos = Object.fromEntries(new FormData(formularioRegistro).entries());

    const payload = {
        Nombres: datos.nombres,
        Apellidos: datos.apellidos,
        Sexo: datos.sexo,
        Fecha_nacimiento: datos.fecha_nacimiento,
        Telefono: datos.telefono,
        Direccion: datos.direccion,
        Email: datos.correo,
        Password_hash: datos.clave,
        Estado: 'ACTIVO',
        idRol: 30001
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
})