import React, { useRef, useEffect, useCallback, useState } from 'react';
import { DownloadIcon } from './icons/DownloadIcon';
import { ImageObject, TextLayer } from '../types';

interface CanvasPreviewProps {
    displayImage?: ImageObject;
    overlayImage?: ImageObject;
    textLayers: TextLayer[];
    activeTextLayerId?: string;
    onUpdateTextLayer: (id: string, newProps: Partial<TextLayer>) => void;
    onSelectTextLayer: (id: string | undefined) => void;
}

const SNAP_THRESHOLD = 8; // pixels

export const Editor: React.FC<CanvasPreviewProps> = ({
    displayImage, overlayImage, textLayers, activeTextLayerId, onUpdateTextLayer, onSelectTextLayer
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const textMetricsCache = useRef<Map<string, { metrics: TextMetrics, lines: string[] }>>(new Map());
    const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});

    const getTextLinesAndMetrics = (ctx: CanvasRenderingContext2D, layer: TextLayer) => {
        const fontStyle = `${layer.italic ? 'italic ' : ''}${layer.bold ? 'bold ' : ''}${layer.fontSize}px ${layer.fontFamily}`;
        ctx.font = fontStyle;
        const lines = layer.text.split('\n');
        // For simplicity, we use the metrics of the longest line for overall width.
        const longestLine = lines.reduce((a, b) => (a.length > b.length ? a : b), '');
        const metrics = ctx.measureText(longestLine);
        return { metrics, lines };
    };

    const getLayerBounds = (layer: TextLayer, canvasCtx: CanvasRenderingContext2D) => {
        const { metrics, lines } = getTextLinesAndMetrics(canvasCtx, layer);
        const { position, textAlign, fontSize, lineHeight } = layer;
        
        const width = metrics.width;
        const totalHeight = lines.length * fontSize * lineHeight - (lineHeight - 1) * fontSize;
        
        let x = position.x;
        if (textAlign === 'center') x -= width / 2;
        if (textAlign === 'right') x -= width;
        
        return { x, y: position.y, width, height: totalHeight, centerX: x + width / 2, centerY: position.y + totalHeight / 2 };
    };


    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const baseWidth = 1280;
        const baseHeight = 720;
        canvas.width = baseWidth;
        canvas.height = baseHeight;

        ctx.fillStyle = '#E5E7EB'; // bg-gray-200 for canvas background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Placeholder when no image is loaded
        if (!displayImage) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Draw a simple image icon
            const iconX = canvas.width / 2;
            const iconY = canvas.height / 2 - 40;
            ctx.strokeStyle = '#9CA3AF'; // text-gray-400
            ctx.lineWidth = 3;
            ctx.strokeRect(iconX - 50, iconY - 40, 100, 75);
            // sun
            ctx.beginPath();
            ctx.arc(iconX - 25, iconY - 15, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#9CA3AF';
            ctx.fill();
            // mountains
            ctx.beginPath();
            ctx.moveTo(iconX - 40, iconY + 25);
            ctx.lineTo(iconX - 15, iconY);
            ctx.lineTo(iconX + 10, iconY + 20);
            ctx.lineTo(iconX + 25, iconY + 10);
            ctx.lineTo(iconX + 40, iconY + 35);
            ctx.stroke();

            // Text below icon
            ctx.fillStyle = '#6B7280'; // text-gray-500
            ctx.font = 'bold 22px Poppins';
            ctx.fillText('Thumbnail kamu bakal muncul di sini', canvas.width / 2, canvas.height / 2 + 60);

            ctx.font = '16px Poppins';
            ctx.fillStyle = '#9CA3AF'; // text-gray-400
            ctx.fillText('Ambil dari URL atau bikin gambar baru buat mulai.', canvas.width / 2, canvas.height / 2 + 90);

            ctx.restore();
            return; // Exit early, no more drawing needed
        }

        const displayImg = new Image();
        const overlayImg = new Image();

        let imagesToLoad = 0;
        if (displayImage) imagesToLoad++;
        if (overlayImage) imagesToLoad++;
        let imagesLoaded = 0;

        const onAllImagesAndFontsLoaded = () => {
            // The background is already filled by the parent drawCanvas call.

            if (displayImage) {
                const canvasAspect = canvas.width / canvas.height;
                const imageAspect = displayImg.naturalWidth / displayImg.naturalHeight;
                let drawWidth, drawHeight, x, y;

                if (imageAspect > canvasAspect) {
                    drawWidth = canvas.width;
                    drawHeight = drawWidth / imageAspect;
                    x = 0;
                    y = (canvas.height - drawHeight) / 2;
                } else {
                    drawHeight = canvas.height;
                    drawWidth = drawHeight * imageAspect;
                    y = 0;
                    x = (canvas.width - drawWidth) / 2;
                }
                ctx.drawImage(displayImg, x, y, drawWidth, drawHeight);
            }
            if (overlayImage) {
                ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
            }

            // Draw snap lines
            ctx.strokeStyle = '#3b82f6'; // blue-500
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            if (snapLines.x !== undefined) {
                ctx.beginPath();
                ctx.moveTo(snapLines.x, 0);
                ctx.lineTo(snapLines.x, canvas.height);
                ctx.stroke();
            }
            if (snapLines.y !== undefined) {
                ctx.beginPath();
                ctx.moveTo(0, snapLines.y);
                ctx.lineTo(canvas.width, snapLines.y);
                ctx.stroke();
            }
            ctx.setLineDash([]);


            // Draw text layers
            textMetricsCache.current.clear();
            textLayers.forEach(layer => {
                const { fontFamily, fontSize, color, bold, italic, textAlign, position, stroke, shadow, outerGlow, lineHeight } = layer;

                ctx.save();
                
                const { metrics, lines } = getTextLinesAndMetrics(ctx, layer);
                textMetricsCache.current.set(layer.id, { metrics, lines });

                ctx.textAlign = textAlign;
                ctx.textBaseline = 'top';

                lines.forEach((line, i) => {
                    const y = position.y + (i * fontSize * lineHeight);

                    // Apply Outer Glow
                    if (outerGlow.enabled) {
                        ctx.shadowColor = outerGlow.color;
                        ctx.shadowBlur = outerGlow.blur; // Size
                        
                        if (outerGlow.spread > 0) {
                            ctx.strokeStyle = outerGlow.color;
                            ctx.lineWidth = outerGlow.spread * 2;
                            ctx.strokeText(line, position.x, y);
                        }
                    }
                    // Apply Drop Shadow
                    if (shadow.enabled) {
                        ctx.shadowColor = shadow.color;
                        ctx.shadowBlur = shadow.blur;
                        ctx.shadowOffsetX = shadow.offsetX;
                        ctx.shadowOffsetY = shadow.offsetY;
                    }
                    
                    ctx.fillStyle = color;
                    ctx.fillText(line, position.x, y);
                    
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;

                    if (stroke.enabled && stroke.width > 0) {
                        ctx.strokeStyle = stroke.color;
                        ctx.lineWidth = stroke.width;
                        ctx.strokeText(line, position.x, y);
                    }
                });

                ctx.restore();
            });

             // Draw bounding box for active layer
            if (activeTextLayerId) {
                const layer = textLayers.find(l => l.id === activeTextLayerId);
                if (layer) {
                    const bounds = getLayerBounds(layer, ctx);
                    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'; // blue-500
                    ctx.lineWidth = 2;
                    ctx.setLineDash([6, 3]);
                    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
                    ctx.setLineDash([]);
                }
            }
        };

        const onImageLoad = () => {
            imagesLoaded++;
            if (imagesLoaded === imagesToLoad) {
                document.fonts.ready.then(onAllImagesAndFontsLoaded);
            }
        };

        if (displayImage) {
            displayImg.onload = onImageLoad;
            displayImg.onerror = () => console.error("Gagal muat gambar utama.");
            displayImg.src = `data:${displayImage.mimeType};base64,${displayImage.data}`;
        }
        if (overlayImage) {
            overlayImg.onload = onImageLoad;
            overlayImg.onerror = () => console.error("Gagal muat gambar overlay.");
            overlayImg.src = `data:${overlayImage.mimeType};base64,${overlayImage.data}`;
        }
    }, [displayImage, overlayImage, textLayers, activeTextLayerId, snapLines]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    const getMousePos = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const getHitLayer = (x: number, y: number): TextLayer | null => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return null;

        for (const layer of [...textLayers].reverse()) {
            const bounds = getLayerBounds(layer, ctx);
            if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
                return layer;
            }
        }
        return null;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const pos = getMousePos(e);
        const hitLayer = getHitLayer(pos.x, pos.y);

        if (hitLayer) {
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;
            const bounds = getLayerBounds(hitLayer, ctx);

            onSelectTextLayer(hitLayer.id);
            setDraggingLayerId(hitLayer.id);
            setDragOffset({
                x: pos.x - hitLayer.position.x,
                y: pos.y - hitLayer.position.y,
            });
        } else {
            onSelectTextLayer(undefined);
            setDraggingLayerId(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!draggingLayerId || !canvas || !ctx) return;
        
        const layer = textLayers.find(l => l.id === draggingLayerId);
        if (!layer) return;

        const pos = getMousePos(e);
        let newX = pos.x - dragOffset.x;
        let newY = pos.y - dragOffset.y;
        
        const bounds = getLayerBounds({ ...layer, position: { x: newX, y: newY } }, ctx);
        const centerX = bounds.centerX;
        const centerY = bounds.centerY;

        const canvasCenterX = canvas.width / 2;
        const canvasCenterY = canvas.height / 2;
        
        let newSnapLines: { x?: number; y?: number } = {};

        if (Math.abs(centerX - canvasCenterX) < SNAP_THRESHOLD) {
            newX -= (centerX - canvasCenterX);
            newSnapLines.x = canvasCenterX;
        }
        if (Math.abs(centerY - canvasCenterY) < SNAP_THRESHOLD) {
            newY -= (centerY - canvasCenterY);
            newSnapLines.y = canvasCenterY;
        }
        
        setSnapLines(newSnapLines);
        
        onUpdateTextLayer(draggingLayerId, {
            position: { x: newX, y: newY },
        });
    };

    const handleMouseUp = () => {
        setDraggingLayerId(null);
        setSnapLines({});
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const currentActiveId = activeTextLayerId;
            onSelectTextLayer(undefined);

            requestAnimationFrame(() => {
                const link = document.createElement('a');
                link.download = 'ez-thumbnail.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                onSelectTextLayer(currentActiveId);
            });
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-white rounded-xl shadow-md border border-gray-200 p-4">
            <div className="w-full flex-grow relative" style={{ minHeight: '300px' }}>
                 <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
                    style={{ cursor: draggingLayerId ? 'grabbing' : 'grab' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>
            <button
                onClick={handleDownload}
                className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={!displayImage}
            >
                <DownloadIcon className="w-5 h-5" /> Download Gambar
            </button>
        </div>
    );
};