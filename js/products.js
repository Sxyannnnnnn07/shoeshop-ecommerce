// ================= PRODUCTS PAGE & CATALOG LOGIC =================

// State variables for catalog filters
let allProducts = [];
let filteredProducts = [];

// Fetch products from database
async function fetchProducts() {
    try {
        const { data, error } = await window.supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        allProducts = data;
        filteredProducts = [...allProducts];
        
        applyInitialUrlCategory();
        renderProducts(filteredProducts);
    } catch (err) {
        console.error("Error fetching products:", err);
        const grid = document.getElementById('productsGrid');
        if (grid) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 40px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; margin-bottom: 12px;"></i>
                <p>ล้มเหลวในการดาวน์โหลดข้อมูลสินค้า กรุณาลองใหม่อีกครั้ง</p>
            </div>`;
        }
    }
}

// Render products into the catalog grid
function renderProducts(productsList) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (productsList.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 60px 0;">
            <i class="fa-solid fa-box-open" style="font-size: 48px; margin-bottom: 16px;"></i>
            <h3>ไม่พบสินค้าสนีกเกอร์ที่ตรงตามเงื่อนไข</h3>
            <p>กรุณาลองรีเซ็ตตัวกรอง หรือปรับเปลี่ยนย่านช่วงราคาสำหรับการค้นหาคู่ที่ต้องการ</p>
        </div>`;
        return;
    }

    grid.innerHTML = productsList.map(product => {
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
            <article class="product-card" onclick="goToProductDetail(${product.id})">
                ${badgeHtml}
                <div class="product-image">
                    <img src="${resolveImageUrl(product.image_url)}" alt="${product.name}">
                </div>
                <div class="product-content">
                    <span class="category">${product.category}</span>
                    <h3>${product.name}</h3>
                    <p>${product.description || 'สนีกเกอร์พรีเมียม สวมใส่สบายในทุกย่างก้าว'}</p>
                    <div class="price-row">
                        <span class="price">฿${product.price.toLocaleString()}</span>
                        ${buttonHtml}
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// Navigation helpers
function goToProductDetail(id) {
    window.location.href = `product-detail.html?id=${id}`;
}

// Quick add from catalog listing
async function quickAddCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    // Use default size 42 and color 'Original' for quick adding
    const success = window.addToCart(product, "42", "Original", 1);
}

// Applying filters
function filterProducts() {
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const checkboxes = document.querySelectorAll('.category-filter:checked');
    const checkedCategories = Array.from(checkboxes).map(cb => cb.value);
    const minPrice = parseFloat(document.getElementById('minPrice')?.value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice')?.value) || Infinity;

    filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchText) || 
                              product.category.toLowerCase().includes(searchText) ||
                              (product.description && product.description.toLowerCase().includes(searchText));
                              
        const matchesCategory = checkedCategories.length === 0 || checkedCategories.includes(product.category);
        const matchesPrice = product.price >= minPrice && product.price <= maxPrice;

        return matchesSearch && matchesCategory && matchesPrice;
    });

    sortProducts();
}

// Sorting products
function sortProducts() {
    const sortBy = document.getElementById('sortBy')?.value || 'default';

    if (sortBy === 'price-asc') {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
        filteredProducts.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-asc') {
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        filteredProducts.sort((a, b) => a.id - b.id);
    }

    renderProducts(filteredProducts);
}

// Pre-fill check categories on page load if coming from query
function applyInitialUrlCategory() {
    const params = new URLSearchParams(window.location.search);
    const categoryQuery = params.get('category');
    if (categoryQuery) {
        const checkboxes = document.querySelectorAll('.category-filter');
        checkboxes.forEach(cb => {
            if (cb.value.toLowerCase() === categoryQuery.toLowerCase()) {
                cb.checked = true;
            }
        });
        
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: cleanUrl}, '', cleanUrl);
    }
}

