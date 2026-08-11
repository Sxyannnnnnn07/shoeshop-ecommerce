// Initialize Supabase Client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabaseClient; // Expose globally for other scripts

// ================= MOCK ADMIN SESSION HELPER =================
// เนื่องจากฐานข้อมูล Supabase มีปัญหา "Database error querying schema"
// ใช้ localStorage เก็บ session จำลองสำหรับ admin เพื่อให้สามารถเข้าใช้งานได้
const MOCK_ADMIN_KEY = 'mock_admin_session';

function setMockAdminSession() {
    const fakeSession = {
        user: {
            id: "00000000-0000-0000-0000-000000000000",
            email: "admin@test.com",
            user_metadata: { full_name: "แอดมินระบบ" }
        },
        access_token: "mock-admin-token"
    };
    localStorage.setItem(MOCK_ADMIN_KEY, JSON.stringify(fakeSession));
    return fakeSession;
}

function getMockAdminSession() {
    const stored = localStorage.getItem(MOCK_ADMIN_KEY);
    return stored ? JSON.parse(stored) : null;
}

function clearMockAdminSession() {
    localStorage.removeItem(MOCK_ADMIN_KEY);
}

function isMockAdminActive() {
    return !!localStorage.getItem(MOCK_ADMIN_KEY);
}

window.setMockAdminSession = setMockAdminSession;
window.getMockAdminSession = getMockAdminSession;
window.clearMockAdminSession = clearMockAdminSession;
window.isMockAdminActive = isMockAdminActive;

// ================= TOAST NOTIFICATION HELPER =================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Choose icon based on type
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';
    if (type === 'warning') icon = 'fa-circle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3.5s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}
window.showToast = showToast; // Expose globally

// ================= CART STATE MANAGEMENT =================
function getCart() {
    return JSON.parse(localStorage.getItem('shoeshop_cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('shoeshop_cart', JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const badge = document.getElementById('cartCount');
    if (badge) {
        const oldCount = parseInt(badge.textContent) || 0;
        badge.textContent = count;
        
        if (count > oldCount) {
            const cartBtn = document.querySelector('.cart-btn');
            if (cartBtn) {
                cartBtn.classList.remove('wiggle');
                void cartBtn.offsetWidth; // Force DOM reflow to restart keyframe animation
                cartBtn.classList.add('wiggle');
                
                setTimeout(() => {
                    cartBtn.classList.remove('wiggle');
                }, 600);
            }
        }
    }
}

function addToCart(product, size, color, quantity) {
    let cart = getCart();
    const existingIndex = cart.findIndex(item => 
        item.id === product.id && 
        item.selectedSize === size && 
        item.selectedColor === color
    );

    if (existingIndex > -1) {
        // Check stock boundary
        if (cart[existingIndex].quantity + quantity > product.stock) {
            showToast(`ไม่สามารถใส่ของเพิ่มได้ สต็อกสินค้าคงเหลือจริงคือ ${product.stock} ชิ้น`, 'error');
            return false;
        }
        cart[existingIndex].quantity += quantity;
    } else {
        if (quantity > product.stock) {
            showToast(`ไม่สามารถใส่ของเพิ่มได้ สต็อกสินค้าคงเหลือจริงคือ ${product.stock} ชิ้น`, 'error');
            return false;
        }
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            selectedSize: size,
            selectedColor: color,
            quantity: quantity,
            stock: product.stock
        });
    }

    saveCart(cart);
    showToast(`เพิ่มรองเท้า ${product.name} (ไซส์ ${size}) ลงตะกร้าแล้ว!`, 'success');
    return true;
}

window.getCart = getCart;
window.saveCart = saveCart;
window.addToCart = addToCart;
window.updateCartBadge = updateCartBadge;

// ================= USER STATE MANAGEMENT =================
let currentUser = null;
let currentUserProfile = null;

