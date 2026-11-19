-- Bitaller · esquema PostgreSQL (compatible con Supabase y PGlite)
CREATE TABLE IF NOT EXISTS talleres (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  ciudad TEXT NOT NULL DEFAULT 'Florencia',
  plan TEXT NOT NULL DEFAULT 'basico' CHECK (plan IN ('basico','completo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  taller_id INT NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('dueno','mecanico')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vehiculos (
  id SERIAL PRIMARY KEY,
  placa TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'moto' CHECK (tipo IN ('moto','carro')),
  celular TEXT NOT NULL,
  autoriza_datos BOOLEAN NOT NULL DEFAULT false,
  autoriza_datos_at TIMESTAMPTZ,
  consulta_publica BOOLEAN NOT NULL DEFAULT false,
  soat_vence DATE,
  rtm_vence DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehiculos_celular_idx ON vehiculos(celular);
CREATE TABLE IF NOT EXISTS servicios (
  id SERIAL PRIMARY KEY,
  taller_id INT NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  vehiculo_id INT NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
  mecanico_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  kilometraje INT,
  trabajos TEXT[] NOT NULL DEFAULT '{}',
  notas TEXT,
  mano_obra INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  es_garantia BOOLEAN NOT NULL DEFAULT false,
  comprobante_enviado BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS servicios_taller_fecha_idx ON servicios(taller_id, fecha);
CREATE INDEX IF NOT EXISTS servicios_vehiculo_idx ON servicios(vehiculo_id);
CREATE TABLE IF NOT EXISTS repuestos (
  id SERIAL PRIMARY KEY,
  taller_id INT NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 2,
  precio INT NOT NULL DEFAULT 0,
  UNIQUE (taller_id, nombre)
);
CREATE TABLE IF NOT EXISTS servicio_repuestos (
  servicio_id INT NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  repuesto_id INT NOT NULL REFERENCES repuestos(id) ON DELETE RESTRICT,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario INT NOT NULL DEFAULT 0,
  PRIMARY KEY (servicio_id, repuesto_id)
);
CREATE TABLE IF NOT EXISTS recordatorios (
  id SERIAL PRIMARY KEY,
  vehiculo_id INT NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
  taller_id INT REFERENCES talleres(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('aceite','soat','rtm')),
  programado_para DATE NOT NULL,
  km_objetivo INT,
  enviado_at TIMESTAMPTZ,
  cancelado BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS recordatorios_pend_idx ON recordatorios(programado_para) WHERE enviado_at IS NULL;
CREATE TABLE IF NOT EXISTS mensajes (
  id SERIAL PRIMARY KEY,
  vehiculo_id INT REFERENCES vehiculos(id) ON DELETE SET NULL,
  telefono TEXT NOT NULL,
  direccion TEXT NOT NULL CHECK (direccion IN ('in','out')),
  tipo TEXT NOT NULL DEFAULT 'otro',
  contenido TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'enviado',
  meta_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mensajes_tel_idx ON mensajes(telefono, created_at);
CREATE TABLE IF NOT EXISTS consultas_placa (
  id SERIAL PRIMARY KEY,
  telefono TEXT NOT NULL,
  placa TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consultas_tel_idx ON consultas_placa(telefono, created_at);