// Reset filters
function resetFilters() {
    const searchInput = document.getElementById('searchInput');
    const minPrice = document.getElementById('minPrice');
    const maxPrice = document.getElementById('maxPrice');
    const checkboxes = document.querySelectorAll('.category-filter');
    const sortBy = document.getElementById('sortBy');

    if (searchInput) searchInput.value = '';
    if (minPrice) minPrice.value = '';
    if (maxPrice) maxPrice.value = '';
    checkboxes.forEach(cb => cb.checked = false);
    if (sortBy) sortBy.value = 'default';

    filteredProducts = [...allProducts];
    renderProducts(filteredProducts);
}

// ================= PRODUCT DETAIL LOGIC =================
let activeSize = null;
let activeColor = 'ออริจินัล';

async function fetchProductDetail(id) {
    const detailContainer = document.getElementById('detailLayout');
    if (!detailContainer) return;

    try {
        const { data: product, error } = await window.supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!product) {
            detailContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 80px 0;">
                <h3>ไม่พบข้อมูลสนีกเกอร์คู่นี้</h3>
                <p>สินค้าที่คุณกำลังเรียกดูอาจถูกลบออก หรือไม่มีอยู่ในระบบ ณ ขณะนี้</p>
                <a href="products.html" class="btn" style="margin-top: 20px;">กลับสู่หน้ารวมสินค้า</a>
            </div>`;
            return;
        }

        document.title = `${product.name} | jehha-sneaker`;

        const isOutOfStock = product.stock <= 0;
        const stockStatusClass = isOutOfStock ? 'out-of-stock' : product.stock <= 3 ? 'low-stock' : 'in-stock';
        const stockStatusText = isOutOfStock ? 'สินค้าหมดเกลี้ยง' : product.stock <= 3 ? `สินค้าใกล้หมด! เหลือเพียง ${product.stock} คู่สุดท้าย` : 'มีสินค้าจำหน่าย';
        
        detailContainer.innerHTML = `
            <!-- Product image -->
            <div class="detail-image-wrapper">
                <img src="${resolveImageUrl(product.image_url)}" alt="${product.name}">
            </div>

            <!-- Product info -->
            <div class="detail-info-wrapper">
                <span class="detail-category">${product.category}</span>
                <h1 class="detail-name">${product.name}</h1>
                <div class="detail-price">฿${product.price.toLocaleString()}</div>
                <p class="detail-description">${product.description || 'ผลิตด้วยวัสดุเกรดพรีเมียม ให้สัมผัสที่นุ่มสบายเท้าและระบายอากาศได้อย่างยอดเยี่ยม รองรับแรงกระแทกในทุกก้าวเดิน เหมาะกับการสวมใส่ในชีวิตประจำวัน เล่นกีฬา หรือใส่ออกกำลังกายเบาๆ'}</p>
                
                <!-- Stock status -->
                <div class="stock-status ${stockStatusClass}" style="margin-bottom: 24px;">
                    <i class="fa-solid ${isOutOfStock ? 'fa-circle-xmark' : 'fa-circle-check'}"></i> ${stockStatusText}
                </div>

                <!-- Sizes Options -->
                <div class="detail-option">
                    <h4>เลือกไซส์รองเท้าของคุณ (EU)</h4>
                    <div class="size-selector">
                        ${[38, 39, 40, 41, 42, 43, 44, 45].map(size => `
                            <button class="size-btn" onclick="selectDetailSize(this, '${size}')">${size}</button>
                        `).join('')}
                    </div>
                </div>

                <!-- Colors Options -->
                <div class="detail-option">
                    <h4>เลือกสีที่ชอบ</h4>
                    <div class="color-selector">
                        <div class="color-dot active" style="background-color: #000000;" onclick="selectDetailColor(this, 'ดำ')" title="ดำ"></div>
                        <div class="color-dot" style="background-color: #ffffff; border: 1px solid var(--border);" onclick="selectDetailColor(this, 'ขาว')" title="ขาว"></div>
                        <div class="color-dot" style="background-color: var(--primary);" onclick="selectDetailColor(this, 'ส้ม')" title="ส้ม"></div>
                        <div class="color-dot" style="background-color: #3b82f6;" onclick="selectDetailColor(this, 'น้ำเงิน')" title="น้ำเงิน"></div>
                    </div>
                </div>

                <!-- Quantity & Add to Cart -->
                <div class="quantity-add-row">
                    <div class="quantity-selector">
                        <button type="button" onclick="adjustQty(-1)" ${isOutOfStock ? 'disabled' : ''}>-</button>
                        <input type="number" id="detailQty" value="1" min="1" max="${product.stock}" readonly ${isOutOfStock ? 'disabled' : ''}>
                        <button type="button" onclick="adjustQty(1)" ${isOutOfStock ? 'disabled' : ''}>+</button>
                    </div>
                    <button class="btn" style="flex-grow: 1;" id="detailAddCartBtn" onclick="handleAddCartClick(${product.id})" ${isOutOfStock ? 'disabled' : ''}>
                        <i class="fa-solid fa-cart-plus"></i> เพิ่มลงตะกร้าสินค้า
                    </button>
                </div>
            </div>
        `;

        // Pre-select size 42 by default if available
        const defaultSizeBtn = document.querySelector(`.size-selector .size-btn`);
        if (defaultSizeBtn) {
            defaultSizeBtn.click();
        }

    } catch (err) {
        console.error("Error fetching product detail:", err);
        detailContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 80px 0;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 40px; margin-bottom: 16px;"></i>
            <p>ล้มเหลวในการดาวน์โหลดรายละเอียดสนีกเกอร์</p>
        </div>`;
    }
}