async function checkUserSession() {
    // ===== BYPASS: ตรวจสอบ mock admin session ก่อน =====
    const mockSession = window.getMockAdminSession();
    if (mockSession) {
        currentUser = mockSession.user;
        currentUserProfile = { role: 'admin', full_name: 'แอดมินระบบ', email: 'admin@test.com' };
        updateHeaderNav(currentUser, currentUserProfile);
        return;
    }
    // ===== END BYPASS =====

    const { data: { session }, error } = await window.supabase.auth.getSession();
    if (error) {
        console.error("Session check error:", error);
        return;
    }
    
    if (session) {
        currentUser = session.user;
        // Fetch public profile to get user role
        const { data: profile, error: profileError } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (!profileError && profile) {
            currentUserProfile = profile;
            updateHeaderNav(currentUser, profile);
        } else {
            console.error("Profile fetch error:", profileError);
            updateHeaderNav(currentUser, null);
        }
    } else {
        currentUser = null;
        currentUserProfile = null;
        updateHeaderNav(null, null);
    }
}

function updateHeaderNav(user, profile) {
    const profileBtn = document.getElementById('userProfileBtn');
    const userEmailText = document.getElementById('navUserEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminMenu = document.querySelectorAll('.admin-only');

    if (user) {
        if (profileBtn) {
            profileBtn.href = "profile.html";
            profileBtn.innerHTML = `<i class="fa-solid fa-user"></i>`;
            profileBtn.title = "ประวัติส่วนตัว";
        }
        if (userEmailText) {
            userEmailText.textContent = profile?.full_name || user.email;
            userEmailText.style.display = 'inline';
        }
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
        }
        
        // Show admin menu item if role is admin
        if (profile && profile.role === 'admin') {
            adminMenu.forEach(el => el.style.display = 'block');
        } else {
            adminMenu.forEach(el => el.style.display = 'none');
        }
    } else {
        if (profileBtn) {
            profileBtn.href = "auth.html";
            profileBtn.innerHTML = `<i class="fa-regular fa-user"></i>`;
            profileBtn.title = "เข้าสู่ระบบ";
        }
        if (userEmailText) {
            userEmailText.textContent = '';
            userEmailText.style.display = 'none';
        }
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }
        adminMenu.forEach(el => el.style.display = 'none');
    }
}

// Log out handler
async function handleLogout() {
    // ===== BYPASS: ล้าง mock admin session =====
    if (window.isMockAdminActive()) {
        window.clearMockAdminSession();
        showToast("ออกจากระบบเสร็จสมบูรณ์แล้ว", "success");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);
        return;
    }
    // ===== END BYPASS =====

    const { error } = await window.supabase.auth.signOut();
    if (error) {
        showToast("เกิดข้อผิดพลาดในการออกจากระบบ", "error");
    } else {
        showToast("ออกจากระบบเสร็จสมบูรณ์แล้ว", "success");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);
    }
}

// Mobile navigation toggle
function initMobileMenu() {
    const toggleBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.querySelector('.nav-links');
    if (toggleBtn && navLinks) {
        toggleBtn.addEventListener('click', () => {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '80px';
            navLinks.style.left = '0';
            navLinks.style.width = '100%';
            navLinks.style.backgroundColor = 'white';
            navLinks.style.borderBottom = '1px solid var(--border)';
            navLinks.style.padding = '20px';
            navLinks.style.zIndex = '999';
        });
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    checkUserSession();
    initMobileMenu();
    
    // Initialize premium animations and tools
    initBackToTop();
    initScrollAnimations();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Subscribe to auth state updates
    window.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            checkUserSession();
        } else if (event === 'SIGNED_OUT') {
            updateHeaderNav(null, null);
        }
    });
});

// ================= BACK TO TOP BUTTON =================
function initBackToTop() {
    const btn = document.createElement('div');
    btn.id = 'backToTop';
    btn.className = 'back-to-top';
    btn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ================= SCROLL ENTRANCE ANIMATIONS =================
function initScrollAnimations() {
    // Select sections and cards to fade in
    const selector = 'section, .product-card, .feature-card, .category-card, .promo-content, .reviews-list-container, .reviews-form-container';
    const elements = document.querySelectorAll(selector);

    if (elements.length === 0) return;

    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    elements.forEach(el => {
        el.classList.add('fade-up-element');
        observer.observe(el);
    });
}
