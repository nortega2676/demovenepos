-- Add id column to cierre_venta table if it doesn't exist
ALTER TABLE cierre_venta 
ADD COLUMN IF NOT EXISTS id INT AUTO_INCREMENT PRIMARY KEY FIRST;
