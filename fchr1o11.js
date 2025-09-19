// login-dashboard.js - Full Login + OTP + Profile + Dropdown Management
(function() {
    'use strict';

    // =======================
    // CONFIGURATION
    // =======================
    const WORKER_URL = "https://pemanis.bulshitman1.workers.dev/";

    // =======================
    // STATE VARIABLES
    // =======================
    let isAuthenticated = false;
    let currentUser = null;
    let otpCountdown = 120;
    let countdownInterval = null;
    let resendCount = 0;
    let resendCountdownInterval = null;

    // =======================
    // ELEMENTS
    // =======================
    const loginForm = document.getElementById('loginFormElement');
    const otpForm = document.getElementById('otpFormElement');
    const otpOverlay = document.getElementById('otpOverlay');
    const nikInput = document.getElementById('nik');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const otpInputs = document.querySelectorAll('.otp-input');
    const countdownElem = document.getElementById('countdown');
    const resendBtn = document.getElementById('resendOtp');
    const loginMsg = document.getElementById('loginMessageText');
    const otpMsg = document.getElementById('otpMessageText');

    // Profile dropdown elements
    const profileToggle = document.getElementById('profileDropdownToggle');
    const profileMenu = document.getElementById('profileDropdownMenu');

    // Sidebar / header profile
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarFallback = document.getElementById('sidebarProfileFallback');
    const headerFallback = document.getElementById('headerProfileFallback');
    const usernameElem = document.getElementById('userDisplayUsername');
    const roleElem = document.getElementById('userDisplayRole');

    // =======================
    // UTILITY FUNCTIONS
    // =======================
    function showMessage(element, text, type='error') {
        if (!element) return;
        element.textContent = text;
        element.className = '';
        if(type==='success') element.classList.add('text-green-600');
        else if(type==='info') element.classList.add('text-blue-600');
        else element.classList.add('text-red-600');
    }

    function setSession(sessionId) { localStorage.setItem("sessionId", sessionId); }
    function getSession() { return localStorage.getItem("sessionId"); }
    function clearSession() { localStorage.removeItem("sessionId"); }

    function resetOtpInputs() {
        otpInputs.forEach(input => input.value='');
        if(otpInputs[0]) otpInputs[0].focus();
    }

    function startOtpCountdown() {
        otpCountdown = 120;
        updateCountdown();
        countdownInterval = setInterval(() => {
            otpCountdown--;
            updateCountdown();
            if(otpCountdown<=0){
                clearInterval(countdownInterval);
                showMessage(otpMsg,'Kode OTP telah kedaluwarsa. Silakan kirim ulang.','error');
            }
        },1000);
    }

    function stopOtpCountdown() {
        if(countdownInterval) clearInterval(countdownInterval);
    }

    function updateCountdown() {
        if(!countdownElem) return;
        const min = Math.floor(otpCountdown/60).toString().padStart(2,'0');
        const sec = (otpCountdown%60).toString().padStart(2,'0');
        countdownElem.textContent = `${min}:${sec}`;
    }

    function startResendCountdown() {
        const durations = [60, 600, 1200, 1800, 3600];
        let countdown = durations[Math.min(resendCount,durations.length-1)];
        resendBtn.disabled = true;
        resendCountdownInterval = setInterval(()=>{
            countdown--;
            if(resendBtn) resendBtn.textContent = `Kirim ulang (${countdown}s)`;
            if(countdown<=0){
                clearInterval(resendCountdownInterval);
                resendBtn.disabled = false;
                if(resendBtn) resendBtn.textContent = 'Kirim ulang';
            }
        },1000);
    }

    function stopResendCountdown() {
        if(resendCountdownInterval) clearInterval(resendCountdownInterval);
        if(resendBtn) { resendBtn.disabled=true; resendBtn.textContent='Kirim ulang'; }
    }

    function updateUserProfile() {
        if(!currentUser) {
            if(sidebarAvatar) sidebarAvatar.style.display='none';
            if(sidebarFallback) sidebarFallback.style.display='flex';
            if(headerFallback) headerFallback.style.display='flex';
            if(usernameElem) usernameElem.textContent='Guest';
            if(roleElem) roleElem.textContent='';
            return;
        }

        if(currentUser.ProfilAvatar) {
            if(sidebarAvatar){sidebarAvatar.src=currentUser.ProfilAvatar; sidebarAvatar.style.display='block';}
            if(sidebarFallback) sidebarFallback.style.display='none';
            if(headerFallback) headerFallback.style.display='none';
        } else {
            if(sidebarAvatar) sidebarAvatar.style.display='none';
            if(sidebarFallback) sidebarFallback.style.display='flex';
            if(headerFallback) headerFallback.style.display='flex';
        }

        if(usernameElem) usernameElem.textContent=currentUser.Username||'User';
        if(roleElem) roleElem.textContent=currentUser.Role||'';
    }

    function logout() {
        const sessionId = getSession();
        if(sessionId){
            fetch(WORKER_URL,{
                method:'POST',
                headers:{'Content-Type':'application/json','x-session-id':sessionId},
                body:JSON.stringify({action:'logout'})
            }).catch(()=>{});
        }
        clearSession();
        isAuthenticated=false;
        currentUser=null;
        if(loginForm) loginForm.reset();
        resetOtpInputs();
        stopOtpCountdown();
        stopResendCountdown();
        updateUserProfile();
        localStorage.removeItem('pendingNik');
        window.dispatchEvent(new CustomEvent('logoutComplete'));
        if(nikInput) nikInput.focus();
    }

    // =======================
    // EVENT HANDLERS
    // =======================
    function bindEvents() {
        // Toggle password
        if(togglePassword){
            togglePassword.addEventListener('click',()=>{
                const type = passwordInput.type==='password'?'text':'password';
                passwordInput.type=type;
                const icon = togglePassword.querySelector('i');
                if(icon){icon.classList.toggle('fa-eye'); icon.classList.toggle('fa-eye-slash');}
            });
        }

        // Login submit
        if(loginForm){
            loginForm.addEventListener('submit',async (e)=>{
                e.preventDefault();
                const nik = nikInput.value.trim();
                const password = passwordInput.value.trim();
                if(!nik||!password){ showMessage(loginMsg,'NIK & Password harus diisi','error'); return;}
                if(nik.length!==16){ showMessage(loginMsg,'NIK harus 16 digit','error'); return;}
                try{
                    const res = await fetch(WORKER_URL,{
                        method:'POST',
                        headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({action:'login',nik,password,deviceInfo:navigator.userAgent})
                    });
                    const data = await res.json();
                    if(data.success && data.step==='otp'){
                        localStorage.setItem('pendingNik',nik);
                        resendCount=0;
                        showMessage(loginMsg,'OTP berhasil dikirim','success');
                        setTimeout(()=>{ if(otpOverlay) otpOverlay.classList.remove('hidden'); startOtpCountdown(); startResendCountdown(); resetOtpInputs(); },1500);
                    } else showMessage(loginMsg,data.message||'Login gagal','error');
                }catch(e){ showMessage(loginMsg,'Terjadi kesalahan koneksi','error');}
            });
        }

        // OTP submit
        if(otpForm){
            otpForm.addEventListener('submit',async (e)=>{
                e.preventDefault();
                const otp = Array.from(otpInputs).map(i=>i.value).join('');
                if(otp.length!==6){ showMessage(otpMsg,'Masukkan 6 digit OTP','error'); return;}
                try{
                    const nik = localStorage.getItem('pendingNik');
                    const res = await fetch(WORKER_URL,{
                        method:'POST',
                        headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({action:'verify-otp',nik,otp,deviceInfo:navigator.userAgent})
                    });
                    const data = await res.json();
                    if(data.success && data.user && data.user.sessionId){
                        setSession(data.user.sessionId);
                        currentUser=data.user;
                        isAuthenticated=true;
                        localStorage.removeItem('pendingNik');
                        showMessage(otpMsg,'Login sukses!','success');
                        setTimeout(()=>{
                            if(otpOverlay) otpOverlay.classList.add('hidden');
                            stopOtpCountdown();
                            stopResendCountdown();
                            resetOtpInputs();
                            updateUserProfile();
                            window.dispatchEvent(new CustomEvent('loginSuccess',{detail:{user:currentUser}}));
                        },1500);
                    } else { showMessage(otpMsg,data.message||'OTP salah','error'); resetOtpInputs();}
                }catch(e){ showMessage(otpMsg,'Terjadi kesalahan koneksi','error');}
            });
        }

        // OTP input auto-focus & paste
        otpInputs.forEach((input,i)=>{
            input.addEventListener('input',e=>{
                e.target.value=e.target.value.replace(/\D/g,'');
                if(e.target.value && i<otpInputs.length-1) otpInputs[i+1].focus();
            });
            input.addEventListener('keydown',e=>{
                if(e.key==='Backspace' && !e.target.value && i>0) otpInputs[i-1].focus();
            });
            input.addEventListener('paste',e=>{
                e.preventDefault();
                const paste=e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
                paste.split('').forEach((c,j)=>{if(otpInputs[j]) otpInputs[j].value=c;});
            });
        });

        // Resend OTP
        if(resendBtn){
            resendBtn.addEventListener('click',async ()=>{
                try{
                    const nik = localStorage.getItem('pendingNik');
                    const res = await fetch(WORKER_URL,{
                        method:'POST',
                        headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({action:'resend-otp',nik,deviceInfo:navigator.userAgent})
                    });
                    const data = await res.json();
                    if(data.success){
                        resendCount++;
                        showMessage(otpMsg,'OTP baru dikirim','success');
                        startOtpCountdown();
                        startResendCountdown();
                        resetOtpInputs();
                    } else showMessage(otpMsg,data.message||'Gagal kirim OTP','error');
                }catch(e){ showMessage(otpMsg,'Terjadi kesalahan koneksi','error');}
            });
        }

        // Close OTP overlay with click outside or ESC
        if(otpOverlay){
            otpOverlay.addEventListener('click',(e)=>{if(e.target===otpOverlay){otpOverlay.classList.add('hidden'); resetOtpInputs(); stopOtpCountdown(); stopResendCountdown();}});
        }
        document.addEventListener('keydown',(e)=>{if(e.key==='Escape' && otpOverlay && !otpOverlay.classList.contains('hidden')){otpOverlay.classList.add('hidden'); resetOtpInputs(); stopOtpCountdown(); stopResendCountdown();}});
        
        // Profile dropdown toggle
        if(profileToggle && profileMenu){
            profileToggle.addEventListener('click',()=>{ profileMenu.classList.toggle('hidden'); });
        }
    }

    // =======================
    // SESSION VALIDATION
    // =======================
    async function validateSession(){
        const sessionId=getSession();
        if(!sessionId) return false;
        try{
            const res = await fetch(WORKER_URL,{
                method:'POST',
                headers:{'Content-Type':'application/json','x-session-id':sessionId},
                body:JSON.stringify({action:'validate-session'})
            });
            const data = await res.json();
            if(data.success && data.user){
                currentUser=data.user;
                isAuthenticated=true;
                updateUserProfile();
                return true;
            } else { clearSession(); return false; }
        }catch(e){ clearSession(); return false; }
    }

    // =======================
    // INITIALIZATION
    // =======================
    async function init(){
        bindEvents();
        const sessionValid = await validateSession();
        if(!sessionValid && nikInput) nikInput.focus();
    }

    if(document.readyState==='loading'){
        document.addEventListener('DOMContentLoaded', init);
    } else init();

    // Expose logout to global
    window.appLogout = logout;

})();
