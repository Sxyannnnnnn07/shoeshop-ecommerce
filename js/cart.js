// ================= CART & CHECKOUT PAGE LOGIC =================

// Utility function to compress uploaded slip image
function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress as JPEG
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// Global variable to store uploaded slip base64
let uploadedSlipBase64 = null;

// Render cart contents on cart.html
function renderCartPage() {
    const itemsContainer = document.getElementById('cartItemsList');
    const layout = document.getElementById('cartLayout');
    const emptyDisplay = document.getElementById('emptyCart');
    
    if (!itemsContainer) return;

    const cart = window.getCart();

    if (cart.length === 0) {
        if (layout) layout.style.display = 'none';
        if (emptyDisplay) emptyDisplay.style.display = 'block';
        return;
    }

    if (layout) layout.style.display = 'grid';
    if (emptyDisplay) emptyDisplay.style.display = 'none';

    itemsContainer.innerHTML = cart.map((item, index) => {
        return `
            <div class="cart-item-row">
                <!-- Product Details -->
                <div class="cart-item-info">
                    <div class="cart-item-image">
                        <img src="${resolveImageUrl(item.image_url)}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <p>ไซส์: ${item.selectedSize} | สี: ${item.selectedColor}</p>
                    </div>
                </div>
                
                <!-- Unit Price -->
                <div class="cart-item-price">
                    ฿${item.price.toLocaleString()}
                </div>

                <!-- Quantity controls -->
                <div class="quantity-selector" style="height: 38px;">
                    <button type="button" style="width: 32px; height: 36px;" onclick="adjustCartItemQty(${index}, -1)">-</button>
                    <input type="text" value="${item.quantity}" style="width: 36px; height: 36px;" readonly>
                    <button type="button" style="width: 32px; height: 36px;" onclick="adjustCartItemQty(${index}, 1)">+</button>
                </div>

                <!-- Total and delete -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <span class="cart-item-total">฿${(item.price * item.quantity).toLocaleString()}</span>
                    <button class="cart-item-remove" onclick="removeCartItem(${index})" title="ลบรายการสินค้า">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    calculateCartTotals();
}

// Adjust quantity inside cart
function adjustCartItemQty(index, amount) {
    let cart = window.getCart();
    if (index < 0 || index >= cart.length) return;

    let newQty = cart[index].quantity + amount;
    
    // Validate boundaries
    if (newQty < 1) newQty = 1;
    if (newQty > cart[index].stock) {
        window.showToast(`จำนวนคงเหลือไม่พอ มีสินค้าเหลือในคลังเพียง ${cart[index].stock} ชิ้นเท่านั้น`, 'error');
        return;
    }

    cart[index].quantity = newQty;
    window.saveCart(cart);
    renderCartPage();
}

// Remove single cart item
function removeCartItem(index) {
    let cart = window.getCart();
    if (index < 0 || index >= cart.length) return;

    const removedName = cart[index].name;
    cart.splice(index, 1);
    window.saveCart(cart);
    renderCartPage();
    window.showToast(`ลบรองเท้า ${removedName} ออกจากตะกร้าสินค้าแล้ว`, 'info');
}

// Calculate subtotals
function calculateCartTotals() {
    const cart = window.getCart();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const subtotalEl = document.getElementById('subtotalVal');
    const totalEl = document.getElementById('totalVal');

    if (subtotalEl) subtotalEl.textContent = `฿${subtotal.toLocaleString()}`;
    if (totalEl) totalEl.textContent = `฿${subtotal.toLocaleString()}`;
}

// ================= CHECKOUT FLOW =================

// Render checkout page order summary list
function renderCheckoutSummary() {
    const summaryContainer = document.getElementById('checkoutSummaryItems');
    if (!summaryContainer) return;

    const cart = window.getCart();
    if (cart.length === 0) {
        window.location.href = "cart.html";
        return;
    }

    summaryContainer.innerHTML = cart.map(item => {
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 14px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${resolveImageUrl(item.image_url)}" alt="${item.name}" style="width: 40px; height: 40px; object-fit: contain; background: #f8fafc; border: 1px solid var(--border); border-radius: 4px; padding: 2px;">
                    <div>
                        <span style="font-weight: 600;">${item.name}</span>
                        <div style="font-size: 11px; color: var(--text-muted);">ไซส์: ${item.selectedSize} | จำนวน: ${item.quantity}</div>
                    </div>
                </div>
                <span style="font-weight: 700;">฿${(item.price * item.quantity).toLocaleString()}</span>
            </div>
        `;
    }).join('');

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('subtotalVal').textContent = `฿${subtotal.toLocaleString()}`;
    document.getElementById('totalVal').textContent = `฿${subtotal.toLocaleString()}`;
}

