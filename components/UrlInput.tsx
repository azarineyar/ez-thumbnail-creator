import React, { useState, useRef } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { AppState, GenerationModel, TextLayer, ImageObject } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { TextIcon } from './icons/TextIcon';
import { EditIcon } from './icons/EditIcon';
import { UploadIcon } from './icons/UploadIcon';
import { UndoIcon } from './icons/UndoIcon';
import { RestartIcon } from './icons/RestartIcon';
import { SettingsIcon } from './icons/SettingsIcon';


interface ControlPanelProps {
    // Image props
    url: string;
    prompt: string;
    promptHistory: string[];
    appMode: AppState['appMode'];
    generationModel: GenerationModel;
    characterReferences: ImageObject[];
    setUrl: (url: string) => void;
    setPrompt: (prompt: string) => void;
    setAppMode: (mode: AppState['appMode']) => void;
    setGenerationModel: (mode: GenerationModel) => void;
    onFetch: () => void;
    onRecreateThumbnail: () => void;
    onGenerate: () => void;
    onOverlayUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveOverlay: () => void;
    onCharacterUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveCharacter: (index: number) => void;
    onUndo: () => void;
    onReset: () => void;
    onOpenSettings: () => void;
    undoDisabled: boolean;
    isLoading: boolean;
    hasBaseImage: boolean;
    hasOverlay: boolean;
    // Text props
    textLayers: TextLayer[];
    activeTextLayerId?: string;
    onAddText: () => void;
    onUpdateText: (id: string, newProps: Partial<TextLayer>) => void;
    onDeleteText: (id: string) => void;
    onSelectText: (id: string | undefined) => void;
}

const FONTS = ['Poppins', 'Montserrat', 'Oswald', 'Anton', 'Bebas Neue', 'Alfa Slab One'];

