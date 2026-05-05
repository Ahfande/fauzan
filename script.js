// ========================
// KONFIGURASI SUPABASE
// ========================
(function loadSupabaseAndInit() {
    if (typeof supabase !== 'undefined' && supabase && supabase.createClient) {
        console.log('Supabase already loaded');
        initializeApp();
    } else {
        console.log('Loading Supabase library...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = function() {
            console.log('Supabase library loaded');
            setTimeout(initializeApp, 100);
        };
        script.onerror = function() {
            console.error('Failed to load Supabase library, running without Supabase');
            initializeWithoutSupabase();
        };
        document.head.appendChild(script);
    }
})();

function initializeApp() {
    if (typeof supabase === 'undefined' || !supabase.createClient) {
        console.error('Supabase not available');
        initializeWithoutSupabase();
        return;
    }
    
    window.SUPABASE_URL = 'https://aksgcswnohvvxnmmcqsi.supabase.co';
    window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrc2djc3dub2h2dnhubW1jcXNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTA2NDksImV4cCI6MjA5MjI2NjY0OX0.SPkDrNB71gGqVccM4j6m1MQKc5L_X1liYc_Fsp1a_AI';
    window.supabaseClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    
    console.log('Supabase client created');
    startFarmApp();
}

function initializeWithoutSupabase() {
    console.warn('Running without Supabase - using local storage only');
    window.supabaseClient = null;
    startFarmApp();
}

