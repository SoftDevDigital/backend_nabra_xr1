# 🚀 Ejemplos de Integración Frontend - Nabra XR

## 📋 Configuración Base

### Axios Configuration
```typescript
// api/config.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 🛒 CARRITO DE COMPRAS

### Hook para Carrito
```typescript
// hooks/useCart.ts
import { useState, useEffect } from 'react';
import { apiClient } from '../api/config';

interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
    stock: number;
    isPreorder: boolean;
    sizes?: string[];
  };
  quantity: number;
  size?: string;
}

interface CartSummary {
  items: CartItem[];
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
  estimatedTax: number;
  estimatedTotal: number;
  currency: string;
}

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/cart');
      setCart(response.data.items || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCartSummary = async () => {
    try {
      const response = await apiClient.get('/cart/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching cart summary:', error);
    }
  };

  const addToCart = async (productId: string, quantity: number, size?: string) => {
    try {
      setLoading(true);
      await apiClient.post('/cart/add', {
        productId,
        quantity,
        size,
      });
      await fetchCart();
      await fetchCartSummary();
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (itemId: string, quantity: number, size?: string) => {
    try {
      setLoading(true);
      await apiClient.put(`/cart/update/${itemId}`, {
        quantity,
        size,
      });
      await fetchCart();
      await fetchCartSummary();
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/cart/remove/${itemId}`);
      await fetchCart();
      await fetchCartSummary();
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setLoading(true);
      await apiClient.delete('/cart/clear');
      setCart([]);
      setSummary(null);
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const validateCart = async () => {
    try {
      const response = await apiClient.get('/cart/validate');
      return response.data;
    } catch (error) {
      console.error('Error validating cart:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchCart();
    fetchCartSummary();
  }, []);

  return {
    cart,
    summary,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    validateCart,
    refetch: fetchCart,
  };
};
```

### Componente de Carrito
```typescript
// components/Cart.tsx
import React, { useState } from 'react';
import { useCart } from '../hooks/useCart';

export const Cart: React.FC = () => {
  const { cart, summary, loading, removeFromCart, updateCartItem, validateCart } = useCart();
  const [validation, setValidation] = useState(null);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeFromCart(itemId);
    } else {
      await updateCartItem(itemId, newQuantity);
    }
  };

  const handleValidateCart = async () => {
    try {
      const result = await validateCart();
      setValidation(result);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  if (loading) return <div>Cargando carrito...</div>;

  return (
    <div className="cart">
      <h2>Mi Carrito</h2>
      
      {validation && (
        <div className={`validation ${validation.valid ? 'success' : 'error'}`}>
          {validation.errors.length > 0 && (
            <div className="errors">
              <h4>Errores:</h4>
              <ul>
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="warnings">
              <h4>Advertencias:</h4>
              <ul>
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {cart.length === 0 ? (
        <p>Tu carrito está vacío</p>
      ) : (
        <>
          <div className="cart-items">
            {cart.map((item) => (
              <div key={item._id} className="cart-item">
                <img 
                  src={item.product.images[0]} 
                  alt={item.product.name}
                  className="product-image"
                />
                <div className="item-details">
                  <h3>{item.product.name}</h3>
                  <p>Precio: ${item.product.price}</p>
                  <p>Talla: {item.size}</p>
                  <div className="quantity-controls">
                    <button 
                      onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button 
                      onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                    >
                      +
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item._id)}
                    className="remove-btn"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {summary && (
            <div className="cart-summary">
              <h3>Resumen del Pedido</h3>
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>${summary.subtotal}</span>
              </div>
              <div className="summary-row">
                <span>Impuestos estimados:</span>
                <span>${summary.estimatedTax}</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>${summary.estimatedTotal}</span>
              </div>
              <button onClick={handleValidateCart} className="validate-btn">
                Validar Carrito
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
```

---

## 💳 PAGOS

### Hook para Pagos
```typescript
// hooks/usePayments.ts
import { useState } from 'react';
import { apiClient } from '../api/config';

interface PaymentResponse {
  id: string;
  status: string;
  approvalUrl?: string;
}

export const usePayments = () => {
  const [loading, setLoading] = useState(false);

  const createPaymentFromCart = async (returnUrl?: string, cancelUrl?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (returnUrl) params.append('returnUrl', returnUrl);
      if (cancelUrl) params.append('cancelUrl', cancelUrl);

      const response = await apiClient.post(`/payments/from-cart?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createPartialPayment = async (items: Array<{ itemId: string; quantity: number }>, returnUrl?: string, cancelUrl?: string) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/payments/partial-checkout', {
        items,
        returnUrl,
        cancelUrl,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating partial payment:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPaymentDetails = async (paymentId: string) => {
    try {
      const response = await apiClient.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw error;
    }
  };

  const getUserPayments = async (limit = 10, offset = 0) => {
    try {
      const response = await apiClient.get(`/payments?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user payments:', error);
      throw error;
    }
  };

  return {
    loading,
    createPaymentFromCart,
    createPartialPayment,
    getPaymentDetails,
    getUserPayments,
  };
};
```

### Componente de Checkout
```typescript
// components/Checkout.tsx
import React, { useState } from 'react';
import { useCart } from '../hooks/useCart';
import { usePayments } from '../hooks/usePayments';

export const Checkout: React.FC = () => {
  const { summary, validateCart, clearCart } = useCart();
  const { createPaymentFromCart, loading } = usePayments();
  const [checkingOut, setCheckingOut] = useState(false);

  const handleCheckout = async () => {
    try {
      setCheckingOut(true);

      // Validar carrito antes del checkout
      const validation = await validateCart();
      if (!validation.valid) {
        alert(`Error: ${validation.errors.join(', ')}`);
        return;
      }

      // Crear pago
      const baseUrl = window.location.origin;
      const payment = await createPaymentFromCart(
        `${baseUrl}/success`,
        `${baseUrl}/cancel`
      );

      // Redirigir a PayPal
      if (payment.approvalUrl) {
        window.location.href = payment.approvalUrl;
      } else {
        throw new Error('No se recibió URL de aprobación de PayPal');
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Error al procesar el pago. Por favor intenta de nuevo.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (!summary) return <div>Cargando...</div>;

  return (
    <div className="checkout">
      <h2>Finalizar Compra</h2>
      
      <div className="order-summary">
        <h3>Resumen del Pedido</h3>
        <div className="summary-details">
          <div className="summary-row">
            <span>Items ({summary.totalQuantity}):</span>
            <span>${summary.subtotal}</span>
          </div>
          <div className="summary-row">
            <span>Impuestos:</span>
            <span>${summary.estimatedTax}</span>
          </div>
          <div className="summary-row total">
            <span>Total:</span>
            <span>${summary.estimatedTotal}</span>
          </div>
        </div>
      </div>

      <div className="payment-section">
        <h3>Método de Pago</h3>
        <div className="payment-method">
          <img src="/paypal-logo.png" alt="PayPal" />
          <span>PayPal</span>
        </div>
      </div>

      <button 
        onClick={handleCheckout}
        disabled={loading || checkingOut || summary.totalItems === 0}
        className="checkout-btn"
      >
        {loading || checkingOut ? 'Procesando...' : 'Pagar con PayPal'}
      </button>
    </div>
  );
};
```

---

## 🔄 MANEJO DE CALLBACKS

### Página de Éxito
```typescript
// pages/Success.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const SuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const payerId = searchParams.get('PayerID');

    if (!token || !payerId) {
      setStatus('error');
      setMessage('Parámetros de pago faltantes');
      return;
    }

    // El backend maneja automáticamente la captura del pago
    // Solo mostramos el resultado
    setStatus('success');
    setMessage('¡Pago completado exitosamente!');
    
    // Redirigir después de 3 segundos
    setTimeout(() => {
      navigate('/orders');
    }, 3000);
  }, [searchParams, navigate]);

  return (
    <div className="payment-result">
      <h2>Resultado del Pago</h2>
      
      {status === 'loading' && (
        <div className="loading">
          <p>Procesando pago...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="success">
          <div className="success-icon">✓</div>
          <p>{message}</p>
          <p>Redirigiendo a tus órdenes...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="error">
          <div className="error-icon">✗</div>
          <p>{message}</p>
          <button onClick={() => navigate('/cart')}>
            Volver al Carrito
          </button>
        </div>
      )}
    </div>
  );
};
```

### Página de Cancelación
```typescript
// pages/Cancel.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const CancelPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setMessage('Token de pago faltante');
      return;
    }

    setMessage('Pago cancelado. Puedes intentar de nuevo cuando quieras.');
  }, [searchParams]);

  return (
    <div className="payment-result">
      <h2>Pago Cancelado</h2>
      
      <div className="cancel">
        <div className="cancel-icon">⚠</div>
        <p>{message}</p>
        <div className="actions">
          <button onClick={() => navigate('/cart')}>
            Volver al Carrito
          </button>
          <button onClick={() => navigate('/')}>
            Continuar Comprando
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 📦 ÓRDENES

### Hook para Órdenes
```typescript
// hooks/useOrders.ts
import { useState, useEffect } from 'react';
import { apiClient } from '../api/config';

interface Order {
  _id: string;
  userId: string;
  items: Array<{
    product: {
      _id: string;
      name: string;
      price: number;
    };
    quantity: number;
    size?: string;
  }>;
  status: string;
  totalAmount: number;
  currency: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
  createdAt: string;
}

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchUserOrders = async (limit = 10, offset = 0) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/orders/my-orders?limit=${limit}&offset=${offset}`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderSummary = async () => {
    try {
      const response = await apiClient.get('/orders/my-orders/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching order summary:', error);
      throw error;
    }
  };

  const getOrderById = async (orderId: string) => {
    try {
      const response = await apiClient.get(`/orders/my-orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchUserOrders();
    fetchOrderSummary();
  }, []);

  return {
    orders,
    summary,
    loading,
    fetchUserOrders,
    fetchOrderSummary,
    getOrderById,
  };
};
```

---

## 🎨 ESTILOS CSS BÁSICOS

```css
/* styles/cart.css */
.cart {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.cart-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 1px solid #ddd;
  margin-bottom: 10px;
  border-radius: 8px;
}

.product-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  margin-right: 15px;
}

.item-details {
  flex: 1;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
}

.quantity-controls button {
  width: 30px;
  height: 30px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
}

.quantity-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cart-summary {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.summary-row.total {
  font-weight: bold;
  font-size: 1.2em;
  border-top: 1px solid #ddd;
  padding-top: 10px;
}

.validation {
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.validation.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.validation.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.checkout-btn {
  width: 100%;
  padding: 15px;
  background: #0070ba;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1em;
  cursor: pointer;
  margin-top: 20px;
}

.checkout-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.payment-result {
  max-width: 500px;
  margin: 50px auto;
  text-align: center;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.success-icon {
  font-size: 4em;
  color: #28a745;
  margin-bottom: 20px;
}

.error-icon {
  font-size: 4em;
  color: #dc3545;
  margin-bottom: 20px;
}

.cancel-icon {
  font-size: 4em;
  color: #ffc107;
  margin-bottom: 20px;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.actions button {
  padding: 10px 20px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 5px;
  cursor: pointer;
}
```

---

## 🔧 CONFIGURACIÓN DE ENTORNO

```bash
# .env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_PAYPAL_CLIENT_ID=tu_paypal_client_id
REACT_APP_ENVIRONMENT=development
```

---

## 📱 CONSIDERACIONES MÓVILES

### Responsive Design
```css
@media (max-width: 768px) {
  .cart-item {
    flex-direction: column;
    text-align: center;
  }
  
  .product-image {
    margin-right: 0;
    margin-bottom: 10px;
  }
  
  .quantity-controls {
    justify-content: center;
  }
  
  .actions {
    flex-direction: column;
  }
}
```

### PayPal Mobile Integration
- PayPal detecta automáticamente dispositivos móviles
- La experiencia se adapta automáticamente
- Considerar usar PayPal SDK para mejor UX en móviles

---

## 🚨 MANEJO DE ERRORES

### Error Boundary
```typescript
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Algo salió mal</h2>
          <p>Por favor recarga la página o contacta soporte.</p>
          <button onClick={() => window.location.reload()}>
            Recargar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 🎯 MEJORES PRÁCTICAS

1. **Validación en Frontend:** Siempre validar datos antes de enviar
2. **Loading States:** Mostrar estados de carga para mejor UX
3. **Error Handling:** Manejar todos los posibles errores
4. **Responsive Design:** Asegurar que funcione en todos los dispositivos
5. **Accessibility:** Implementar ARIA labels y navegación por teclado
6. **Performance:** Optimizar imágenes y lazy loading
7. **Security:** Nunca exponer tokens o datos sensibles en el frontend
8. **Testing:** Implementar tests unitarios y de integración
