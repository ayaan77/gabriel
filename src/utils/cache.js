// Cache utility for competitive intelligence reports
// Uses IndexedDB for persistent storage with TTL

const DB_NAME = 'GabrielIntelligence';
const STORE_NAME = 'reports';
const DB_VERSION = 1;
const DEFAULT_TTL_DAYS = 7;

// Initialize IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'domain' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// Get cached intelligence report for a domain
export async function getIntelligence(domain) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(domain);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const result = request.result;
                if (!result) {
                    resolve(null);
                    return;
                }

                // Check if expired
                const now = Date.now();
                const age = now - result.timestamp;
                const maxAge = DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000;

                if (age > maxAge) {
                    // Expired, delete it
                    deleteIntelligence(domain);
                    resolve(null);
                } else {
                    resolve(result.report);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.error('Cache read error:', err);
        return null;
    }
}

// Save intelligence report with timestamp
export async function saveIntelligence(domain, report) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const data = {
            domain,
            report,
            timestamp: Date.now()
        };

        const request = store.put(data);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.error('Cache write error:', err);
        return false;
    }
}

// Delete a specific domain's intelligence
export async function deleteIntelligence(domain) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(domain);
        return true;
    } catch (err) {
        console.error('Cache delete error:', err);
        return false;
    }
}

// Clear all expired cache entries
export async function clearOldCache() {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('timestamp');

        const now = Date.now();
        const maxAge = DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000;
        const cutoff = now - maxAge;

        const request = index.openCursor();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.timestamp < cutoff) {
                    cursor.delete();
                }
                cursor.continue();
            }
        };

        return true;
    } catch (err) {
        console.error('Cache cleanup error:', err);
        return false;
    }
}

// Get all cached domains (for debugging)
export async function getAllCachedDomains() {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.error('Cache list error:', err);
        return [];
    }
}
