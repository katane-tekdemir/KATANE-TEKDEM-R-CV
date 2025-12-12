/* --- SİSTEM VERİLERİ (CONFIG) --- */
const STORAGE_KEY = 'katane_ultimate_v8'; // Versiyon yükseltildi
let db = {}; // Veri artık API'den gelecek
let isAuth = false;

/* --- BAŞLATMA --- */
window.onload = () => {
    setTimeout(async () => {
        document.getElementById('boot-screen').style.display = 'none';
        await loadDataFromBackend(); // API'den veriyi çek
        renderApp();
        document.querySelector('.menu-btn[onclick="navigate(\'home\')"]').classList.add('active');
    }, 3500);

    setupCursor();
};

/* --- API İŞLEMLERİ --- */

async function loadDataFromBackend() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('API veriyi çekemedi.');
        db = await response.json();
        console.log("Veri Backend'den başarıyla yüklendi.");
    } catch (error) {
        console.error("Veri yükleme hatası:", error);
        alert("Sisteme bağlanılamadı. Uygulama verimsiz çalışabilir.");
        // Hata durumunda uygulama çökmesin diye boş objelerle başlat
        db = { auth: { email: '', pass: '' }, profile: {name:'ERROR', subtitle: 'CONNECTION FAILED'}, library: [], projects: [], schools: [] };
    }
}

// Yeni KAYDETME fonksiyonu: Veriyi API'ye POST eder
const save = async () => {
    if (!isAuth || !db.auth || !db.auth.email || !db.auth.pass) {
        return console.warn("Admin oturumu açık değil veya kimlik bilgisi eksik. Kayıt denemesi durduruldu.");
    }
    
    // Auth bilgilerini gizlice data'ya ekle (Flask'te kontrol edilecek)
    const payload = {
        ...db,
        auth_email: db.auth.email,
        auth_pass: db.auth.pass
    };
    
    try {
        const response = await fetch('/api/data/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Hatası: ${errorData.message}`);
        }

        console.log("Veri sunucuya başarıyla kaydedildi.");
        // Başarılı kayıttan sonra yeni veriyi backend'den çekmeye gerek yok, 
        // çünkü save işlemi zaten tüm 'db' objesini gönderip yeniledi.
    } catch (error) {
        console.error("Veri kaydetme hatası:", error);
        alert(`Veri kaydetme başarısız oldu: ${error.message}`);
    }
};


/* --- ANA FONKSİYONLAR (GERİ KALANLAR AYNI MANTIKLA ÇALIŞIR) --- */
function renderApp() {
    // Profil Verileri Güncelleme
    setText('nav-name', db.profile.name);
    document.getElementById('nav-name').setAttribute('data-text', db.profile.name);
    setText('hero-title', db.profile.name);
    document.getElementById('hero-title').setAttribute('data-text', db.profile.name);
    setText('hero-subtitle', db.profile.subtitle);
    
    setSrc('nav-logo', db.profile.logo);
    setSrc('hero-img', db.profile.logo);
    
    setText('about-text', db.profile.about); 

    // İletişim
    setText('c-email', db.profile.email);
    setText('c-insta', db.profile.instagram);
    setText('c-phone', db.profile.phone);

    // İstatistikleri Güncelle
    setText('stat-count-1', db.projects.length + '+');
    setText('stat-count-2', db.library.length + db.schools.length + '+');

    // Gridler
    renderGrid(db.library, 'library-grid', 'item-card', openDetail);
    renderGrid(db.projects, 'projects-grid', 'project-card', openProjectDetail);
    renderGrid(db.schools, 'schools-grid', 'school-card', openSchoolDetail); 
    
    renderAdminList('admin-list', db.library, 'delItem');
    renderAdminList('admin-project-list', db.projects, 'delProject');
    renderAdminList('admin-school-list', db.schools, 'delSchool'); 

    setupProjectFilters();
}

