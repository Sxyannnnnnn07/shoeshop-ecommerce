// ================= ADMIN DASHBOARD LOGIC =================

let adminProducts = [];
let adminOrders = [];

// 1. Authenticate Admin Role and Initialize
async function initAdminDashboard() {
    const layout = document.getElementById('adminDashboardLayout');
    const deniedBanner = document.getElementById('adminAccessDenied');

    const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
    
    if (sessionError || !session) {
        if (deniedBanner) deniedBanner.style.display = 'block';
        window.showToast("จำเป็นต้องเข้าสู่ระบบแอดมินก่อน! กำลังย้ายหน้า...", "error");
        setTimeout(() => {
            window.location.href = "auth.html?redirect=admin.html";
        }, 1500);
        return;
    }

    const user = session.user;

    // Fetch user profile role
    const { data: profile, error: profileError } = await window.supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile || profile.role !== 'admin' || user.email !== 'admin@test.com') {
        if (deniedBanner) deniedBanner.style.display = 'block';
        if (layout) layout.style.display = 'none';
        window.showToast("ไม่มีสิทธิ์เข้าถึง! เฉพาะแอดมินสูงสุดเท่านั้น", "error");
    } else {
        if (layout) layout.style.display = 'grid';
        if (deniedBanner) deniedBanner.style.display = 'none';
        
        loadAdminProducts();
        loadAdminOrders();
    }
}

// ================= TAB MANAGEMENT =================
function initAdminTabs() {
    const tabProductsBtn = document.getElementById('tabProductsBtn');
    const tabOrdersBtn = document.getElementById('tabOrdersBtn');
    const tabProductsContent = document.getElementById('tabProductsContent');
    const tabOrdersContent = document.getElementById('tabOrdersContent');

    if (tabProductsBtn && tabOrdersBtn) {
        tabProductsBtn.addEventListener('click', () => {
            tabProductsBtn.classList.add('active');
            tabOrdersBtn.classList.remove('active');
            tabProductsContent.style.display = 'block';
            tabOrdersContent.style.display = 'none';
        });

        tabOrdersBtn.addEventListener('click', () => {
            tabOrdersBtn.classList.add('active');
            tabProductsBtn.classList.remove('active');
            tabOrdersContent.style.display = 'block';
            tabProductsContent.style.display = 'none';
        });
    }
}

// ================= MODALS MANAGEMENT =================
function initAdminModals() {
    const addModal = document.getElementById('addProductModal');
    const openAddBtn = document.getElementById('openAddProductModalBtn');
    const closeAddBtn = document.getElementById('closeAddProductModalBtn');
    
    if (openAddBtn && addModal) {
        openAddBtn.addEventListener('click', () => addModal.classList.add('active'));
    }
    if (closeAddBtn && addModal) {
        closeAddBtn.addEventListener('click', () => addModal.classList.remove('active'));
    }

    const editModal = document.getElementById('editProductModal');
    const closeEditBtn = document.getElementById('closeEditProductModalBtn');
    
    if (closeEditBtn && editModal) {
        closeEditBtn.addEventListener('click', () => editModal.classList.remove('active'));
    }

    window.addEventListener('click', (e) => {
        if (e.target === addModal) addModal.classList.remove('active');
        if (e.target === editModal) editModal.classList.remove('active');
    });
}

// ================= PRODUCT CRUD OPERATIONS =================

