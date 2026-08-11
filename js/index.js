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

// Fetch dynamic store statistics
async function loadShopStats() {
    const statProducts = document.getElementById('statProducts');
    const statCustomers = document.getElementById('statCustomers');
    const statRating = document.getElementById('statRating');
    if (!statProducts && !statCustomers && !statRating) return;

    try {
        // Fetch average rating dynamically from reviews
        const { data: reviewsData } = await window.supabase
            .from('reviews')
            .select('rating');
        
        let avgRating = 5.0;
        if (reviewsData && reviewsData.length > 0) {
            const totalRating = reviewsData.reduce((sum, r) => sum + r.rating, 0);
            avgRating = (totalRating / reviewsData.length).toFixed(1);
        }
        if (statRating) statRating.textContent = `${avgRating}★`;

        const { data, error } = await window.supabase.rpc('get_shop_stats');
        if (!error && data) {
            if (statProducts) statProducts.textContent = `${data.products_count || 0}`;
            if (statCustomers) statCustomers.textContent = `${data.profiles_count || 0}+`;
        } else {
            // Fallback: Query public products table count safely
            const { data: prodData, error: prodErr } = await window.supabase
                .from('products')
                .select('id');
            
            if (!prodErr && prodData && statProducts) {
                statProducts.textContent = `${prodData.length}`;
            }

            // Fallback for profiles (might return error/empty due to RLS, default to 3 if so)
            const { data: profData, error: profErr } = await window.supabase
                .from('profiles')
                .select('id');
            
            if (!profErr && profData && statCustomers) {
                statCustomers.textContent = `${profData.length}+`;
            } else if (statCustomers) {
                statCustomers.textContent = `3+`; // Default mock data if RLS restricts
            }
        }
    } catch (err) {
        console.error("Failed to load statistics:", err);
    }
}

window.quickAddCart = quickAddCart;

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProducts();
    loadShopStats();
    
    // Initialize reviews system
    checkAuthForReviews().then(() => {
        loadReviews();
        initStarRatingSelection();
    });

    document.getElementById('submitReviewForm')?.addEventListener('submit', handleReviewSubmit);
});

// ================= REVIEWS SYSTEM LOGIC =================

// Check auth state for review form and user info
async function checkAuthForReviews() {
    const authWrapper = document.getElementById('reviewFormAuthWrapper');
    const noAuthWrapper = document.getElementById('reviewFormNoAuthWrapper');
    if (!authWrapper || !noAuthWrapper) return;

    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            // Fetch profile for user name
            const { data: profile } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();
            
            currentUserProfile = profile;
            
            authWrapper.style.display = 'block';
            noAuthWrapper.style.display = 'none';
        } else {
            currentUser = null;
            currentUserProfile = null;
            authWrapper.style.display = 'none';
            noAuthWrapper.style.display = 'block';
        }
    } catch (err) {
        console.error("Auth check for reviews failed:", err);
    }
}