function renderGrid(items, containerId, cardClass, clickHandler) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = cardClass;
        
        let content = '';
        if (cardClass === 'item-card') {
            content = `<img src="${item.img}" alt="${item.title}">
                       <div class="card-details">
                           <h4>${item.title}</h4>
                           <span>${item.type}</span>
                       </div>`;
        } else if (cardClass === 'project-card') {
            const techBadges = item.techs.map(t => `<span class="tech-badge">${t}</span>`).join('');
            content = `<div class="project-details">
                           <h4>${item.title}</h4>
                           <div class="tech-list">${techBadges}</div>
                           <p>${item.desc.substring(0, 100)}...</p>
                           <a href="${item.link}" target="_blank" class="project-link">GÖRÜNTÜLE <i class="fas fa-arrow-right"></i></a>
                       </div>`;
        } else if (cardClass === 'school-card') {
            content = `<img src="${item.img}" alt="${item.name}">
                       <div class="card-details">
                           <h4>${item.name}</h4>
                           <p>${item.period} | GPA: ${item.gpa}</p>
                           <p style="margin-top: 5px;">${item.desc.substring(0, 70)}...</p>
                       </div>`;
        }
        
        card.innerHTML = content;
        card.onclick = () => clickHandler(item);
        grid.appendChild(card);
    });
}

function setupProjectFilters() {
    const filterContainer = document.getElementById('project-filters');
    filterContainer.innerHTML = `<button class="filter-btn active" onclick="filterProjects('all')">TÜMÜ</button>`;

    const allTechs = db.projects.flatMap(p => p.techs);
    const uniqueTechs = [...new Set(allTechs)];

    uniqueTechs.forEach(tech => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = tech.toUpperCase();
        btn.onclick = (e) => filterProjects(tech, e);
        filterContainer.appendChild(btn);
    });
}

window.filterProjects = (tech, event) => {
    document.querySelectorAll('#project-filters .filter-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        document.querySelector('#project-filters .filter-btn').classList.add('active');
    }

    if (tech === 'all') {
        renderGrid(db.projects, 'projects-grid', 'project-card', openProjectDetail);
    } else {
        const filtered = db.projects.filter(p => p.techs.includes(tech));
        renderGrid(filtered, 'projects-grid', 'project-card', openProjectDetail);
    }
}

window.searchProjects = () => {
    const query = val('project-search').toLowerCase();
    const filtered = db.projects.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.techs.some(t => t.toLowerCase().includes(query))
    );
    renderGrid(filtered, 'projects-grid', 'project-card', openProjectDetail);
}

window.searchLibrary = () => {
    const query = val('search-input').toLowerCase();
    const filtered = db.library.filter(item => item.title.toLowerCase().includes(query));
    renderGrid(filtered, 'library-grid', 'item-card', openDetail);
}

window.filterItems = (type, event) => {
    document.querySelectorAll('#library .control-panel button').forEach(b => b.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }

    if(type === 'all') renderGrid(db.library, 'library-grid', 'item-card', openDetail);
    else renderGrid(db.library.filter(i => i.type === type), 'library-grid', 'item-card', openDetail);
}

/* --- ADMIN PANELİ --- */
window.login = () => {
    const m = val('login-email');
    const p = val('login-pass');
    if(m === db.auth.email && p === db.auth.pass) {
        isAuth = true;
        closeModal('modal-login');
        openModal('modal-admin');
        fillAdminForms();
    } else {
        setText('login-msg', 'ERİŞİM REDDEDİLDİ. IP LOGLANDI.');
        document.getElementById('login-msg').style.color = 'red';
    }
}

window.addItem = () => {
    const title = val('add-title');
    const type = val('add-type');
    const desc = val('add-desc');
    const link = val('add-link');
    const file = document.getElementById('add-file').files[0];

    if(title) {
        if (file) {
            const r = new FileReader();
            r.onload = async (e) => { // async eklendi
                db.library.unshift({ id: Date.now(), title, type, desc, img: e.target.result, link });
                await save(); // await eklendi
                alert('Veri Şifrelendi ve Kaydedildi.');
                renderApp();
            };
            r.readAsDataURL(file);
        } else {
            db.library.unshift({ id: Date.now(), title, type, desc, img: 'https://via.placeholder.com/600x400?text=' + type.toUpperCase(), link });
            save();
            alert('Veri Şifrelendi ve Kaydedildi.');
            renderApp();
        }
    } else { alert('Başlık zorunludur!'); }
}

