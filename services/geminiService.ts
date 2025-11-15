import { GoogleGenAI, Modality } from "@google/genai";
import { ImageObject, GenerationModel } from "../types";

// Initialize the GoogleGenAI client once as per guidelines.
// The API key is expected to be in process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function getModelName(model: GenerationModel): string {
    switch (model) {
        case 'gemini':
            return 'gemini-2.5-flash-image';
        case 'imagen4':
            return 'imagen-4.0-generate-001';
        case 'imagen4ultra':
            return 'imagen-4.0-ultra-generate-001';
        case 'imagen4fast':
            return 'imagen-4.0-fast-generate-001';
    }
}

function processPromptWithReferences(prompt: string, refCount: number): string {
    if (refCount === 0) return prompt;

    let processedPrompt = prompt;
    // Replace {orang1}, {orang2}, etc. with more descriptive text for the AI
    for (let i = 1; i <= refCount; i++) {
        const placeholder = new RegExp(`{orang${i}}`, 'g');
        processedPrompt = processedPrompt.replace(placeholder, `the person in reference image ${i}`);
    }
    return processedPrompt;
}

async function generateWithMultimodalPrompt(prompt: string, model: GenerationModel, characterReferences: ImageObject[] = []): Promise<ImageObject> {
    const modelName = getModelName(model);
    const parts: any[] = [];

    // Add character references first
    characterReferences.forEach(ref => {
        parts.push({ inlineData: { data: ref.data, mimeType: ref.mimeType } });
    });

    // Process prompt and add it as the last part
    const processedPrompt = processPromptWithReferences(prompt, characterReferences.length);
    parts.push({ text: processedPrompt });

    if (model === 'gemini') {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: '16:9' }
            }
        });

        const responseParts = response.candidates?.[0]?.content?.parts;
        if (responseParts) {
            for (const part of responseParts) {
                if (part.inlineData) {
                    return { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
                }
            }
        }
    } else { // Imagen models
        const response = await ai.models.generateImages({
            model: modelName,
            prompt: processedPrompt, // Imagen takes a single string prompt
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '16:9',
            },
        });

        if (response.generatedImages?.[0]?.image.imageBytes) {
            return { data: response.generatedImages[0].image.imageBytes, mimeType: 'image/png' };
        }
    }
    
    throw new Error("AI-nya nggak ngasih gambar. Coba ganti prompt-nya ya.");
}

export async function generateImageFromPrompt(prompt: string, model: GenerationModel, characterReferences: ImageObject[] = []): Promise<ImageObject> {
    return generateWithMultimodalPrompt(prompt, model, characterReferences);
}


export async function editImageWithPrompt(baseImage: ImageObject, prompt: string, model: GenerationModel, characterReferences: ImageObject[] = []): Promise<ImageObject> {
     if (model === 'gemini') {
        const parts: any[] = [];
        // Add the base image to be edited
        parts.push({ inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } });
        
        // Add character references
        characterReferences.forEach(ref => {
            parts.push({ inlineData: { data: ref.data, mimeType: ref.mimeType } });
        });

        // Process prompt and add it as the last part
        const processedPrompt = processPromptWithReferences(prompt, characterReferences.length);
        parts.push({ text: processedPrompt });
        
        const response = await ai.models.generateContent({
            model: getModelName(model),
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: '16:9' }
            },
        });

        const responseParts = response.candidates?.[0]?.content?.parts;
        if (responseParts) {
            for (const part of responseParts) {
                if (part.inlineData) {
                    return { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
                }
            }
        }
        throw new Error("AI-nya nggak ngasih gambar. Coba ganti prompt-nya ya.");
    } else {
        // Imagen models don't edit, they re-generate. We describe the image and then apply the prompt.
        const analysisPrompt = "Describe this image in detail for an image generation AI, capturing its style, composition, colors, and subject matter.";
        
        const analysisResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } }, { text: analysisPrompt }] }
        });

        const description = analysisResponse.text;
        if (!description) throw new Error("AI-nya gagal analisis gambar buat diedit.");

        const generationPrompt = `${description}. Then, apply this modification: ${prompt}`;
        
        return generateWithMultimodalPrompt(generationPrompt, model, characterReferences);
    }
}

