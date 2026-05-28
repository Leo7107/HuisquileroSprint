const express = require("express");
require("dotenv").config();
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend/templates")));
app.use('/css', express.static(path.join(__dirname, "frontend/templates/css")));
app.use('/js', express.static(path.join(__dirname, "frontend/templates/js")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/templates/html", "login.html"));
});

const PAGINAS_PERMITIDAS = new Set([
    'dashboard-admin.html',
    'dashboard-medico.html',
    'dashboard-paciente.html',
    'dashboard-recepcionista.html',
    'agendar.html',
    'forgot-password.html'
]);

app.get("/html/:pagina", (req, res) => {
    const pagina = req.params.pagina;
    if (!PAGINAS_PERMITIDAS.has(pagina))
        return res.status(404).send('Not found');
    res.sendFile(path.join(__dirname, "frontend/templates/html", pagina));
});

const pdfRoutes            = require('./routes/pdf.routes.js');
const consultasRoutes      = require("./routes/consultas.routes");
const facturasRoutes       = require("./routes/facturas.routes");
const recetasRoutes        = require("./routes/recetas.routes");
const usuariosRoutes       = require("./routes/usuarios.routes");
const pacientesRoutes      = require("./routes/pacientes.routes");
const doctoresRoutes       = require("./routes/doctores.routes");
const citasRoutes          = require("./routes/citas.routes");
const diagnosticosRoutes   = require("./routes/diagnosticos.routes");
const historialRoutes      = require("./routes/historial.routes");
const detallesFacturaRoutes= require("./routes/detalles_factura.routes");
const perfilRoutes         = require("./routes/perfil.routes");
const medicamentosRoutes   = require("./routes/medicamentos.routes");
const metricasRoutes       = require('./routes/metricas.routes');
const reportesRoutes       = require('./routes/reportes.routes'); // 

app.use('/api/metricas',         metricasRoutes);
app.use("/api/consultas",        consultasRoutes);
app.use("/api/facturas",         facturasRoutes);
app.use("/api/recetas",          recetasRoutes);
app.use("/api/usuarios",         usuariosRoutes);
app.use("/api/pacientes",        pacientesRoutes);
app.use("/api/doctores",         doctoresRoutes);
app.use("/api/citas",            citasRoutes);
app.use("/api/diagnosticos",     diagnosticosRoutes);
app.use("/api/historial",        historialRoutes);
app.use("/api/detalles-factura", detallesFacturaRoutes);
app.use("/api/perfil",           perfilRoutes);
app.use("/api/medicamentos",     medicamentosRoutes);
app.use('/api/pdf',              pdfRoutes);
app.use('/api/reportes',         reportesRoutes); // 

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🔥 Servidor corriendo en puerto ${PORT}`);
});