const TextEditorPanel: React.FC<Pick<ControlPanelProps, 'textLayers' | 'activeTextLayerId' | 'onAddText' | 'onUpdateText' | 'onDeleteText' | 'onSelectText'>> = ({
    textLayers, activeTextLayerId, onAddText, onUpdateText, onDeleteText, onSelectText
}) => {
    const activeLayer = textLayers.find(l => l.id === activeTextLayerId);
    
    const handleUpdate = (props: Partial<TextLayer>) => {
        if (activeLayer) {
            onUpdateText(activeLayer.id, props);
        }
    };

    const handleEffectUpdate = (effect: 'stroke' | 'shadow' | 'outerGlow', props: Partial<TextLayer['stroke']>) => {
         if (activeLayer) {
            onUpdateText(activeLayer.id, { [effect]: { ...activeLayer[effect], ...props } });
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex justify-between items-center">
                 <h2 className="text-lg font-semibold text-gray-900">Edit Teks</h2>
                <button onClick={onAddText} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm">+ Tambah Teks</button>
            </div>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex-shrink-0">
                    <ul className="space-y-2 max-h-32 overflow-y-auto">
                        {textLayers.map(layer => (
                            <li key={layer.id} onClick={() => onSelectText(layer.id)}
                                className={`flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors ${activeTextLayerId === layer.id ? 'bg-blue-100 text-blue-800' : 'bg-white hover:bg-gray-100 border border-gray-200'}`}>
                                <span className="truncate w-4/5 text-sm font-medium">{layer.text || 'Teks Baru'}</span>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteText(layer.id); }} className="text-red-500 hover:text-red-700">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                         {textLayers.length === 0 && <p className="text-center text-gray-500 text-sm p-2">Belum ada teks.</p>}
                    </ul>
                </div>

                {activeLayer ? (
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4 text-sm">
                        <div>
                            <label className="block text-gray-700 mb-1 font-medium text-sm">Tulis Teksnya</label>
                            <textarea value={activeLayer.text} onChange={e => handleUpdate({ text: e.target.value })} rows={3}
                                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 mb-1 font-medium text-sm">Font</label>
                                <select value={activeLayer.fontFamily} onChange={e => handleUpdate({ fontFamily: e.target.value })}
                                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1 font-medium text-sm">Ukuran</label>
                                <input type="number" value={activeLayer.fontSize} onChange={e => handleUpdate({ fontSize: parseInt(e.target.value) || 48 })}
                                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                             <div>
                                <label className="block text-gray-700 mb-1 font-medium text-sm">Spasi Baris</label>
                                <input type="number" step="0.1" value={activeLayer.lineHeight} onChange={e => handleUpdate({ lineHeight: parseFloat(e.target.value) || 1.2 })}
                                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                         <div>
                            <label className="block text-gray-700 mb-1 font-medium text-sm">Warna</label>
                             <input type="color" value={activeLayer.color} onChange={e => handleUpdate({ color: e.target.value })}
                                className="w-12 h-10 p-1 bg-white border border-gray-300 rounded-lg cursor-pointer" />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={activeLayer.bold} onChange={e => handleUpdate({ bold: e.target.checked })} className="form-checkbox h-5 w-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"/> Tebal</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={activeLayer.italic} onChange={e => handleUpdate({ italic: e.target.checked })} className="form-checkbox h-5 w-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"/> Miring</label>
                        </div>
                        <div>
                           <label className="block text-gray-700 mb-1 font-medium text-sm">Rata</label>
                           <div className="flex bg-gray-200 rounded-lg p-1">
                                <button onClick={() => handleUpdate({textAlign: 'left'})} className={`w-1/3 py-1 rounded-md ${activeLayer.textAlign === 'left' ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-300'}`}>Kiri</button>
                                <button onClick={() => handleUpdate({textAlign: 'center'})} className={`w-1/3 py-1 rounded-md ${activeLayer.textAlign === 'center' ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-300'}`}>Tengah</button>
                                <button onClick={() => handleUpdate({textAlign: 'right'})} className={`w-1/3 py-1 rounded-md ${activeLayer.textAlign === 'right' ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-300'}`}>Kanan</button>
                           </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-200">
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer mb-2"><input type="checkbox" checked={activeLayer.stroke.enabled} onChange={e => handleEffectUpdate('stroke', { enabled: e.target.checked })}/> <span className="font-medium text-gray-700">Garis Tepi</span></label>
                                {activeLayer.stroke.enabled && <div className="grid grid-cols-2 gap-2 pl-6 items-center">
                                    <input type="color" value={activeLayer.stroke.color} onChange={e => handleEffectUpdate('stroke', { color: e.target.value })} className="w-12 h-8 p-0.5 bg-white border border-gray-300 rounded-lg cursor-pointer" />
                                    <input type="number" min="0" placeholder="Tebal" value={activeLayer.stroke.width} onChange={e => handleEffectUpdate('stroke', { width: parseInt(e.target.value) })} className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-1 text-center"/>
                                </div>}
                            </div>
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer mb-2"><input type="checkbox" checked={activeLayer.shadow.enabled} onChange={e => handleEffectUpdate('shadow', { enabled: e.target.checked })}/> <span className="font-medium text-gray-700">Bayangan</span></label>
                                {activeLayer.shadow.enabled && <div className="pl-6 space-y-2">
                                    <input type="color" value={activeLayer.shadow.color} onChange={e => handleEffectUpdate('shadow', { color: e.target.value })} className="w-12 h-8 p-0.5 bg-white border border-gray-300 rounded-lg cursor-pointer" />
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
                                        <label>Blur<input type="number" min="0" value={activeLayer.shadow.blur} onChange={e => handleEffectUpdate('shadow', { blur: parseInt(e.target.value) })} className="w-full bg-white border border-gray-300 text-gray-900 rounded p-1 mt-1"/></label>
                                        <label>X<input type="number" value={activeLayer.shadow.offsetX} onChange={e => handleEffectUpdate('shadow', { offsetX: parseInt(e.target.value) })} className="w-full bg-white border border-gray-300 text-gray-900 rounded p-1 mt-1"/></label>
                                        <label>Y<input type="number" value={activeLayer.shadow.offsetY} onChange={e => handleEffectUpdate('shadow', { offsetY: parseInt(e.target.value) })} className="w-full bg-white border border-gray-300 text-gray-900 rounded p-1 mt-1"/></label>
                                    </div>
                                </div>}
                            </div>
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer mb-2"><input type="checkbox" checked={activeLayer.outerGlow.enabled} onChange={e => handleEffectUpdate('outerGlow', { enabled: e.target.checked })}/> <span className="font-medium text-gray-700">Cahaya Luar</span></label>
                                {activeLayer.outerGlow.enabled && <div className="pl-6 space-y-2">
                                    <input type="color" value={activeLayer.outerGlow.color} onChange={e => handleEffectUpdate('outerGlow', { color: e.target.value })} className="w-12 h-8 p-0.5 bg-white border border-gray-300 rounded-lg cursor-pointer" />
                                    <div className="grid grid-cols-2 gap-2 text-center text-xs text-gray-500">
                                        <label>Ukuran<input type="number" min="0" value={activeLayer.outerGlow.blur} onChange={e => handleEffectUpdate('outerGlow', { blur: parseInt(e.target.value) })} className="w-full bg-white border border-gray-300 text-gray-900 rounded p-1 mt-1"/></label>
                                        <label>Sebar<input type="number" min="0" value={activeLayer.outerGlow.spread} onChange={e => handleEffectUpdate('outerGlow', { spread: parseInt(e.target.value) })} className="w-full bg-white border border-gray-300 text-gray-900 rounded p-1 mt-1"/></label>
                                    </div>
                                </div>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-gray-500 text-center">
                        <p>Pilih teks buat diedit, atau tambahin teks baru.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const ImageControlPanel: React.FC<ControlPanelProps> = (props) => {
    const { url, prompt, promptHistory, appMode, generationModel, characterReferences,
        setUrl, setPrompt, setAppMode, setGenerationModel, onFetch, onRecreateThumbnail, onGenerate, onOverlayUpload, onRemoveOverlay, onCharacterUpload, onRemoveCharacter,
        isLoading, hasBaseImage, hasOverlay, onUndo, onReset, undoDisabled, onOpenSettings
    } = props;
    
    const [historyIndex, setHistoryIndex] = useState(-1);
    const charUploadRef = useRef<HTMLInputElement>(null);
    const isGeneratingNew = !hasBaseImage;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (promptHistory.length === 0 || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault();

        if (e.key === 'ArrowUp') {
            const newIndex = historyIndex >= 0 ? Math.max(0, historyIndex - 1) : promptHistory.length - 1;
            setHistoryIndex(newIndex);
            setPrompt(promptHistory[newIndex]);
        } else if (e.key === 'ArrowDown') {
            const newIndex = historyIndex !== -1 && historyIndex < promptHistory.length - 1 ? historyIndex + 1 : -1;
            setHistoryIndex(newIndex);
            setPrompt(newIndex === -1 ? '' : promptHistory[newIndex]);
        }
    };

    const isCopyMode = appMode === 'copy';

    return (
        <div className="flex flex-col gap-6 h-full">
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    1. {isGeneratingNew ? 'Mulai dari Link (Opsional)' : 'Pilih Mode'}
                </label>
                <div className="flex bg-gray-200 rounded-lg p-1">
                    <button
                        onClick={() => setAppMode('edit')}
                        disabled={!hasBaseImage}
                        className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${appMode === 'edit' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-gray-300'}`}
                    >
                        Edit Aja
                    </button>
                    <button
                        onClick={() => setAppMode('copy')}
                        disabled={!hasBaseImage}
                        className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${appMode === 'copy' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-gray-300'}`}
                    >
                        Bikin Ulang
                    </button>
                </div>
                 <div className="flex gap-2 mt-4">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste link YouTube atau gambar di sini..."
                        className="flex-grow bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                        disabled={isLoading}
                    />
                    <button
                        onClick={isCopyMode ? onRecreateThumbnail : onFetch}
                        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 whitespace-nowrap"
                        disabled={isLoading || !url}
                    >
                        {isCopyMode ? 'Bikin!' : 'Ambil'}
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">2. Upload Foto Karakter (Opsional, maks 6)</label>
                <div className="grid grid-cols-3 gap-2">
                    {characterReferences.map((char, index) => (
                        <div key={index} className="relative group aspect-square">
                            <img src={`data:${char.mimeType};base64,${char.data}`} className="w-full h-full object-cover rounded-lg" alt={`Karakter ${index + 1}`} />
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                <p className="text-white font-bold text-lg">{`{orang${index + 1}}`}</p>
                                <button onClick={() => onRemoveCharacter(index)} className="absolute top-1 right-1 text-red-400 hover:text-red-300 p-1 bg-black/50 rounded-full">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {characterReferences.length < 6 && (
                        <button
                            onClick={() => charUploadRef.current?.click()}
                            className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-500 transition-colors disabled:opacity-50"
                            disabled={isLoading}
                        >
                            <UploadIcon className="w-6 h-6 mb-1 text-blue-500" />
                            <span className="text-xs font-semibold text-blue-500">Tambah Karakter</span>
                        </button>
                    )}
                </div>
                <input
                    ref={charUploadRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={onCharacterUpload}
                    className="hidden"
                />
            </div>
            
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">3. Pilih Model AI-nya</label>
                <select
                    value={generationModel}
                    onChange={(e) => setGenerationModel(e.target.value as GenerationModel)}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                    disabled={isLoading}
                >
                    <option value="gemini">Gemini Flash (Cepat &amp; Oke buat semua)</option>
                    <option value="imagen4">Imagen 4 (Kualitas Paling Bagus)</option>
                    <option value="imagen4ultra">Imagen 4 Ultra (Kualitas Super Pro)</option>
                    <option value="imagen4fast">Imagen 4 Fast (Hasilnya Sat Set)</option>
                </select>
            </div>
           
            <div className="flex-grow flex flex-col min-h-0 border-t border-gray-200 pt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    4. {isGeneratingNew ? 'Mau Bikin Gambar Apa?' : 'Mau Diedit Gimana?'}
                </label>
                <textarea
                    value={prompt}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => {
                        setPrompt(e.target.value);
                        setHistoryIndex(-1);
                    }}
                    rows={4}
                    placeholder={isGeneratingNew ? "Contoh: kucing oren gendut lagi nyuri kue..." : "Contoh: bikin cahayanya lebih dramatis"}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 flex-grow disabled:opacity-50"
                    disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-2">
                    {isGeneratingNew
                        ? "Jelasin gambar yang kamu mau. Pakai {orang1} buat masukin karakter."
                        : "Perbaiki gambar yang ada atau bikin ulang dengan gaya baru."
                    }
                </p>
            </div>
            
            <div>
                <button
                    onClick={onGenerate}
                    className="w-full text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-500 hover:to-purple-600 transition-all duration-300"
                    disabled={isLoading || !prompt}
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Lagi proses...
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5" />
                            {isGeneratingNew ? 'Bikin Gambarnya!' : 'Terapkan Perubahan'}
                        </>
                    )}
                </button>
                <div className="mt-3 flex justify-center gap-3">
                    <button 
                        onClick={onUndo} 
                        className="bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-3 rounded-lg hover:bg-gray-100 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        disabled={undoDisabled}
                    >
                        <UndoIcon className="w-5 h-5"/> <span className="sm:inline">Undo</span>
                    </button>
                    <button 
                        onClick={onReset} 
                        className="bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-3 rounded-lg hover:bg-gray-100 transition flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                    >
                        <RestartIcon className="w-5 h-5"/> <span className="sm:inline">Reset</span>
                    </button>
                    <button 
                        onClick={onOpenSettings} 
                        className="bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-3 rounded-lg hover:bg-gray-100 transition flex items-center gap-2 text-sm"
                    >
                        <SettingsIcon className="w-5 h-5"/> <span className="sm:inline">API Key</span>
                    </button>
                </div>
            </div>
        </div>
    );
}


export const UrlInput: React.FC<ControlPanelProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
    const { hasBaseImage } = props;

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 h-full flex flex-col">
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('image')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'image' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Gambar
                    </button>
                    <button
                        onClick={() => setActiveTab('text')}
                        disabled={!hasBaseImage}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === 'text' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Teks
                    </button>
                </nav>
            </div>

            <div className="flex-grow min-h-0">
                {activeTab === 'image' && <ImageControlPanel {...props} />}
                {activeTab === 'text' && hasBaseImage && <TextEditorPanel {...props} />}
                {activeTab === 'text' && !hasBaseImage && (
                    <div className="flex-grow flex items-center justify-center text-center text-gray-500 h-full">
                        <p>Ambil atau bikin gambar dulu baru bisa nambahin teks.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
