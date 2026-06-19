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
    const suhuElement = document.getElementById('suhu-value');
    const kelembabanElement = document.getElementById('kelembaban-value');
    const umurDisplay = document.getElementById('umur-display');
    const umurInput = document.getElementById('umur-input');
    const setUmurBtn = document.getElementById('set-umur-btn');
    const umurFeedback = document.getElementById('umur-feedback');
    const timeElement = document.getElementById('current-time');
    
    // ========================
    // VARIABEL GRAFIK
    // ========================
    let suhuChart, kelembabanChart;
    let suhuDataPoints = [];     
    let kelembabanDataPoints = []; 
    let waktuDataPoints = [];    
    let lastSensorId = null;
    let sensorTimestamp = null; 
    const MAX_DATA_POINTS = 20;   
    
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
    // GRAFIK
    // ========================
    function initCharts() {
        const ctxSuhu = document.getElementById('suhuChart').getContext('2d');
        const ctxKelembaban = document.getElementById('kelembabanChart').getContext('2d');
        
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        if (suhuDataPoints.length === 0) {
            suhuDataPoints = [28];
            kelembabanDataPoints = [65];
            waktuDataPoints = [timeLabel];
        }
        
        suhuChart = new Chart(ctxSuhu, {
            type: 'line',
            data: {
                labels: waktuDataPoints,
                datasets: [{
                    label: 'Suhu (℃)',
                    data: suhuDataPoints,
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#D4AF37',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { labels: { color: '#f6f8f7', font: { size: 11 } } },
                    tooltip: { backgroundColor: 'rgba(26, 48, 38, 0.95)', titleColor: '#D4AF37', bodyColor: '#f6f8f7', borderColor: '#D4AF37', borderWidth: 1 }
                },
                scales: {
                    y: { beginAtZero: false, min: 15, max: 45, grid: { color: 'rgba(212, 175, 55, 0.1)' }, title: { display: true, text: 'Temperature (℃)', color: '#D4AF37', font: { size: 10 } }, ticks: { color: '#f6f8f7' } },
                    x: { grid: { color: 'rgba(212, 175, 55, 0.05)' }, ticks: { color: '#f6f8f7', maxRotation: 45, minRotation: 45, font: { size: 9 } } }
                }
            }
        });
        
        kelembabanChart = new Chart(ctxKelembaban, {
            type: 'line',
            data: {
                labels: waktuDataPoints,
                datasets: [{
                    label: 'Kelembaban (%)',
                    data: kelembabanDataPoints,
                    borderColor: '#4A90D9',
                    backgroundColor: 'rgba(74, 144, 217, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#4A90D9',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { labels: { color: '#f6f8f7', font: { size: 11 } } },
                    tooltip: { backgroundColor: 'rgba(26, 48, 38, 0.95)', titleColor: '#4A90D9', bodyColor: '#f6f8f7', borderColor: '#4A90D9', borderWidth: 1 }
                },
                scales: {
                    y: { beginAtZero: false, min: 0, max: 100, grid: { color: 'rgba(74, 144, 217, 0.1)' }, title: { display: true, text: 'Kelembaban (%)', color: '#4A90D9', font: { size: 10 } }, ticks: { color: '#f6f8f7' } },
                    x: { grid: { color: 'rgba(212, 175, 55, 0.05)' }, ticks: { color: '#f6f8f7', maxRotation: 45, minRotation: 45, font: { size: 9 } } }
                }
            }
        });
    }
    
    function addChartDataPoint(nilaiSuhu, nilaiKelembaban, timestamp) {
        if (!suhuChart || !kelembabanChart) return;
        
        let timeLabel;
        if (timestamp) {
            const date = new Date(timestamp);
            timeLabel = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else {
            const now = new Date();
            timeLabel = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        
        suhuDataPoints.push(nilaiSuhu);
        kelembabanDataPoints.push(nilaiKelembaban);
        waktuDataPoints.push(timeLabel);
        
        while (suhuDataPoints.length > MAX_DATA_POINTS) {
            suhuDataPoints.shift();
            kelembabanDataPoints.shift();
            waktuDataPoints.shift();
        }

        suhuChart.data.labels = [...waktuDataPoints];
        suhuChart.data.datasets[0].data = [...suhuDataPoints];
        suhuChart.update('none');
        
        kelembabanChart.data.labels = [...waktuDataPoints];
        kelembabanChart.data.datasets[0].data = [...kelembabanDataPoints];
        kelembabanChart.update('none');
        
        saveChartDataToLocal();
    }
    
    function saveChartDataToLocal() {
        const chartData = { suhu: suhuDataPoints, kelembaban: kelembabanDataPoints, waktu: waktuDataPoints, lastSensorId: lastSensorId };
        localStorage.setItem('chartData', JSON.stringify(chartData));
    }
    
    function loadChartDataFromLocal() {
        const saved = localStorage.getItem('chartData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.suhu && data.suhu.length > 0) {
                    suhuDataPoints = data.suhu;
                    kelembabanDataPoints = data.kelembaban;
                    waktuDataPoints = data.waktu;
                    lastSensorId = data.lastSensorId || null;
                    
                    if (suhuChart && kelembabanChart) {
                        suhuChart.data.labels = [...waktuDataPoints];
                        suhuChart.data.datasets[0].data = [...suhuDataPoints];
                        suhuChart.update();
                        kelembabanChart.data.labels = [...waktuDataPoints];
                        kelembabanChart.data.datasets[0].data = [...kelembabanDataPoints];
                        kelembabanChart.update();
                    }
                }
            } catch(e) { console.log('Error loading chart data:', e); }
        }
    }
    
    function resetCharts() {
        suhuDataPoints = [];
        kelembabanDataPoints = [];
        waktuDataPoints = [];
        lastSensorId = null;
        
        if (!useSimulatedData && suhu !== 0 && kelembaban !== 0) {
            const now = new Date();
            const timeLabel = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            suhuDataPoints.push(suhu);
            kelembabanDataPoints.push(kelembaban);
            waktuDataPoints.push(timeLabel);
        }
        
        if (suhuChart && kelembabanChart) {
            suhuChart.data.labels = [...waktuDataPoints];
            suhuChart.data.datasets[0].data = [...suhuDataPoints];
            suhuChart.update();
            kelembabanChart.data.labels = [...waktuDataPoints];
            kelembabanChart.data.datasets[0].data = [...kelembabanDataPoints];
            kelembabanChart.update();
        }
        
        saveChartDataToLocal();
        if (umurFeedback) {
            const originalText = umurFeedback.textContent;
            umurFeedback.textContent = '📊 Grafik telah direset!';
            umurFeedback.style.color = '#D4AF37';
            setTimeout(() => { umurFeedback.textContent = originalText; }, 2000);
        }
    }
    
    // ========================
    // UPDATE UMUR HARIAN
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
            umurFeedback.textContent = 'Umur ayam bertambah! Sekarang ' + umurAyam + ' hari';
            umurFeedback.style.color = '#D4AF37';
            setTimeout(() => resetFeedback(), 3000);
            localStorage.setItem('lastUmurUpdate', today);
        }
    }
    
    async function saveMode(mode) {
        if (!window.supabaseClient) return;
        try {
            await window.supabaseClient.from('system_config').insert([{ mode: mode, updated_at: new Date().toISOString() }]);
        } catch (error) { console.error('Error saving mode:', error); }
    }
    
    async function fetchSensorData() {
        if (!window.supabaseClient) { useSimulatedData = true; return false; }
        
        try {
            const { data, error } = await window.supabaseClient.from('sensors').select('suhu, kelembaban, id, created_at').order('id', { ascending: false }).limit(1);
            
            if (error) { useSimulatedData = true; return false; }
            
            if (data && data.length > 0) {
                const newSensorId = data[0].id;
                const newSuhu = data[0].suhu;
                const newKelembaban = data[0].kelembaban;
                const newTimestamp = data[0].created_at;
                const isNewData = (lastSensorId !== newSensorId);
                
                if (isNewData) {
                    suhu = newSuhu;
                    kelembaban = newKelembaban;
                    lastSensorId = newSensorId;
                    sensorTimestamp = newTimestamp;
                    useSimulatedData = false;
                    updateSensorDisplay();
                    addChartDataPoint(suhu, kelembaban, sensorTimestamp);
                    if (currentMode === 'AUTO') autoControl();
                    return true;
                } else {
                    if (useSimulatedData) {
                        suhu = newSuhu;
                        kelembaban = newKelembaban;
                        lastSensorId = newSensorId;
                        useSimulatedData = false;
                        updateSensorDisplay();
                        addChartDataPoint(suhu, kelembaban, newTimestamp);
                        if (currentMode === 'AUTO') autoControl();
                    } else { updateSensorDisplay(); }
                    return false;
                }
            } else { useSimulatedData = true; return false; }
        } catch (error) { useSimulatedData = true; return false; }
    }
    
    async function fetchUmurAyam() {
        if (!window.supabaseClient) {
            const saved = localStorage.getItem('umurAyam');
            if (saved) { umurAyam = parseInt(saved); umurDisplay.textContent = umurAyam + ' Hari'; umurInput.value = umurAyam; }
            return;
        }
        try {
            const { data, error } = await window.supabaseClient.from('farm_config').select('umur_ayam').order('updated_at', { ascending: false }).limit(1);
            if (!error && data && data.length > 0) { umurAyam = data[0].umur_ayam; umurDisplay.textContent = umurAyam + ' Hari'; umurInput.value = umurAyam; }
        } catch (error) { console.error('Error fetching umur:', error); }
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
            const { data, error } = await window.supabaseClient.from('control_status').select('control1, control2, control3').order('updated_at', { ascending: false }).limit(1);
            if (!error && data && data.length > 0) { control1Status = data[0].control1; control2Status = data[0].control2; control3Status = data[0].control3; updateControlUI(); }
        } catch (error) { console.error('Error fetching control:', error); }
    }
    
    async function saveUmurAyam(umur) {
        if (!window.supabaseClient) { localStorage.setItem('umurAyam', umur); return; }
        try { await window.supabaseClient.from('farm_config').insert([{ umur_ayam: umur, updated_at: new Date().toISOString() }]); } 
        catch (error) { localStorage.setItem('umurAyam', umur); }
    }
    
    async function saveControlStatus() {
        if (!window.supabaseClient) {
            localStorage.setItem('control1Status', control1Status);
            localStorage.setItem('control2Status', control2Status);
            localStorage.setItem('control3Status', control3Status);
            return;
        }
        try {
            await window.supabaseClient.from('control_status').insert([{ control1: control1Status, control2: control2Status, control3: control3Status, updated_at: new Date().toISOString() }]);
        } catch (error) { console.error('Error saving control:', error); }
    }
    
