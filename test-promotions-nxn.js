const axios = require('axios');

const BASE_URL = 'https://api.nabra.mx';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGQxNTFkM2ExN2RiOTczYmRmM2EyZTUiLCJlbWFpbCI6ImVzdGFuaXNsYW92YWxkZXo3OEBnbWFpbC5jb20iLCJmaXJzdE5hbWUiOiJKdWFuIiwibGFzdE5hbWUiOiJQw6lyZXoiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjExNDcwMjksImV4cCI6MTc2MTE1MDYyOX0.7HBIYHBVZ5RRmzV4_9rcWFibPccpVkbkAqPysGoageQ';

async function testPromotionsNxN() {
  console.log('🧪 Probando promociones NxN (2x1, 3x1, etc.)...\n');

  try {
    // 1. Crear una promoción 2x1
    console.log('📝 Creando promoción 2x1...');
    const promotion2x1 = {
      name: "2x1 Test",
      description: "Compra 2 lleva 3",
      type: "buy_x_get_y",
      productIds: ["68f8ddbeb378cf79481d835e"], // Usar un producto existente
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
      buyQuantity: 2,
      getQuantity: 1,
      isActive: true
    };

    const createResponse = await axios.post(`${BASE_URL}/promotions/admin/create`, promotion2x1, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    console.log('✅ Promoción 2x1 creada:', createResponse.data._id);

    // 2. Verificar que el producto tiene la promoción
    console.log('\n🔍 Verificando promoción en producto...');
    const productResponse = await axios.get(`${BASE_URL}/products/${promotion2x1.productIds[0]}/promotions`);
    console.log('📦 Producto con promoción:', {
      name: productResponse.data.name,
      originalPrice: productResponse.data.originalPrice,
      finalPrice: productResponse.data.finalPrice,
      hasPromotion: productResponse.data.hasPromotion,
      promotionName: productResponse.data.promotionName
    });

    // 3. Simular diferentes cantidades en el carrito
    console.log('\n🛒 Probando diferentes cantidades en carrito...');
    
    const testCases = [
      { quantity: 1, expected: 'Sin promoción (cantidad insuficiente)' },
      { quantity: 2, expected: '2x1: Paga 2, lleva 3 (1 gratis)' },
      { quantity: 3, expected: '2x1: Paga 2, lleva 3 (1 gratis) + 1 normal' },
      { quantity: 4, expected: '2x1: Paga 4, lleva 6 (2 gratis)' },
      { quantity: 5, expected: '2x1: Paga 4, lleva 6 (2 gratis) + 1 normal' }
    ];

    for (const testCase of testCases) {
      console.log(`\n📊 Probando cantidad: ${testCase.quantity}`);
      console.log(`   Esperado: ${testCase.expected}`);
      
      // Simular agregar al carrito
      try {
        const addToCartResponse = await axios.post(`${BASE_URL}/cart/add`, {
          productId: promotion2x1.productIds[0],
          quantity: testCase.quantity,
          size: "35"
        }, {
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });
        
        console.log('   ✅ Agregado al carrito');
        console.log('   💰 Precio final:', addToCartResponse.data.cart.finalTotal);
        console.log('   🎯 Descuento total:', addToCartResponse.data.cart.totalDiscount);
        
        // Limpiar carrito para siguiente prueba
        await axios.delete(`${BASE_URL}/cart/clear`, {
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });
        
      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }

    // 4. Crear promoción 3x1 para probar
    console.log('\n📝 Creando promoción 3x1...');
    const promotion3x1 = {
      name: "3x1 Test",
      description: "Compra 3 lleva 4",
      type: "buy_x_get_y",
      productIds: ["68f8ddbeb378cf79481d835e"],
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      buyQuantity: 3,
      getQuantity: 1,
      isActive: true
    };

    const create3x1Response = await axios.post(`${BASE_URL}/promotions/admin/create`, promotion3x1, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    console.log('✅ Promoción 3x1 creada:', create3x1Response.data._id);

    // 5. Probar 3x1
    console.log('\n🛒 Probando promoción 3x1...');
    const testCases3x1 = [
      { quantity: 3, expected: '3x1: Paga 3, lleva 4 (1 gratis)' },
      { quantity: 6, expected: '3x1: Paga 6, lleva 8 (2 gratis)' },
      { quantity: 7, expected: '3x1: Paga 6, lleva 8 (2 gratis) + 1 normal' }
    ];

    for (const testCase of testCases3x1) {
      console.log(`\n📊 Probando cantidad: ${testCase.quantity}`);
      console.log(`   Esperado: ${testCase.expected}`);
      
      try {
        const addToCartResponse = await axios.post(`${BASE_URL}/cart/add`, {
          productId: promotion2x1.productIds[0],
          quantity: testCase.quantity,
          size: "35"
        }, {
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });
        
        console.log('   ✅ Agregado al carrito');
        console.log('   💰 Precio final:', addToCartResponse.data.cart.finalTotal);
        console.log('   🎯 Descuento total:', addToCartResponse.data.cart.totalDiscount);
        
        // Limpiar carrito
        await axios.delete(`${BASE_URL}/cart/clear`, {
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });
        
      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }

    console.log('\n✅ Pruebas de promociones NxN completadas');

  } catch (error) {
    console.error('❌ Error en pruebas:', error.response?.data || error.message);
  }
}

testPromotionsNxN();

