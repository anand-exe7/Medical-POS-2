import { dbStore } from "@/lib/dbStore";
import { Product, ProductBatch, ProductWithBatches, OrderWithRelations, CartItem } from "@/lib/types";

export async function verifyPasscode(enteredPasscode: string): Promise<{ success: boolean; role?: 'staff' | 'admin' }> {
  const adminPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || "sulficker11";
  const staffPasscode = process.env.NEXT_PUBLIC_STAFF_PASSCODE || "staff123";

  const normalizedEntered = enteredPasscode.replace(/\s/g, "");

  if (normalizedEntered === adminPasscode) {
    return { success: true, role: 'admin' };
  }
  if (normalizedEntered === staffPasscode) {
    return { success: true, role: 'staff' };
  }

  return { success: false };
}

// Products
export async function fetchProducts(): Promise<ProductWithBatches[]> {
  return dbStore.listProductsWithBatches();
}

export async function createProduct(data: { name: string; description: string | null; category: string; schedule_category: 'NONE' | 'H' | 'H1'; low_stock_threshold: number }): Promise<Product> {
  return dbStore.addProduct(data);
}

export async function editProduct(id: string, data: Partial<Product>): Promise<Product | null> {
  return dbStore.updateProduct(id, data);
}

export async function removeProduct(id: string): Promise<void> {
  return dbStore.deleteProduct(id);
}

// Batches
export async function createBatch(productId: string, data: Omit<ProductBatch, 'id' | 'product_id' | 'arrived_at'>): Promise<ProductBatch> {
  return dbStore.addBatch({
    product_id: productId,
    ...data,
  });
}

export async function editBatch(id: string, data: Partial<ProductBatch>): Promise<ProductBatch | null> {
  return dbStore.updateBatch(id, data);
}

export async function removeBatch(id: string): Promise<void> {
  return dbStore.deleteBatch(id);
}

// Orders
export async function fetchOrders(): Promise<OrderWithRelations[]> {
  return dbStore.listOrdersWithRelations();
}

export async function fetchOrderById(id: string): Promise<OrderWithRelations | null> {
  return dbStore.getOrderWithRelations(id);
}

export async function orderIdExists(id: string): Promise<boolean> {
  return dbStore.orderIdExists(id);
}

export async function submitOrder(payload: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  source: 'ONLINE' | 'OFFLINE';
  billDate: string;
  items: CartItem[];
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  discountAmount: number;
  gstPercentage: number;
  gstAmount: number;
  deliveryFee: number;
  grandTotal: number;
  cashReceived: number;
}): Promise<{ orderId: string }> {
  return dbStore.submitOrder(payload);
}

export async function removeOrder(id: string): Promise<void> {
  return dbStore.deleteOrder(id);
}