// Handle Order Submission (COD & Transfer checkout)
async function handleCheckoutSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitOrderBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่งคำสั่งซื้อ...';

    // 1. Get logged in user session
    const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
    
    if (sessionError || !session) {
        window.showToast("กรุณาเข้าสู่ระบบเพื่อดำเนินการยืนยันสั่งซื้อสินค้า!", "error");
        setTimeout(() => {
            window.location.href = "auth.html?redirect=checkout.html";
        }, 1500);
        return;
    }

    const user = session.user;
    const cart = window.getCart();

    if (cart.length === 0) {
        window.showToast("ตะกร้าสินค้าของคุณว่างเปล่า!", "error");
        submitBtn.disabled = false;
        const currentMethod = document.getElementById('paymentMethod').value;
        if (currentMethod === 'TRANSFER') {
            submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ยืนยันการสั่งซื้อสินค้า (แนบสลิปโอนเงิน)';
        } else {
            submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ยืนยันการสั่งซื้อสินค้า (ชำระเงินปลายทาง)';
        }
        return;
    }

    // 2. Shipping inputs & payment options
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const paymentMethod = document.getElementById('paymentMethod').value;

    if (paymentMethod === 'TRANSFER' && !uploadedSlipBase64) {
        window.showToast("กรุณาแนบภาพสลิปโอนเงินก่อนทำการสั่งซื้อ!", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ยืนยันการสั่งซื้อสินค้า (แนบสลิปโอนเงิน)';
        return;
    }

    // Serialize payment details and address into shipping_address column as JSON
    const orderMetadata = {
        fullName: fullName,
        address: address,
        payment_method: paymentMethod,
        slip: paymentMethod === 'TRANSFER' ? uploadedSlipBase64 : null
    };
    const fullShippingInfo = JSON.stringify(orderMetadata);

    // 3. Prepare parameters for RPC transaction place_order
    const itemsParam = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
    }));

    try {
        const { data: orderId, error: orderError } = await window.supabase.rpc('place_order', {
            p_user_id: user.id,
            p_shipping_address: fullShippingInfo,
            p_phone: phone,
            p_items: itemsParam
        });

        if (orderError) throw orderError;

        window.showToast("ส่งคำสั่งซื้อเสร็จสมบูรณ์เรียบร้อยแล้ว! ขอบพระคุณครับ", "success");
        
        localStorage.removeItem('shoeshop_cart');
        window.updateCartBadge();

        setTimeout(() => {
            window.location.href = "profile.html";
        }, 1500);

    } catch (err) {
        console.error("Order insertion failed:", err);
        
        // Show Postgres database exception message if available
        let userMsg = "การซื้อของขัดข้อง สินค้าบางชิ้นอาจเหลือสต็อกไม่พอกับปริมาณที่คุณเลือก";
        if (err.message) {
            // Translate database exception messages to Thai
            if (err.message.includes('Insufficient stock')) {
                userMsg = "สต็อกสินค้าไม่พอสำหรับการดำเนินการ! สินค้าชิ้นนั้นอาจจะจำหน่ายหมดระหว่างทำคำสั่งซื้อ";
            } else {
                userMsg = err.message;
            }
        }
        
        window.showToast(userMsg, "error");
        
        submitBtn.disabled = false;
        if (paymentMethod === 'TRANSFER') {
            submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ยืนยันการสั่งซื้อสินค้า (แนบสลิปโอนเงิน)';
        } else {
            submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ยืนยันการสั่งซื้อสินค้า (ชำระเงินปลายทาง)';
        }
    }
}

