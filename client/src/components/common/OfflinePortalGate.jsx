import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useConnection } from '../../context/ConnectionContext';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui';
import { WifiOff, RefreshCw, ArrowRight, ShieldAlert, LifeBuoy } from 'lucide-react';

/**
 * OfflinePortalGate: Enforces security rule that Field Responder and Admin Command
 * consoles are never populated with cached operational data while disconnected.
 * Displays a calm network required panel with retry and emergency redirect actions.
 */
export const OfflinePortalGate = ({ children }) => {
  const { online, checkReachability } = useConnection();
  const { role } = useAuth();
  const { t } = useLang();
  const [isChecking, setIsChecking] = useState(false);

  // Citizen portal is always allowed offline
  if (role === 'citizen' || online) {
    return children;
  }

  // Responder or Admin while offline
  const handleRetry = async () => {
    setIsChecking(true);
    try {
      await checkReachability();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-app-border bg-surface shadow-xs">
        <CardHeader className="bg-[#FAF9F6] border-b border-app-border text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#FEF6EE] border border-[#F9DBAF] flex items-center justify-center text-[#B54708] mb-3">
            <WifiOff className="w-6 h-6" />
          </div>
          <CardTitle className="text-lg font-bold text-navy-ink">
            {t('offline.portalGateTitle')}
          </CardTitle>
          <CardDescription className="text-xs text-muted-text mt-1 max-w-sm mx-auto">
            {t('offline.portalGateDesc')}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4 text-center">
          <p className="text-xs text-muted-text">
            {t('offline.portalGateSecurityNote')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isChecking}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? t('offline.checking') : t('offline.retryConnection')}</span>
            </Button>

            <Link
              to="/citizen/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-teal-deep text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>{t('offline.goToCitizenPortal')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