window.addProject = async () => {
    const title = val('proj-title');
    const link = val('proj-link');
    const techs = val('proj-techs').split(',').map(t => t.trim()).filter(t => t !== '');
    const desc = val('proj-desc');

    if (title && techs.length > 0) {
        db.projects.unshift({ id: Date.now(), title, link, techs, desc });
        await save();
        alert('Proje Verisi Kaydedildi.');
        renderApp();
    } else { alert('Başlık ve Teknolojiler zorunludur!'); }
}

window.addSchool = () => {
    const name = val('school-name');
    const period = val('school-period');
    const gpa = val('school-gpa');
    const desc = val('school-desc');
    const file = document.getElementById('school-file').files[0];

    if (name && period) {
        if (file) {
            const r = new FileReader();
            r.onload = async (e) => { // async eklendi
                db.schools.unshift({ id: Date.now(), name, period, gpa, img: e.target.result, desc });
                await save(); // await eklendi
                alert('Okul Kaydı Şifrelendi ve Kaydedildi.');
                renderApp();
            };
            r.readAsDataURL(file);
        } else {
            db.schools.unshift({ id: Date.now(), name, period, gpa, img: 'https://via.placeholder.com/600x400?text=SCHOOL+LOGO', desc });
            save();
            alert('Okul Kaydı Şifrelendi ve Kaydedildi.');
            renderApp();
        }
    } else { alert('Okul Adı ve Dönem zorunludur!'); }
}


function renderAdminList(containerId, dataArray, deleteHandlerName) {
    const l = document.getElementById(containerId);
    l.innerHTML = '';
    dataArray.forEach(i => {
        const title = i.title || i.name || 'Başlıksız';
        const li = document.createElement('li');
        li.innerHTML = `<span style="color:white">${title}</span> <button onclick="${deleteHandlerName}(${i.id})" style="color:red;background:none;border:none;cursor:pointer;">[SİL]</button>`;
        li.style.borderBottom = '1px solid #333'; li.style.padding='5px'; li.style.display='flex'; li.style.justifyContent='space-between';
        l.appendChild(li);
    });
}

window.delItem = async (id) => {
    if(confirm('Kalıcı olarak silinsin mi?')) {
        db.library = db.library.filter(x => x.id !== id);
        await save();
        renderApp();
    }
}

window.delProject = async (id) => {
    if (confirm('Bu proje kaydını silmek istediğinizden emin misiniz?')) {
        db.projects = db.projects.filter(x => x.id !== id);
        await save();
        renderApp();
    }
}

window.delSchool = async (id) => { 
    if (confirm('Bu okul kaydını kalıcı olarak silmek istediğinizden emin misiniz?')) {
        db.schools = db.schools.filter(x => x.id !== id);
        await save();
        renderApp();
    }
}

window.saveSettings = async () => {
    // Profil güncellemeleri
    db.profile.name = val('set-name');
    db.profile.subtitle = val('set-sub');
    db.profile.about = val('set-about');
    db.profile.instagram = val('set-insta');
    db.profile.phone = val('set-phone');
    db.profile.email = val('set-email-contact');

    const f = document.getElementById('set-logo').files[0];
    if(f) {
        const r = new FileReader();
        r.onload = async (e) => {
            db.profile.logo = e.target.result;
            await save();
            renderApp();
            alert('Profil Güncellendi ve UI Yenilendi!');
        };
        r.readAsDataURL(f);
    } else {
        await save();
        renderApp();
        alert('Profil Güncellendi!');
    }
}

window.saveSecurity = async () => {
    db.auth.email = val('set-admin-email');
    db.auth.pass = val('set-admin-pass');
    await save();
    logout();
    alert('Güvenlik Protokolleri Değişti. Tekrar Giriş Yapın.');
}

