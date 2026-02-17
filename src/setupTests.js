import '@testing-library/jest-dom';

// Mock chrome API
global.chrome = {
    storage: {
        local: {
            get: vi.fn((keys, cb) => cb({})),
            set: vi.fn(),
            remove: vi.fn(),
        },
    },
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
    },
    tabs: {
        query: vi.fn(),
        sendMessage: vi.fn(),
        create: vi.fn(),
    },
    scripting: {
        executeScript: vi.fn(),
    },
    windows: {
        getCurrent: vi.fn(),
    },
    sidePanel: {
        open: vi.fn(),
    }
};
