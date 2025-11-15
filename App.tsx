import React, { useState } from 'react';
import { AppState, ImageObject, GenerationModel, TextLayer } from './types';
import { extractYouTubeVideoId, fetchImageAsBase64 } from './utils/imageUtils';
import { editImageWithPrompt, copyImageStyle, generateImageFromPrompt } from './services/geminiService';

import { UrlInput } from './components/UrlInput';
import { Editor } from './components/Editor';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { SettingsModal } from './components/SettingsModal';

const createDefaultTextLayer = (): TextLayer => ({
    id: `text_${Date.now()}`,
    text: 'Teks Kamu di Sini',
    fontFamily: 'Poppins',
    fontSize: 80,
    lineHeight: 1.2,
    color: '#FFFFFF',
    bold: true,
    italic: false,
    textAlign: 'center',
    position: { x: 1280 / 2, y: 100 },
    stroke: { enabled: true, color: '#000000', width: 4, blur:0, offsetX: 0, offsetY: 0, spread: 0 },
    shadow: { enabled: false, color: '#000000', blur: 5, offsetX: 5, offsetY: 5, width: 0, spread: 0 },
    outerGlow: { enabled: false, color: '#FFFFFF', blur: 20, offsetX: 0, offsetY: 0, width: 0, spread: 0 },
});


const initialState: AppState = {
    youtubeUrl: '',
    controlPrompt: '',
    isLoading: false,
    promptHistory: [],
    imageHistory: [],
    appMode: 'edit',
    generationModel: 'gemini',
    textLayers: [],
    activeTextLayerId: undefined,
    characterReferences: [],
};

function fileToBase64(file: File): Promise<ImageObject> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                 const [prefix, data] = reader.result.split(',');
                 const mimeMatch = prefix.match(/:(.*?);/);
                 if (!mimeMatch || !data) {
                      reject('Gagal parse data URL');
                      return;
                 }
                 resolve({ data, mimeType: mimeMatch[1] });
            } else {
                reject('Gagal baca file');
            }
        };
        reader.onerror = error => reject(error);
    });
}

