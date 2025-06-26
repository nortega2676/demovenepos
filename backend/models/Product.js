const { pool } = require('../db/database');

const Product = {
    // Obtener todos los productos con información de categoría
    getAll: async () => {
        try {
            const query = `
                SELECT 
                    p.nombre,
                    p.precio,
                    p.categoria_id,
                    c.nombre as categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                ORDER BY c.nombre, p.nombre
            `;
            
            console.log('=== EJECUTANDO CONSULTA SQL ===');
            console.log('Consulta SQL:', query.replace(/\s+/g, ' ').trim());
            
            const [rows] = await pool.query(query);
            
            console.log('Resultados de la consulta:', {
                cantidad: rows.length,
                columnas: rows.length > 0 ? Object.keys(rows[0]) : 'No hay resultados',
                primeros3: rows.slice(0, 3) // Mostrar los primeros 3 registros
            });
            
            return rows;
        } catch (error) {
            console.error('Error al obtener productos:', error);
            throw error;
        }
    },

    // Obtener producto por ID
    getById: async (id) => {
        try {
            const query = `
                SELECT p.*, c.nombre as categoria_nombre, c.descripcion as categoria_descripcion
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.id = ?
            `;
            const [rows] = await pool.query(query, [id]);
            return rows[0];
        } catch (error) {
            console.error('Error al obtener producto por ID:', error);
            throw error;
        }
    },

    // Crear un nuevo producto
    create: async (productData) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Verificar si la categoría existe
            const [category] = await connection.query(
                'SELECT id FROM categorias WHERE id = ?',
                [productData.categoria_id]
            );
            
            if (category.length === 0) {
                throw new Error('La categoría especificada no existe');
            }
            
            // Insertar el producto
            const [result] = await connection.query(
                `INSERT INTO productos 
                (nombre, descripcion, precio, categoria_id, stock) 
                VALUES (?, ?, ?, ?, ?)`,
                [
                    productData.nombre,
                    productData.descripcion || null,
                    productData.precio,
                    productData.categoria_id,
                    productData.stock || 0
                ]
            );
            
            // Obtener el producto recién creado con la información de la categoría
            const [newProduct] = await connection.query(
                `SELECT p.*, c.nombre as categoria_nombre 
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.id = ?`,
                [result.insertId]
            );
            
            await connection.commit();
            return newProduct[0];
        } catch (error) {
            await connection.rollback();
            console.error('Error al crear producto:', error);
            
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                const err = new Error('La categoría especificada no existe');
                err.code = 'INVALID_CATEGORY';
                throw err;
            }
            
            if (error.code === 'ER_DUP_ENTRY') {
                const err = new Error('Ya existe un producto con este nombre');
                err.code = 'DUPLICATE_ENTRY';
                throw err;
            }
            
            throw error;
        } finally {
            connection.release();
        }
    },

    // Actualizar un producto
    update: async (id, productData) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Verificar si el producto existe
            const [existingProduct] = await connection.query(
                'SELECT id FROM productos WHERE id = ?',
                [id]
            );
            
            if (existingProduct.length === 0) {
                throw new Error('Producto no encontrado');
            }
            
            // Verificar si se está actualizando la categoría
            if (productData.categoria_id) {
                const [category] = await connection.query(
                    'SELECT id FROM categorias WHERE id = ?',
                    [productData.categoria_id]
                );
                
                if (category.length === 0) {
                    throw new Error('La categoría especificada no existe');
                }
            }
            
            // Construir la consulta de actualización dinámicamente
            const updateFields = [];
            const updateValues = [];
            
            const allowedFields = ['nombre', 'descripcion', 'precio', 'categoria_id', 'stock'];
            
            for (const field of allowedFields) {
                if (productData[field] !== undefined) {
                    updateFields.push(`${field} = ?`);
                    updateValues.push(productData[field]);
                }
            }
            
            if (updateFields.length === 0) {
                throw new Error('No se proporcionaron datos para actualizar');
            }
            
            // Agregar el ID al final para el WHERE
            updateValues.push(id);
            
            // Actualizar el producto
            const [result] = await connection.query(
                `UPDATE productos SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );
            
            // Obtener el producto actualizado con la información de la categoría
            const [updatedProduct] = await connection.query(
                `SELECT p.*, c.nombre as categoria_nombre 
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.id = ?`,
                [id]
            );
            
            if (updatedProduct.length === 0) {
                throw new Error('Error al obtener el producto actualizado');
            }
            
            await connection.commit();
            return updatedProduct[0];
        } catch (error) {
            await connection.rollback();
            console.error('Error al actualizar producto:', error);
            
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                const err = new Error('La categoría especificada no existe');
                err.code = 'INVALID_CATEGORY';
                throw err;
            }
            
            if (error.code === 'ER_DUP_ENTRY') {
                const err = new Error('Ya existe un producto con este nombre');
                err.code = 'DUPLICATE_ENTRY';
                throw err;
            }
            
            throw error;
        } finally {
            connection.release();
        }
    },

    // Eliminar un producto
    delete: async (id) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Verificar si el producto existe
            const [product] = await connection.query(
                'SELECT id FROM productos WHERE id = ?',
                [id]
            );
            
            if (product.length === 0) {
                throw new Error('Producto no encontrado');
            }
            
            // Verificar si hay ventas asociadas a este producto
            const [sales] = await connection.query(
                'SELECT COUNT(*) as count FROM detalles_venta WHERE producto_id = ?',
                [id]
            );
            
            if (sales[0].count > 0) {
                throw new Error('No se puede eliminar el producto porque tiene ventas asociadas');
            }
            
            // Eliminar el producto
            const [result] = await connection.query(
                'DELETE FROM productos WHERE id = ?',
                [id]
            );
            
            if (result.affectedRows === 0) {
                throw new Error('No se pudo eliminar el producto');
            }
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error al eliminar producto:', error);
            throw error;
        } finally {
            connection.release();
        }
    },
    
    // Obtener productos por categoría
    getByCategory: async (categoryId) => {
        try {
            const query = `
                SELECT p.*, c.nombre as categoria_nombre 
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.categoria_id = ?
                ORDER BY p.nombre
            `;
            const [rows] = await pool.query(query, [categoryId]);
            return rows;
        } catch (error) {
            console.error('Error al obtener productos por categoría:', error);
            throw error;
        }
    }
};

module.exports = Product;
