import React, { useState, useEffect } from 'react';
import { useLang } from '../../context/LangContext';
import { Button } from '../ui';
import { Download, CheckCircle2 } from 'lucide-react';

/**
 * InstallAppButton: Uses beforeinstallprompt to provide an unobtrusive PWA install action.
 */
export const InstallAppButton = ({ className = '', variant = 'outline', size = 'sm' }) => {
  const { t } = useLang();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.info('[PWA] FloodResQ installed as standalone PWA.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.info(`[PWA] Install prompt outcome: ${outcome}`);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#EDF6F1] border border-[#C3E4D1] text-[#3B7A57] text-xs font-medium ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{t('offline.appInstalled') || 'App Installed (Standalone PWA)'}</span>
      </div>
    );
  }

  if (!deferredPrompt) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleInstallClick}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <Download className="w-4 h-4 text-teal-deep" />
      <span>{t('offline.installApp') || 'Install App'}</span>
    </Button>
  );
};