function App() {
    const [state, setState] = useState<AppState>(initialState);

    const getYouTubeThumbnail = async (videoId: string): Promise<ImageObject> => {
        const potentialUrls = [
            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        ];
    
        const oembedUrl = `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`;
        try {
            const oembedResponse = await fetch(oembedUrl);
            if (oembedResponse.ok) {
                const oembedData = await oembedResponse.json();
                const guaranteedUrl = oembedData.thumbnail_url;
                if (guaranteedUrl && !potentialUrls.includes(guaranteedUrl)) {
                    potentialUrls.push(guaranteedUrl);
                }
            } else {
                 console.warn('oEmbed request failed; video may be private or unlisted. Relying on direct URLs.');
            }
        } catch (error) {
            console.warn('oEmbed request failed, likely a network issue. Relying on direct URLs.');
        }
    
        for (const url of potentialUrls) {
            try {
                const image = await fetchImageAsBase64(url);
                return image;
            } catch (error) {
                console.warn(`Could not fetch thumbnail from ${url}. Trying next...`);
            }
        }
    
        throw new Error('Gagal ambil thumbnail video ini. Mungkin videonya private, dihapus, atau link-nya salah.');
    };

    const getImageFromUrl = async (url: string): Promise<ImageObject> => {
        const videoId = extractYouTubeVideoId(url);
        if (videoId) {
            return getYouTubeThumbnail(videoId);
        } else {
            return fetchImageAsBase64(url);
        }
    };

    const handleReset = () => {
        setState(prev => ({...initialState, appMode: prev.appMode, generationModel: prev.generationModel}));
    };
    
    const handleUndo = () => {
        if (state.imageHistory.length <= 1) return;

        const newImageHistory = [...state.imageHistory];
        newImageHistory.pop();

        const newPromptHistory = [...state.promptHistory];
        newPromptHistory.pop();

        setState(prev => ({
            ...prev,
            imageHistory: newImageHistory,
            promptHistory: newPromptHistory,
            displayImage: newImageHistory[newImageHistory.length - 1],
            errorMessage: undefined,
        }));
    };

    const setError = (message: string) => {
        setState(prev => ({ ...prev, isLoading: false, errorMessage: message }));
    };

    const parseErrorMessage = (error: any): string | null => {
        if (!(error instanceof Error)) return null;

        try {
            // Gemini API errors are often JSON strings inside the message property
            const errorJson = JSON.parse(error.message);
            const details = errorJson.error;

            if (details && details.message) {
                if (details.status === 'UNAVAILABLE' || details.code === 503) {
                    return 'Model AI lagi sibuk banget. Coba beberapa saat lagi atau ganti model lain, ya.';
                }
                // A more user-friendly message for invalid API key
                if (details.message.includes("API key not valid")) {
                    return 'API Key kamu sepertinya salah. Cek lagi ya.';
                }
                 // For billing errors
                if (details.message.includes("billed users")) {
                    return 'Model ini butuh akun dengan billing aktif. Coba ganti ke model Gemini Flash, ya.';
                }
                return details.message;
            }
        } catch (e) {
            // It's not a JSON string, so we'll just return the raw message
            return error.message;
        }

        return error.message; // Fallback
    };


    const handleGenericError = (error: any, defaultMessage: string) => {
        console.error(error);
        const friendlyMessage = parseErrorMessage(error);
        setError(friendlyMessage || defaultMessage);
    };

    const handleFetchThumbnail = async () => {
        if (!state.youtubeUrl) return;
        setState(prev => ({ ...initialState, youtubeUrl: prev.youtubeUrl, appMode: 'edit', generationModel: prev.generationModel, isLoading: true }));
        
        try {
            const imageObject = await getImageFromUrl(state.youtubeUrl);
            setState(prev => ({
                ...prev,
                isLoading: false,
                baseImage: imageObject,
                displayImage: imageObject,
                imageHistory: [imageObject],
            }));
        } catch (error) {
            handleGenericError(error, 'Gagal ambil gambar. Cek lagi link-nya, ya.');
        }
    };
    
    const handleRecreateThumbnail = async () => {
        if (!state.youtubeUrl) return;
        setState(prev => ({ ...initialState, youtubeUrl: prev.youtubeUrl, appMode: 'copy', generationModel: prev.generationModel, isLoading: true }));

        try {
            const originalThumbnail = await getImageFromUrl(state.youtubeUrl);
            const newImageObject = await copyImageStyle(originalThumbnail, state.generationModel);
            setState(prev => ({
                ...prev,
                isLoading: false,
                baseImage: newImageObject,
                displayImage: newImageObject,
                imageHistory: [newImageObject],
            }));
        } catch (err) {
            handleGenericError(err, 'Gagal bikin ulang thumbnailnya. Coba lagi, yuk.');
        }
    };

    const handleOverlayUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const overlayObject = await fileToBase64(file);
                setState(prev => ({ ...prev, overlayImage: overlayObject }));
            } catch (error) {
                console.error(error);
                setError('Gagal nambahin gambar overlay.');
            }
        }
        event.target.value = '';
    };

    const handleRemoveOverlay = () => {
        setState(prev => ({ ...prev, overlayImage: undefined }));
    };

    const handleGenerate = async () => {
        if (!state.controlPrompt || state.isLoading) return;
        setState(prev => ({ ...prev, isLoading: true, errorMessage: undefined }));
        
        try {
            if (state.baseImage && state.displayImage) {
                const modifiedImageObject = await editImageWithPrompt(state.displayImage, state.controlPrompt, state.generationModel, state.characterReferences);
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    displayImage: modifiedImageObject,
                    promptHistory: [...prev.promptHistory, prev.controlPrompt],
                    imageHistory: [...prev.imageHistory, modifiedImageObject],
                    controlPrompt: '',
                }));
            } else {
                const newImageObject = await generateImageFromPrompt(state.controlPrompt, state.generationModel, state.characterReferences);
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    baseImage: newImageObject,
                    displayImage: newImageObject,
                    imageHistory: [newImageObject],
                    promptHistory: [prev.controlPrompt],
                    controlPrompt: '',
                }));
            }
        } catch (err) {
            handleGenericError(err, 'AI-nya gagal proses prompt kamu. Coba lagi, ya.');
        }
    };


    const handleAddTextLayer = () => {
        const newLayer = createDefaultTextLayer();
        setState(prev => ({
            ...prev,
            textLayers: [...prev.textLayers, newLayer],
            activeTextLayerId: newLayer.id,
        }));
    };

    const handleUpdateTextLayer = (id: string, newProps: Partial<TextLayer>) => {
        setState(prev => ({
            ...prev,
            textLayers: prev.textLayers.map(layer =>
                layer.id === id ? { ...layer, ...newProps } : layer
            ),
        }));
    };

    const handleDeleteTextLayer = (id: string) => {
        setState(prev => ({
            ...prev,
            textLayers: prev.textLayers.filter(layer => layer.id !== id),
            activeTextLayerId: prev.activeTextLayerId === id ? undefined : prev.activeTextLayerId,
        }));
    };

    const handleSelectTextLayer = (id: string | undefined) => {
        setState(prev => ({ ...prev, activeTextLayerId: id }));
    };
    
    const handleCharacterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (state.characterReferences.length >= 6) {
            setError("Maksimal cuma bisa upload 6 foto karakter, ya.");
            return;
        }
        const file = event.target.files?.[0];
        if (file) {
            try {
                const charObject = await fileToBase64(file);
                setState(prev => {
                    const newCharReferences = [...prev.characterReferences, charObject];
                    const newCharIndex = newCharReferences.length;
                    const newCharLabel = `{orang${newCharIndex}}`;
                    
                    const currentPrompt = prev.controlPrompt.trim();
                    const newPrompt = currentPrompt ? `${currentPrompt} ${newCharLabel}` : newCharLabel;

                    return { 
                        ...prev, 
                        characterReferences: newCharReferences,
                        controlPrompt: newPrompt 
                    };
                });
            } catch (error) {
                handleGenericError(error, "Gagal upload foto karakternya.");
            }
        }
        event.target.value = '';
    };

    const handleRemoveCharacter = (index: number) => {
        setState(prev => ({
            ...prev,
            characterReferences: prev.characterReferences.filter((_, i) => i !== index),
        }));
    };

    return (
        <div className="h-screen w-screen bg-gray-100 text-gray-900 flex flex-col p-4 sm:p-6 font-[Poppins]">
            <header className="w-full flex-shrink-0 flex justify-between items-center pb-4">
                 <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center gap-2">
                    <SparklesIcon className="w-7 h-7 text-blue-600"/> EZ Thumbnail Creator
                </h1>
            </header>

            <main className="flex-grow w-full mx-auto flex flex-col lg:flex-row gap-6 overflow-hidden">
                 {state.errorMessage && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg shadow-lg z-50 animate-fade-in"
                         onClick={() => setState(s => ({...s, errorMessage: undefined}))}>
                        <p>{state.errorMessage}</p>
                    </div>
                )}
                <div className="w-full lg:w-[450px] lg:max-w-md flex-shrink-0 flex flex-col">
                    <UrlInput
                        url={state.youtubeUrl}
                        prompt={state.controlPrompt}
                        promptHistory={state.promptHistory}
                        appMode={state.appMode}
                        generationModel={state.generationModel}
                        characterReferences={state.characterReferences}
                        setUrl={url => setState(s => ({ ...s, youtubeUrl: url }))}
                        setPrompt={prompt => setState(s => ({...s, controlPrompt: prompt}))}
                        setAppMode={mode => setState(s => ({...s, appMode: mode}))}
                        setGenerationModel={model => setState(s => ({ ...s, generationModel: model as GenerationModel }))}
                        onFetch={handleFetchThumbnail}
                        onRecreateThumbnail={handleRecreateThumbnail}
                        onGenerate={handleGenerate}
                        onOverlayUpload={handleOverlayUpload}
                        onRemoveOverlay={handleRemoveOverlay}
                        onCharacterUpload={handleCharacterUpload}
                        onRemoveCharacter={handleRemoveCharacter}
                        onUndo={handleUndo}
                        onReset={handleReset}
                        undoDisabled={state.imageHistory.length <= 1 || state.isLoading}
                        isLoading={state.isLoading}
                        hasBaseImage={!!state.baseImage}
                        hasOverlay={!!state.overlayImage}
                        textLayers={state.textLayers}
                        activeTextLayerId={state.activeTextLayerId}
                        onAddText={handleAddTextLayer}
                        onUpdateText={handleUpdateTextLayer}
                        onDeleteText={handleDeleteTextLayer}
                        onSelectText={handleSelectTextLayer}
                    />
                </div>
                <div className="flex-grow w-full min-w-0 h-full">
                    <Editor
                        displayImage={state.displayImage}
                        overlayImage={state.overlayImage}
                        textLayers={state.textLayers}
                        activeTextLayerId={state.activeTextLayerId}
                        onUpdateTextLayer={handleUpdateTextLayer}
                        onSelectTextLayer={handleSelectTextLayer}
                    />
                </div>
            </main>
            <SettingsModal isOpen={false} onClose={() => {}} />
        </div>
    );
}

export default App;