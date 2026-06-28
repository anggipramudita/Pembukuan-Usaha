// Global State
let currentUser = null;
let currentRoute = 'dashboard';
let chartInstance = null; // For destroying previous chart

// Utilities
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
};
const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

// DOM Elements
const appWrapper = document.getElementById('app-wrapper');
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const viewContainer = document.getElementById('view-container');
const pageTitle = document.getElementById('page-title');
const navLinks = document.querySelectorAll('.nav-links li[data-route]');
const themeIcon = document.getElementById('theme-icon');
const btnLogout = document.getElementById('btn-logout');

// Initialization
async function initApp() {
    // Check if already logged in via localStorage (for simple persistence)
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        showMainApp();
    }
    
    // Apply theme
    const theme = await db.get('settings', 'theme') || { value: 'light' };
    document.body.className = theme.value + '-mode';
    themeIcon.className = theme.value === 'dark' ? 'bx bx-sun' : 'bx bx-moon';

    // Update Brand
    const brand = await db.get('settings', 'businessName');
    if(brand) document.getElementById('brand-name').innerText = brand.value;
}

// Authentication
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userInp = document.getElementById('login-username').value.trim().toLowerCase();
    const passInp = document.getElementById('login-password').value;

    const user = await db.get('users', userInp);
    if (user && user.password === passInp) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showMainApp();
    } else {
        alert('Username atau password salah! (Coba admin/password123)');
    }
});

document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;

    if (!username) return alert('Username tidak boleh kosong');

    const existingUser = await db.get('users', username);
    if (existingUser) {
        alert('Username sudah digunakan! Silakan gunakan username lain.');
        return;
    }

    const newUser = {
        username,
        password,
        name,
        role: 'Owner'
    };

    await db.add('users', newUser);
    alert('Akun berhasil dibuat! Silakan login menggunakan username dan password Anda.');
    registerForm.reset();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

btnLogout.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    currentUser = null;
    appWrapper.classList.add('hidden');
    loginScreen.classList.remove('hidden');
});

function showMainApp() {
    loginScreen.classList.add('hidden');
    appWrapper.classList.remove('hidden');
    
    document.getElementById('current-user-name').innerText = currentUser.name;
    document.getElementById('current-user-role').innerText = currentUser.role;
    
    // Admin only links
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = currentUser.role === 'Owner' || currentUser.role === 'Admin' ? 'block' : 'none';
    });

    renderView(currentRoute);
}

// Sidebar Toggle
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

document.getElementById('sidebar-toggle').addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('active');
        if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    } else {
        sidebar.classList.toggle('collapsed');
    }
});
window.toggleMobileSidebar = () => {
    const sb = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
};

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
}

// Theme Toggle
document.querySelector('.theme-toggle').addEventListener('click', async () => {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    document.body.className = newTheme + '-mode';
    themeIcon.className = newTheme === 'dark' ? 'bx bx-sun' : 'bx bx-moon';
    await db.put('settings', { key: 'theme', value: newTheme });
});

// Routing
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        currentRoute = link.getAttribute('data-route');
        
        if (window.innerWidth <= 768 && sidebar && sidebarOverlay) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        } else if (window.innerWidth > 768 && sidebar && sidebar.classList.contains('collapsed')) {
            // Expand sidebar if an icon is clicked while collapsed on desktop
            sidebar.classList.remove('collapsed');
        }

        renderView(currentRoute);
    });
});

async function renderView(route) {
    const titles = {
        'dashboard': 'Dashboard',
        'pemasukan': 'Data Pemasukan',
        'pengeluaran': 'Data Pengeluaran',
        'hutang': 'Kelola Hutang',
        'piutang': 'Kelola Piutang',
        'kas-bank': 'Kas & Rekening Bank',
        'kategori': 'Kategori Transaksi',
        'laporan': 'Laporan Keuangan',
        'data-usaha': 'Profil Data Usaha',
        'users': 'Manajemen Pengguna',
        'pengaturan': 'Pengaturan Sistem'
    };
    pageTitle.innerText = titles[route] || 'Dashboard';
    viewContainer.innerHTML = '<div style="text-align:center; padding:50px;"><i class="bx bx-loader-alt bx-spin" style="font-size:40px; color:var(--primary)"></i></div>';

    try {
        switch (route) {
            case 'dashboard': await renderDashboard(); break;
            case 'pemasukan': await renderTransaksi('pemasukan'); break;
            case 'pengeluaran': await renderTransaksi('pengeluaran'); break;
            case 'hutang': await renderHutangPiutang('debts'); break;
            case 'piutang': await renderHutangPiutang('receivables'); break;
            case 'kategori': await renderKategori(); break;
            case 'laporan': await renderLaporan(); break;
            case 'data-usaha': await renderDataUsaha(); break;
            case 'pengaturan': await renderPengaturan(); break;
            default:
                viewContainer.innerHTML = `<div class="glass-effect" style="padding:40px; border-radius:20px; text-align:center;">
                    <h3>Modul ${titles[route]} sedang dalam pengembangan</h3>
                </div>`;
        }
    } catch (error) {
        console.error("Error rendering view:", error);
        viewContainer.innerHTML = `<div style="color:var(--danger)">Error memuat halaman.</div>`;
    }
}