function fillAdminForms() {
    document.getElementById('set-name').value = db.profile.name;
    document.getElementById('set-sub').value = db.profile.subtitle;
    document.getElementById('set-about').value = db.profile.about;
    document.getElementById('set-insta').value = db.profile.instagram;
    document.getElementById('set-phone').value = db.profile.phone;
    document.getElementById('set-admin-email').value = db.auth.email;
    document.getElementById('set-admin-pass').value = db.auth.pass;
    document.getElementById('set-email-contact').value = db.profile.email;

    renderAdminList('admin-list', db.library, 'delItem');
    renderAdminList('admin-project-list', db.projects, 'delProject');
    renderAdminList('admin-school-list', db.schools, 'delSchool'); 
}

/* --- MODAL DETAYLARI --- */
window.openDetail = (item) => {
    setSrc('d-img', item.img);
    setText('d-title', item.title);
    setText('d-type', item.type);
    setText('d-desc', item.desc);
    
    const linkEl = document.getElementById('d-link');
    if (item.link && item.link !== '#') {
        linkEl.href = item.link;
        linkEl.style.display = 'block';
    } else {
        linkEl.style.display = 'none';
    }
    
    openModal('modal-detail');
}

window.openProjectDetail = (item) => {
    setText('pd-title', item.title);
    setText('pd-desc', item.desc);
    document.getElementById('pd-link').href = item.link;
    
    const techsDiv = document.getElementById('pd-techs');
    techsDiv.innerHTML = item.techs.map(t => `<span class="tech-badge">${t}</span>`).join('');
    
    openModal('modal-project-detail');
}

window.openSchoolDetail = (item) => {
    setText('sd-title', item.name);
    setSrc('sd-img', item.img);
    setText('sd-period', item.period);
    setText('sd-gpa', 'Ortalama: ' + item.gpa);
    setText('sd-desc', item.desc);
    openModal('modal-school-detail');
}


/* --- NAVİGASYON & UX İYİLEŞTİRMELERİ --- */
window.navigate = (viewId) => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    const targetButton = event.currentTarget;
    if (targetButton) {
        targetButton.classList.add('active');
    }

    if (viewId === 'about') {
         typeWriterEffect(db.profile.about, 'about-text');
    } else {
        setText('about-text', db.profile.about);
    }
}

window.simulateSend = () => {
    const btn = event.target;
    const original = btn.innerText;
    btn.innerText = 'ENCRYPTING & SENDING...';
    btn.disabled = true;
    setTimeout(() => {
        alert('Mesaj güvenli sunucuya iletildi.');
        btn.innerText = original;
        btn.disabled = false;
        document.querySelectorAll('.form-input').forEach(i => i.value = '');
    }, 2000);
}

function typeWriterEffect(text, elementId) {
    let i = 0;
    const el = document.getElementById(elementId);
    el.innerHTML = '';
    function type() {
        if (i < text.length) {
            el.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, 30);
        }
    }
    type();
}

/* --- ORTAK --- */
const val = (id) => document.getElementById(id).value;
const setText = (id, txt) => document.getElementById(id).innerText = txt;
const setSrc = (id, src) => document.getElementById(id).src = src;

window.logout = () => { isAuth = false; closeModal('modal-admin'); };

// Modal Yönetimi
document.getElementById('admin-btn').onclick = () => {
    if (isAuth) {
        openModal('modal-admin');
        fillAdminForms(); 
    } else {
        openModal('modal-login');
    }
};
document.querySelectorAll('.close').forEach(x => x.onclick = (e) => e.target.closest('.modal').style.display='none');
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
window.switchTab = (id) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(event && event.target) event.target.classList.add('active');
    
    if (id === 'tab-profile' || id === 'tab-security' || id === 'tab-projects' || id === 'tab-schools') {
        fillAdminForms();
    }
}

function setupCursor() {
    const dot = document.getElementById('cursor-dot');
    const out = document.getElementById('cursor-outline');
    window.onmousemove = (e) => {
        dot.style.top = e.clientY + 'px'; dot.style.left = e.clientX + 'px';
        out.animate({ left: `${e.clientX}px`, top: `${e.clientY}px` }, { duration: 500, fill: "forwards" });
    }
}