// Fetch and render reviews from Supabase
async function loadReviews() {
    const listContainer = document.getElementById('reviewsList');
    const avgEl = document.getElementById('reviewsAvg');
    if (!listContainer) return;

    try {
        const { data: reviews, error } = await window.supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (reviews.length === 0) {
            listContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-regular fa-comment-dots" style="font-size: 36px; margin-bottom: 12px;"></i>
                <p>ยังไม่มีการรีวิวสินค้าในขณะนี้ ร่วมเป็นคนแรกที่รีวิวกันเลย!</p>
            </div>`;
            if (avgEl) avgEl.textContent = '5.0★';
            return;
        }

        // Calculate average rating
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = (totalRating / reviews.length).toFixed(1);
        if (avgEl) avgEl.textContent = `${avgRating}★`;

        // Check if current user is admin to show delete buttons
        const isAdmin = currentUserProfile?.role === 'admin';

        listContainer.innerHTML = reviews.map(review => {
            const date = new Date(review.created_at).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            // Star HTML string
            const starsHtml = '<i class="fa-solid fa-star"></i>'.repeat(review.rating) + 
                              '<i class="fa-regular fa-star"></i>'.repeat(5 - review.rating);

            // Delete button for admins only
            const deleteBtnHtml = isAdmin
                ? `<button class="review-delete-btn" onclick="handleDeleteReview('${review.id}')" title="ลบความคิดเห็น">
                    <i class="fa-regular fa-trash-can"></i>
                   </button>`
                : '';

            // Generate avatar initials and hashed background color
            const initial = (review.user_name || '?').charAt(0).toUpperCase();
            const avatarColors = ['#ff7849', '#ff5a1f', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#f59e0b'];
            const charCodeSum = (review.user_name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            const bgColor = avatarColors[charCodeSum % avatarColors.length];

            return `
                <div class="review-card-item">
                    <div class="review-card-top">
                        <div class="review-user-info-wrapper">
                            <div class="review-avatar" style="background-color: ${bgColor};">
                                ${initial}
                            </div>
                            <div class="review-user-info">
                                <h5>${review.user_name}</h5>
                                <span class="review-product-tag">${review.product_name}</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="review-stars">
                                ${starsHtml}
                            </div>
                            ${deleteBtnHtml}
                        </div>
                    </div>
                    <p class="review-comment" style="margin-left: 62px; margin-top: 10px;">${review.comment}</p>
                    <div class="review-date">${date}</div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Failed to load reviews:", err);
        listContainer.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 40px;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; margin-bottom: 12px;"></i>
            <p>เกิดข้อผิดพลาดในการโหลดข้อมูลรีวิว</p>
        </div>`;
    }
}

// Handle star rating interactive selection
function initStarRatingSelection() {
    const stars = document.querySelectorAll('#starRatingSelect i');
    const input = document.getElementById('reviewRatingVal');
    if (stars.length === 0 || !input) return;

    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            const rating = parseInt(e.target.getAttribute('data-rating'));
            input.value = rating;
            
            // Set active class
            stars.forEach((s, idx) => {
                if (idx < rating) {
                    s.classList.add('active');
                    s.classList.replace('fa-regular', 'fa-solid');
                } else {
                    s.classList.remove('active');
                    s.classList.replace('fa-solid', 'fa-regular');
                }
            });
        });

        // Hover effect helper
        star.addEventListener('mouseover', (e) => {
            const rating = parseInt(e.target.getAttribute('data-rating'));
            stars.forEach((s, idx) => {
                if (idx < rating) {
                    s.style.color = 'var(--warning)';
                } else {
                    s.style.color = '#cbd5e1';
                }
            });
        });

        star.addEventListener('mouseout', () => {
            const rating = parseInt(input.value);
            stars.forEach((s, idx) => {
                if (idx < rating) {
                    s.style.color = '';
                } else {
                    s.style.color = '';
                }
            });
        });
    });
}

// Handle review form submit
async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!currentUser) {
        window.showToast("กรุณาเข้าสู่ระบบก่อนรีวิวสินค้า!", "error");
        return;
    }

    const rating = parseInt(document.getElementById('reviewRatingVal').value) || 5;
    const productName = document.getElementById('reviewProduct').value;
    const comment = document.getElementById('reviewComment').value.trim();

    if (!productName) {
        window.showToast("กรุณาเลือกรุ่นรองเท้าที่จะรีวิว!", "warning");
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่งรีวิว...';

    try {
        const userName = currentUserProfile?.full_name || currentUser.email.split('@')[0];
        
        const { error } = await window.supabase
            .from('reviews')
            .insert([{
                user_id: currentUser.id,
                user_name: userName,
                rating,
                product_name: productName,
                comment
            }]);

        if (error) throw error;

        window.showToast("ส่งความคิดเห็นของคุณสำเร็จแล้ว ขอบพระคุณครับ!", "success");
        
        // Reset form
        document.getElementById('reviewComment').value = '';
        document.getElementById('reviewProduct').value = '';
        document.getElementById('reviewRatingVal').value = '5';
        
        // Reset stars styling
        const stars = document.querySelectorAll('#starRatingSelect i');
        stars.forEach(s => {
            s.classList.add('active');
            s.classList.replace('fa-regular', 'fa-solid');
        });

        // Reload reviews
        await loadReviews();

    } catch (err) {
        console.error("Failed to submit review:", err);
        window.showToast(err.message || "ส่งรีวิวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ส่งความคิดเห็น';
    }
}

// Admin delete review handler
async function handleDeleteReview(reviewId) {
    if (!confirm("คุณต้องการลบความคิดเห็นนี้ออกใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;

    try {
        const { error } = await window.supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId);

        if (error) throw error;

        window.showToast("ลบความคิดเห็นเสร็จสิ้น!", "success");
        await loadReviews();

    } catch (err) {
        console.error("Failed to delete review:", err);
        window.showToast(err.message || "ไม่สามารถลบความคิดเห็นนี้ได้", "error");
    }
}

window.handleDeleteReview = handleDeleteReview;
