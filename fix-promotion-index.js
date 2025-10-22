// Script para eliminar el índice problemático de la base de datos
const { MongoClient } = require('mongodb');

async function fixPromotionIndex() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB');
    
    const db = client.db('test');
    const collection = db.collection('simplepromotions');
    
    // Listar todos los índices
    console.log('Índices actuales:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(JSON.stringify(index, null, 2));
    });
    
    // Eliminar el índice problemático
    try {
      await collection.dropIndex('lastModifiedBy.email_1');
      console.log('Índice lastModifiedBy.email_1 eliminado exitosamente');
    } catch (error) {
      console.log('Error eliminando índice:', error.message);
    }
    
    // Listar índices después de la eliminación
    console.log('\nÍndices después de la eliminación:');
    const indexesAfter = await collection.indexes();
    indexesAfter.forEach(index => {
      console.log(JSON.stringify(index, null, 2));
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixPromotionIndex();
