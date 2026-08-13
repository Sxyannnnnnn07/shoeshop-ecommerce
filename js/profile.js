// ================= MEMBER PROFILE & ORDER HISTORY LOGIC =================

async function loadUserProfileAndOrders() {
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const avatarEl = document.getElementById('profileAvatar');
    const ordersContainer = document.getElementById('ordersList');

    // 1. Check user session
    const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
    if (sessionError || !session) {
        window.showToast("กรุณาเข้าสู่ระบบเพื่อเข้าชมหน้าโปรไฟล์!", "error");
        setTimeout(() => {
            window.location.href = "auth.html";
        }, 1000);
        return;
    }

    const user = session.user;
    
    // 2. Fetch User Profile role/name
    const { data: profile, error: profileError } = await window.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profileError && profile) {
        if (nameEl) nameEl.textContent = profile.full_name || "คนรักสนีกเกอร์";
        if (emailEl) emailEl.textContent = profile.email || user.email;
        if (avatarEl) {
            if (profile.avatar_url) {
                avatarEl.innerHTML = `<img src="${profile.avatar_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" alt="Avatar">`;
            } else {
                avatarEl.textContent = (profile.full_name || user.email).charAt(0).toUpperCase();
            }
        }
    } else {
        if (nameEl) nameEl.textContent = "คนรักสนีกเกอร์";
        if (emailEl) emailEl.textContent = user.email;
    }

    // 3. Fetch Orders history (nested items + product details)
    try {
        const { data: orders, error: ordersError } = await window.supabase
            .from('orders')
            .select(`
                id,
                total,
                status,
                created_at,
                shipping_address,
                phone,
                order_items (
                    id,
                    quantity,
                    price,
                    products (
                        id,
                        name,
                        image_url
                    )
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        if (!ordersContainer) return;

        if (orders.length === 0) {
            ordersContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-receipt" style="font-size: 48px; margin-bottom: 16px;"></i>
                <h3>ยังไม่มีประวัติการสั่งซื้อของคุณ</h3>
                <p>คุณยังไม่ได้เลือกซื้อและสั่งซื้อรองเท้าจากร้านค้าของเราเลย</p>
            </div>`;
            return;
        }

        ordersContainer.innerHTML = orders.map(order => {
            const date = new Date(order.created_at).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Status Badge
            const statusClass = order.status.toLowerCase();
            let statusLabel = 'รอดำเนินการ';
            if (order.status === 'shipped') statusLabel = 'จัดส่งแล้ว';
            else if (order.status === 'delivered') statusLabel = 'จัดส่งสำเร็จ';
            else if (order.status === 'cancelled') statusLabel = 'ยกเลิกแล้ว';

            // Items HTML
            const itemsHtml = order.order_items.map(item => {
                const product = item.products || { name: 'สนีกเกอร์ที่ถูกลบออกจากระบบ', image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600' };
                return `
                    <div class="order-item-summary">
                        <div class="order-item-summary-left">
                            <img src="${product.image_url}" alt="${product.name}">
                            <div>
                                <span class="item-name">${product.name}</span>
                                <div class="item-meta">จำนวน: ${item.quantity} | ราคาต่อชิ้น: ฿${item.price.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            let paymentMethodLabel = "ยอดชำระเงินปลายทางทั้งหมด:";
            let slipStatusHtml = "";

            try {
                if (order.shipping_address && order.shipping_address.startsWith('{')) {
                    const meta = JSON.parse(order.shipping_address);
                    if (meta.payment_method === 'TRANSFER') {
                        paymentMethodLabel = "ยอดชำระผ่านธนาคารทั้งหมด:";
                        if (meta.slip) {
                            slipStatusHtml = `
                                <div style="font-size: 12px; color: #10b981; margin-top: 4px; font-weight: 600;">
                                    <i class="fa-solid fa-circle-check"></i> แนบหลักฐานการโอนเงินแล้ว
                                </div>
                            `;
                        } else {
                            slipStatusHtml = `
                                <div style="font-size: 12px; color: var(--danger); margin-top: 4px; font-weight: 600;">
                                    <i class="fa-solid fa-circle-xmark"></i> ยังไม่ได้แนบหลักฐานการโอนเงิน
                                </div>
                            `;
                        }
                    }
                }
            } catch (e) {
                console.error("Error parsing order shipping address:", e);
            }

            return `
                <div class="order-history-card">
                    <div class="order-header">
                        <div class="order-header-info">
                            <h4>รหัสออเดอร์: #${order.id.substring(0, 8)}...</h4>
                            <p><i class="fa-regular fa-calendar"></i> สั่งซื้อเมื่อ: ${date} น.</p>
                        </div>
                        <span class="order-status ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="order-items-list">
                        ${itemsHtml}
                    </div>
                    <div class="order-total-row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <span style="font-weight: 600;">${paymentMethodLabel}</span>
                            ${slipStatusHtml}
                        </div>
                        <span class="total-val" style="font-size: 18px; font-weight: 800; color: var(--primary);">฿${order.total.toLocaleString()}</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Failed to load orders history:", err);
        if (ordersContainer) {
            ordersContainer.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 40px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; margin-bottom: 12px;"></i>
                <p>เกิดข้อขัดข้องในการโหลดประวัติสั่งซื้อของคุณ กรุณาลองโหลดใหม่อีกครั้ง</p>
            </div>`;
        }
    }
}

// Image compression helper
function compressAvatarImage(file, maxWidth = 300, maxHeight = 300, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
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
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// Handle avatar file upload
async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        window.showToast("กรุณาเลือกไฟล์รูปภาพเท่านั้น!", "error");
        return;
    }

    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
        window.showToast("กรุณาเข้าสู่ระบบก่อนเปลี่ยนรูปโปรไฟล์", "error");
        return;
    }

    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl) {
        avatarEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i>`;
    }

    try {
        const compressedBase64 = await compressAvatarImage(file);

        const { error } = await window.supabase
            .from('profiles')
            .update({ avatar_url: compressedBase64 })
            .eq('id', session.user.id);

        if (error) throw error;

        window.showToast("อัปเดตรูปโปรไฟล์สำเร็จเรียบร้อยแล้ว!", "success");

        if (avatarEl) {
            avatarEl.innerHTML = `<img src="${compressedBase64}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" alt="Avatar">`;
        }

        // Refresh global header nav avatar
        if (typeof window.checkUserSession === 'function') {
            window.checkUserSession();
        }

    } catch (err) {
        console.error("Failed to upload profile avatar:", err);
        window.showToast(err.message || "ไม่สามารถอัปเดตรูปโปรไฟล์ได้", "error");
        loadUserProfileAndOrders();
    }
}

// Sidebar logout & avatar upload click handlers
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('ordersList')) {
        loadUserProfileAndOrders();
    }

    const avatarInput = document.getElementById('avatarFileInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarUpload);
    }

    const sidebarLogout = document.getElementById('profileLogoutBtn');
    if (sidebarLogout) {
        sidebarLogout.addEventListener('click', async () => {
            const { error } = await window.supabase.auth.signOut();
            if (error) {
                window.showToast("ออกจากระบบไม่สำเร็จ", "error");
            } else {
                window.showToast("ออกจากระบบเสร็จเรียบร้อยแล้ว!", "success");
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1000);
            }
        });
    }
});