// Check auth before allowing checkout navigation
async function handleCheckoutNav(e) {
    e.preventDefault();
    
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
        window.showToast("กรุณาลงทะเบียนสมาชิกหรือเข้าสู่ระบบก่อนทำการสั่งซื้อ!", "warning");
        setTimeout(() => {
            window.location.href = "auth.html?redirect=checkout.html";
        }, 1200);
    } else {
        window.location.href = "checkout.html";
    }
}

window.adjustCartItemQty = adjustCartItemQty;
window.removeCartItem = removeCartItem;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cartItemsList')) {
        renderCartPage();
        
        const checkoutRedirectBtn = document.getElementById('checkoutBtn');
        if (checkoutRedirectBtn) {
            checkoutRedirectBtn.addEventListener('click', handleCheckoutNav);
        }
    }

    if (document.getElementById('checkoutSummaryItems')) {
        renderCheckoutSummary();
        
        const checkoutForm = document.getElementById('checkoutForm');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', handleCheckoutSubmit);
        }

        // Setup Payment Method Toggle & Slip Upload Preview
        const paymentMethodSelect = document.getElementById('paymentMethod');
        const bankTransferDetails = document.getElementById('bankTransferDetails');
        const submitOrderBtn = document.getElementById('submitOrderBtn');
        const paymentSlipInput = document.getElementById('paymentSlip');
        const paymentSlipFileName = document.getElementById('paymentSlipFileName');
        const slipPreviewContainer = document.getElementById('slipPreviewContainer');
        const slipImagePreview = document.getElementById('slipImagePreview');

        if (paymentMethodSelect && bankTransferDetails) {
            paymentMethodSelect.addEventListener('change', () => {
                if (paymentMethodSelect.value === 'TRANSFER') {
                    bankTransferDetails.style.display = 'block';
                    if (paymentSlipInput) paymentSlipInput.required = true;
                    if (submitOrderBtn) {
                        submitOrderBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ยืนยันการสั่งซื้อสินค้า (แนบสลิปโอนเงิน)';
                    }
                } else {
                    bankTransferDetails.style.display = 'none';
                    if (paymentSlipInput) paymentSlipInput.required = false;
                    if (submitOrderBtn) {
                        submitOrderBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ยืนยันการสั่งซื้อสินค้า (ชำระเงินปลายทาง)';
                    }
                }
            });
        }

        if (paymentSlipInput) {
            paymentSlipInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    paymentSlipFileName.textContent = file.name;
                    try {
                        // Show loading status
                        if (submitOrderBtn) {
                            submitOrderBtn.disabled = true;
                            submitOrderBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดและบีบอัดรูปภาพ...';
                        }

                        // Compress image to keep DB record small
                        uploadedSlipBase64 = await compressImage(file, 600, 800, 0.6);

                        if (slipImagePreview && slipPreviewContainer) {
                            slipImagePreview.src = uploadedSlipBase64;
                            slipPreviewContainer.style.display = 'block';
                        }
                    } catch (err) {
                        console.error("Failed to read/compress slip image:", err);
                        window.showToast("เกิดข้อผิดพลาดในการโหลดรูปภาพสลิป", "error");
                        paymentSlipFileName.textContent = "ยังไม่ได้เลือกไฟล์";
                        uploadedSlipBase64 = null;
                        if (slipPreviewContainer) slipPreviewContainer.style.display = 'none';
                    } finally {
                        if (submitOrderBtn) {
                            submitOrderBtn.disabled = false;
                            if (paymentMethodSelect.value === 'TRANSFER') {
                                submitOrderBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ยืนยันการสั่งซื้อสินค้า (แนบสลิปโอนเงิน)';
                            } else {
                                submitOrderBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ยืนยันการสั่งซื้อสินค้า (ชำระเงินปลายทาง)';
                            }
                        }
                    }
                } else {
                    paymentSlipFileName.textContent = "ยังไม่ได้เลือกไฟล์";
                    uploadedSlipBase64 = null;
                    if (slipPreviewContainer) slipPreviewContainer.style.display = 'none';
                }
            });
        }
    }
});
