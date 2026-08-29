import {
  Product,
  ProductBatch,
  ProductWithBatches,
  Customer,
  OrderRow,
  OrderItemRow,
  OrderWithRelations,
  CartItem,
} from "./types";

type StoreShape = {
  products: Product[];
  batches: ProductBatch[];
  customers: Customer[];
  orders: OrderRow[];
  order_items: OrderItemRow[];
};

const STORAGE_KEY = "pmbjk_makkal_marundhagam_store_v1";

const uid = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const emptyStore = (): StoreShape => ({
  products: [],
  batches: [],
  customers: [],
  orders: [],
  order_items: [],
});

const readStore = (): StoreShape => {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      products: parsed.products || [],
      batches: parsed.batches || [],
      customers: parsed.customers || [],
      orders: parsed.orders || [],
      order_items: parsed.order_items || [],
    };
  } catch (err) {
    console.warn("Local store read failed:", err);
    return emptyStore();
  }
};

const writeStore = (store: StoreShape): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn("Local store write failed:", err);
  }
};

const withBatches = (product: Product, batches: ProductBatch[]): ProductWithBatches => {
  const own = batches
    .filter((b) => b.product_id === product.id)
    .sort((a, b) => new Date(a.arrived_at).getTime() - new Date(b.arrived_at).getTime());

  let total_stock = 0;
  let earliest_expiry: string | null = null;
  let active_selling_price = 0;
  let foundActive = false;

  for (const batch of own) {
    total_stock += batch.stock_quantity;
    if (batch.stock_quantity > 0) {
      if (!foundActive) {
        active_selling_price = Number(batch.selling_price);
        foundActive = true;
      }
      if (!earliest_expiry || new Date(batch.expiry_date) < new Date(earliest_expiry)) {
        earliest_expiry = batch.expiry_date;
      }
    }
  }

  return {
    ...product,
    batches: own,
    total_stock,
    earliest_expiry,
    active_selling_price,
  };
};