export async function copyImageStyle(baseImage: ImageObject, model: GenerationModel): Promise<ImageObject> {
    const analysisPrompt = `**Act As:** A highly skilled visual analyst and AI image generation prompt engineer. Your expertise is in deconstructing visual content into its core artistic components and translating them into precise, effective prompts for image generation AI models.

**Task:** Meticulously analyze the provided thumbnail image. Your goal is to generate a single, comprehensive, and highly detailed prompt string that an AI image generator can use to recreate a very similar image with high fidelity, **but completely free of any text or numbers.**

**Critical Rule: Visuals Only - Exclude Text**
Your final prompt must focus exclusively on the visual, photographic, and artistic elements of the image. You MUST completely ignore and exclude any and all text, numbers, letters, logos, watermarks, or graphic overlays from your analysis and from the final generation prompt. The goal is a clean image base without any typography.

**Instructions for your final output:**
Your entire output MUST be a single, continuous paragraph of text that forms the generation prompt. Do not use markdown, headers, or lists. Structure this prompt string by synthesizing your analysis of the image into the following components, in order:

1.  **Main Theme & Mood:** Start by identifying the central idea or emotion. (e.g., "A sense of calm morning tranquility," "an epic fantasy adventure," "a clean and modern tech tutorial," "vibrant and cheerful comedy").
2.  **Quality & Art Style:** Begin with quality modifiers (e.g., "Masterpiece, best quality, ultra-detailed, high resolution"). Then, specify the art style (e.g., "professional photography," "modern anime/webtoon style," "digital painting," "3D render," "hyperrealistic photo"), including details about line art and coloring/shading if applicable.
3.  **Composition & Framing (Crucial):** This is a critical step. Meticulously define the shot type (e.g., "Close-Up," "Medium Shot," "Full Shot"), the precise camera angle (e.g., "Front View," "Profile View," "High Angle," "Low Angle"), and the subject's placement within the frame (e.g., "centered," "following the rule of thirds," "asymmetrically placed").
4.  **Subject & Focal Point:** Provide a detailed description of the main subject. Detail their apparent gender, age, hair (color, style), precise facial expression (e.g., "smiling blissfully, serene expression, eyes closed"), pose, action, and clothing. Be specific.
5.  **Lighting & Atmosphere:** Describe the light source, direction (e.g., "front-lit," "side-lit," "backlit"), quality (e.g., "soft diffused light," "hard light with sharp shadows"), and color temperature (e.g., "warm golden hour light," "cool blue tones"). Also, describe the overall mood it creates (e.g., "feeling of peace and happiness, cozy ambiance").
6.  **Color Palette:** Identify the 3-5 dominant colors and describe the overall color scheme (e.g., "monochromatic blue," "warm pastels," "complementary oranges and blues").
7.  **Background & Setting:** Describe the environment where the scene takes place (e.g., "urban cafe," "fantasy landscape," "minimalist studio"), and its level of detail or blur (e.g., "soft-focus background, detailed cityscape, bokeh effect").
8.  **Unique Details:** Mention any small, characteristic elements that give the image personality (e.g., "floating dust particles," "falling leaves," "a subtle lens flare," "the texture of the clothing").

Analyze the provided image based on all these criteria (ignoring text as per the critical rule), then combine your findings into the final, single-paragraph prompt string.`;
    
    const analysisResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ inlineData: { data: baseImage.data, mimeType: baseImage.mimeType }}, { text: analysisPrompt }] }
    });

    const styleDescription = analysisResponse.text;
    if (!styleDescription) {
        throw new Error("AI-nya gagal analisis gaya gambarnya.");
    }

    // The analysis response IS the final, well-structured generation prompt.
    const generationPrompt = styleDescription;

    const modelName = getModelName(model);

    if (model === 'gemini') {
        const imageResponse = await ai.models.generateContent({
            model: modelName,
            contents: { parts: [{ text: generationPrompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
                imageConfig: {
                    aspectRatio: '16:9'
                }
            }
        });

        const responseParts = imageResponse.candidates?.[0]?.content?.parts;
        if (responseParts) {
            for (const part of responseParts) {
              if (part.inlineData) {
                return { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
              }
            }
        }
    } else { // Imagen models
        const imageResponse = await ai.models.generateImages({
            model: modelName,
            prompt: generationPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '16:9',
            },
        });
        
        if (imageResponse.generatedImages?.[0]?.image.imageBytes) {
            return { data: imageResponse.generatedImages[0].image.imageBytes, mimeType: 'image/png' };
        }
    }

    throw new Error("AI-nya nggak ngasih gambar dari prompt gaya tadi.");
}