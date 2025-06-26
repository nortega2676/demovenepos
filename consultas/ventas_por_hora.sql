-- Consulta optimizada para obtener ventas por hora (6 AM - 9 PM)
-- Incluye todas las horas del rango, incluso sin ventas
WITH RECURSIVE horas_del_dia AS (
    SELECT 6 AS hora
    UNION ALL
    SELECT hora + 1 FROM horas_del_dia WHERE hora < 21
)
SELECT 
    h.hora,
    COALESCE(v.cantidad_ventas, 0) AS cantidad_ventas,
    COALESCE(v.total_ventas, 0) AS total_ventas,
    COALESCE(v.promedio_por_venta, 0) AS promedio_por_venta
FROM 
    horas_del_dia h
LEFT JOIN (
    SELECT 
        HOUR(fecha_venta) AS hora_venta,
        COUNT(*) AS cantidad_ventas,
        SUM(total) AS total_ventas,
        ROUND(SUM(total) / NULLIF(COUNT(*), 0), 2) AS promedio_por_venta
    FROM 
        ventas
    WHERE 
        HOUR(fecha_venta) BETWEEN 6 AND 21
        AND DATE(fecha_venta) = ?  -- Se pasa como parámetro
    GROUP BY 
        HOUR(fecha_venta)
) v ON h.hora = v.hora_venta
ORDER BY 
    h.hora ASC;
