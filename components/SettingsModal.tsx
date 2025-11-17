import React, { useState, useEffect } from 'react';
import { getApiKey, saveApiKey } from '../utils/apiKeyManager';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        if (isOpen) {
            setApiKey(getApiKey() || '');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        saveApiKey(apiKey);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Pengaturan API Key</h2>
                <p className="text-gray-600 mb-2">
                    Masukkan Gemini API Key kamu di bawah ini. Key kamu akan disimpan di browser ini aja.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                    Belum punya key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">Bikin API Key di Google AI Studio.</a>
                </p>

                <div>
                    <label htmlFor="apiKeyInput" className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
                    <input
                        id="apiKeyInput"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Masukkan API Key kamu di sini"
                        className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex justify-end gap-4 mt-8">
                     <button
                        onClick={onClose}
                        className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Simpan
                    </button>
                </div>
            </div>
        </div>
    );
};
