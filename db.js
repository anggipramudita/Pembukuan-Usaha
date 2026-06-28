const DB_NAME = 'PembukuanDB';
const DB_VERSION = 1;

class Database {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("Database error: ", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Transaksi (Pemasukan & Pengeluaran)
                if (!db.objectStoreNames.contains('transactions')) {
                    const store = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('type', 'type', { unique: false }); // 'pemasukan' or 'pengeluaran'
                    store.createIndex('date', 'date', { unique: false });
                }

                // Kategori
                if (!db.objectStoreNames.contains('categories')) {
                    const store = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('type', 'type', { unique: false });
                }

                // Hutang
                if (!db.objectStoreNames.contains('debts')) {
                    const store = db.createObjectStore('debts', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('status', 'status', { unique: false }); // 'lunas' or 'belum'
                }

                // Piutang
                if (!db.objectStoreNames.contains('receivables')) {
                    const store = db.createObjectStore('receivables', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('status', 'status', { unique: false });
                }

                // Kas & Bank
                if (!db.objectStoreNames.contains('banks')) {
                    const store = db.createObjectStore('banks', { keyPath: 'id', autoIncrement: true });
                }

                // Settings (Data Usaha, Tema, etc)
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Users
                if (!db.objectStoreNames.contains('users')) {
                    const store = db.createObjectStore('users', { keyPath: 'username' });
                }
            };
        });
    }

    async add(storeName, data) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, key) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

const db = new Database();

// Helper functions to seed initial data if empty
async function seedInitialData() {
    // Check if admin user exists
    const admin = await db.get('users', 'admin');
    if (!admin) {
        await db.add('users', {
            username: 'admin',
            password: 'password123', // In a real app this would be hashed
            name: 'Administrator',
            role: 'Owner' // Owner, Admin, Staff
        });
    }

    // Default Settings
    const businessName = await db.get('settings', 'businessName');
    if (!businessName) {
        await db.put('settings', { key: 'businessName', value: 'Toko Sejahtera' });
        await db.put('settings', { key: 'currency', value: 'IDR' });
        await db.put('settings', { key: 'theme', value: 'light' });
    }

    // Default Categories
    const cats = await db.getAll('categories');
    if (cats.length === 0) {
        const defaultCats = [
            { name: 'Penjualan', type: 'pemasukan' },
            { name: 'Jasa', type: 'pemasukan' },
            { name: 'Belanja Barang', type: 'pengeluaran' },
            { name: 'Gaji', type: 'pengeluaran' },
            { name: 'Listrik & Air', type: 'pengeluaran' },
            { name: 'Operasional', type: 'pengeluaran' }
        ];
        for (let cat of defaultCats) {
            await db.add('categories', cat);
        }
    }
}

// Seed on startup
db.initPromise.then(() => seedInitialData());