export const dbStore = {
  // PRODUCTS
  async listProducts(): Promise<Product[]> {
    const store = readStore();
    return [...store.products].sort((a, b) => a.name.localeCompare(b.name));
  },

  async getProductWithBatches(id: string): Promise<ProductWithBatches | null> {
    const store = readStore();
    const product = store.products.find((p) => p.id === id);
    if (!product) return null;
    return withBatches(product, store.batches);
  },

  async listProductsWithBatches(): Promise<ProductWithBatches[]> {
    const store = readStore();
    return [...store.products]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => withBatches(p, store.batches));
  },

  async addProduct(input: {
    name: string;
    description: string | null;
    category: string;
    schedule_category: "NONE" | "H" | "H1";
    low_stock_threshold: number;
  }): Promise<Product> {
    const store = readStore();
    const record: Product = {
      id: uid(),
      name: input.name,
      description: input.description,
      category: input.category,
      schedule_category: input.schedule_category,
      low_stock_threshold: input.low_stock_threshold,
      created_at: new Date().toISOString(),
    };
    store.products.push(record);
    writeStore(store);
    return record;
  },

  async updateProduct(id: string, patch: Partial<Product>): Promise<Product | null> {
    const store = readStore();
    const idx = store.products.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    const { id: _ignored, ...safePatch } = patch;
    store.products[idx] = { ...store.products[idx], ...safePatch };
    writeStore(store);
    return store.products[idx];
  },

  async deleteProduct(id: string): Promise<void> {
    const store = readStore();
    store.products = store.products.filter((p) => p.id !== id);
    store.batches = store.batches.filter((b) => b.product_id !== id);
    writeStore(store);
  },

  // BATCHES
  async addBatch(input: {
    product_id: string;
    batch_no: string | null;
    manufacturer: string | null;
    hsn_code: string | null;
    cost_price: number;
    selling_price: number;
    stock_quantity: number;
    mfg_date: string | null;
    expiry_date: string;
  }): Promise<ProductBatch> {
    const store = readStore();
    const record: ProductBatch = {
      id: uid(),
      product_id: input.product_id,
      batch_no: input.batch_no,
      manufacturer: input.manufacturer,
      hsn_code: input.hsn_code,
      cost_price: input.cost_price,
      selling_price: input.selling_price,
      stock_quantity: input.stock_quantity,
      mfg_date: input.mfg_date,
      expiry_date: input.expiry_date,
      arrived_at: new Date().toISOString(),
    };
    store.batches.push(record);
    writeStore(store);
    return record;
  },

  async updateBatch(id: string, patch: Partial<ProductBatch>): Promise<ProductBatch | null> {
    const store = readStore();
    const idx = store.batches.findIndex((b) => b.id === id);
    if (idx < 0) return null;
    const { id: _ignored, ...safePatch } = patch;
    store.batches[idx] = { ...store.batches[idx], ...safePatch };
    writeStore(store);
    return store.batches[idx];
  },

  async deleteBatch(id: string): Promise<void> {
    const store = readStore();
    store.batches = store.batches.filter((b) => b.id !== id);
    writeStore(store);
  },

  // CUSTOMERS
  async upsertCustomer(name: string, phone: string): Promise<Customer> {
    const store = readStore();
    const existing = store.customers.find((c) => c.phone === phone);
    if (existing) {
      existing.name = name;
      writeStore(store);
      return existing;
    }
    const record: Customer = {
      id: uid(),
      name,
      phone,
      created_at: new Date().toISOString(),
    };
    store.customers.push(record);
    writeStore(store);
    return record;
  },

  // ORDERS
  async orderIdExists(id: string): Promise<boolean> {
    const store = readStore();
    return store.orders.some((o) => o.id === id);
  },

  async listOrdersWithRelations(): Promise<OrderWithRelations[]> {
    const store = readStore();
    return [...store.orders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((order) => {
        const customer = store.customers.find((c) => c.id === order.customer_id);
        return {
          ...order,
          customer_name: customer?.name || "",
          customer_phone: customer?.phone || "",
          items: store.order_items.filter((i) => i.order_id === order.id),
        };
      });
  },

  async getOrderWithRelations(id: string): Promise<OrderWithRelations | null> {
    const store = readStore();
    const order = store.orders.find((o) => o.id === id);
    if (!order) return null;
    const customer = store.customers.find((c) => c.id === order.customer_id);
    return {
      ...order,
      customer_name: customer?.name || "",
      customer_phone: customer?.phone || "",
      items: store.order_items.filter((i) => i.order_id === id),
    };
  },

  async deleteOrder(id: string): Promise<void> {
    const store = readStore();
    store.orders = store.orders.filter((o) => o.id !== id);
    store.order_items = store.order_items.filter((i) => i.order_id !== id);
    writeStore(store);
  },

  // FIFO DEDUCTION & ORDER SUBMISSION
  async submitOrder(payload: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    source: "ONLINE" | "OFFLINE";
    billDate: string;
    items: CartItem[];
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
    discountAmount: number;
    gstPercentage: number;
    gstAmount: number;
    deliveryFee: number;
    grandTotal: number;
    cashReceived: number;
  }): Promise<{ orderId: string }> {
    const store = readStore();

    // 1. Upsert customer
    let customer = store.customers.find((c) => c.phone === payload.customerPhone);
    if (customer) {
      customer.name = payload.customerName;
    } else {
      customer = {
        id: uid(),
        name: payload.customerName,
        phone: payload.customerPhone,
        created_at: new Date().toISOString(),
      };
      store.customers.push(customer);
    }

    // 2. FIFO stock deduction and split items
    const finalOrderItems: Omit<OrderItemRow, "id">[] = [];

    for (const item of payload.items) {
      if (!item.product_id) {
        finalOrderItems.push({
          order_id: payload.orderId,
          product_id: null,
          batch_id: null,
          snapshot_name: item.name,
          snapshot_price: item.price,
          quantity: item.qty,
        });
        continue;
      }

      const productBatches = store.batches
        .filter((b) => b.product_id === item.product_id && b.stock_quantity > 0)
        .sort((a, b) => new Date(a.arrived_at).getTime() - new Date(b.arrived_at).getTime());

      let remaining = item.qty;

      for (const batch of productBatches) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, batch.stock_quantity);
        batch.stock_quantity -= take;

        finalOrderItems.push({
          order_id: payload.orderId,
          product_id: item.product_id,
          batch_id: batch.id,
          snapshot_name: item.name,
          snapshot_price: Number(batch.selling_price),
          quantity: take,
        });

        remaining -= take;
      }

      if (remaining > 0) {
        finalOrderItems.push({
          order_id: payload.orderId,
          product_id: item.product_id,
          batch_id: null,
          snapshot_name: item.name,
          snapshot_price: item.price,
          quantity: remaining,
        });
      }
    }

    // 3. Insert order
    const orderRow: OrderRow = {
      id: payload.orderId,
      customer_id: customer.id,
      source: payload.source,
      status: "COMPLETED",
      subtotal:
        payload.grandTotal + payload.discountAmount - payload.gstAmount - payload.deliveryFee,
      discount_type: payload.discountType,
      discount_value: payload.discountValue,
      discount_amount: payload.discountAmount,
      gst_percentage: payload.gstPercentage,
      gst_amount: payload.gstAmount,
      delivery_fee: payload.deliveryFee,
      grand_total: payload.grandTotal,
      cash_received: payload.cashReceived,
      bill_date: payload.billDate,
      created_at: new Date().toISOString(),
    };
    store.orders.push(orderRow);

    // 4. Insert order items
    for (const oi of finalOrderItems) {
      store.order_items.push({ id: uid(), ...oi });
    }

    writeStore(store);
    return { orderId: payload.orderId };
  },
};