function autoControl() {
    if (currentMode !== 'AUTO' || useSimulatedData) return;
    
    // Definisikan batas suhu dan kelembaban berdasarkan umur ayam
    let batasDingin, batasPanas, batasLembabRendah, batasLembabTinggi;
    
    // ===== BATAS NORMAL =====
    let suhuNormalMin, suhuNormalMax, lembabNormalMin, lembabNormalMax;
    
    if (umurAyam <= 7) {
        batasDingin = 28;
        batasPanas = 33;
        batasLembabRendah = 50;
        batasLembabTinggi = 70;
        // BATAS NORMAL
        suhuNormalMin = 29;
        suhuNormalMax = 32;
        lembabNormalMin = 55;
        lembabNormalMax = 65;
    } else if (umurAyam <= 14) {
        batasDingin = 26;
        batasPanas = 30;
        batasLembabRendah = 50;
        batasLembabTinggi = 70;
        // BATAS NORMAL
        suhuNormalMin = 27;
        suhuNormalMax = 29;
        lembabNormalMin = 55;
        lembabNormalMax = 65;
    } else {
        batasDingin = 22;
        batasPanas = 27;
        batasLembabRendah = 50;
        batasLembabTinggi = 70;
        // BATAS NORMAL
        suhuNormalMin = 23;
        suhuNormalMax = 26;
        lembabNormalMin = 55;
        lembabNormalMax = 65;
    }
    
    // ===== KATEGORISASI DENGAN BATAS NORMAL =====
    let kondisiSuhu, kondisiLembab;
    
    // Suhu: RENDAH, NORMAL, TINGGI
    if (suhu < suhuNormalMin) {
        kondisiSuhu = 'RENDAH';
    } else if (suhu >= suhuNormalMin && suhu <= suhuNormalMax) {
        kondisiSuhu = 'NORMAL';
    } else {
        kondisiSuhu = 'TINGGI';
    }
    
    // Kelembaban: RENDAH, NORMAL, TINGGI
    if (kelembaban < lembabNormalMin) {
        kondisiLembab = 'RENDAH';
    } else if (kelembaban >= lembabNormalMin && kelembaban <= lembabNormalMax) {
        kondisiLembab = 'NORMAL';
    } else {
        kondisiLembab = 'TINGGI';
    }
    
    // ===== LOGIKA KONTROL 9 KONDISI =====
    let newControl1 = false, newControl2 = false, newControl3 = false;
    
    if (kondisiSuhu === 'RENDAH') {
        if (kondisiLembab === 'RENDAH') {
            // No 1: Suhu rendah, kelembaban rendah → Lampu ON, Pompa ON, Kipas OFF
            newControl1 = true;
            newControl2 = true;
            newControl3 = false;
        } else if (kondisiLembab === 'NORMAL') {
            // No 2: Suhu rendah, kelembaban normal → Lampu ON, Pompa OFF, Kipas OFF
            newControl1 = true;
            newControl2 = false;
            newControl3 = false;
        } else { // TINGGI
            // No 3: Suhu rendah, kelembaban tinggi → Lampu ON, Pompa OFF, Kipas ON
            newControl1 = true;
            newControl2 = false;
            newControl3 = true;
        }
    } else if (kondisiSuhu === 'NORMAL') {
        if (kondisiLembab === 'RENDAH') {
            // No 4: Suhu normal, kelembaban rendah → Lampu OFF, Pompa ON, Kipas OFF
            newControl1 = false;
            newControl2 = true;
            newControl3 = false;
        } else if (kondisiLembab === 'NORMAL') {
            // No 5: Suhu normal, kelembaban normal → SEMUA OFF (IDEAL)
            newControl1 = false;
            newControl2 = false;
            newControl3 = false;
        } else { // TINGGI
            // No 6: Suhu normal, kelembaban tinggi → Lampu OFF, Pompa OFF, Kipas ON
            newControl1 = false;
            newControl2 = false;
            newControl3 = true;
        }
    } else { // SUHU TINGGI
        if (kondisiLembab === 'RENDAH') {
            // No 7: Suhu tinggi, kelembaban rendah → Lampu OFF, Pompa ON, Kipas ON
            newControl1 = false;
            newControl2 = true;
            newControl3 = true;
        } else if (kondisiLembab === 'NORMAL') {
            // No 8: Suhu tinggi, kelembaban normal → Lampu OFF, Pompa OFF, Kipas ON
            newControl1 = false;
            newControl2 = false;
            newControl3 = true;
        } else { // TINGGI
            // No 9: Suhu tinggi, kelembaban tinggi → Lampu OFF, Pompa OFF, Kipas ON
            newControl1 = false;
            newControl2 = false;
            newControl3 = true;
        }
    }
    
    // Terapkan perubahan jika berbeda
    if (control1Status !== newControl1 || control2Status !== newControl2 || control3Status !== newControl3) {
        control1Status = newControl1;
        control2Status = newControl2;
        control3Status = newControl3;
        updateControlUI();
        saveControlStatus();
    }
}
    
    function updateControlUI() {
        const toggles = document.querySelectorAll('.toggle-switch input');
        const statusDivs = document.querySelectorAll('.control-status');
        
        toggles.forEach((toggle, index) => {
            if (toggle) { if (index === 0) toggle.checked = control1Status; if (index === 1) toggle.checked = control2Status; if (index === 2) toggle.checked = control3Status; }
        });
        
        statusDivs.forEach((status, index) => {
            if (status) {
                let isActive = (index === 0) ? control1Status : (index === 1) ? control2Status : control3Status;
                status.textContent = isActive ? 'AKTIF' : 'NONAKTIF';
                if (isActive) status.classList.add('active'); else status.classList.remove('active');
            }
        });
    }
    
    function updateSensorDisplay() {
        if (suhuElement) suhuElement.textContent = (useSimulatedData || (suhu === 0 && kelembaban === 0)) ? '--°C' : Math.round(suhu) + '°C';
        if (kelembabanElement) kelembabanElement.textContent = (useSimulatedData || (suhu === 0 && kelembaban === 0)) ? '--%' : Math.round(kelembaban) + '%';
    }
    
    async function checkForNewSensorData() { await fetchSensorData(); }

    function setUmurAyam() {
        let nilaiUmur = parseInt(umurInput.value);
        if (isNaN(nilaiUmur)) { umurFeedback.textContent = 'Masukkan angka yang valid!'; setTimeout(() => resetFeedback(), 2000); return; }
        if (nilaiUmur < 0 || nilaiUmur > 100) { umurFeedback.textContent = nilaiUmur < 0 ? 'Umur tidak boleh negatif!' : '⚠️ Maksimal umur 100 hari!'; setTimeout(() => resetFeedback(), 2000); return; }
        
        umurAyam = nilaiUmur;
        umurDisplay.textContent = umurAyam + ' Hari';
        umurInput.value = umurAyam;
        saveUmurAyam(umurAyam);
        localStorage.setItem('lastUmurUpdate', new Date().toDateString());
        umurFeedback.textContent = 'Umur ayam berhasil diupdate!';
        if (umurAyam === 0) umurFeedback.textContent = 'Ayam baru lahir!';
        else if (umurAyam >= 60) umurFeedback.textContent = 'Ayam siap panen! Umur sudah ' + umurAyam + ' hari';
        setTimeout(() => resetFeedback(), 2500);
    }
    
    function resetFeedback() { umurFeedback.textContent = 'Masukkan umur ayam dalam hari'; umurFeedback.style.color = '#D4AF37'; }
    
    function switchMode(mode) {
        currentMode = mode;
        const toggles = document.querySelectorAll('.toggle-switch input');
        if (mode === 'AUTO') { toggles.forEach(toggle => { if (toggle) toggle.disabled = true; }); if (!useSimulatedData) autoControl(); } 
        else { toggles.forEach(toggle => { if (toggle) toggle.disabled = false; }); }
        
        const modeBtns = document.querySelectorAll('.btn-mode');
        modeBtns.forEach(btn => { if (btn && btn.textContent.trim() === mode) btn.classList.add('active'); else if (btn) btn.classList.remove('active'); });
        localStorage.setItem('currentMode', mode); saveMode(mode);
    }
    
    function setupManualToggles() {
        const toggles = document.querySelectorAll('.toggle-switch input');
        toggles.forEach((toggle, index) => {
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            newToggle.addEventListener('change', function(e) {
                if (currentMode === 'MANUAL') {
                    if (index === 0) control1Status = this.checked;
                    if (index === 1) control2Status = this.checked;
                    if (index === 2) control3Status = this.checked;
                    const statusDivs = document.querySelectorAll('.control-status');
                    if (statusDivs[index]) {
                        statusDivs[index].textContent = this.checked ? 'AKTIF' : 'NONAKTIF';
                        if (this.checked) statusDivs[index].classList.add('active'); else statusDivs[index].classList.remove('active');
                    }
                    saveControlStatus();
                } else {
                    if (index === 0) this.checked = control1Status;
                    if (index === 1) this.checked = control2Status;
                    if (index === 2) this.checked = control3Status;
                    const controlItem = this.closest('.control-item');
                    const warning = document.createElement('div');
                    warning.textContent = 'Ganti ke MODE MANUAL dulu!';
                    warning.style.cssText = 'color:#D4AF37;font-size:11px;margin-top:5px;background:rgba(0,0,0,0.5);padding:2px 5px;border-radius:5px;';
                    controlItem.appendChild(warning);
                    setTimeout(() => warning.remove(), 1500);
                }
            });
            toggles[index] = newToggle;
        });
    }
    
    function updateTime() { if (timeElement) timeElement.textContent = new Date().toLocaleTimeString('id-ID'); }
    
    function createBubbles() {
        const bubbleContainer = document.querySelector('.bubble-container');
        if (!bubbleContainer) return;
        for (let i = 0; i < 30; i++) {
            const bubble = document.createElement('div');
            bubble.classList.add('bubble');
            const size = Math.random() * 60 + 10;
            bubble.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;animation-duration:${Math.random()*15+8}s;animation-delay:${Math.random()*10}s;`;
            bubble.style.setProperty('--x-move', (Math.random() - 0.5) * 2);
            bubbleContainer.appendChild(bubble);
        }
    }
    
    // ========================
    // DOWNLOAD HISTORY
    // ========================
    
    async function fetchSensorDataByDateRange(startDate, endDate) {
        if (!window.supabaseClient) return [];
        try {
            let query = window.supabaseClient.from('sensors').select('suhu, kelembaban, created_at').order('created_at', { ascending: true });
            if (startDate) { const startDateTime = new Date(startDate); startDateTime.setHours(0,0,0,0); query = query.gte('created_at', startDateTime.toISOString()); }
            if (endDate) { const endDateTime = new Date(endDate); endDateTime.setHours(23,59,59,999); query = query.lte('created_at', endDateTime.toISOString()); }
            const { data, error } = await query;
            if (error) return [];
            return data || [];
        } catch (error) { return []; }
    }
    
    async function fetchControlHistoryByDateRange(startDate, endDate) {
        if (!window.supabaseClient) return [];
        try {
            let query = window.supabaseClient.from('control_status').select('control1, control2, control3, updated_at').order('updated_at', { ascending: true });
            if (startDate) { const startDateTime = new Date(startDate); startDateTime.setHours(0,0,0,0); query = query.gte('updated_at', startDateTime.toISOString()); }
            if (endDate) { const endDateTime = new Date(endDate); endDateTime.setHours(23,59,59,999); query = query.lte('updated_at', endDateTime.toISOString()); }
            const { data, error } = await query;
            if (error) return [];
            return data || [];
        } catch (error) { return []; }
    }
    
    async function fetchModeHistoryByDateRange(startDate, endDate) {
        if (!window.supabaseClient) return [];
        try {
            let query = window.supabaseClient.from('system_config').select('mode, updated_at').order('updated_at', { ascending: true });
            if (startDate) { const startDateTime = new Date(startDate); startDateTime.setHours(0,0,0,0); query = query.gte('updated_at', startDateTime.toISOString()); }
            if (endDate) { const endDateTime = new Date(endDate); endDateTime.setHours(23,59,59,999); query = query.lte('updated_at', endDateTime.toISOString()); }
            const { data, error } = await query;
            if (error) return [];
            return data || [];
        } catch (error) { return []; }
    }
    
    function aggregateDataByInterval(data, intervalMinutes) {
        if (!data || data.length === 0) return [];
        if (intervalMinutes === 1) return data.map(d => ({ ...d, type: 'original' }));
        
        const aggregated = [];
        const intervalMs = intervalMinutes * 60 * 1000;
        let currentIntervalStart = new Date(data[0].created_at);
        currentIntervalStart.setMilliseconds(0); currentIntervalStart.setSeconds(0);
        let sumSuhu = 0, sumKelembaban = 0, count = 0;
        
        for (const item of data) {
            const itemDate = new Date(item.created_at);
            const intervalStart = new Date(currentIntervalStart);
            if (itemDate - intervalStart < intervalMs) {
                sumSuhu += item.suhu; sumKelembaban += item.kelembaban; count++;
            } else {
                if (count > 0) aggregated.push({ start_time: new Date(currentIntervalStart), end_time: new Date(currentIntervalStart.getTime() + intervalMs), avg_suhu: sumSuhu/count, avg_kelembaban: sumKelembaban/count, count: count });
                currentIntervalStart = new Date(itemDate); currentIntervalStart.setMilliseconds(0); currentIntervalStart.setSeconds(0);
                sumSuhu = item.suhu; sumKelembaban = item.kelembaban; count = 1;
            }
        }
        if (count > 0) aggregated.push({ start_time: new Date(currentIntervalStart), end_time: new Date(currentIntervalStart.getTime() + intervalMs), avg_suhu: sumSuhu/count, avg_kelembaban: sumKelembaban/count, count: count });
        return aggregated;
    }
    
function getControlStatusAtTime(controlHistory, targetTime) {
    // Default semua false
    let latestStatus = { control1: false, control2: false, control3: false };
    
    if (!controlHistory || controlHistory.length === 0) {
        return latestStatus;
    }
    
    const targetTimestamp = new Date(targetTime).getTime();
    let foundRecord = null;
    
    // Cari record dengan updated_at <= targetTime (data sudah di-sort ascending)
    for (let i = 0; i < controlHistory.length; i++) {
        const record = controlHistory[i];
        const recordTime = new Date(record.updated_at).getTime();
        
        if (recordTime <= targetTimestamp) {
            foundRecord = record; // Terus update sampai yang terakhir
        }
    }
    
    // Jika tidak ditemukan, gunakan record PALING AWAL (yang pertama)
    // atau record PALING AKHIR tergantung kebutuhan
    if (!foundRecord && controlHistory.length > 0) {
        // Untuk data sebelum control pertama, gunakan control pertama
        foundRecord = controlHistory[0];
        console.log(`[INFO] No control before ${new Date(targetTimestamp).toLocaleString()}, using earliest control: ${new Date(foundRecord.updated_at).toLocaleString()}`);
    }
    
    if (foundRecord) {
        latestStatus = {
            control1: foundRecord.control1 === true,
            control2: foundRecord.control2 === true,
            control3: foundRecord.control3 === true
        };
    }
    
    return latestStatus;
}
    
    function getModeAtTime(modeHistory, targetTime) {
        let latestMode = 'AUTO';
        for (const record of modeHistory) { if (new Date(record.updated_at) <= targetTime) latestMode = record.mode; else break; }
        return latestMode;
    }
    
    function generateCSVWithFilters(sensorData, controlHistory, modeHistory, intervalMinutes, startDate, endDate) {
        const aggregatedData = aggregateDataByInterval(sensorData, intervalMinutes);
        const now = new Date();
        const dateRangeText = `${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}`;
        let csvRows = [];
        
        csvRows.push(['LAPORAN DATA SMART CONTROL']);
        csvRows.push(['Tanggal Export:', now.toLocaleString('id-ID')]);
        csvRows.push(['Periode Data:', dateRangeText]);
        csvRows.push(['Interval Rata-rata:', intervalMinutes === 1 ? 'Original (setiap data)' : `${intervalMinutes} menit`]);
        csvRows.push(['Total Data Original:', sensorData.length]);
        csvRows.push(['Total Data Setelah Agregasi:', aggregatedData.length]);
        csvRows.push(['']);
        csvRows.push(['RINGKASAN KONDISI TERAKHIR']);
        csvRows.push(['Parameter', 'Nilai']);
        csvRows.push(['Mode Kontrol', getModeAtTime(modeHistory, new Date())]);
        csvRows.push(['Status Lampu', getControlStatusAtTime(controlHistory, new Date()).control1 ? 'AKTIF' : 'NONAKTIF']);
        csvRows.push(['Status Pompa', getControlStatusAtTime(controlHistory, new Date()).control2 ? 'AKTIF' : 'NONAKTIF']);
        csvRows.push(['Status Kipas', getControlStatusAtTime(controlHistory, new Date()).control3 ? 'AKTIF' : 'NONAKTIF']);
        csvRows.push(['']);
        
        if (intervalMinutes === 1) {
            csvRows.push(['DATA SENSOR ORIGINAL']);
            csvRows.push(['Waktu', 'Suhu (°C)', 'Kelembaban (%)', 'Mode', 'Lampu', 'Pompa', 'Kipas']);
            for (const item of sensorData) {
                const waktu = new Date(item.created_at).toLocaleString('id-ID');
                const mode = getModeAtTime(modeHistory, new Date(item.created_at));
                const control = getControlStatusAtTime(controlHistory, new Date(item.created_at));
                csvRows.push([waktu, item.suhu, item.kelembaban, mode, control.control1 ? 'AKTIF' : 'NONAKTIF', control.control2 ? 'AKTIF' : 'NONAKTIF', control.control3 ? 'AKTIF' : 'NONAKTIF']);
            }
        } else {
            csvRows.push([`DATA SENSOR RATA-RATA PER ${intervalMinutes} MENIT`]);
            csvRows.push(['Periode Mulai', 'Periode Selesai', 'Rata Suhu', 'Rata Kelembaban', 'Jumlah Data', 'Mode', 'Lampu', 'Pompa', 'Kipas']);
            for (const interval of aggregatedData) {
                const midTime = new Date((interval.start_time.getTime() + interval.end_time.getTime()) / 2);
                const mode = getModeAtTime(modeHistory, midTime);
                const control = getControlStatusAtTime(controlHistory, midTime);
                csvRows.push([interval.start_time.toLocaleString('id-ID'), interval.end_time.toLocaleString('id-ID'), interval.avg_suhu.toFixed(1), interval.avg_kelembaban.toFixed(1), interval.count, mode, control.control1 ? 'AKTIF' : 'NONAKTIF', control.control2 ? 'AKTIF' : 'NONAKTIF', control.control3 ? 'AKTIF' : 'NONAKTIF']);
            }
        }
        return csvRows.map(row => row.join(',')).join('\n');
    }
    
    // ========================
    // PDF
    // ========================
    async function downloadHistoryPDF() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const interval = parseInt(document.getElementById('intervalSelect').value);
        
        showDownloadFeedback('📡 Mengambil data untuk PDF...');
        
        const [sensorData, controlHistory, modeHistory] = await Promise.all([
            fetchSensorDataByDateRange(startDate, endDate),
            fetchControlHistoryByDateRange(startDate, endDate),
            fetchModeHistoryByDateRange(startDate, endDate)
        ]);
        
        if (!sensorData || sensorData.length === 0) {
            showDownloadFeedback('⚠️ Tidak ada data pada periode yang dipilih!');
            return;
        }
        
        const aggregatedData = aggregateDataByInterval(sensorData, interval);
        const now = new Date();
        const dateRangeText = `${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}`;
        const lastControl = getControlStatusAtTime(controlHistory, new Date());
        const lastMode = getModeAtTime(modeHistory, new Date());
        
        let tableRows = '';
        const maxRows = interval === 1 ? 500 : 200;
        const displayData = interval === 1 ? sensorData.slice(0, maxRows) : aggregatedData.slice(0, maxRows);
        
        if (interval === 1) {
            for (const item of displayData) {
                const waktu = new Date(item.created_at).toLocaleString('id-ID');
                const mode = getModeAtTime(modeHistory, new Date(item.created_at));
                const control = getControlStatusAtTime(controlHistory, new Date(item.created_at));
                tableRows += `<tr><td style="border:1px solid #ddd;padding:6px;">${waktu}</td><td style="border:1px solid #ddd;padding:6px;">${item.suhu}°C</td><td style="border:1px solid #ddd;padding:6px;">${item.kelembaban}%</td><td style="border:1px solid #ddd;padding:6px;">${mode}</td><td style="border:1px solid #ddd;padding:6px;${control.control1 ? 'color:#28a745;font-weight:bold;' : 'color:#dc3545;'}">${control.control1 ? 'AKTIF' : 'NONAKTIF'}</td><td style="border:1px solid #ddd;padding:6px;${control.control2 ? 'color:#28a745;font-weight:bold;' : 'color:#dc3545;'}">${control.control2 ? 'AKTIF' : 'NONAKTIF'}</td><td style="border:1px solid #ddd;padding:6px;${control.control3 ? 'color:#28a745;font-weight:bold;' : 'color:#dc3545;'}">${control.control3 ? 'AKTIF' : 'NONAKTIF'}</td></tr>`;
            }
        } else {
            for (const interval of displayData) {
                const midTime = new Date((interval.start_time.getTime() + interval.end_time.getTime()) / 2);
                const mode = getModeAtTime(modeHistory, midTime);
                const control = getControlStatusAtTime(controlHistory, midTime);
                tableRows += `<tr><td style="border:1px solid #ddd;padding:6px;">${interval.start_time.toLocaleString('id-ID')}</td><td style="border:1px solid #ddd;padding:6px;">${interval.end_time.toLocaleString('id-ID')}</td><td style="border:1px solid #ddd;padding:6px;">${interval.avg_suhu.toFixed(1)}°C</td><td style="border:1px solid #ddd;padding:6px;">${interval.avg_kelembaban.toFixed(1)}%</td><td style="border:1px solid #ddd;padding:6px;">${interval.count}</td><td style="border:1px solid #ddd;padding:6px;">${mode}</td><td style="border:1px solid #ddd;padding:6px;${control.control1 ? 'color:#28a745;font-weight:bold;' : 'color:#dc3545;'}">${control.control1 ? 'AKTIF' : 'NONAKTIF'}</td><td style="border:1px solid #ddd;padding:6px;${control.control2 ? 'color:#28a745;font-weight:bold;' : 'color:#dc3545;'}">${control.control2 ? 'AKTIF' : 'NONAKTIF'}</td><td style="border:1px solid #ddd;padding:6px;${control.control3 ? 'color:#28a745;font-weight:bold;' : 'color:#dc3545;'}">${control.control3 ? 'AKTIF' : 'NONAKTIF'}</td></tr>`;
            }
        }
        
        const pdfHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: white; }
        .container { max-width: 100%; margin: 0 auto; }
        h1 { color: #D4AF37; text-align: center; margin-bottom: 10px; }
        .subtitle { text-align: center; color: #666; margin-bottom: 20px; border-bottom: 2px solid #D4AF37; padding-bottom: 10px; }
        .info-box { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #D4AF37; }
        .info-grid { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; }
        .info-card { background: #f5f5f5; padding: 12px; border-radius: 8px; flex: 1; min-width: 150px; border-left: 4px solid #D4AF37; }
        .info-card strong { display: block; color: #2D4A3E; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
        th { background: #D4AF37; color: #1A3026; padding: 8px; border: 1px solid #ddd; }
        td { padding: 6px; border: 1px solid #ddd; }
        .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; }
        @media print { body { padding: 10px; } .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>SMART CONTROL SYSTEM</h1>
        <div class="subtitle">Laporan Monitoring Kandang</div>
        
        <div class="info-grid">
            <div class="info-card"><strong>Tanggal Export</strong>${now.toLocaleString('id-ID')}</div>
            <div class="info-card"><strong>Periode Data</strong>${dateRangeText}</div>
            <div class="info-card"><strong>Interval</strong>${interval === 1 ? 'Original (setiap data)' : `${interval} menit`}</div>
            <div class="info-card"><strong>Total Data</strong>${sensorData.length} data original<br>${aggregatedData.length} data tampil</div>
        </div>
        
        <div class="info-grid">
            <div class="info-card"><strong>Mode Kontrol</strong>${lastMode}</div>
            <div class="info-card"><strong>Lampu</strong><span style="${lastControl.control1 ? 'color:#28a745;font-weight:bold;' : 'color:#dc3545;'}"> ${lastControl.control1 ? 'AKTIF' : 'NONAKTIF'}</span></div>
            <div class="info-card"><strong>Pompa</strong><span style="${lastControl.control2 ? 'color:#28a745;font-weight:bold;' : 'color:#dc3545;'}"> ${lastControl.control2 ? 'AKTIF' : 'NONAKTIF'}</span></div>
            <div class="info-card"><strong>Kipas</strong><span style="${lastControl.control3 ? 'color:#28a745;font-weight:bold;' : 'color:#dc3545;'}"> ${lastControl.control3 ? 'AKTIF' : 'NONAKTIF'}</span></div>
        </div>
        
        <h3 style="margin: 20px 0 10px 0; background: #2D4A3E; color: #D4AF37; padding: 8px; border-radius: 5px;">DATA SENSOR ${interval === 1 ? '(ORIGINAL)' : `RATA-RATA PER ${interval} MENIT`}</h3>
        <table>
            <thead>
                <tr>
                    ${interval === 1 ? 
                        '<th>Waktu</th><th>Suhu</th><th>Kelembaban</th><th>Mode</th><th>Lampu</th><th>Pompa</th><th>Kipas</th>' :
                        '<th>Periode Mulai</th><th>Periode Selesai</th><th>Rata Suhu</th><th>Rata Kelembaban</th><th>Jml Data</th><th>Mode</th><th>Lampu</th><th>Pompa</th><th>Kipas</th>'
                    }
                </tr>
            </thead>
            <tbody>
                ${tableRows || '<tr><td colspan="9" style="text-align:center;">Tidak ada data</td></tr>'}
            </tbody>
        </table>
        ${(interval === 1 && sensorData.length > maxRows) ? `<p style="font-size:10px; color:#666; margin-top:10px;">* Menampilkan ${maxRows} dari ${sensorData.length} data terbaru</p>` : ''}
        ${(!interval === 1 && aggregatedData.length > maxRows) ? `<p style="font-size:10px; color:#666; margin-top:10px;">* Menampilkan ${maxRows} dari ${aggregatedData.length} interval</p>` : ''}
        
        <div class="footer">
            <p>Generated: ${now.toLocaleString('id-ID')}</p>
        </div>
    </div>
    <script>
        window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
    </script>
</body>
</html>
        `;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(pdfHtml);
            printWindow.document.close();
            showDownloadFeedback('✅ PDF berhasil dibuka! Silakan klik Save/Print.');
        } else {
            showDownloadFeedback('❌ Popup diblokir. Izinkan popup untuk download PDF.');
        }
    }
    
