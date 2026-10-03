import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { CameraCapture, compressFrameToJpeg } from './CameraCapture';
import { useLang } from '../../context/LangContext';

export const PhotoPicker = ({
  value = null,
  onChange,
  multiple = false,
  maxPhotos = 4,
  maxSizeMB = 5,
  label = null,
  helperText = null,
  disabled = false,
  className = '',
}) => {
  const { t } = useLang?.() || { t: (k) => k };
  const [cameraOpen, setCameraOpen] = useState(false);
  const [errorToast, setErrorToast] = useState(null);
  const fileInputRef = useRef(null);

  // Normalize photos list
  const photos = multiple
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : (value ? [value] : []);

  const isMaxReached = multiple && photos.length >= maxPhotos;

  const showToast = (title, message) => {
    setErrorToast({ title, message });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('resq:toast', {
          detail: { title, message, type: 'critical' },
        })
      );
    }
    setTimeout(() => {
      setErrorToast(null);
    }, 4000);
  };

  // Add photo dataUrl
  const handleAddPhoto = (dataUrl) => {
    if (!dataUrl) return;
    if (multiple) {
      if (photos.length >= maxPhotos) {
        showToast(
          t('photo.maxReachedTitle') || 'Photo Limit Reached',
          t('photo.maxReachedDesc', { count: maxPhotos }) || `Maximum of ${maxPhotos} photos allowed.`
        );
        return;
      }
      onChange?.([...photos, dataUrl]);
    } else {
      onChange?.(dataUrl);
    }
  };

  // Remove photo at index
  const handleRemovePhoto = (index) => {
    if (disabled) return;
    if (multiple) {
      const updated = photos.filter((_, i) => i !== index);
      onChange?.(updated);
    } else {
      onChange?.(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // File upload input handler
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(
        t('photo.invalidType') || 'Invalid File Type',
        t('photo.invalidTypeDesc') || 'Please select a valid image file (PNG, JPG, or WEBP).'
      );
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      showToast(
        t('photo.sizeExceeded') || 'File Too Large',
        t('photo.sizeExceededDesc', { size: maxSizeMB }) ||
          `Image exceeds maximum allowed size of ${maxSizeMB}MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (re) => {
        img.onload = async () => {
          const compressed = await compressFrameToJpeg(img, 1280, 0.8);
          handleAddPhoto(compressed.dataUrl);
        };
        img.src = re.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to process image:', err);
      showToast(
        t('photo.processError') || 'Image Error',
        t('photo.processErrorDesc') || 'Failed to process selected image.'
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header and Labels */}
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider">
            {label}
          </label>
        )}
        {multiple && (
          <span className="text-[11px] font-mono text-muted-text">
            {photos.length} / {maxPhotos} {t('photo.photos') || 'photos'}
          </span>
        )}
      </div>

      {helperText && (
        <p className="text-[11px] text-muted-text -mt-1 leading-normal">
          {helperText}
        </p>
      )}

      {/* Error alert if any */}
      {errorToast && (
        <div className="p-2.5 rounded bg-[#FDF2F2] border border-[#F8D2D0] flex items-center gap-2 text-xs text-[#B42318] animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorToast.message}</span>
        </div>
      )}

      {/* Action Buttons: Take Photo & Upload Image */}
      {(!multiple && photos.length === 0) || (multiple && !isMaxReached) ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Camera}
            disabled={disabled}
            onClick={() => setCameraOpen(true)}
            className="border-app-border text-navy-ink hover:bg-app-bg text-xs"
          >
            {t('photo.takePhoto') || 'Take Photo'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Upload}
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="border-app-border text-navy-ink hover:bg-app-bg text-xs"
          >
            {t('photo.uploadImage') || 'Upload Image'}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={handleFileChange}
            className="hidden"
          />

          <span className="text-[10px] text-muted-text">
            {t('photo.fileLimit', { size: maxSizeMB }) || `Max ${maxSizeMB}MB · auto-compressed`}
          </span>
        </div>
      ) : null}

      {/* Thumbnail Previews Grid */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2.5 pt-1">
          {photos.map((photoUrl, index) => (
            <div
              key={index}
              className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-md overflow-hidden border border-app-border bg-app-bg shadow-xs shrink-0"
            >
              <img
                src={photoUrl}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  aria-label="Remove photo"
                  className="absolute top-1 right-1 p-1 rounded-full bg-navy-ink/80 text-white hover:bg-[#B42318] transition-colors shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => handleAddPhoto(dataUrl)}
        title={t('photo.cameraModalTitle') || 'Field Camera View'}
      />
    </div>
  );
};
