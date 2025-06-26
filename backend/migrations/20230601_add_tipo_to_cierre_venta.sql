-- Add tipo column to cierre_venta table
ALTER TABLE cierre_venta 
ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'general' COMMENT 'Tipo de cierre: general o personal';

-- Add index for better performance on date and type queries
CREATE INDEX idx_cierre_venta_fecha_tipo ON cierre_venta (DATE(fecha_cierre), tipo);

-- Add index for personal closures by user and date
CREATE INDEX idx_cierre_venta_usuario_fecha_tipo ON cierre_venta (usuario_id, DATE(fecha_cierre), tipo);
