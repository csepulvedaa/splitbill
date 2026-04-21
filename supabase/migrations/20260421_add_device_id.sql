-- Añade device_id a bills para aislar cuentas por dispositivo anónimo.
-- Las cuentas existentes (device_id NULL) quedan huérfanas; se pueden
-- reasignar manualmente si se desea migrarlas a un usuario real en el futuro.

ALTER TABLE bills ADD COLUMN IF NOT EXISTS device_id TEXT;

CREATE INDEX IF NOT EXISTS bills_device_id_idx ON bills (device_id);