function startFarmApp() {
    console.log('Starting Smart Farm Application...');
    
    // ========================
    // ELEMEN DOM
    // ========================
    const suhuElement = document.getElementById('suhu-value');
    const kelembabanElement = document.getElementById('kelembaban-value');
    const umurDisplay = document.getElementById('umur-display');
    const umurInput = document.getElementById('umur-input');
    const setUmurBtn = document.getElementById('set-umur-btn');
    const umurFeedback = document.getElementById('umur-feedback');
    const timeElement = document.getElementById('current-time');
    
    // ========================
    // VARIABEL GLOBAL
    // ========================
    let suhu = 28;
    let kelembaban = 65;
    let umurAyam = 0;
    let currentMode = 'AUTO';
    let control1Status = false;
    let control2Status = false;
    let control3Status = false;
    let useSimulatedData = true;
    
    // ========================
    // FUNGSI UPDATE UMUR HARIAN
    // ========================
    function updateUmurHarian() {
        const today = new Date().toDateString();
        let lastUpdate = localStorage.getItem('lastUmurUpdate');
        
        if (!lastUpdate) {
            localStorage.setItem('lastUmurUpdate', today);
            return;
        }
        
        if (lastUpdate !== today) {
            umurAyam++;
            umurDisplay.textContent = umurAyam + ' Hari';
            umurInput.value = umurAyam;
            saveUmurAyam(umurAyam);
            
            umurFeedback.textContent = '📅 Umur ayam bertambah! Sekarang ' + umurAyam + ' hari';
            umurFeedback.style.color = '#D4AF37';
            setTimeout(() => resetFeedback(), 3000);
            localStorage.setItem('lastUmurUpdate', today);
            console.log('Umur ayam bertambah menjadi:', umurAyam, 'hari');
            
            if (umurAyam >= 60 && umurAyam < 61) {
                umurFeedback.textContent = '🎉 SELAMAT! Ayam sudah siap panen! 🎉';
                setTimeout(() => resetFeedback(), 5000);
            }
        }
    }
    
    // ========================
    // FUNGSI SUPABASE
    // ========================
    
    // TAMBAHKAN FUNGSI INI - SAVE MODE KE SUPABASE
    async function saveMode(mode) {
        if (!window.supabaseClient) {
            console.log('No Supabase, mode saved to localStorage only');
            return;
        }
        
        try {
            const { error } = await window.supabaseClient
                .from('system_config')
                .insert([{ 
                    mode: mode, 
                    updated_at: new Date().toISOString() 
                }]);
            
            if (error) {
                console.error('Error saving mode to Supabase:', error);
            } else {
                console.log('✅ Mode saved to Supabase:', mode);
            }
        } catch (error) {
            console.error('Error in saveMode:', error);
        }
    }
    
async function fetchSensorData() {
    if (!window.supabaseClient) {
        useSimulatedData = true;
        return false;
    }
    
    try {
        // Gunakan order by id DESC (lebih akurat)
        const { data, error } = await window.supabaseClient
            .from('sensors')
            .select('suhu, kelembaban, id, created_at')
            .order('id', { ascending: false })  // Ganti dari created_at ke id
            .limit(1);
        
        if (error) {
            console.error('Error fetching sensor:', error);
            useSimulatedData = true;
            return false;
        }
        
        if (data && data.length > 0) {
            suhu = data[0].suhu;
            kelembaban = data[0].kelembaban;
            updateSensorDisplay();
            useSimulatedData = false;
            console.log('✅ Sensor data loaded:', suhu, kelembaban, 'ID:', data[0].id);
            return true;
        } else {
            console.log('No sensor data found');
            useSimulatedData = true;
            return false;
        }
    } catch (error) {
        console.error('Error in fetchSensorData:', error);
        useSimulatedData = true;
        return false;
    }
}
    
    async function fetchUmurAyam() {
        if (!window.supabaseClient) {
            const saved = localStorage.getItem('umurAyam');
            if (saved) {
                umurAyam = parseInt(saved);
                umurDisplay.textContent = umurAyam + ' Hari';
                umurInput.value = umurAyam;
            }
            return;
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('farm_config')
                .select('umur_ayam')
                .order('updated_at', { ascending: false })
                .limit(1);
            
            if (!error && data && data.length > 0) {
                umurAyam = data[0].umur_ayam;
                umurDisplay.textContent = umurAyam + ' Hari';
                umurInput.value = umurAyam;
            }
        } catch (error) {
            console.error('Error fetching umur:', error);
        }
    }
    
    async function fetchControlStatus() {
        if (!window.supabaseClient) {
            const c1 = localStorage.getItem('control1Status');
            const c2 = localStorage.getItem('control2Status');
            const c3 = localStorage.getItem('control3Status');
            if (c1 !== null) control1Status = c1 === 'true';
            if (c2 !== null) control2Status = c2 === 'true';
            if (c3 !== null) control3Status = c3 === 'true';
            updateControlUI();
            return;
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('control_status')
                .select('control1, control2, control3')
                .order('updated_at', { ascending: false })
                .limit(1);
            
            if (!error && data && data.length > 0) {
                control1Status = data[0].control1;
                control2Status = data[0].control2;
                control3Status = data[0].control3;
                updateControlUI();
            }
        } catch (error) {
            console.error('Error fetching control:', error);
        }
    }
    
    async function saveUmurAyam(umur) {
        if (!window.supabaseClient) {
            localStorage.setItem('umurAyam', umur);
            return;
        }
        
        try {
            await window.supabaseClient
                .from('farm_config')
                .insert([{ umur_ayam: umur, updated_at: new Date().toISOString() }]);
        } catch (error) {
            console.error('Error saving umur:', error);
            localStorage.setItem('umurAyam', umur);
        }
    }
    
    async function saveControlStatus() {
        if (!window.supabaseClient) {
            localStorage.setItem('control1Status', control1Status);
            localStorage.setItem('control2Status', control2Status);
            localStorage.setItem('control3Status', control3Status);
            return;
        }
        
        try {
            await window.supabaseClient
                .from('control_status')
                .insert([{ 
                    control1: control1Status, 
                    control2: control2Status, 
                    control3: control3Status,
                    updated_at: new Date().toISOString()
                }]);
            console.log('Control saved:', {control1Status, control2Status, control3Status});
        } catch (error) {
            console.error('Error saving control:', error);
            localStorage.setItem('control1Status', control1Status);
            localStorage.setItem('control2Status', control2Status);
            localStorage.setItem('control3Status', control3Status);
        }
    }
    
    // ========================
    // FUNGSI AUTO CONTROL (LOGIKA ONLY DI WEB)
    // ========================
function autoControl() {
    if (currentMode !== 'AUTO') return;
    if (useSimulatedData) return;
    
    console.log('═══════════════════════════════════════════════════');
    console.log('🤖 AUTO CONTROL TRIGGERED');
    console.log(`📊 INPUT: Umur=${umurAyam} hari, Suhu=${suhu}°C, Kelembaban=${kelembaban}%`);
    console.log('═══════════════════════════════════════════════════');
    
    // STEP 1: Tentukan batas suhu berdasarkan umur
    let batasDingin, batasPanas;
    if (umurAyam <= 7) {
        batasDingin = 28;
        batasPanas = 33;
        console.log(`📌 KELOMPOK UMUR: 1-7 hari (batas dingin=${batasDingin}°C, batas panas=${batasPanas}°C)`);
    } else if (umurAyam <= 14) {
        batasDingin = 26;
        batasPanas = 30;
        console.log(`📌 KELOMPOK UMUR: 8-14 hari (batas dingin=${batasDingin}°C, batas panas=${batasPanas}°C)`);
    } else {
        batasDingin = 22;
        batasPanas = 27;
        console.log(`📌 KELOMPOK UMUR: 15-35 hari (batas dingin=${batasDingin}°C, batas panas=${batasPanas}°C)`);
    }
    
    // STEP 2: Tentukan kategori suhu
    let kategoriSuhu;
    if (suhu < batasDingin) {
        kategoriSuhu = 'DINGIN';
        console.log(`🌡️ KATEGORI SUHU: DINGIN (${suhu}°C < ${batasDingin}°C)`);
    } else if (suhu > batasPanas) {
        kategoriSuhu = 'PANAS';
        console.log(`🌡️ KATEGORI SUHU: PANAS (${suhu}°C > ${batasPanas}°C)`);
    } else {
        kategoriSuhu = 'NORMAL';
        console.log(`🌡️ KATEGORI SUHU: NORMAL (${batasDingin}°C ≤ ${suhu}°C ≤ ${batasPanas}°C)`);
    }
    
    // STEP 3: Tentukan kategori kelembaban
    let kategoriLembab;
    if (kelembaban < 50) {
        kategoriLembab = 'KERING';
        console.log(`💧 KATEGORI KELEMBABAN: KERING (${kelembaban}% < 50%)`);
    } else if (kelembaban > 70) {
        kategoriLembab = 'BASAH';
        console.log(`💧 KATEGORI KELEMBABAN: BASAH (${kelembaban}% > 70%)`);
    } else {
        kategoriLembab = 'IDEAL';
        console.log(`💧 KATEGORI KELEMBABAN: IDEAL (50% ≤ ${kelembaban}% ≤ 70%)`);
    }
    
    // STEP 4: Tentukan output berdasarkan tabel logika
    let newControl1 = false; // Lampu
    let newControl2 = false; // Kipas
    let newControl3 = false; // Pompa
    
    let alasan = '';
    
    if (kategoriSuhu === 'DINGIN') {
        newControl1 = true;  // Lampu ON untuk semua kondisi dingin
        alasan = 'Suhu terlalu dingin, menghangatkan kandang';
        
        if (kategoriLembab === 'KERING') {
            newControl2 = false;
            newControl3 = true;
            alasan += ' + kelembaban kering, menyalakan pompa untuk pelembaban';
        } else if (kategoriLembab === 'IDEAL') {
            newControl2 = false;
            newControl3 = false;
            alasan += ' + kelembaban ideal, hanya pemanas yang aktif';
        } else { // BASAH
            newControl2 = true;
            newControl3 = false;
            alasan += ' + kelembaban basah, menyalakan kipas untuk sirkulasi udara';
        }
    } 
    else if (kategoriSuhu === 'NORMAL') {
        newControl1 = false;
        alasan = 'Suhu normal';
        
        if (kategoriLembab === 'KERING') {
            newControl2 = false;
            newControl3 = true;
            alasan += ' tetapi kelembaban kering → menyalakan pompa untuk pelembaban';
        } else if (kategoriLembab === 'IDEAL') {
            newControl2 = false;
            newControl3 = false;
            alasan += ' dan kelembaban ideal → semua aktuator mati (KONDISI IDEAL)';
        } else { // BASAH
            newControl2 = true;
            newControl3 = false;
            alasan += ' tetapi kelembaban basah → menyalakan kipas untuk sirkulasi';
        }
    } 
    else { // PANAS
        newControl1 = false;
        newControl2 = true;
        alasan = 'Suhu terlalu panas, menyalakan kipas untuk pendinginan';
        
        if (kategoriLembab === 'KERING') {
            newControl3 = true;
            alasan += ' + kelembaban kering, menyalakan pompa untuk misting (pendinginan evaporatif)';
        } else {
            newControl3 = false;
            alasan += ' + kelembaban cukup, hanya kipas yang aktif';
        }
    }
    
    console.log(`🧠 KEPUTUSAN: ${alasan}`);
    console.log(`📤 OUTPUT: Lampu=${newControl1 ? '🟢 ON' : '⚫ OFF'}, Kipas=${newControl2 ? '🟢 ON' : '⚫ OFF'}, Pompa=${newControl3 ? '🟢 ON' : '⚫ OFF'}`);
    
    // STEP 5: Update status jika ada perubahan
    if (control1Status !== newControl1 || control2Status !== newControl2 || control3Status !== newControl3) {
        control1Status = newControl1;
        control2Status = newControl2;
        control3Status = newControl3;
        updateControlUI();
        saveControlStatus();
        console.log('✅ STATUS UPDATED: Perubahan disimpan');
    } else {
        console.log('⏸️ TIDAK ADA PERUBAHAN: Status masih sama seperti sebelumnya');
    }
    
    console.log('═══════════════════════════════════════════════════\n');
}
    
    function updateControlUI() {
        const toggles = document.querySelectorAll('.toggle-switch input');
        const statusDivs = document.querySelectorAll('.control-status');
        
        toggles.forEach((toggle, index) => {
            if (toggle) {
                if (index === 0) toggle.checked = control1Status;
                if (index === 1) toggle.checked = control2Status;
                if (index === 2) toggle.checked = control3Status;
            }
        });
        
        statusDivs.forEach((status, index) => {
            if (status) {
                let isActive = false;
                if (index === 0) isActive = control1Status;
                if (index === 1) isActive = control2Status;
                if (index === 2) isActive = control3Status;
                
                status.textContent = isActive ? 'AKTIF' : 'NONAKTIF';
                if (isActive) status.classList.add('active');
                else status.classList.remove('active');
            }
        });
    }
    
    function updateSensorDisplay() {
        if (suhuElement) {
            if (useSimulatedData || (suhu === 0 && kelembaban === 0)) {
                suhuElement.textContent = '--°C';
            } else {
                suhuElement.textContent = Math.round(suhu) + '°C';
            }
        }
        
        if (kelembabanElement) {
            if (useSimulatedData || (suhu === 0 && kelembaban === 0)) {
                kelembabanElement.textContent = '--%';
            } else {
                kelembabanElement.textContent = Math.round(kelembaban) + '%';
            }
        }
    }
    
    async function refreshSensorData() {
        await fetchSensorData();
        if (currentMode === 'AUTO' && !useSimulatedData) {
            autoControl();
        }
    }
    
    // ========================
    // FUNGSI UMUR AYAM
    // ========================
    function setUmurAyam() {
        let nilaiUmur = parseInt(umurInput.value);
        
        if (isNaN(nilaiUmur)) {
            umurFeedback.textContent = '❌ Masukkan angka yang valid!';
            setTimeout(() => resetFeedback(), 2000);
            return;
        }
        
        if (nilaiUmur < 0 || nilaiUmur > 100) {
            umurFeedback.textContent = nilaiUmur < 0 ? '⚠️ Umur tidak boleh negatif!' : '⚠️ Maksimal umur 100 hari!';
            setTimeout(() => resetFeedback(), 2000);
            return;
        }
        
        umurAyam = nilaiUmur;
        umurDisplay.textContent = umurAyam + ' Hari';
        umurInput.value = umurAyam;
        saveUmurAyam(umurAyam);
        localStorage.setItem('lastUmurUpdate', new Date().toDateString());
        
        umurFeedback.textContent = '✅ Umur ayam berhasil diupdate!';
        
        if (umurAyam === 0) {
            umurFeedback.textContent = '🐣 Ayam baru lahir! Selamat memelihara!';
        } else if (umurAyam >= 60) {
            umurFeedback.textContent = '🎉 Ayam siap panen! Umur sudah ' + umurAyam + ' hari';
        } else if (umurAyam >= 30) {
            umurFeedback.textContent = '📈 Ayam dalam masa pertumbuhan optimal';
        }
        
        setTimeout(() => resetFeedback(), 2500);
    }
    
    function resetFeedback() {
        umurFeedback.textContent = 'Masukkan umur ayam dalam hari';
        umurFeedback.style.color = '#D4AF37';
    }
    
    // ========================
    // FUNGSI MODE (AUTO/MANUAL) - DIPERBAIKI DENGAN SAVE MODE
    // ========================
    function switchMode(mode) {
        currentMode = mode;
        console.log('🔄 Switching to mode:', mode);
        
        const toggles = document.querySelectorAll('.toggle-switch input');
        
        if (mode === 'AUTO') {
            // Nonaktifkan semua toggle
            toggles.forEach(toggle => {
                if (toggle) toggle.disabled = true;
            });
            // Jalankan auto control
            if (!useSimulatedData) {
                autoControl();
            }
        } else {
            // Aktifkan semua toggle untuk manual
            toggles.forEach(toggle => {
                if (toggle) toggle.disabled = false;
            });
        }
        
        // Update UI mode buttons
        const modeBtns = document.querySelectorAll('.btn-mode');
        modeBtns.forEach(btn => {
            if (btn && btn.textContent.trim() === mode) {
                btn.classList.add('active');
            } else if (btn) {
                btn.classList.remove('active');
            }
        });
        
        // Simpan mode ke localStorage
        localStorage.setItem('currentMode', mode);
        
        // *** INI YANG PENTING: SIMPAN MODE KE SUPABASE ***
        saveMode(mode);
    }
    
    // ========================
    // SETUP MANUAL TOGGLES
    // ========================
    function setupManualToggles() {
        const toggles = document.querySelectorAll('.toggle-switch input');
        
        toggles.forEach((toggle, index) => {
            // Hapus event listener lama dengan clone
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            newToggle.addEventListener('change', function(e) {
                console.log(`Toggle ${index + 1} clicked, current mode:`, currentMode);
                
                if (currentMode === 'MANUAL') {
                    // Update status
                    if (index === 0) control1Status = this.checked;
                    if (index === 1) control2Status = this.checked;
                    if (index === 2) control3Status = this.checked;
                    
                    // Update UI
                    const statusDivs = document.querySelectorAll('.control-status');
                    if (statusDivs[index]) {
                        statusDivs[index].textContent = this.checked ? 'AKTIF' : 'NONAKTIF';
                        if (this.checked) statusDivs[index].classList.add('active');
                        else statusDivs[index].classList.remove('active');
                    }
                    
                    // Simpan ke database
                    saveControlStatus();
                    console.log(`✅ Control ${index + 1} set to:`, this.checked ? 'AKTIF' : 'NONAKTIF');
                } else {
                    // Di mode AUTO, revert ke nilai sebelumnya
                    if (index === 0) this.checked = control1Status;
                    if (index === 1) this.checked = control2Status;
                    if (index === 2) this.checked = control3Status;
                    
                    // Tampilkan peringatan
                    const controlItem = this.closest('.control-item');
                    const warning = document.createElement('div');
                    warning.textContent = '⚠️ Ganti ke MODE MANUAL dulu!';
                    warning.style.color = '#D4AF37';
                    warning.style.fontSize = '11px';
                    warning.style.marginTop = '5px';
                    warning.style.backgroundColor = 'rgba(0,0,0,0.5)';
                    warning.style.padding = '2px 5px';
                    warning.style.borderRadius = '5px';
                    controlItem.appendChild(warning);
                    setTimeout(() => warning.remove(), 1500);
                }
            });
            
            // Update reference
            toggles[index] = newToggle;
        });
    }
    
    function updateTime() {
        const now = new Date();
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('id-ID');
        }
    }
    
    function createBubbles() {
        const bubbleContainer = document.querySelector('.bubble-container');
        if (!bubbleContainer) return;
        
        for (let i = 0; i < 30; i++) {
            const bubble = document.createElement('div');
            bubble.classList.add('bubble');
            const size = Math.random() * 60 + 10;
            bubble.style.width = size + 'px';
            bubble.style.height = size + 'px';
            bubble.style.left = Math.random() * 100 + '%';
            bubble.style.animationDuration = Math.random() * 15 + 8 + 's';
            bubble.style.animationDelay = Math.random() * 10 + 's';
            bubble.style.setProperty('--x-move', (Math.random() - 0.5) * 2);
            bubbleContainer.appendChild(bubble);
        }
    }
    
    // ========================
    // INISIALISASI
    // ========================
    async function init() {
        // Ambil data dari Supabase
        await fetchSensorData();
        await fetchUmurAyam();
        await fetchControlStatus();
        
        // Setup manual toggles
        setupManualToggles();
        
        // Setup mode buttons
        const modeBtns = document.querySelectorAll('.btn-mode');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const mode = this.textContent.trim();
                switchMode(mode);
            });
        });
        
        // Load saved mode dari localStorage
        const savedMode = localStorage.getItem('currentMode');
        if (savedMode && (savedMode === 'AUTO' || savedMode === 'MANUAL')) {
            switchMode(savedMode);
        } else {
            switchMode('AUTO');
        }
        
        // Setup umur ayam
        if (setUmurBtn) setUmurBtn.addEventListener('click', setUmurAyam);
        if (umurInput) {
            umurInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') setUmurAyam();
            });
        }
        
        // Interval untuk update
        setInterval(updateUmurHarian, 60000);
        updateUmurHarian();
        setInterval(refreshSensorData, 3000);
        setInterval(updateTime, 1000);
        updateTime();
        createBubbles();
        
        console.log('✅ Smart Farm Ready! Mode:', currentMode);
        console.log('💡 Tips: Klik MANUAL dulu baru bisa kontrol manual');
    }
    
    init();
}