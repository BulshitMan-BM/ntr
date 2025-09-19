// ================================
// login-dashboard.js - Gabungan Script Lama + Baru
(function() {
    'use strict';

    // ======== CONFIG ========
    const WORKER_URL = "https://pemanis.bulshitman1.workers.dev/";

    // ======== STATE ========
    let isAuthenticated = false;
    let currentUser = null;
    let otpCountdown = 120;
    let countdownInterval = null;
    let resendCount = 0;
    let resendCountdownInterval = null;

    // ======== ELEMENTS ========
    const loginContainer = document.getElementById('loginContainer');
    const loginFormElement = document.getElementById('loginFormElement');
    const otpFormElement = document.getElementById('otpFormElement');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const nikInput = document.getElementById('nik');
    const otpInputs = document.querySelectorAll('.otp-input');
    const countdownElement = document.getElementById('countdown');
    const resendOtpButton = document.getElementById('resendOtp');
    const backToLoginButton = document.getElementById('backToLogin');

    const loginMessage = document.getElementById('loginMessage');
    const loginMessageIcon = document.getElementById('loginMessageIcon');
    const loginMessageText = document.getElementById('loginMessageText');
    const otpMessage = document.getElementById('otpMessage');
    const otpMessageIcon = document.getElementById('otpMessageIcon');
    const otpMessageText = document.getElementById('otpMessageText');

    // ======== LOGIN MANAGER ========
    const LoginManager = {

        init: function() {
            this.initDarkMode();
            this.bindEvents();
            this.checkExistingSession();
        },

        initDarkMode: function() {
            const isDark = localStorage.getItem('darkMode') === 'true';
            if (isDark) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        },

        bindEvents: function() {
            if (togglePassword) togglePassword.addEventListener('click', this.togglePasswordVisibility);
            if (nikInput) nikInput.addEventListener('input', this.formatNikInput);
            if (loginFormElement) loginFormElement.addEventListener('submit', this.handleLogin.bind(this));
            if (otpFormElement) otpFormElement.addEventListener('submit', this.handleOtpVerification.bind(this));
            this.bindOtpInputs();
            if (resendOtpButton) resendOtpButton.addEventListener('click', this.handleResendOtp.bind(this));
            if (backToLoginButton) backToLoginButton.addEventListener('click', this.showLoginForm.bind(this));
            if (document.getElementById('otpOverlay')) {
                document.getElementById('otpOverlay').addEventListener('click', (e) => {
                    if (e.target.id === 'otpOverlay') this.showLoginForm();
                });
            }
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !document.getElementById('otpOverlay').classList.contains('hidden')) {
                    this.showLoginForm();
                }
            });
        },

        togglePasswordVisibility: function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const icon = togglePassword.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        },

        formatNikInput: function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
        },

        bindOtpInputs: function() {
            otpInputs.forEach((input, index) => {
                input.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/\D/g, '');
                    if (e.target.value && index < otpInputs.length - 1) otpInputs[index + 1].focus();
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !e.target.value && index > 0) otpInputs[index - 1].focus();
                });
                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    paste.split('').forEach((char, i) => {
                        if (otpInputs[i]) otpInputs[i].value = char;
                    });
                });
            });
        },

        showLoginMessage: function(message, type='error') {
            if (!loginMessage) return;
            loginMessageText.textContent = message;
            loginMessage.classList.remove('hidden');
            loginMessage.className = 'border p-2 rounded flex items-center';
            loginMessageIcon.className = 'mr-3';
            if(type==='success') loginMessageIcon.classList.add('fas','fa-check-circle','text-green-600');
            else if(type==='info') loginMessageIcon.classList.add('fas','fa-info-circle','text-blue-600');
            else loginMessageIcon.classList.add('fas','fa-exclamation-circle','text-red-600');
        },

        hideLoginMessage: function() { if(loginMessage) loginMessage.classList.add('hidden'); },
        showOtpMessage: function(message,type='error'){ if(!otpMessage) return; otpMessageText.textContent=message; otpMessage.classList.remove('hidden'); },
        hideOtpMessage: function(){ if(otpMessage) otpMessage.classList.add('hidden'); },

        setSession: function(sessionId){ localStorage.setItem("sessionId", sessionId); },
        getSession: function(){ return localStorage.getItem("sessionId"); },
        clearSession: function(){ localStorage.removeItem("sessionId"); },

        handleLogin: async function(e){
            e.preventDefault();
            this.hideLoginMessage();
            const nik = nikInput.value.trim();
            const password = passwordInput.value.trim();
            if(!nik||!password){ this.showLoginMessage('NIK dan password harus diisi','error'); return;}
            if(nik.length!==16){ this.showLoginMessage('NIK harus 16 digit','error'); return;}
            this.showLoginLoading(true);
            try{
                const res = await fetch(WORKER_URL,{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'login', nik,password,deviceInfo:navigator.userAgent})});
                const data = await res.json();
                if(data.success && data.step==='otp'){
                    localStorage.setItem('pendingNik',nik);
                    resendCount=0;
                    this.showLoginMessage('OTP berhasil dikirim','success');
                    setTimeout(()=>this.showOtpForm(),1500);
                }else this.showLoginMessage(data.message||'Login gagal','error');
            }catch(err){ this.showLoginMessage('Terjadi kesalahan koneksi','error'); }
            finally{ this.showLoginLoading(false); }
        },

        showLoginLoading: function(loading){
            const button = document.getElementById('loginButton');
            const text = document.getElementById('loginButtonText');
            const spinner = document.getElementById('loginSpinner');
            if(!button) return;
            if(loading){ button.disabled=true; if(text) text.textContent='Memproses...'; if(spinner) spinner.style.display='inline-block'; }
            else{ button.disabled=false; if(text) text.textContent='Masuk'; if(spinner) spinner.style.display='none'; }
        },

        showOtpForm: function(){ 
            const overlay = document.getElementById('otpOverlay'); 
            if(!overlay) return;
            overlay.classList.remove('hidden'); 
            this.startCountdown(); this.startResendCountdown();
            if(otpInputs[0]) otpInputs[0].focus();
            this.hideLoginMessage();
        },

        showLoginForm: function(){ 
            const overlay = document.getElementById('otpOverlay'); 
            if(!overlay) return;
            overlay.classList.add('hidden'); 
            this.resetOtpForm(); this.stopCountdown(); this.stopResendCountdown(); this.hideOtpMessage(); 
        },

        handleOtpVerification: async function(e){
            e.preventDefault();
            this.hideOtpMessage();
            const otp = Array.from(otpInputs).map(i=>i.value).join('');
            if(otp.length!==6){ this.showOtpMessage('Masukkan 6 digit OTP','error'); return; }
            this.showVerifyLoading(true);
            try{
                const nik = localStorage.getItem('pendingNik');
                const res = await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'verify-otp',nik,otp,deviceInfo:navigator.userAgent})});
                const data = await res.json();
                if(data.success && data.user && data.user.sessionId){
                    this.setSession(data.user.sessionId);
                    currentUser=data.user;
                    isAuthenticated=true;
                    localStorage.removeItem('pendingNik');
                    this.showOtpMessage('Verifikasi berhasil','success');
                    setTimeout(()=>{
                        document.getElementById('otpOverlay').classList.add('hidden');
                        this.stopCountdown();
                        this.stopResendCountdown();
                        this.resetOtpForm();
                        this.hideOtpMessage();
                        window.dispatchEvent(new CustomEvent('loginSuccess',{detail:{user:currentUser}}));
                    },1500);
                }else{
                    this.showOtpMessage(data.message||'OTP salah','error');
                    otpInputs.forEach(i=>i.value=''); if(otpInputs[0]) otpInputs[0].focus();
                }
            }catch(err){ this.showOtpMessage('Terjadi kesalahan koneksi','error'); }
            finally{ this.showVerifyLoading(false); }
        },

        showVerifyLoading:function(loading){
            const btn=document.getElementById('verifyButton');
            const txt=document.getElementById('verifyButtonText');
            const spinner=document.getElementById('verifySpinner');
            const back=document.getElementById('backToLogin');
            if(!btn) return;
            if(loading){
                btn.disabled=true; if(back) back.disabled=true; if(txt) txt.textContent='Memverifikasi...'; if(spinner) spinner.style.display='inline-block';
                otpInputs.forEach(i=>{ i.disabled=true; i.classList.add('bg-gray-100','dark:bg-gray-600','cursor-not-allowed'); });
            }else{
                btn.disabled=false; if(back) back.disabled=false; if(txt) txt.textContent='Verifikasi'; if(spinner) spinner.style.display='none';
                otpInputs.forEach(i=>{ i.disabled=false; i.classList.remove('bg-gray-100','dark:bg-gray-600','cursor-not-allowed'); });
            }
        },

        startCountdown:function(){
            otpCountdown=120; this.updateCountdownDisplay();
            countdownInterval=setInterval(()=>{
                otpCountdown--; this.updateCountdownDisplay();
                if(otpCountdown<=0){ this.stopCountdown(); this.showOtpMessage('OTP kedaluwarsa','error'); }
            },1000);
        },
        stopCountdown:function(){ if(countdownInterval){ clearInterval(countdownInterval); countdownInterval=null; } },
        updateCountdownDisplay:function(){ if(countdownElement){ const m=Math.floor(otpCountdown/60); const s=otpCountdown%60; countdownElement.textContent=`${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`; } },

        startResendCountdown:function(){
            const durations=[60,600,1200,1800,3600]; const maxIndex=durations.length-1; const idx=Math.min(resendCount,maxIndex);
            let countdown=durations[idx]; if(resendOtpButton) resendOtpButton.disabled=true;
            if(resendCountdownInterval) clearInterval(resendCountdownInterval);
            resendCountdownInterval=setInterval(()=>{
                countdown--; this.updateResendCountdownDisplay(countdown);
                if(countdown<=0){ clearInterval(resendCountdownInterval); resendCountdownInterval=null; if(resendOtpButton) resendOtpButton.disabled=false; const t=document.getElementById('resendButtonText'); if(t) t.textContent='Kirim ulang'; }
            },1000);
        },
        stopResendCountdown:function(){ if(resendCountdownInterval){ clearInterval(resendCountdownInterval); resendCountdownInterval=null; } if(resendOtpButton) resendOtpButton.disabled=true; const t=document.getElementById('resendButtonText'); if(t) t.textContent='Kirim ulang'; },
        updateResendCountdownDisplay:function(c){ const t=document.getElementById('resendButtonText'); if(t && c>0){ const h=Math.floor(c/3600); const m=Math.floor((c%3600)/60); const s=c%60; t.textContent = h>0?`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`:`${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`; } },
        resetOtpForm:function(){ otpInputs.forEach(i=>i.value=''); },

        handleResendOtp: async function(){
            this.hideOtpMessage(); this.resetOtpForm();
            try{
                const nik = localStorage.getItem('pendingNik');
                const res = await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resend-otp',nik,deviceInfo:navigator.userAgent})});
                const data = await res.json();
                if(data.success){ resendCount++; this.showOtpMessage('OTP baru dikirim','success'); this.startCountdown(); this.startResendCountdown(); }
                else this.showOtpMessage(data.message||'Gagal kirim OTP','error');
            }catch(err){ this.showOtpMessage('Terjadi kesalahan koneksi','error'); }
        },

        validateSession: async function(){
            const sessionId=this.getSession();
            if(!sessionId) return false;
            try{
                const res=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json','x-session-id':sessionId},body:JSON.stringify({action:'validate-session'})});
                const data=await res.json();
                if(data.success && data.user){ currentUser=data.user; isAuthenticated=true; return true; }
                else { this.clearSession(); return false; }
            }catch(err){ this.clearSession(); return false; }
        },

        checkExistingSession: async function(){
            const valid = await this.validateSession();
            if(valid) window.dispatchEvent(new CustomEvent('loginSuccess',{detail:{user:currentUser}}));
            else if(nikInput) nikInput.focus();
        },

        logout: async function(){
            const sessionId=this.getSession();
            if(sessionId){
                try{ await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json','x-session-id':sessionId},body:JSON.stringify({action:'logout'})}); }catch(err){}
            }
            this.clearSession(); isAuthenticated=false; currentUser=null;
            if(loginFormElement) loginFormElement.reset();
            this.resetOtpForm(); this.stopCountdown(); this.stopResendCountdown(); this.hideLoginMessage(); this.hideOtpMessage();
            resendCount=0; localStorage.removeItem('pendingNik');
            window.dispatchEvent(new CustomEvent('logoutComplete'));
            setTimeout(()=>{ if(nikInput) nikInput.focus(); },100);
        }
    };

    // ======== UPDATE PROFILE UI ========
    function updateUserProfile(){
        const sidebarImg=document.getElementById('sidebarAvatar');
        const sidebarFallback=document.getElementById('sidebarProfileFallback');
        const headerFallback=document.getElementById('headerProfileFallback');
        const usernameElem=document.getElementById('userDisplayUsername');
        const roleElem=document.getElementById('userDisplayRole');

        if(currentUser){
            if(currentUser.ProfilAvatar){
                if(sidebarImg){ sidebarImg.src=`https://pemanis.bulshitman1.workers.dev/avatar?url=${encodeURIComponent(currentUser.ProfilAvatar)}`; sidebarImg.style.display='block'; }
                if(sidebarFallback) sidebarFallback.style.display='none';
                if(headerFallback) headerFallback.style.display='none';
            } else { if(sidebarImg) sidebarImg.style.display='none'; if(sidebarFallback) sidebarFallback.style.display='flex'; if(headerFallback) headerFallback.style.display='flex'; }
            if(usernameElem) usernameElem.textContent=currentUser.Username||'User';
            if(roleElem) roleElem.textContent=currentUser.Role||'';
        } else {
            if(sidebarImg) sidebarImg.style.display='none'; if(sidebarFallback) sidebarFallback.style.display='flex'; if(headerFallback) headerFallback.style.display='flex';
            if(usernameElem) usernameElem.textContent='User'; if(roleElem) roleElem.textContent='';
        }
    }

    window.addEventListener('loginSuccess',updateUserProfile);

    // ======== INIT ========
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>LoginManager.init());
    else LoginManager.init();

})();
