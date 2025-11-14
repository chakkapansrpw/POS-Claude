import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, BarChart3, Settings, Plus, Minus, Trash2, Check, X, Edit2, Save, Home } from 'lucide-react';

const ModernPOS = () => {
  const [activeTab, setActiveTab] = useState('order');
  const [loading, setLoading] = useState(true);

  // ข้อมูลระบบ
  const [config, setConfig] = useState({
    storeName: 'ร้านอาหารของฉัน',
    logo: '🍽️',
    theme: '#3b82f6'
  });

  // ข้อมูลสินค้า
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  // ออร์เดอร์
  const [tables, setTables] = useState([]);
  const [currentTable, setCurrentTable] = useState(null);
  const [currentOrder, setCurrentOrder] = useState([]);

  // สต๊อก
  const [stockHistory, setStockHistory] = useState([]);

  // ฟังก์ชันบันทึกและโหลดข้อมูล
  const saveData = async (key, data) => {
    try {
      await window.storage.set(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const loadData = async (key, defaultValue) => {
    try {
      const result = await window.storage.get(key);
      return result ? JSON.parse(result.value) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  // โหลดข้อมูลตอนเริ่มต้น
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      
      const savedConfig = await loadData('config', config);
      const savedProducts = await loadData('products', [
        { id: 1, name: 'ข้าวผัด', price: 50, recipeId: 1 },
        { id: 2, name: 'ส้มตำ', price: 40, recipeId: 2 }
      ]);
      const savedRecipes = await loadData('recipes', [
        { id: 1, name: 'สูตรข้าวผัด', items: [{ stockId: 1, amount: 0.2 }, { stockId: 2, amount: 0.1 }] },
        { id: 2, name: 'สูตรส้มตำ', items: [{ stockId: 3, amount: 0.3 }] }
      ]);
      const savedStockItems = await loadData('stockItems', [
        { id: 1, name: 'ข้าว', unit: 'กก.', quantity: 50 },
        { id: 2, name: 'ไข่', unit: 'ฟอง', quantity: 100 },
        { id: 3, name: 'มะละกอ', unit: 'กก.', quantity: 20 }
      ]);
      const savedTables = await loadData('tables', [
        { id: 1, name: 'โต๊ะ 1', status: 'available', orders: [] },
        { id: 2, name: 'โต๊ะ 2', status: 'available', orders: [] },
        { id: 3, name: 'โต๊ะ 3', status: 'available', orders: [] },
        { id: 4, name: 'โต๊ะ 4', status: 'available', orders: [] }
      ]);
      const savedStockHistory = await loadData('stockHistory', []);

      setConfig(savedConfig);
      setProducts(savedProducts);
      setRecipes(savedRecipes);
      setStockItems(savedStockItems);
      setTables(savedTables);
      setStockHistory(savedStockHistory);
      
      setLoading(false);
    };

    initData();
  }, []);

  // บันทึกข้อมูลเมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (!loading) saveData('config', config);
  }, [config, loading]);

  useEffect(() => {
    if (!loading) saveData('products', products);
  }, [products, loading]);

  useEffect(() => {
    if (!loading) saveData('recipes', recipes);
  }, [recipes, loading]);

  useEffect(() => {
    if (!loading) saveData('stockItems', stockItems);
  }, [stockItems, loading]);

  useEffect(() => {
    if (!loading) saveData('tables', tables);
  }, [tables, loading]);

  useEffect(() => {
    if (!loading) saveData('stockHistory', stockHistory);
  }, [stockHistory, loading]);

  // ฟังก์ชันจัดการออร์เดอร์
  const selectTable = (table) => {
    setCurrentTable(table);
    setCurrentOrder(table.orders || []);
  };

  const addToOrder = (product) => {
    const existing = currentOrder.find(item => item.id === product.id);
    if (existing) {
      setCurrentOrder(currentOrder.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCurrentOrder([...currentOrder, { ...product, quantity: 1 }]);
    }
  };

  const updateOrderQuantity = (productId, change) => {
    setCurrentOrder(currentOrder.map(item =>
      item.id === productId
        ? { ...item, quantity: Math.max(0, item.quantity + change) }
        : item
    ).filter(item => item.quantity > 0));
  };

  const saveOrder = () => {
    if (!currentTable) return;
    
    setTables(tables.map(table =>
      table.id === currentTable.id
        ? { ...table, orders: currentOrder, status: currentOrder.length > 0 ? 'occupied' : 'available' }
        : table
    ));
    setCurrentOrder([]);
    setCurrentTable(null);
  };

  const checkout = (paymentMethod) => {
    if (!currentTable || currentOrder.length === 0) return;

    // ตัดสต๊อกอัตโนมัติ
    const newStockItems = [...stockItems];
    const newHistory = [];

    currentOrder.forEach(orderItem => {
      const product = products.find(p => p.id === orderItem.id);
      if (product && product.recipeId) {
        const recipe = recipes.find(r => r.id === product.recipeId);
        if (recipe) {
          recipe.items.forEach(recipeItem => {
            const stockIndex = newStockItems.findIndex(s => s.id === recipeItem.stockId);
            if (stockIndex !== -1) {
              const usedAmount = recipeItem.amount * orderItem.quantity;
              newStockItems[stockIndex] = { 
                ...newStockItems[stockIndex], 
                quantity: newStockItems[stockIndex].quantity - usedAmount 
              };

              newHistory.push({
                id: Date.now() + Math.random(),
                type: 'auto',
                stockId: recipeItem.stockId,
                stockName: newStockItems[stockIndex].name,
                amount: -usedAmount,
                reason: `ขาย ${product.name} x${orderItem.quantity}`,
                date: new Date().toLocaleString('th-TH')
              });
            }
          });
        }
      }
    });

    setStockItems(newStockItems);
    setStockHistory([...newHistory, ...stockHistory]);

    setTables(tables.map(table =>
      table.id === currentTable.id
        ? { ...table, orders: [], status: 'available' }
        : table
    ));
    setCurrentOrder([]);
    setCurrentTable(null);
    alert(`ชำระเงินสำเร็จด้วย${paymentMethod}`);
  };

  // ฟังก์ชันจัดการสต๊อก
  const addStockManual = (stockId, amount, reason) => {
    const stockIndex = stockItems.findIndex(s => s.id === stockId);
    if (stockIndex !== -1) {
      const newStockItems = [...stockItems];
      newStockItems[stockIndex] = {
        ...newStockItems[stockIndex],
        quantity: newStockItems[stockIndex].quantity + amount
      };
      setStockItems(newStockItems);

      const history = {
        id: Date.now(),
        type: 'manual',
        stockId,
        stockName: stockItems[stockIndex].name,
        amount,
        reason,
        date: new Date().toLocaleString('th-TH')
      };
      setStockHistory([history, ...stockHistory]);
    }
  };

  // UI Components
  const OrderTab = () => (
    <div className="space-y-6">
      {!currentTable ? (
        <div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: config.theme }}>เลือกโต๊ะ</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tables.map(table => (
              <button
                key={table.id}
                onClick={() => selectTable(table)}
                className={`p-6 rounded-2xl backdrop-blur-md border-2 transition-all ${
                  table.status === 'available'
                    ? 'bg-white/50 border-gray-200 hover:border-blue-400'
                    : 'bg-red-50/50 border-red-300'
                }`}
              >
                <Home className="w-8 h-8 mx-auto mb-2" style={{ color: config.theme }} />
                <div className="font-bold">{table.name}</div>
                <div className="text-sm text-gray-600">
                  {table.status === 'available' ? 'ว่าง' : `${table.orders?.length || 0} รายการ`}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold" style={{ color: config.theme }}>{currentTable.name}</h2>
              <button
                onClick={() => { setCurrentTable(null); setCurrentOrder([]); }}
                className="p-2 rounded-xl bg-white/50 backdrop-blur-md hover:bg-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {products.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToOrder(product)}
                  className="w-full p-4 rounded-2xl bg-white/50 backdrop-blur-md border-2 border-gray-200 hover:border-blue-400 text-left transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold">{product.name}</div>
                      <div className="text-sm text-gray-600">฿{product.price}</div>
                    </div>
                    <Plus className="w-5 h-5" style={{ color: config.theme }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 border-2 border-gray-200">
            <h3 className="text-xl font-bold mb-4" style={{ color: config.theme }}>รายการสั่ง</h3>
            <div className="space-y-3 mb-6">
              {currentOrder.length === 0 ? (
                <div className="text-center text-gray-500 py-8">ยังไม่มีรายการ</div>
              ) : (
                currentOrder.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-white/70 rounded-xl">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">฿{item.price}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateOrderQuantity(item.id, -1)}
                        className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4 text-red-600" />
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateOrderQuantity(item.id, 1)}
                        className="w-8 h-8 rounded-lg bg-green-100 hover:bg-green-200 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 text-green-600" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {currentOrder.length > 0 && (
              <>
                <div className="border-t-2 border-gray-200 pt-4 mb-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>รวมทั้งหมด</span>
                    <span style={{ color: config.theme }}>
                      ฿{currentOrder.reduce((sum, item) => sum + item.price * item.quantity, 0)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={saveOrder}
                    className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium"
                  >
                    บันทึกออร์เดอร์
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => checkout('เงินสด')}
                      className="py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium"
                    >
                      เงินสด
                    </button>
                    <button
                      onClick={() => checkout('โอน/QR')}
                      className="py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium"
                    >
                      โอน/QR
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const ProductTab = () => {
    const [editMode, setEditMode] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: 0, recipeId: null });

    const addProduct = () => {
      if (!newProduct.name || newProduct.price <= 0) return;
      const product = {
        id: Date.now(),
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        recipeId: newProduct.recipeId ? parseInt(newProduct.recipeId) : null
      };
      setProducts([...products, product]);
      setNewProduct({ name: '', price: 0, recipeId: null });
    };

    const deleteProduct = (id) => {
      setProducts(products.filter(p => p.id !== id));
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold" style={{ color: config.theme }}>จัดการสินค้า</h2>
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 rounded-xl bg-white/50 backdrop-blur-md border-2 border-gray-200 hover:border-blue-400"
          >
            {editMode ? <Check className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
          </button>
        </div>

        {editMode && (
          <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 border-2 border-gray-200">
            <h3 className="font-bold mb-4">เพิ่มสินค้าใหม่</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="ชื่อสินค้า"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="px-4 py-2 rounded-xl bg-white/70 border-2 border-gray-200 focus:border-blue-400 outline-none"
              />
              <input
                type="number"
                placeholder="ราคา"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                className="px-4 py-2 rounded-xl bg-white/70 border-2 border-gray-200 focus:border-blue-400 outline-none"
              />
              <select
                value={newProduct.recipeId || ''}
                onChange={(e) => setNewProduct({ ...newProduct, recipeId: e.target.value })}
                className="px-4 py-2 rounded-xl bg-white/70 border-2 border-gray-200 focus:border-blue-400 outline-none"
              >
                <option value="">ไม่มีสูตร</option>
                {recipes.map(recipe => (
                  <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                ))}
              </select>
              <button
                onClick={addProduct}
                className="px-4 py-2 rounded-xl text-white font-medium"
                style={{ backgroundColor: config.theme }}
              >
                เพิ่ม
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {products.map(product => (
            <div key={product.id} className="bg-white/50 backdrop-blur-md rounded-2xl p-6 border-2 border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg">{product.name}</h3>
                  <p className="text-2xl font-bold" style={{ color: config.theme }}>฿{product.price}</p>
                </div>
                {editMode && (
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="p-2 rounded-lg bg-red-100 hover:bg-red-200"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                )}
              </div>
              {product.recipeId && (
                <div className="text-sm text-gray-600">
                  สูตร: {recipes.find(r => r.id === product.recipeId)?.name || '-'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const StockTab = () => {
    const [showAddStock, setShowAddStock] = useState(false);
    const [stockForm, setStockForm] = useState({ stockId: '', amount: 0, reason: '' });

    const handleAddStock = () => {
      if (!stockForm.stockId || stockForm.amount === 0) return;
      addStockManual(parseInt(stockForm.stockId), parseFloat(stockForm.amount), stockForm.reason);
      setStockForm({ stockId: '', amount: 0, reason: '' });
      setShowAddStock(false);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold" style={{ color: config.theme }}>จัดการสต๊อก</h2>
          <button
            onClick={() => setShowAddStock(!showAddStock)}
            className="px-4 py-2 rounded-xl text-white font-medium"
            style={{ backgroundColor: config.theme }}
          >
            <Plus className="w-5 h-5 inline mr-2" />
            เพิ่ม/ตัดสต๊อก
          </button>
        </div>

        {showAddStock && (
          <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 border-2 border-gray-200">
            <h3 className="font-bold mb-4">เพิ่ม/ตัดสต๊อกแบบ Manual</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <select
                value={stockForm.stockId}
                onChange={(e) => setStockForm({ ...stockForm, stockId: e.target.value })}
                className="px-4 py-2 rounded-xl bg-white/70 border-2 border-gray-200 focus:border-blue-400 outline-none"
              >
                <option value="">เลือกสต๊อก</option>
                {stockItems.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="จำนวน (+/-)"
                value={stockForm.amount}
                onChange={(e) => setStockForm({ ...stockForm, amount: e.target.value })}
                className="px-4 py-2 rounded-xl bg-white/70 border-2 border-gray-200 focus:border-blue-400 outline-none"
              />
              <input
                type="text"
                placeholder="เหตุผล"
                value={stockForm.reason}
                onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
                className="px-4 py-2 rounded-xl bg-white/70 border-2 border-gray-200 focus:border-blue-400 outline-none"
              />
              <button
                onClick={handleAddStock}
                className="px-4 py-2 rounded-xl text-white font-medium"
                style={{ backgroundColor: config.theme }}
              >
                บันทึก
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-lg mb-4">สต๊อกปัจจุบัน</h3>
            <div className="space-y-3">
              {stockItems.map(item => (
                <div key={item.id} className="bg-white/50 backdrop-blur-md rounded-xl p-4 border-2 border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold">{item.name}</div>
                      <div className="text-sm text-gray-600">หน่วย: {item.unit}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: config.theme }}>
                        {item.quantity.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">{item.unit}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">ประวัติการเคลื่อนไหวสต๊อก</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stockHistory.map(history => (
                <div key={history.id} className="bg-white/50 backdrop-blur-md rounded-xl p-4 border-2 border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold">{history.stockName}</div>
                    <div className={`font-bold ${history.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {history.amount > 0 ? '+' : ''}{history.amount.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{history.reason}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {history.type === 'auto' ? '🤖 อัตโนมัติ' : '✏️ Manual'} • {history.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DashboardTab = () => {
    const totalSales = stockHistory.filter(h => h.type === 'auto').length;
    
    const totalRevenue = stockHistory
      .filter(h => h.type === 'auto')
      .reduce((sum, h) => {
        const match = h.reason.match(/ขาย (.+) x(\d+)/);
        if (match) {
          const productName = match[1];
          const quantity = parseInt(match[2]);
          const product = products.find(p => p.name === productName);
          if (product) {
            return sum + (product.price * quantity);
          }
        }
        return sum;
      }, 0);

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold" style={{ color: config.theme }}>Dashboard</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 border-2 border-gray-200">
            <div className="text-sm text-gray-600 mb-2">ยอดขายวันนี้</div>
            <div className="text-3xl font-bold" style={{ color: config.theme }}>
              ฿{totalRevenue.toLocaleString()}
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 border-2 border-gray-200">
            <div className="text-sm text-gray-600 mb-2">จำนวนออร์เดอร์</div>
            <div className="text-3xl font-bold" style={{ color: config.theme }}>
              {totalSales}
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 border-2 border-gray-200">
            <div className="text-sm text-gray-600 mb-2">โต๊ะที่ใช้งาน</div>
            <div className="text-3xl font-bold" style={{ color: config.theme }}>
              {tables.filter(t => t.status === 'occupied').length}/{tables.length}
            </div>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 border-2 border-gray-200">
          <h3 className="font-bold text-lg mb-4">สต๊อกที่ใกล้หมด</h3>
          <div className="space-y-3">
            {stockItems
              .filter(item => item.quantity < 10)
              .map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-200">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-red-600 font-bold">{item.quantity.toFixed(2)} {item.unit}</div>
                </div>
              ))}
            {stockItems.filter(item => item.quantity < 10).length === 0 && (
              <div className="text-center text-gray-500 py-4">สต๊อกเพียงพอทั้งหมด</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const SettingsTab = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold" style={{ color: config.theme }}>ตั้งค่า</h2>
        
        <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 border-2 border-gray-200 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">ชื่อร้าน</label>
            <input
              type="text"
              value={config.storeName}
              onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/70 border-2 border-gray-200 focus:border-blue-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">โลโก้ (Emoji)</label>
            <input
              type="text"
              value={config.logo}
              onChange={(e) => setConfig({ ...config, logo: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/70 border-2 border-gray-200 focus:border-blue-400 outline-none text-2xl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">สีธีม</label>
            <div className="flex gap-3">
              {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                <button
                  key={color}
                  onClick={() => setConfig({ ...config, theme: color })}
                  className={`w-12 h-12 rounded-xl border-4 transition-all ${
                    config.theme === color ? 'border-gray-800 scale-110' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="pt-4 border-t-2 border-gray-200">
            <p className="text-sm text-gray-600">
              💡 <strong>หมายเหตุ:</strong> ข้อมูลจะถูกบันทึกอัตโนมัติในเบราว์เซอร์ของคุณ
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl font-bold text-gray-600">กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-md border-b-2 border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{config.logo}</span>
              <h1 className="text-2xl font-bold" style={{ color: config.theme }}>
                {config.storeName}
              </h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('order')}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  activeTab === 'order'
                    ? 'bg-white border-2 shadow-sm'
                    : 'bg-white/50 border-2 border-transparent hover:bg-white/70'
                }`}
                style={activeTab === 'order' ? { borderColor: config.theme } : {}}
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden md:inline">ออร์เดอร์</span>
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  activeTab === 'products'
                    ? 'bg-white border-2 shadow-sm'
                    : 'bg-white/50 border-2 border-transparent hover:bg-white/70'
                }`}
                style={activeTab === 'products' ? { borderColor: config.theme } : {}}
              >
                <Package className="w-5 h-5" />
                <span className="hidden md:inline">สินค้า</span>
              </button>
              <button
                onClick={() => setActiveTab('stock')}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  activeTab === 'stock'
                    ? 'bg-white border-2 shadow-sm'
                    : 'bg-white/50 border-2 border-transparent hover:bg-white/70'
                }`}
                style={activeTab === 'stock' ? { borderColor: config.theme } : {}}
              >
                <Package className="w-5 h-5" />
                <span className="hidden md:inline">สต๊อก</span>
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white border-2 shadow-sm'
                    : 'bg-white/50 border-2 border-transparent hover:bg-white/70'
                }`}
                style={activeTab === 'dashboard' ? { borderColor: config.theme } : {}}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="hidden md:inline">Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  activeTab === 'settings'
                    ? 'bg-white border-2 shadow-sm'
                    : 'bg-white/50 border-2 border-transparent hover:bg-white/70'
                }`}
                style={activeTab === 'settings' ? { borderColor: config.theme } : {}}
              >
                <Settings className="w-5 h-5" />
                <span className="hidden md:inline">ตั้งค่า</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'order' && <OrderTab />}
        {activeTab === 'products' && <ProductTab />}
        {activeTab === 'stock' && <StockTab />}
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
};

export default ModernPOS;