// Fetch and render inventory
async function loadAdminProducts() {
    const tableBody = document.getElementById('adminProductsTableBody');
    if (!tableBody) return;

    try {
        const { data: products, error } = await window.supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        adminProducts = products;

        if (products.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">ไม่มีข้อมูลรองเท้าในระบบ กดปุ่ม 'เพิ่มสินค้าใหม่' ด้านบนเพื่อเริ่มลงรายการ</td></tr>`;
            return;
        }

        tableBody.innerHTML = products.map(product => {
            return `
                <tr>
                    <td><img src="${product.image_url}" alt="${product.name}"></td>
                    <td style="font-weight: 600;">${product.name}</td>
                    <td><span class="badge" style="margin-bottom: 0; padding: 4px 12px; font-size: 11px;">${product.category}</span></td>
                    <td style="font-weight: 700;">฿${product.price.toLocaleString()}</td>
                    <td style="font-weight: 700; color: ${product.stock <= 0 ? 'var(--danger)' : product.stock <= 3 ? 'var(--warning)' : 'var(--success)'};">
                        ${product.stock} คู่
                    </td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="admin-action-btn edit" onclick="openEditProduct(${product.id})" title="แก้ไขสินค้า"><i class="fa-regular fa-pen-to-square"></i></button>
                            <button class="admin-action-btn delete" onclick="deleteProduct(${product.id})" title="ลบสินค้า"><i class="fa-regular fa-trash-can"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Failed to load products in admin:", err);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 30px;">ล้มเหลวในการดาวน์โหลดตารางข้อมูลสินค้า</td></tr>`;
    }
}

// Create Product Form Submit
async function handleAddProductSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('newProdName').value.trim();
    const category = document.getElementById('newProdCategory').value;
    const price = parseFloat(document.getElementById('newProdPrice').value);
    const stock = parseInt(document.getElementById('newProdStock').value);
    const image_url = document.getElementById('newProdImage').value.trim();
    const description = document.getElementById('newProdDesc').value.trim();

    try {
        const { error } = await window.supabase
            .from('products')
            .insert([{ name, category, price, stock, image_url, description }]);

        if (error) throw error;

        window.showToast(`เพิ่มสนีกเกอร์คู่ใหม่ "${name}" สำเร็จแล้ว!`, "success");
        
        document.getElementById('addProductForm').reset();
        document.getElementById('addProductModal').classList.remove('active');
        
        loadAdminProducts();

    } catch (err) {
        console.error("Create product failed:", err);
        window.showToast(err.message || "ไม่สามารถเพิ่มข้อมูลสินค้าได้", "error");
    }
}

// Open Edit Product Modal
function openEditProduct(id) {
    const product = adminProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('editProdId').value = product.id;
    document.getElementById('editProdName').value = product.name;
    document.getElementById('editProdCategory').value = product.category;
    document.getElementById('editProdPrice').value = product.price;
    document.getElementById('editProdStock').value = product.stock;
    document.getElementById('editProdImage').value = product.image_url;
    document.getElementById('editProdDesc').value = product.description || '';

    document.getElementById('editProductModal').classList.add('active');
}

// Edit Product Form Submit
async function handleEditProductSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('editProdId').value;
    const name = document.getElementById('editProdName').value.trim();
    const category = document.getElementById('editProdCategory').value;
    const price = parseFloat(document.getElementById('editProdPrice').value);
    const stock = parseInt(document.getElementById('editProdStock').value);
    const image_url = document.getElementById('editProdImage').value.trim();
    const description = document.getElementById('editProdDesc').value.trim();

    try {
        const { error } = await window.supabase
            .from('products')
            .update({ name, category, price, stock, image_url, description })
            .eq('id', id);

        if (error) throw error;

        window.showToast("บันทึกการแก้ไขข้อมูลสินค้าเสร็จเรียบร้อย!", "success");
        
        document.getElementById('editProductForm').reset();
        document.getElementById('editProductModal').classList.remove('active');
        
        loadAdminProducts();

    } catch (err) {
        console.error("Edit product failed:", err);
        window.showToast(err.message || "ไม่สามารถบันทึกแก้ไขสินค้าได้", "error");
    }
}

