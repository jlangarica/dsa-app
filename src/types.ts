declare interface Paciente {
  id_paciente?: number;
  rud?: string;
  numero_registro?: string;
  nombre_completo: string;
  fecha_nacimiento?: string;
  sexo?: 'M' | 'F' | 'X';
  created_at?: string;
  updated_at?: string;
}

declare interface Dsa {
  id_dsa?: number;
  folio_dsa: string;
  id_tramite?: number;
  id_uc?: number;
  fecha_recepcion?: string;
  id_servicio?: number;
  no_oficio?: string;
  id_usuario?: number;
  fecha_entrega_cotizacion?: string;
  id_estatus_tramite?: number;
  observaciones?: string;
  cancelado_at?: string;
  motivo_cancelacion?: string;
}

declare interface DsaDetalle {
  id_dsa_detalle?: number;
  id_dsa: number;
  codigo_art: string;
  cantidad: number;
  id_paciente?: number;
  precio_unitario: number;
}

declare interface Proveedor {
  id_proveedor?: number;
  nombre_proveedor: string;
  rfc?: string;
  estado_proveedor: 'Activo' | 'Suspendido' | 'Cancelado' | 'En revision';
}
