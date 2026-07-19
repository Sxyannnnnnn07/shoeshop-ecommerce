// ================= INDEX / HOME PAGE LOGIC =================

async function loadFeaturedProducts() {
    const featuredGrid = document.getElementById('featuredGrid');
    if (!featuredGrid) return;

    try {
        // Fetch top 8 products from the database
        const { data: products, error } = await window.supabase
            .from('products')
            .select('*')
            .limit(8);

        if (error) throw error;

        if (products.length === 0) {
            featuredGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">
                <i class="fa-solid fa-store-slash" style="font-size: 36px; margin-bottom: 12px;"></i>
                <p>ยังไม่มีรายการรองเท้าพร้อมจำหน่าย ณ ขณะนี้</p>
            </div>`;
            return;
        }

        featuredGrid.innerHTML = products.map(product => {
            const isOutOfStock = product.stock <= 0;
            const buttonHtml = isOutOfStock
                ? `<span class="out-of-stock-badge">สินค้าหมด</span>`
                : `<button class="add-cart" onclick="event.preventDefault(); quickAddCart(${product.id})">ใส่ตะกร้า</button>`;

            const badgeHtml = isOutOfStock 
                ? `<div class="product-badge sale" style="background-color: var(--border-dark);">ขายหมดแล้ว</div>` 
                : product.stock <= 3 
                    ? `<div class="product-badge sale">สินค้าใกล้หมด</div>` 
                    : '';

            return `
                <article class="product-card" onclick="window.location.href='product-detail.html?id=${product.id}'" style="cursor: pointer;">
                    ${badgeHtml}
                    <div class="product-image">
                        <img src="${product.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'}" alt="${product.name}">
                    </div>
                    <div class="product-content">
                        <span class="category">${product.category}</span>
                        <h3>${product.name}</h3>
                        <p>${product.description || 'สวมใส่สบาย โดดเด่นในทุกกิจกรรม'}</p>
                        <div class="price-row">
                            <span class="price">฿${product.price.toLocaleString()}</span>
                            ${buttonHtml}
                        </div>
                    </div>
                </article>
            `;
        }).join('');

    } catch (err) {
        console.error("Error loading homepage featured products:", err);
        featuredGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 40px;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; margin-bottom: 12px;"></i>
            <p>เกิดข้อผิดพลาดในการโหลดข้อมูลสินค้าจากเซิร์ฟเวอร์</p>
        </div>`;
    }
}

// Quick add from home catalog listing
async function quickAddCart(productId) {
    try {
        const { data: product, error } = await window.supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;
        
        if (product) {
            window.addToCart(product, "42", "ออริจินัล", 1);
        }
    } catch (err) {
        console.error(err);
        window.showToast("ระบบขัดข้อง ไม่สามารถเรียกข้อมูลเพื่อใส่ตะกร้าได้", "error");
    }
}

window.quickAddCart = quickAddCart;

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProducts();
});
