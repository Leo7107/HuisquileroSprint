const citasController = require('../../controllers/citas.controller');

jest.mock('../../models/citas.model');
const Cita = require('../../models/citas.model');

function mockRes() {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
}

beforeEach(() => jest.clearAllMocks());

// ── getCitas ──────────────────────────────────────────────────────────────────
describe('getCitas', () => {
  it('returns all citas', () => {
    const data = [{ idCita: 1 }, { idCita: 2 }];
    Cita.getAll.mockImplementation(cb => cb(null, data));
    const res = mockRes();
    citasController.getCitas({}, res);
    expect(res.json).toHaveBeenCalledWith(data);
  });

  it('returns 500 on DB error', () => {
    Cita.getAll.mockImplementation(cb => cb(new Error('DB'), null));
    const res = mockRes();
    citasController.getCitas({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ── createCita ────────────────────────────────────────────────────────────────
describe('createCita', () => {
  it('returns 400 when idDoctor is missing', () => {
    const res = mockRes();
    citasController.createCita({ body: { fecha: '2025-01-01', hora: '10:00' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it('returns 400 when fecha is missing', () => {
    const res = mockRes();
    citasController.createCita({ body: { idDoctor: 1, hora: '10:00' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when hora is missing', () => {
    const res = mockRes();
    citasController.createCita({ body: { idDoctor: 1, fecha: '2025-01-01' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 409 when duplicate cita exists', () => {
    Cita.checkDuplicado.mockImplementation((doc, f, h, excl, cb) => cb(null, [{ idCita: 99 }]));
    const res = mockRes();
    citasController.createCita({ body: { idDoctor: 1, fecha: '2025-01-01', hora: '10:00' } }, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('creates cita when no duplicate exists', () => {
    Cita.checkDuplicado.mockImplementation((doc, f, h, excl, cb) => cb(null, []));
    Cita.create.mockImplementation((data, cb) => cb(null, { insertId: 42 }));
    const res = mockRes();
    citasController.createCita({ body: { idDoctor: 1, fecha: '2025-01-01', hora: '10:00' } }, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Cita creada', id: 42 });
  });

  it('returns 500 when checkDuplicado fails', () => {
    Cita.checkDuplicado.mockImplementation((doc, f, h, excl, cb) => cb(new Error('DB'), null));
    const res = mockRes();
    citasController.createCita({ body: { idDoctor: 1, fecha: '2025-01-01', hora: '10:00' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ── cancelarCita ──────────────────────────────────────────────────────────────
describe('cancelarCita', () => {
  it('returns 400 if idPaciente is missing in body', () => {
    const res = mockRes();
    citasController.cancelarCita({ params: { id: '1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 if cita not found', () => {
    Cita.getById.mockImplementation((id, cb) => cb(null, []));
    const res = mockRes();
    citasController.cancelarCita({ params: { id: '1' }, body: { idPaciente: '5' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 if patient does not own cita', () => {
    Cita.getById.mockImplementation((id, cb) =>
      cb(null, [{ idCita: 1, idPaciente: 99, estado: 'PENDIENTE' }]));
    const res = mockRes();
    citasController.cancelarCita({ params: { id: '1' }, body: { idPaciente: '5' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 409 if cita is already CANCELADA', () => {
    Cita.getById.mockImplementation((id, cb) =>
      cb(null, [{ idCita: 1, idPaciente: 5, estado: 'CANCELADA' }]));
    const res = mockRes();
    citasController.cancelarCita({ params: { id: '1' }, body: { idPaciente: '5' } }, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('cancelada') }));
  });

  it('returns 409 if cita is already COMPLETADA', () => {
    Cita.getById.mockImplementation((id, cb) =>
      cb(null, [{ idCita: 1, idPaciente: 5, estado: 'COMPLETADA' }]));
    const res = mockRes();
    citasController.cancelarCita({ params: { id: '1' }, body: { idPaciente: '5' } }, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('returns 409 if cancelar affects 0 rows', () => {
    Cita.getById.mockImplementation((id, cb) =>
      cb(null, [{ idCita: 1, idPaciente: 5, estado: 'PENDIENTE' }]));
    Cita.cancelar.mockImplementation((idC, idP, cb) => cb(null, { affectedRows: 0 }));
    const res = mockRes();
    citasController.cancelarCita({ params: { id: '1' }, body: { idPaciente: '5' } }, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('cancels cita successfully', () => {
    Cita.getById.mockImplementation((id, cb) =>
      cb(null, [{ idCita: 1, idPaciente: 5, estado: 'PENDIENTE' }]));
    Cita.cancelar.mockImplementation((idC, idP, cb) => cb(null, { affectedRows: 1 }));
    const res = mockRes();
    citasController.cancelarCita({ params: { id: '1' }, body: { idPaciente: '5' } }, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Cita cancelada correctamente' });
  });
});

// ── reprogramarCita ───────────────────────────────────────────────────────────
describe('reprogramarCita', () => {
  it('returns 400 if idPaciente, fecha or hora missing', () => {
    const res = mockRes();
    citasController.reprogramarCita({ params: { id: '1' }, body: { idPaciente: 5 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 if cita not found', () => {
    Cita.getById.mockImplementation((id, cb) => cb(null, []));
    const res = mockRes();
    citasController.reprogramarCita(
      { params: { id: '1' }, body: { idPaciente: 5, fecha: '2025-06-01', hora: '11:00' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 if patient does not own cita', () => {
    Cita.getById.mockImplementation((id, cb) =>
      cb(null, [{ idCita: 1, idPaciente: 99, idDoctor: 3, estado: 'PENDIENTE' }]));
    const res = mockRes();
    citasController.reprogramarCita(
      { params: { id: '1' }, body: { idPaciente: 5, fecha: '2025-06-01', hora: '11:00' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 409 if cita is CANCELADA', () => {
    Cita.getById.mockImplementation((id, cb) =>
      cb(null, [{ idCita: 1, idPaciente: 5, idDoctor: 3, estado: 'CANCELADA' }]));
    const res = mockRes();
    citasController.reprogramarCita(
      { params: { id: '1' }, body: { idPaciente: 5, fecha: '2025-06-01', hora: '11:00' } }, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('returns 409 if cita is COMPLETADA', () => {
    Cita.getById.mockImplementation((id, cb) =>
      cb(null, [{ idCita: 1, idPaciente: 5, idDoctor: 3, estado: 'COMPLETADA' }]));
    const res = mockRes();
    citasController.reprogramarCita(
      { params: { id: '1' }, body: { idPaciente: 5, fecha: '2025-06-01', hora: '11:00' } }, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('returns 409 when the new slot is already taken', () => {
    Cita.getById.mockImplementation((id, cb) =>
      cb(null, [{ idCita: 1, idPaciente: 5, idDoctor: 3, estado: 'PENDIENTE' }]));
    Cita.checkDuplicado.mockImplementation((doc, f, h, excl, cb) => cb(null, [{ idCita: 88 }]));
    const res = mockRes();
    citasController.reprogramarCita(
      { params: { id: '1' }, body: { idPaciente: 5, fecha: '2025-06-01', hora: '11:00' } }, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('reprograms cita successfully', () => {
    Cita.getById.mockImplementation((id, cb) =>
      cb(null, [{ idCita: 1, idPaciente: 5, idDoctor: 3, estado: 'PENDIENTE' }]));
    Cita.checkDuplicado.mockImplementation((doc, f, h, excl, cb) => cb(null, []));
    Cita.reprogramar.mockImplementation((idC, idP, f, h, cb) => cb(null, { affectedRows: 1 }));
    const res = mockRes();
    citasController.reprogramarCita(
      { params: { id: '1' }, body: { idPaciente: 5, fecha: '2025-06-01', hora: '11:00' } }, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Cita reprogramada correctamente' });
  });
});
