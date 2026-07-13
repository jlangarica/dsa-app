function buscarPaciente(criterio) {
  const endpoint = 'pacientes?or=(rud.eq.' + criterio + ',nombre_completo.ilike.*' + criterio + '*)';
  return supabaseFetch(endpoint, { method: 'get' });
}

function registrarPaciente(paciente) {
  const opciones = {
    method: 'post',
    contentType: 'application/json',
    headers: { Prefer: 'return=representation' },
    payload: JSON.stringify(paciente)
  };

  const resultado = supabaseFetch('pacientes', opciones);
  return resultado[0];
}

function obtenerDsaConDetalles(folioDsa) {
  const camposSelect = [
    '*',
    'uc_solicitantes(uc_denominacion,uc_cod)',
    'servicios(nombre)',
    'usuarios(nombre)',
    `dsa_detalles(
      cantidad,
      precio_unitario,
      catalogo(descripcion,presentacion),
      pacientes(nombre_completo,rud)
    )`
  ].join(',');

  const endpoint = `dsa?folio_dsa=eq.${folioDsa}&select=${camposSelect}`;
  const resultado = supabaseFetch(endpoint, { method: 'get' });
  return resultado.length > 0 ? resultado[0] : null;
}

function crearTramiteDsaCompleto(dsa, articulos) {
  const dsaCreada = supabaseFetch('dsa', {
    method: 'post',
    contentType: 'application/json',
    headers: { Prefer: 'return=representation' },
    payload: JSON.stringify(dsa)
  })[0];

  if (!dsaCreada.id_dsa) {
    throw new Error('No se pudo generar el ID de la DSA');
  }

  const detallesPayload = articulos.map(function(art) {
    return {
      codigo_art: art.codigo_art,
      cantidad: art.cantidad,
      id_paciente: art.id_paciente,
      precio_unitario: art.precio_unitario,
      id_dsa: dsaCreada.id_dsa
    };
  });

  supabaseFetch('dsa_detalles', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(detallesPayload)
  });

  return dsaCreada.folio_dsa;
}

function insertarCompraDSADetalle(cabecera, detalles) {
  var dsa = {
    folio_dsa: cabecera.folio_dsa,
    id_tramite: cabecera.id_tramite || null,
    id_uc: cabecera.id_uc || null,
    fecha_recepcion: cabecera.fecha_recepcion || null,
    id_servicio: cabecera.id_servicio || null,
    no_oficio: cabecera.no_oficio || null,
    id_usuario: cabecera.id_usuario || null,
    id_estatus_tramite: cabecera.id_estatus_tramite || null,
    observaciones: cabecera.observaciones || null
  };

  return crearTramiteDsaCompleto(dsa, detalles || []);
}

function obtenerDatosIniciales() {
  try {
    return {
      tramites: supabaseFetch('tipos_tramite?activo=eq.true&select=id_tramite,tipo_tramite', { method: 'get' }) || [],
      unidades: supabaseFetch('uc_solicitantes?activo=eq.true&select=id_uc,uc_denominacion,uc_cod', { method: 'get' }) || [],
      servicios: supabaseFetch('servicios?activo=eq.true&select=id_servicio,nombre', { method: 'get' }) || [],
      usuarios: supabaseFetch('usuarios?activo=eq.true&select=id_usuario,nombre', { method: 'get' }) || [],
      estatus: supabaseFetch('estatus_tramite?select=id_estatus_tramite,estatus_tramite', { method: 'get' }) || [],
      catalogo: supabaseFetch('catalogo?activo=eq.true&select=codigo_art,descripcion,precio_sin_iva,presentacion', { method: 'get' }) || [],
      pacientes: supabaseFetch('pacientes?select=id_paciente,nombre_completo,rud', { method: 'get' }) || []
    };
  } catch (error) {
    throw new Error('Error al cargar catálogos desde Supabase: ' + error.message);
  }
}
