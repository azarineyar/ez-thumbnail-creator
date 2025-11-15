
export function extractYouTubeVideoId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return match[2];
    }
    return null;
}

export async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string; }> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    const [prefix, data] = reader.result.split(',');
                    const mimeMatch = prefix.match(/:(.*?);/);
                    if (!mimeMatch || !data) {
                         reject('Failed to parse data URL');
                         return;
                    }
                    resolve({ data, mimeType: mimeMatch[1] });
                } else {
                    reject('Failed to read blob as base64 string');
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Failed to fetch image as base64:", error);
        throw error;
    }
}