// =========================================
// MODULES IMPLEMENTATION
// =========================================

// 1. DASHBOARD
async function renderDashboard() {
    const trx = await db.getAll('transactions');
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    
    // Last 7 days data for chart
    const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const chartData = { pemasukan: Array(7).fill(0), pengeluaran: Array(7).fill(0) };

    trx.forEach(t => {
        const amt = parseFloat(t.amount);
        if (t.type === 'pemasukan') totalPemasukan += amt;
        else if (t.type === 'pengeluaran') totalPengeluaran += amt;

        const dayIdx = last7Days.indexOf(t.date);
        if(dayIdx !== -1) {
            if(t.type === 'pemasukan') chartData.pemasukan[dayIdx] += amt;
            else chartData.pengeluaran[dayIdx] += amt;
        }
    });

    const labaBersih = totalPemasukan - totalPengeluaran;
    
    // Hutang Piutang Summary
    const debts = await db.getAll('debts');
    const receivables = await db.getAll('receivables');
    const totalHutang = debts.filter(d => d.status === 'belum').reduce((acc, d) => acc + parseFloat(d.amount), 0);
    const totalPiutang = receivables.filter(r => r.status === 'belum').reduce((acc, r) => acc + parseFloat(r.amount), 0);

    const html = `
        <div class="grid-cards">
            <div class="stat-card">
                <div class="stat-icon primary"><i class='bx bx-wallet'></i></div>
                <div class="stat-info">
                    <p>Laba Bersih</p>
                    <h3>${formatCurrency(labaBersih)}</h3>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon success"><i class='bx bx-trending-up'></i></div>
                <div class="stat-info">
                    <p>Total Pemasukan</p>
                    <h3>${formatCurrency(totalPemasukan)}</h3>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon danger"><i class='bx bx-trending-down'></i></div>
                <div class="stat-info">
                    <p>Total Pengeluaran</p>
                    <h3>${formatCurrency(totalPengeluaran)}</h3>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon warning"><i class='bx bx-credit-card'></i></div>
                <div class="stat-info">
                    <p>Hutang Berjalan</p>
                    <h3>${formatCurrency(totalHutang)}</h3>
                </div>
            </div>
        </div>

        <div class="grid-charts">
            <div class="chart-card">
                <div class="chart-header">
                    <h3>Grafik 7 Hari Terakhir</h3>
                </div>
                <canvas id="mainChart" height="100"></canvas>
            </div>
            <div class="chart-card">
                <div class="chart-header">
                    <h3>Transaksi Terbaru</h3>
                </div>
                <div style="overflow-x:auto;">
                    <table style="font-size:12px;">
                        ${trx.sort((a,b) => b.id - a.id).slice(0, 5).map(t => `
                            <tr>
                                <td data-label="Tanggal">${formatDate(t.date)}</td>
                                <td data-label="Nominal" style="color: ${t.type === 'pemasukan' ? 'var(--success)' : 'var(--danger)'}">
                                    ${t.type === 'pemasukan' ? '+' : '-'}${formatCurrency(t.amount)}
                                </td>
                            </tr>
                        `).join('')}
                        ${trx.length === 0 ? '<tr><td>Belum ada transaksi</td></tr>' : ''}
                    </table>
                </div>
            </div>
        </div>
    `;
    viewContainer.innerHTML = html;

    // Render Chart.js
    if (chartInstance) chartInstance.destroy();
    const ctx = document.getElementById('mainChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.map(d => d.substr(5)), // MM-DD
            datasets: [
                {
                    label: 'Pemasukan',
                    data: chartData.pemasukan,
                    borderColor: '#05cd99',
                    backgroundColor: 'rgba(5, 205, 153, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Pengeluaran',
                    data: chartData.pengeluaran,
                    borderColor: '#ee5d50',
                    backgroundColor: 'rgba(238, 93, 80, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// 2. TRANSAKSI (Pemasukan / Pengeluaran)
async function renderTransaksi(type) {
    const isPemasukan = type === 'pemasukan';
    const allTrx = await db.getAll('transactions');
    const trx = allTrx.filter(t => t.type === type).sort((a,b) => b.id - a.id);
    const categories = (await db.getAll('categories')).filter(c => c.type === type);

    const html = `
        <div class="mb-20 text-right">
            <button class="btn btn-primary" onclick="openModal('${type}Modal')">
                <i class='bx bx-plus'></i> Tambah ${isPemasukan ? 'Pemasukan' : 'Pengeluaran'}
            </button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Kategori</th>
                        <th>Keterangan</th>
                        <th>Nominal</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${trx.map(t => `
                        <tr>
                            <td data-label="Tanggal">${formatDate(t.date)}</td>
                            <td data-label="Kategori"><span class="badge" style="background:var(--secondary)">${t.category}</span></td>
                            <td data-label="Keterangan">${t.note}</td>
                            <td data-label="Nominal" style="color: ${isPemasukan ? 'var(--success)' : 'var(--danger)'}">
                                ${formatCurrency(t.amount)}
                            </td>
                            <td data-label="Aksi">
                                <button class="btn btn-danger" style="padding:5px 10px;" onclick="deleteRecord('transactions', ${t.id}, '${type}')"><i class='bx bx-trash'></i></button>
                            </td>
                        </tr>
                    `).join('')}
                    ${trx.length === 0 ? '<tr><td colspan="5" class="text-center">Tidak ada data</td></tr>' : ''}
                </tbody>
            </table>
        </div>

        <!-- Modal -->
        <div id="${type}Modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Tambah ${isPemasukan ? 'Pemasukan' : 'Pengeluaran'}</h3>
                    <button class="close-modal" onclick="closeModal('${type}Modal')">&times;</button>
                </div>
                <form id="form-${type}">
                    <div class="form-group">
                        <label>Tanggal</label>
                        <input type="date" id="${type}-date" required value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label>Kategori</label>
                        <select id="${type}-category" required>
                            <option value="">Pilih Kategori</option>
                            ${categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Nominal</label>
                        <input type="number" id="${type}-amount" required min="0">
                    </div>
                    <div class="form-group">
                        <label>Keterangan / Catatan</label>
                        <input type="text" id="${type}-note" required>
                    </div>
                    <div class="form-group">
                        <label>Upload Bukti (Opsional)</label>
                        <input type="file" id="${type}-file" accept="image/*">
                    </div>
                    <button type="submit" class="btn btn-primary w-100">Simpan Transaksi</button>
                </form>
            </div>
        </div>
    `;
    viewContainer.innerHTML = html;

    document.getElementById(`form-${type}`).addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById(`${type}-date`).value;
        const category = document.getElementById(`${type}-category`).value;
        const amount = document.getElementById(`${type}-amount`).value;
        const note = document.getElementById(`${type}-note`).value;
        const fileInput = document.getElementById(`${type}-file`);
        
        let fileBase64 = null;
        if (fileInput.files.length > 0) {
            fileBase64 = await getBase64(fileInput.files[0]);
        }

        await db.add('transactions', {
            type: type,
            date, category, amount: parseFloat(amount), note, fileBase64,
            createdAt: new Date().toISOString()
        });

        closeModal(`${type}Modal`);
        renderView(type);
    });
}

// 3. HUTANG & PIUTANG
async function renderHutangPiutang(storeName) {
    const isHutang = storeName === 'debts';
    const label = isHutang ? 'Hutang' : 'Piutang';
    const records = await db.getAll(storeName);

    const html = `
        <div class="mb-20 text-right">
            <button class="btn btn-primary" onclick="openModal('${storeName}Modal')">
                <i class='bx bx-plus'></i> Tambah ${label}
            </button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>${isHutang ? 'Pemberi Hutang' : 'Pelanggan'}</th>
                        <th>Jatuh Tempo</th>
                        <th>Nominal</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr>
                            <td data-label="Nama">${r.name}</td>
                            <td data-label="Jatuh Tempo">${formatDate(r.dueDate)}</td>
                            <td data-label="Nominal">${formatCurrency(r.amount)}</td>
                            <td data-label="Status">
                                <span class="badge ${r.status === 'lunas' ? 'success' : 'warning'}">
                                    ${r.status.toUpperCase()}
                                </span>
                            </td>
                            <td data-label="Aksi">
                                ${r.status === 'belum' ? `<button class="btn btn-success" style="padding:5px 10px; margin-right:5px;" onclick="markAsPaid('${storeName}', ${r.id}, '${storeName === 'debts' ? 'hutang' : 'piutang'}')"><i class='bx bx-check'></i> Lunas</button>` : ''}
                                <button class="btn btn-danger" style="padding:5px 10px;" onclick="deleteRecord('${storeName}', ${r.id}, '${storeName === 'debts' ? 'hutang' : 'piutang'}')"><i class='bx bx-trash'></i></button>
                            </td>
                        </tr>
                    `).join('')}
                    ${records.length === 0 ? '<tr><td colspan="5" class="text-center">Tidak ada data</td></tr>' : ''}
                </tbody>
            </table>
        </div>

        <div id="${storeName}Modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Tambah ${label}</h3>
                    <button class="close-modal" onclick="closeModal('${storeName}Modal')">&times;</button>
                </div>
                <form id="form-${storeName}">
                    <div class="form-group">
                        <label>Nama ${isHutang ? 'Pemberi Hutang' : 'Pelanggan'}</label>
                        <input type="text" id="${storeName}-name" required>
                    </div>
                    <div class="form-group">
                        <label>Nominal</label>
                        <input type="number" id="${storeName}-amount" required min="0">
                    </div>
                    <div class="form-group">
                        <label>Tanggal Jatuh Tempo</label>
                        <input type="date" id="${storeName}-due" required>
                    </div>
                    <button type="submit" class="btn btn-primary w-100">Simpan</button>
                </form>
            </div>
        </div>
    `;
    viewContainer.innerHTML = html;

    document.getElementById(`form-${storeName}`).addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById(`${storeName}-name`).value;
        const amount = document.getElementById(`${storeName}-amount`).value;
        const dueDate = document.getElementById(`${storeName}-due`).value;
        
        await db.add(storeName, {
            name, amount: parseFloat(amount), dueDate, status: 'belum'
        });

        closeModal(`${storeName}Modal`);
        renderView(storeName === 'debts' ? 'hutang' : 'piutang');
    });
}

window.markAsPaid = async (storeName, id, routeName) => {
    if(confirm('Tandai sebagai lunas?')) {
        const record = await db.get(storeName, id);
        record.status = 'lunas';
        await db.put(storeName, record);
        
        // Optional: create auto transaction here
        renderView(routeName);
    }
}

// 4. KATEGORI
async function renderKategori() {
    const cats = await db.getAll('categories');
    const html = `
        <div class="grid-charts">
            <div class="chart-card">
                <h3>Tambah Kategori</h3>
                <form id="form-cat" style="margin-top:20px;">
                    <div class="form-group">
                        <label>Nama Kategori</label>
                        <input type="text" id="cat-name" required>
                    </div>
                    <div class="form-group">
                        <label>Tipe</label>
                        <select id="cat-type" required>
                            <option value="pemasukan">Pemasukan</option>
                            <option value="pengeluaran">Pengeluaran</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary w-100">Tambah</button>
                </form>
            </div>
            <div class="table-container">
                <table style="font-size:13px;">
                    <thead><tr><th>Nama</th><th>Tipe</th><th>Aksi</th></tr></thead>
                    <tbody>
                        ${cats.map(c => `
                            <tr>
                                <td data-label="Nama">${c.name}</td>
                                <td data-label="Tipe"><span class="badge ${c.type==='pemasukan'?'success':'danger'}">${c.type.toUpperCase()}</span></td>
                                <td data-label="Aksi"><button class="btn btn-danger" style="padding:4px 8px;" onclick="deleteRecord('categories', ${c.id}, 'kategori')"><i class='bx bx-trash'></i></button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    viewContainer.innerHTML = html;

    document.getElementById('form-cat').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('cat-name').value;
        const type = document.getElementById('cat-type').value;
        await db.add('categories', { name, type });
        renderView('kategori');
    });
}

// 5. LAPORAN & EXPORT
async function renderLaporan() {
    const html = `
        <div class="chart-card">
            <div class="filters-bar">
                <div class="form-group" style="margin-bottom:0; flex:1;">
                    <label>Mulai Tanggal</label>
                    <input type="date" id="filter-start">
                </div>
                <div class="form-group" style="margin-bottom:0; flex:1;">
                    <label>Sampai Tanggal</label>
                    <input type="date" id="filter-end">
                </div>
                <button class="btn btn-primary" onclick="generateReport()"><i class='bx bx-filter'></i> Tampilkan</button>
                <button class="btn btn-danger" onclick="exportPDF()"><i class='bx bxs-file-pdf'></i> Export PDF</button>
                <button class="btn btn-success" onclick="exportExcel()"><i class='bx bx-spreadsheet'></i> Export Excel</button>
            </div>
            
            <div id="report-result" class="table-container" style="margin-top:20px;">
                <p class="text-center text-muted">Silakan atur tanggal dan klik Tampilkan.</p>
            </div>
        </div>
    `;
    viewContainer.innerHTML = html;
}

window.generateReport = async () => {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    
    let trx = await db.getAll('transactions');
    if (start) trx = trx.filter(t => t.date >= start);
    if (end) trx = trx.filter(t => t.date <= end);
    
    // Sort by date
    trx.sort((a,b) => new Date(a.date) - new Date(b.date));

    let html = `
        <table id="report-table">
            <thead>
                <tr>
                    <th>Tanggal</th>
                    <th>Tipe</th>
                    <th>Kategori</th>
                    <th>Keterangan</th>
                    <th>Pemasukan</th>
                    <th>Pengeluaran</th>
                </tr>
            </thead>
            <tbody>
    `;
    let totalIn = 0; let totalOut = 0;
    trx.forEach(t => {
        if(t.type === 'pemasukan') totalIn += t.amount;
        else totalOut += t.amount;
        
        html += `
            <tr>
                <td data-label="Tanggal">${formatDate(t.date)}</td>
                <td data-label="Tipe">${t.type === 'pemasukan' ? 'In' : 'Out'}</td>
                <td data-label="Kategori">${t.category}</td>
                <td data-label="Keterangan">${t.note}</td>
                <td data-label="Pemasukan" style="color:var(--success)">${t.type === 'pemasukan' ? formatCurrency(t.amount) : '-'}</td>
                <td data-label="Pengeluaran" style="color:var(--danger)">${t.type === 'pengeluaran' ? formatCurrency(t.amount) : '-'}</td>
            </tr>
        `;
    });
    html += `
            <tr style="font-weight:bold; background:var(--secondary)">
                <td colspan="4" class="text-right">TOTAL</td>
                <td style="color:var(--success)">${formatCurrency(totalIn)}</td>
                <td style="color:var(--danger)">${formatCurrency(totalOut)}</td>
            </tr>
            <tr style="font-weight:bold; font-size:16px;">
                <td colspan="4" class="text-right">LABA BERSIH</td>
                <td colspan="2" class="text-center">${formatCurrency(totalIn - totalOut)}</td>
            </tr>
            </tbody>
        </table>
    `;
    document.getElementById('report-result').innerHTML = html;
}

window.exportPDF = () => {
    if(typeof window.jspdf === 'undefined') return alert('Library PDF belum dimuat.');
    const doc = new window.jspdf.jsPDF();
    doc.text("Laporan Keuangan", 14, 15);
    
    doc.autoTable({
        html: '#report-table',
        startY: 25,
        theme: 'grid'
    });
    doc.save('Laporan_Keuangan.pdf');
}

window.exportExcel = () => {
    if(typeof XLSX === 'undefined') return alert('Library Excel belum dimuat.');
    const table = document.getElementById('report-table');
    if(!table) return alert('Tampilkan laporan terlebih dahulu.');
    
    const wb = XLSX.utils.table_to_book(table, {sheet: "Laporan"});
    XLSX.writeFile(wb, 'Laporan_Keuangan.xlsx');
}

// 6. PENGATURAN (Backup & Data Usaha)
async function renderDataUsaha() {
    const brand = await db.get('settings', 'businessName') || { value: '' };
    const address = await db.get('settings', 'address') || { value: '' };
    const phone = await db.get('settings', 'phone') || { value: '' };
    
    const html = `
        <div class="chart-card" style="max-width:600px; margin:0 auto;">
            <div class="chart-header"><h3>Profil Data Usaha</h3></div>
            <form id="form-usaha">
                <div class="form-group">
                    <label>Nama Usaha</label>
                    <input type="text" id="us-name" value="${brand.value}" required>
                </div>
                <div class="form-group">
                    <label>Alamat</label>
                    <textarea id="us-address" rows="3">${address.value}</textarea>
                </div>
                <div class="form-group">
                    <label>Telepon</label>
                    <input type="text" id="us-phone" value="${phone.value}">
                </div>
                <button type="submit" class="btn btn-primary w-100">Simpan Perubahan</button>
            </form>
        </div>
    `;
    viewContainer.innerHTML = html;

    document.getElementById('form-usaha').addEventListener('submit', async(e) => {
        e.preventDefault();
        await db.put('settings', { key: 'businessName', value: document.getElementById('us-name').value });
        await db.put('settings', { key: 'address', value: document.getElementById('us-address').value });
        await db.put('settings', { key: 'phone', value: document.getElementById('us-phone').value });
        alert('Data usaha disimpan.');
        initApp(); // Refresh sidebar brand
    });
}

async function renderPengaturan() {
    const html = `
        <div class="grid-charts">
            <div class="chart-card">
                <h3>Backup & Restore Database</h3>
                <p style="color:var(--text-muted); font-size:14px; margin: 10px 0 20px;">
                    Amankan data Anda dengan menyimpannya ke file lokal, atau pulihkan data dari file backup.
                </p>
                <div class="d-flex gap-10">
                    <button class="btn btn-primary" onclick="backupDB()"><i class='bx bx-download'></i> Backup Data (.json)</button>
                    <div class="file-upload-wrapper" style="padding:10px; flex:1;">
                        <input type="file" id="restore-file" accept=".json" onchange="restoreDB(this)">
                        <span><i class='bx bx-upload'></i> Restore Data</span>
                    </div>
                </div>
                <div style="margin-top:30px; border-top:1px solid var(--border); padding-top:20px;">
                    <h3 style="color:var(--danger)">Reset Sistem</h3>
                    <p style="color:var(--text-muted); font-size:14px; margin: 10px 0 20px;">Hapus seluruh data (Transaksi, Hutang, Piutang) secara permanen.</p>
                    <button class="btn btn-danger" onclick="resetDB()"><i class='bx bx-trash'></i> Hapus Semua Data</button>
                </div>
            </div>
        </div>
    `;
    viewContainer.innerHTML = html;
}

window.backupDB = async () => {
    const data = {
        transactions: await db.getAll('transactions'),
        categories: await db.getAll('categories'),
        debts: await db.getAll('debts'),
        receivables: await db.getAll('receivables'),
        settings: await db.getAll('settings'),
        users: await db.getAll('users'),
    };
    const blob = new Blob([JSON.stringify(data)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Pembukuan_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

window.restoreDB = async (input) => {
    if(input.files.length === 0) return;
    if(confirm('Peringatan: Merestore data akan menimpa data saat ini. Lanjutkan?')) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                await db.clear('transactions'); for(let i of data.transactions||[]) await db.add('transactions', i);
                await db.clear('categories'); for(let i of data.categories||[]) await db.add('categories', i);
                await db.clear('debts'); for(let i of data.debts||[]) await db.add('debts', i);
                await db.clear('receivables'); for(let i of data.receivables||[]) await db.add('receivables', i);
                await db.clear('settings'); for(let i of data.settings||[]) await db.put('settings', i);
                alert('Restore berhasil. Halaman akan dimuat ulang.');
                location.reload();
            } catch (err) {
                alert('Gagal merestore: Format file tidak valid.');
            }
        };
        reader.readAsText(file);
    }
}

window.resetDB = async () => {
    if(confirm('APAKAH ANDA YAKIN? Semua data akan hilang!')) {
        if(confirm('Sekali lagi, data tidak dapat dikembalikan. Lanjut?')) {
            await db.clear('transactions');
            await db.clear('debts');
            await db.clear('receivables');
            alert('Data berhasil direset.');
            renderView('dashboard');
        }
    }
}

// Global Modal Handlers
window.openModal = (id) => document.getElementById(id).classList.add('active');
window.closeModal = (id) => document.getElementById(id).classList.remove('active');
window.deleteRecord = async (store, id, routeName) => {
    if(confirm('Hapus data ini?')) {
        await db.delete(store, id);
        renderView(routeName);
    }
};

// Start
initApp();