// Selector callbacks
function selectDetailSize(buttonElement, size) {
    document.querySelectorAll('.size-selector .size-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    activeSize = size;
}

function selectDetailColor(dotElement, colorName) {
    document.querySelectorAll('.color-selector .color-dot').forEach(dot => dot.classList.remove('active'));
    dotElement.classList.add('active');
    activeColor = colorName;
}

// Quantity Adjust
function adjustQty(amount) {
    const qtyInput = document.getElementById('detailQty');
    if (!qtyInput) return;
    
    let val = parseInt(qtyInput.value) + amount;
    const max = parseInt(qtyInput.max) || 1;
    if (val < 1) val = 1;
    if (val > max) val = max;
    qtyInput.value = val;
}

// Add to cart click
async function handleAddCartClick(productId) {
    if (!activeSize) {
        window.showToast("กรุณาเลือกไซส์รองเท้าของคุณก่อน!", "warning");
        return;
    }

    try {
        const { data: product, error } = await window.supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;
        
        const qtyInput = document.getElementById('detailQty');
        const quantity = parseInt(qtyInput.value) || 1;

        const success = window.addToCart(product, activeSize, activeColor, quantity);
    } catch (err) {
        console.error(err);
        window.showToast("ระบบขัดข้อง ไม่สามารถเรียกข้อมูลสต็อกสินค้าได้", "error");
    }
}

window.quickAddCart = quickAddCart;
window.selectDetailSize = selectDetailSize;
window.selectDetailColor = selectDetailColor;
window.adjustQty = adjustQty;
window.handleAddCartClick = handleAddCartClick;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('productsGrid')) {
        fetchProducts();

        document.getElementById('searchInput')?.addEventListener('input', filterProducts);
        document.querySelectorAll('.category-filter').forEach(cb => {
            cb.addEventListener('change', filterProducts);
        });
        document.getElementById('minPrice')?.addEventListener('input', filterProducts);
        document.getElementById('maxPrice')?.addEventListener('input', filterProducts);
        document.getElementById('sortBy')?.addEventListener('change', filterProducts);
        document.getElementById('resetFilters')?.addEventListener('click', resetFilters);
    }

    const params = new URLSearchParams(window.location.search);
    const detailId = params.get('id');
    if (detailId && document.getElementById('detailLayout')) {
        fetchProductDetail(detailId);
    }
});
