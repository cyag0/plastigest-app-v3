# POSV3 - Componentes Imperativos

Esta versión del POS implementa componentes **imperativos** donde el estado se maneja externamente, haciendo que los componentes sean más reutilizables y fáciles de testear.

## Filosofía de Diseño

A diferencia de POSV2 que usa Context y maneja estado interno, POSV3 usa componentes "tontos" (dumb components) que:

- **No mantienen estado interno** - Todo el estado se pasa como props
- **Emiten eventos** - Comunican cambios mediante callbacks
- **Son predecibles** - Mismas props = mismo render
- **Son reutilizables** - Pueden usarse en diferentes contextos

## Componentes

### ListProducts

Componente que muestra una lista/grid de productos con búsqueda y filtros por categoría.

#### Props

```typescript
interface ListProductsProps {
  products: ProductListItem[];        // Lista de productos a mostrar
  categories?: ProductCategory[];     // Categorías para filtrar
  onItemPress: (product: ProductListItem) => void;  // Evento al presionar producto
  loading?: boolean;                  // Estado de carga
  showSearch?: boolean;               // Mostrar buscador
  showCategories?: boolean;           // Mostrar filtro de categorías
  numColumns?: number;                // Número de columnas del grid
  autoAdjustColumns?: boolean;        // Ajustar columnas automáticamente
}
```

#### Estructura de ProductListItem

```typescript
interface ProductListItem {
  id: number;
  code: string;
  name: string;
  price: number;                      // ⚠️ Precio unificado (no sale_price/purchase_price)
  current_stock?: number;
  category_id?: number;
  main_image?: {
    uri: string;
  };
}
```

#### Ejemplo de Uso

```typescript
const [products, setProducts] = useState<ProductListItem[]>([]);

// Formatear productos desde la API
const formattedProducts = apiProducts.map(p => ({
  id: p.id,
  code: p.code,
  name: p.name,
  price: parseFloat(p.sale_price || "0"), // ⚠️ Formatear según necesidad
  current_stock: p.current_stock,
  category_id: p.category_id,
  main_image: p.main_image,
}));

<ListProducts
  products={formattedProducts}
  categories={categories}
  onItemPress={(product) => {
    console.log("Producto seleccionado:", product);
    // Agregar al carrito o hacer lo que necesites
  }}
  loading={loading}
/>
```

### Cart

Componente que muestra el carrito con items, controles de cantidad, cambio de unidades y total.

#### Props

```typescript
interface CartProps {
  items: CartItemData[];                          // Items del carrito
  onQuantityChange: (itemId: number, newQuantity: number) => void;  // Cambio de cantidad
  onUnitChange: (itemId: number, unitId: number) => void;           // Cambio de unidad
  onRemoveItem: (itemId: number) => void;         // Eliminar item
  onClearCart?: () => void;                       // Limpiar carrito
  onFinish?: () => void;                          // Finalizar compra/venta
  isScreen?: boolean;                             // Si se muestra como pantalla completa
  showFooter?: boolean;                           // Mostrar footer con total y botón
  children?: React.ReactNode;                     // Contenido adicional
}
```

#### Estructura de CartItemData

```typescript
interface CartItemData {
  id: number;                     // ID del item en el carrito (no del producto)
  product_id: number;             // ID del producto original
  code: string;
  name: string;
  price: number;                  // Precio unitario actual
  quantity: number;
  total: number;                  // price * quantity
  unit_id?: number;
  unit_name?: string;
  unit_abbreviation?: string;
  main_image?: {
    uri: string;
  };
  available_units?: Array<{      // Unidades disponibles para cambiar
    id: number;
    name: string;
    abbreviation: string;
    price: number;
  }>;
}
```

#### Ejemplo de Uso

```typescript
const [cartItems, setCartItems] = useState<CartItemData[]>([]);

<Cart
  items={cartItems}
  onQuantityChange={(itemId, newQuantity) => {
    setCartItems(items => 
      items.map(item => 
        item.id === itemId
          ? { ...item, quantity: newQuantity, total: item.price * newQuantity }
          : item
      )
    );
  }}
  onUnitChange={(itemId, unitId) => {
    setCartItems(items => 
      items.map(item => {
        if (item.id === itemId && item.available_units) {
          const unit = item.available_units.find(u => u.id === unitId);
          if (unit) {
            return {
              ...item,
              unit_id: unitId,
              unit_name: unit.name,
              unit_abbreviation: unit.abbreviation,
              price: unit.price,
              total: unit.price * item.quantity,
            };
          }
        }
        return item;
      })
    );
  }}
  onRemoveItem={(itemId) => {
    setCartItems(items => items.filter(item => item.id !== itemId));
  }}
  onClearCart={() => setCartItems([])}
  onFinish={() => {
    console.log("Finalizar con:", cartItems);
  }}
/>
```

## Ejemplo Completo de Integración

Ver [index.tsx](./index.tsx) para un ejemplo completo de cómo usar ambos componentes juntos.

### Flujo de Datos

```
Usuario presiona producto
    ↓
onItemPress(product)
    ↓
Agregar/actualizar en cartItems (estado externo)
    ↓
cartItems se actualiza
    ↓
Cart re-renderiza con nuevos items
```

### Ventajas de este Enfoque

1. **Testabilidad** - Fácil testear componentes con props específicas
2. **Reutilización** - Mismo componente para ventas y compras
3. **Flexibilidad** - El padre decide cómo manejar el estado
4. **Predictibilidad** - No hay "magia" de estado interno
5. **Debugging** - Más fácil rastrear cambios de estado

### Comparación con POSV2

| Aspecto | POSV2 | POSV3 |
|---------|-------|-------|
| Estado | Context interno | Props externas |
| Precio | `sale_price`/`purchase_price` | `price` unificado |
| Eventos | Manejo interno | Callbacks explícitos |
| Reutilización | Acoplado a Context | Totalmente desacoplado |
| Testing | Requiere mock de Context | Props directas |

## Migración desde POSV2

Si tienes código que usa POSV2 y quieres migrar a POSV3:

1. **Extraer estado del Context** - Mover estado a componente padre
2. **Formatear productos** - Convertir a `ProductListItem` con campo `price`
3. **Implementar callbacks** - Crear handlers para eventos
4. **Manejar carrito externamente** - Usar `useState` para items

Ejemplo:

```typescript
// POSV2
const { addToCart, products } = usePOS();
<ProductCard product={p} onAddToCart={addToCart} />

// POSV3
const [products, setProducts] = useState<ProductListItem[]>([]);
const handleItemPress = (product) => { /* lógica */ };
<ListProducts products={products} onItemPress={handleItemPress} />
```