function showDownloadModal() {
    const modal = document.getElementById('downloadModal');
    if (modal) {
        // Ubah default ke tanggal Juni 2026
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        // Set ke 1 Juni 2026
        if (startDateInput && !startDateInput.value) {
            startDateInput.value = '2026-06-01';
        }
        // Set ke 7 Juni 2026 (atau hari ini jika sudah lewat)
        if (endDateInput && !endDateInput.value) {
            const today = new Date();
            if (today.getFullYear() === 2026 && today.getMonth() === 5) { // Juni = bulan 5
                endDateInput.value = today.toISOString().slice(0,10);
            } else {
                endDateInput.value = '2026-06-07';
            }
        }
        
        modal.style.display = 'block';
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
    }
}
    
    function showDownloadFeedback(message) {
        const feedback = document.createElement('div');
        feedback.innerHTML = `<div style="position:fixed;bottom:20px;right:20px;background:linear-gradient(135deg,#2D4A3E,#1A3026);color:#D4AF37;padding:12px 20px;border-radius:10px;border:1px solid #D4AF37;box-shadow:0 5px 20px rgba(0,0,0,0.3);z-index:1001;font-weight:600;animation:slideInRight 0.3s ease;"><i class="fas fa-info-circle"></i> ${message}</div>`;
        if (!document.querySelector('#downloadFeedbackStyle')) {
            const style = document.createElement('style');
            style.id = 'downloadFeedbackStyle';
            style.textContent = '@keyframes slideInRight{from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;}}';
            document.head.appendChild(style);
        }
        document.body.appendChild(feedback);
        setTimeout(() => { if(feedback && feedback.remove) feedback.remove(); }, 3000);
    }
    
    async function downloadHistoryCSV() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const interval = parseInt(document.getElementById('intervalSelect').value);
        
        showDownloadFeedback('📡 Mengambil data dari database...');
        const [sensorData, controlHistory, modeHistory] = await Promise.all([
            fetchSensorDataByDateRange(startDate, endDate),
            fetchControlHistoryByDateRange(startDate, endDate),
            fetchModeHistoryByDateRange(startDate, endDate)
        ]);
        
        if (!sensorData || sensorData.length === 0) { showDownloadFeedback('⚠️ Tidak ada data pada periode yang dipilih!'); return; }
        
        const csvData = generateCSVWithFilters(sensorData, controlHistory, modeHistory, interval, startDate, endDate);
        const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const filename = `smart_control_${startDate || 'all'}_to_${endDate || 'now'}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`;
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showDownloadFeedback(`✅ CSV berhasil didownload! (${sensorData.length} data)`);
    }
    
    // ========================
    // INISIALISASI
    // ========================
    async function init() {
        initCharts();
        loadChartDataFromLocal();
        
        await fetchSensorData(); 
        await fetchUmurAyam();
        await fetchControlStatus();
        
        setupManualToggles();
        const modeBtns = document.querySelectorAll('.btn-mode');
        modeBtns.forEach(btn => { btn.addEventListener('click', function() { switchMode(this.textContent.trim()); }); });
        const savedMode = localStorage.getItem('currentMode');
        switchMode((savedMode === 'AUTO' || savedMode === 'MANUAL') ? savedMode : 'AUTO');
        
        const resetSuhuBtn = document.getElementById('resetSuhuChart');
        const resetKelembabanBtn = document.getElementById('resetKelembabanChart');
        if (resetSuhuBtn) resetSuhuBtn.addEventListener('click', resetCharts);
        if (resetKelembabanBtn) resetKelembabanBtn.addEventListener('click', resetCharts);
        
        if (setUmurBtn) setUmurBtn.addEventListener('click', setUmurAyam);
        if (umurInput) umurInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') setUmurAyam(); });
        
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) downloadBtn.addEventListener('click', showDownloadModal);
        
        const downloadCSVBtn = document.getElementById('downloadCSV');
        if (downloadCSVBtn) downloadCSVBtn.addEventListener('click', () => { document.getElementById('downloadModal').style.display = 'none'; downloadHistoryCSV(); });
        
        const downloadPDFBtn = document.getElementById('downloadPDF');
        if (downloadPDFBtn) downloadPDFBtn.addEventListener('click', () => { document.getElementById('downloadModal').style.display = 'none'; downloadHistoryPDF(); });
        
        setInterval(updateUmurHarian, 60000);
        updateUmurHarian();
        setInterval(checkForNewSensorData, 5000);
        setInterval(updateTime, 1000);
        updateTime();
        createBubbles();
        
        console.log('✅ Smart Farm Ready! Mode:', currentMode);
        console.log('📥 Fitur Download: Pilih tanggal dan interval, lalu download CSV/PDF');
    }
    
    init();
}