// Delete Product
async function deleteProduct(id) {
    const product = adminProducts.find(p => p.id === id);
    if (!product) return;

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "${product.name}" ออกจากระบบถาวร? การลบนี้ไม่สามารถกู้คืนข้อมูลได้`)) {
        return;
    }

    try {
        const { error } = await window.supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;

        window.showToast("ลบสนีกเกอร์คู่นี้ออกจากคลังเรียบร้อย!", "success");
        loadAdminProducts();

    } catch (err) {
        console.error("Delete product failed:", err);
        window.showToast(err.message || "ไม่สามารถลบสินค้าชิ้นนี้ได้", "error");
    }
}

// ================= ORDERS MANAGEMENT =================

// Fetch and render orders
async function loadAdminOrders() {
    const tableBody = document.getElementById('adminOrdersTableBody');
    if (!tableBody) return;

    try {
        const { data: orders, error } = await window.supabase
            .from('orders')
            .select(`
                id,
                total,
                status,
                created_at,
                shipping_address,
                phone,
                profiles (
                    email,
                    full_name
                ),
                order_items (
                    quantity,
                    products (
                        name
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        adminOrders = orders;

        if (orders.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">ยังไม่มีลูกค้าสั่งซื้อสินค้าเข้ามาในระบบ</td></tr>`;
            return;
        }

        tableBody.innerHTML = orders.map(order => {
            const date = new Date(order.created_at).toLocaleDateString('th-TH', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const customerName = order.profiles?.full_name || 'ลูกค้าทั่วไป';
            const customerEmail = order.profiles?.email || 'ไม่มีอีเมล';
            const addressFormatted = order.shipping_address.replace(/\n/g, ', ');

            const itemsSummary = order.order_items.map(item => {
                const name = item.products?.name || 'ลบออกจากระบบ';
                return `${name} (x${item.quantity})`;
            }).join(', ');

            return `
                <tr>
                    <td>
                        <span style="font-weight: 600;">${date} น.</span>
                        <div style="font-size: 11px; color: var(--text-muted);">ID: #${order.id.substring(0, 8)}</div>
                    </td>
                    <td>
                        <span style="font-weight: 600;">${customerName}</span>
                        <div style="font-size: 11px; color: var(--text-muted);">${customerEmail}</div>
                    </td>
                    <td>
                        <div style="max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${addressFormatted}">${addressFormatted}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">เบอร์ติดต่อ: ${order.phone}</div>
                        <div style="font-size: 11px; color: var(--primary); font-weight: 600;">สินค้า: ${itemsSummary}</div>
                    </td>
                    <td style="font-weight: 800; color: var(--primary);">฿${order.total.toLocaleString()}</td>
                    <td>
                        <select onchange="updateOrderStatus('${order.id}', this.value)" style="padding: 6px 12px; border-radius: 6px; font-weight: 600; outline: none; border: 1px solid var(--border); cursor: pointer;" class="status-select-${order.status}">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>รอดำเนินการ (Pending)</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>จัดส่งแล้ว (Shipped)</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>ได้รับของแล้ว (Delivered)</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ยกเลิกออเดอร์ (Cancelled)</option>
                        </select>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Failed to load orders in admin:", err);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger); padding: 30px;">ล้มเหลวในการดาวน์โหลดตารางข้อมูลคำสั่งซื้อ</td></tr>`;
    }
}

// Update Order Status dropdown change handler
async function updateOrderStatus(orderId, newStatus) {
    try {
        const { error } = await window.supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (error) throw error;

        window.showToast("อัปเดตสถานะออเดอร์เรียบร้อยแล้ว!", "success");
        loadAdminOrders();

    } catch (err) {
        console.error("Order status update failed:", err);
        window.showToast(err.message || "ไม่สามารถอัปเดตสถานะคำสั่งซื้อได้", "error");
    }
}

window.openEditProduct = openEditProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('adminDashboardLayout') || document.getElementById('adminAccessDenied')) {
        initAdminDashboard();
        initAdminTabs();
        initAdminModals();

        document.getElementById('addProductForm')?.addEventListener('submit', handleAddProductSubmit);
        document.getElementById('editProductForm')?.addEventListener('submit', handleEditProductSubmit);
    }
});
