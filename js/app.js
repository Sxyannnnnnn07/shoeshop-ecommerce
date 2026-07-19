// Initialize Supabase Client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabaseClient; // Expose globally for other scripts

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
        badge.textContent = count;
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
