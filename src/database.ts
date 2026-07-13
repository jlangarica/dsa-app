import { Paciente, Dsa, DsaDetalle } from './types';

function buscarPaciente(criterio: string): Paciente[] {
  const endpoint = `pacientes?or=(rud.eq.${criterio},nombre_completo.ilike.*${criterio}*)`;
  return supabaseFetch(endpoint, { method: 'get' });
}

function registrarPaciente(paciente: Paciente): Paciente {
  const opciones: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: { Prefer: 'return=representation' },
    payload: JSON.stringify(paciente)
  };

  const resultado = supabaseFetch('pacientes', opciones);
  return resultado[0];
}

function obtenerDsaConDetalles(folioDsa: string) {
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

function crearTramiteDsaCompleto(dsa: Dsa, articulos: Omit<DsaDetalle, 'id_dsa'>[]) {
  const dsaCreada = supabaseFetch('dsa', {
    method: 'post',
    contentType: 'application/json',
    headers: { Prefer: 'return=representation' },
    payload: JSON.stringify(dsa)
  })[0] as Dsa;

  if (!dsaCreada.id_dsa) {
    throw new Error('No se pudo generar el ID de la DSA');
  }

  const detallesPayload = articulos.map(art => ({
    ...art,
    id_dsa: dsaCreada.id_dsa
  }));

  supabaseFetch('dsa_detalles', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(detallesPayload)
  });

  return dsaCreada.folio_dsa;
}
