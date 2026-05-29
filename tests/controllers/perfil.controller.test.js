jest.mock('../../models/perfil.model');
const Perfil = require('../../models/perfil.model');
const perfilController = require('../../controllers/perfil.controller');

function mockRes() {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
}

beforeEach(() => jest.clearAllMocks());

// ── getPerfil ─────────────────────────────────────────────────────────────────
describe('getPerfil', () => {
  it('returns user data when found', () => {
    const data = { idUsuario: 1, Nombres: 'Ana' };
    Perfil.getPerfil.mockImplementation((id, cb) => cb(null, [data]));
    const res = mockRes();
    perfilController.getPerfil({ params: { idUsuario: '1' } }, res);
    expect(res.json).toHaveBeenCalledWith(data);
  });

  it('returns 404 when user not found', () => {
    Perfil.getPerfil.mockImplementation((id, cb) => cb(null, []));
    const res = mockRes();
    perfilController.getPerfil({ params: { idUsuario: '99' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 500 on DB error', () => {
    Perfil.getPerfil.mockImplementation((id, cb) => cb(new Error('DB'), null));
    const res = mockRes();
    perfilController.getPerfil({ params: { idUsuario: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ── updatePerfil ──────────────────────────────────────────────────────────────
describe('updatePerfil', () => {
  it('returns 500 when updateUsuario fails', async () => {
    Perfil.updateUsuario.mockImplementation((id, data, cb) => cb(new Error('DB'), null));
    const res = mockRes();
    await perfilController.updatePerfil(
      { params: { idUsuario: '1' }, body: { Telefono: '1234' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('creates paciente and historial when neither exists', async () => {
    Perfil.updateUsuario.mockImplementation((id, data, cb) => cb(null, {}));
    Perfil.getPacienteByUsuario.mockImplementation((id, cb) => cb(null, []));
    Perfil.createPaciente.mockImplementation((data, cb) => cb(null, { insertId: 7 }));
    Perfil.getHistorialByPaciente.mockImplementation((id, cb) => cb(null, []));
    Perfil.createHistorial.mockImplementation((data, cb) => cb(null, {}));

    const res = mockRes();
    await perfilController.updatePerfil(
      { params: { idUsuario: '1' }, body: { Telefono: '1234', tipo_sangre: 'O+' } }, res);

    expect(Perfil.createPaciente).toHaveBeenCalled();
    expect(Perfil.createHistorial).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Perfil actualizado correctamente' });
  });

  it('updates existing paciente and historial', async () => {
    Perfil.updateUsuario.mockImplementation((id, data, cb) => cb(null, {}));
    Perfil.getPacienteByUsuario.mockImplementation((id, cb) =>
      cb(null, [{ idPaciente: 5 }]));
    Perfil.updatePaciente.mockImplementation((id, data, cb) => cb(null, {}));
    Perfil.getHistorialByPaciente.mockImplementation((id, cb) =>
      cb(null, [{ idHistorial: 3 }]));
    Perfil.updateHistorial.mockImplementation((id, data, cb) => cb(null, {}));

    const res = mockRes();
    await perfilController.updatePerfil(
      { params: { idUsuario: '1' }, body: { Direccion: 'Calle 1', alergias: 'Ninguna' } }, res);

    expect(Perfil.updatePaciente).toHaveBeenCalled();
    expect(Perfil.updateHistorial).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Perfil actualizado correctamente' });
  });

  it('skips updateUsuario when no user fields are present', async () => {
    Perfil.getPacienteByUsuario.mockImplementation((id, cb) =>
      cb(null, [{ idPaciente: 5 }]));
    Perfil.updatePaciente.mockImplementation((id, data, cb) => cb(null, {}));
    Perfil.getHistorialByPaciente.mockImplementation((id, cb) =>
      cb(null, [{ idHistorial: 3 }]));
    Perfil.updateHistorial.mockImplementation((id, data, cb) => cb(null, {}));

    const res = mockRes();
    await perfilController.updatePerfil(
      { params: { idUsuario: '1' }, body: { tipo_sangre: 'A+' } }, res);

    expect(Perfil.updateUsuario).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Perfil actualizado correctamente' });
  });
});
