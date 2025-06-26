const mysql = require('mysql2/promise');
const { pool } = require('../db/database');

const Category = {
    // Obtener todas las categorías
    getAll: async () => {
        try {
            const query = 'SELECT * FROM categorias ORDER BY nombre';
            const [rows] = await pool.query(query);
            return rows;
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            throw error;
        }
    },

    // Crear una nueva categoría
    create: async (categoryData) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            const [result] = await connection.query(
                'INSERT INTO categorias (nombre) VALUES (?)',
                [categoryData.nombre]
            );
            
            const [newCategory] = await connection.query(
                'SELECT * FROM categorias WHERE id = ?',
                [result.insertId]
            );
            
            await connection.commit();
            return newCategory[0];
        } catch (error) {
            await connection.rollback();
            console.error('Error al crear categoría:', error);
            
            // Manejar error de categoría duplicada
            if (error.code === 'ER_DUP_ENTRY') {
                const err = new Error('Ya existe una categoría con este nombre');
                err.code = 'DUPLICATE_ENTRY';
                throw err;
            }
            
            throw error;
        } finally {
            connection.release();
        }
    },
    
    // Obtener categoría por ID
    getById: async (id) => {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM categorias WHERE id = ?',
                [id]
            );
            return rows[0];
        } catch (error) {
            console.error('Error al obtener categoría por ID:', error);
            throw error;
        }
    },
    
    // Actualizar una categoría
    update: async (id, categoryData) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            const [result] = await connection.query(
                'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?',
                [categoryData.nombre, categoryData.descripcion || null, id]
            );
            
            if (result.affectedRows === 0) {
                throw new Error('Categoría no encontrada');
            }
            
            const [updatedCategory] = await connection.query(
                'SELECT * FROM categorias WHERE id = ?',
                [id]
            );
            
            await connection.commit();
            return updatedCategory[0];
        } catch (error) {
            await connection.rollback();
            console.error('Error al actualizar categoría:', error);
            
            if (error.code === 'ER_DUP_ENTRY') {
                const err = new Error('Ya existe una categoría con este nombre');
                err.code = 'DUPLICATE_ENTRY';
                throw err;
            }
            
            throw error;
        } finally {
            connection.release();
        }
    },
    
    // Eliminar una categoría
    delete: async (id) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Verificar si hay productos asociados a esta categoría
            const [products] = await connection.query(
                'SELECT COUNT(*) as count FROM productos WHERE categoria_id = ?',
                [id]
            );
            
            if (products[0].count > 0) {
                throw new Error('No se puede eliminar la categoría porque tiene productos asociados');
            }
            
            const [result] = await connection.query(
                'DELETE FROM categorias WHERE id = ?',
                [id]
            );
            
            if (result.affectedRows === 0) {
                throw new Error('Categoría no encontrada');
            }
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error al eliminar categoría:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = Category;
