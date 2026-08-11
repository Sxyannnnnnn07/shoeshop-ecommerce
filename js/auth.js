document.addEventListener('DOMContentLoaded', () => {
    const loginTabBtn = document.getElementById('loginTabBtn');
    const signupTabBtn = document.getElementById('signupTabBtn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    // Toggle Tabs
    if (loginTabBtn && signupTabBtn) {
        loginTabBtn.addEventListener('click', () => {
            loginTabBtn.classList.add('active');
            signupTabBtn.classList.remove('active');
            loginForm.classList.add('active');
            signupForm.classList.remove('active');
        });

        signupTabBtn.addEventListener('click', () => {
            signupTabBtn.classList.add('active');
            loginTabBtn.classList.remove('active');
            signupForm.classList.add('active');
            loginForm.classList.remove('active');
        });
    }

    // Handle Login Form Submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังเข้าสู่ระบบ...';

            // ===== BYPASS: admin@test.com ล็อกอินโดยตรงโดยไม่ผ่าน Supabase =====
            if (email === 'admin@test.com') {
                window.setMockAdminSession();
                window.showToast("เข้าสู่ระบบแอดมินเรียบร้อยแล้ว!", "success");
                setTimeout(() => {
                    const params = new URLSearchParams(window.location.search);
                    const redirect = params.get('redirect');
                    window.location.href = redirect || "index.html";
                }, 1000);
                return;
            }
            // ===== END BYPASS =====

            try {
                const { data, error } = await window.supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                window.showToast("เข้าสู่ระบบเรียบร้อยแล้ว!", "success");
                
                // Redirect user after successful login
                setTimeout(() => {
                    const params = new URLSearchParams(window.location.search);
                    const redirect = params.get('redirect');
                    if (redirect) {
                        window.location.href = redirect;
                    } else {
                        window.location.href = "index.html";
                    }
                }, 1000);

            } catch (err) {
                console.error(err);
                window.showToast(err.message || "การเข้าสู่ระบบล้มเหลว กรุณาลองใหม่อีกครั้ง", "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> เข้าสู่ระบบ';
            }
        });
    }

    // Handle Signup Form Submit
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;

            if (password !== confirmPassword) {
                window.showToast("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน!", "error");
                return;
            }

            const submitBtn = signupForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสร้างบัญชีผู้ใช้...';

            try {
                const { data, error } = await window.supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name
                        }
                    }
                });

                if (error) throw error;

                if (data.session) {
                    window.showToast("สมัครสมาชิกสำเร็จ! ระบบกำลังนำเข้าใช้งาน...", "success");
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 1500);
                } else {
                    window.showToast("กรุณาตรวจสอบกล่องจดหมายอีเมลของคุณเพื่อยืนยันตัวตนก่อนเข้าใช้งาน!", "warning");
                    signupForm.reset();
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> ยืนยันการลงทะเบียน';
                }

            } catch (err) {
                console.error(err);
                window.showToast(err.message || "การลงทะเบียนบัญชีล้มเหลว กรุณาลองใหม่อีกครั้ง", "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> ยืนยันการลงทะเบียน';
            }
        });
    }

    // Google Sign-In Handler
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            try {
                // Dynamic redirect URL that works both in development (if HTTP) and production
                let redirectUrl = window.location.origin + window.location.pathname.replace('auth.html', 'index.html');
                
                // If opening via file:/// (Google OAuth doesn't support file:// protocol redirects)
                if (window.location.protocol === 'file:') {
                    window.showToast("Google Login ไม่รองรับการรันผ่านการดับเบิ้ลคลิกไฟล์ตรงๆ (file://) กรุณาทดสอบบนหน้าเว็บที่ออนไลน์บน Netlify แทนครับ!", "warning");
                    return;
                }

                const { error } = await window.supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: redirectUrl
                    }
                });

                if (error) throw error;

            } catch (err) {
                console.error(err);
                window.showToast("การเข้าสู่ระบบด้วย Google ขัดข้อง: " + err.message, "error");
            }
        });
    }
});
