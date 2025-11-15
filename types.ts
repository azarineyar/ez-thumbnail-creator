export interface ImageObject {
    data: string; // base64 string without prefix
    mimeType: string; // e.g., 'image/jpeg'
}

export type GenerationModel = 'gemini' | 'imagen4' | 'imagen4ultra' | 'imagen4fast';

export interface TextEffect {
    enabled: boolean;
    color: string;
    // For stroke
    width: number;
    // For shadow/glow
    blur: number;
    offsetX: number;
    offsetY: number;
    // For Outer Glow intensity
    spread: number;
}

export interface TextLayer {
    id: string;
    text: string;
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    color: string;
    bold: boolean;
    italic: boolean;
    textAlign: 'left' | 'center' | 'right';
    position: { x: number; y: number };
    stroke: TextEffect;
    shadow: TextEffect;
    outerGlow: TextEffect;
}

export interface AppState {
    youtubeUrl: string;
    controlPrompt: string;
    baseImage?: ImageObject;
    overlayImage?: ImageObject;
    displayImage?: ImageObject;
    isLoading: boolean;
    errorMessage?: string;
    promptHistory: string[];
    imageHistory: ImageObject[];
    appMode: 'edit' | 'copy';
    generationModel: GenerationModel;
    textLayers: TextLayer[];
    activeTextLayerId?: string;
    characterReferences: ImageObject[];
}