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

function normalizarError(error) {
  return error instanceof Error ? error.message : String(error);
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
    throw new Error('Error al cargar catálogos desde Supabase: ' + normalizarError(error));
  }
}

function obtenerMetricasDSA() {
  try {
    const endpoint = 'dsa?select=id_dsa,folio_dsa,fecha_recepcion,no_oficio,cancelado_at,observaciones&order=creado.desc';
    const registros = supabaseFetch(endpoint, { method: 'get' }) || [];

    let total = registros.length;
    let activos = 0;
    let cancelados = 0;

    registros.forEach(function(r) {
      if (r.cancelado_at) {
        cancelados++;
      } else {
        activos++;
      }
    });

    return {
      total: total,
      activos: activos,
      cancelados: cancelados,
      recientes: registros.slice(0, 15)
    };
  } catch (error) {
    throw new Error('No se pudieron compilar las métricas de Supabase: ' + normalizarError(error));
  }
}

function supabaseFetchSeguro(endpoint, fallback) {
  try {
    var resultado = supabaseFetch(endpoint, { method: 'get' });
    return resultado || fallback;
  } catch (error) {
    console.warn('Consulta ERP omitida: ' + endpoint + ' :: ' + normalizarError(error));
    return fallback;
  }
}

function sumarCampo(registros, campo) {
  return (registros || []).reduce(function(total, item) {
    return total + Number(item[campo] || 0);
  }, 0);
}

function obtenerSuiteERP() {
  var dsa = supabaseFetchSeguro('dsa?select=id_dsa,folio_dsa,fecha_recepcion,no_oficio,cancelado_at,observaciones,uc_solicitantes(uc_denominacion,uc_cod),servicios(nombre),estatus_tramite(estatus_tramite)&order=creado.desc&limit=80', []);
  var caa = supabaseFetchSeguro('caa_autorizaciones?select=id_caa,folio,fecha_autorizacion,importe_autorizado,dsa(folio_dsa),proveedores(nombre_proveedor)&order=fecha_autorizacion.desc&limit=60', []);
  var pedidos = supabaseFetchSeguro('pedidos?select=id_pedido,no_pedido,fecha_pedido,cancelado_at,proveedores(nombre_proveedor),estatus_entrega(estatus_entrega),caa_autorizaciones(folio,importe_autorizado,dsa(folio_dsa))&order=fecha_pedido.desc&limit=80', []);
  var facturacion = supabaseFetchSeguro('facturacion_detalle?select=id_factura_detalle,importe_facturado,importe_pagado,fecha_pago,fecha_envio_xml_rf,facturas(no_factura,fecha_factura,proveedores(nombre_proveedor)),pedidos_detalles(pedidos(no_pedido),dsa_detalles(catalogo(descripcion)))&order=created_at.desc&limit=80', []);
  var proveedores = supabaseFetchSeguro('proveedores?select=id_proveedor,nombre_proveedor,rfc,estado_proveedor,giro,vigencia,correo,telefono_1&order=nombre_proveedor.asc&limit=80', []);
  var pacientes = supabaseFetchSeguro('pacientes?select=id_paciente,nombre_completo,rud&order=nombre_completo.asc&limit=80', []);

  var facturado = sumarCampo(facturacion, 'importe_facturado');
  var pagado = sumarCampo(facturacion, 'importe_pagado');
  var autorizado = sumarCampo(caa, 'importe_autorizado');

  return {
    resumen: {
      expedientes: dsa.length,
      autorizaciones: caa.length,
      pedidos: pedidos.length,
      proveedores: proveedores.length,
      pacientes: pacientes.length,
      facturado: facturado,
      pagado: pagado,
      porPagar: Math.max(facturado - pagado, 0),
      autorizado: autorizado
    },
    pipeline: dsa.slice(0, 20),
    autorizaciones: caa,
    pedidos: pedidos,
    facturacion: facturacion,
    proveedores: proveedores,
    pacientes: pacientes
  };
}

function obtenerVistasOperativas() {
  try {
    const proveedores = supabaseFetch('proveedores?select=id_proveedor,nombre_proveedor,rfc,estado_proveedor,giro,vigencia,correo,telefono_1&order=nombre_proveedor.asc&limit=50', { method: 'get' }) || [];
    const pedidos = supabaseFetch('pedidos?select=id_pedido,no_pedido,fecha_pedido,cancelado_at,proveedores(nombre_proveedor),estatus_entrega(estatus_entrega),caa_autorizaciones(folio,dsa(folio_dsa))&order=fecha_pedido.desc&limit=50', { method: 'get' }) || [];
    const facturacion = supabaseFetch('facturacion_detalle?select=id_factura_detalle,importe_facturado,importe_pagado,fecha_pago,fecha_envio_xml_rf,facturas(no_factura,fecha_factura,proveedores(nombre_proveedor)),pedidos_detalles(pedidos(no_pedido),dsa_detalles(cantidad,catalogo(descripcion)))&order=created_at.desc&limit=50', { method: 'get' }) || [];
    const catalogoFinanciero = supabaseFetch('catalogo?select=codigo_art,descripcion,precio_sin_iva,iva,presentacion,unidades_presentacion,cog(cog_id,capitulo,concepto,partida_especifica,tipo_gasto)&order=descripcion.asc&limit=50', { method: 'get' }) || [];

    return {
      proveedores: proveedores,
      pedidos: pedidos,
      facturacion: facturacion,
      catalogoFinanciero: catalogoFinanciero,
      resumen: {
        proveedores: proveedores.length,
        pedidos: pedidos.length,
        facturas: facturacion.length,
        catalogo: catalogoFinanciero.length
      }
    };
  } catch (error) {
    throw new Error('No se pudieron cargar las vistas operativas: ' + normalizarError(error));
  }
}
