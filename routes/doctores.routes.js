const express = require("express");
const router = express.Router();
const doctoresController = require("../controllers/doctores.controller");

router.get("/", doctoresController.getDoctores);
router.get("/:id", doctoresController.getDoctorById);
router.post("/", doctoresController.createDoctor);
router.put("/:id", doctoresController.updateDoctor);
router.delete("/:id", doctoresController.deleteDoctor);

module.exports = router;
