const API_KEY_STORAGE_KEY = 'gemini-api-key';

export function saveApiKey(apiKey: string): void {
    if (apiKey) {
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
        // If the key is empty, remove it
        localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
}

export function getApiKey(): string | null {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function clearApiKey(): void {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
}
