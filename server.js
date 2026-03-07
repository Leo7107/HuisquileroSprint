const express = require("express");
require("dotenv").config();
const path = require("path");

const app = express();

app.use(express.json());

app.use(express.static(path.join(__dirname, "frontend/templates")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/templates/html", "login.html"));
});

app.get("/html/:pagina", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/templates/html", req.params.pagina));
});

const consultasRoutes = require("./routes/consultas.routes");
const facturasRoutes = require("./routes/facturas.routes");
const recetasRoutes = require("./routes/recetas.routes");
const usuariosRoutes = require("./routes/usuarios.routes");
const pacientesRoutes = require("./routes/pacientes.routes");
const doctoresRoutes = require("./routes/doctores.routes");
const citasRoutes = require("./routes/citas.routes");
const diagnosticosRoutes = require("./routes/diagnosticos.routes");
const historialRoutes = require("./routes/historial.routes");
const detallesFacturaRoutes = require("./routes/detalles_factura.routes");

app.use("/api/consultas", consultasRoutes);
app.use("/api/facturas", facturasRoutes);
app.use("/api/recetas", recetasRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/pacientes", pacientesRoutes);
app.use("/api/doctores", doctoresRoutes);
app.use("/api/citas", citasRoutes);
app.use("/api/diagnosticos", diagnosticosRoutes);
app.use("/api/historial", historialRoutes);
app.use("/api/detalles-factura", detallesFacturaRoutes);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🔥 Servidor corriendo en puerto ${PORT}`);
});
