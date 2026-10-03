import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DEMO_USERS } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { Card, Button, Badge } from '../../components/ui';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { Radio, AlertCircle, ArrowRight, Shield } from 'lucide-react';

export const ResponderLogin = () => {
  const { signIn, role, isAuthenticated } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      if (role === 'responder') navigate('/responder/dashboard');
      else if (role === 'citizen') navigate('/citizen/dashboard');
      else if (role === 'admin') navigate('/admin/dashboard');
    }
  }, [isAuthenticated, role, navigate]);

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = t('auth.emailRequired') || 'Agency email is required.';
    }
    if (!password) {
      errs.password = t('auth.passwordRequired') || 'Security PIN / Password is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await signIn(email, password, 'responder');
      const from = location.state?.from?.pathname || '/responder/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message || t('auth.invalidCredentials') || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail(DEMO_USERS.responder.email);
    setPassword('demo-password-123');
    setErrors({});
    setServerError('');
  };

  return (
    <div className="min-h-screen bg-app-bg text-navy-ink font-sans flex flex-col justify-between antialiased">
      {/* 1. HERO */}
      <section className="bg-[linear-gradient(135deg,#0F2A3D_0%,#1F6F78_100%)] text-white px-6 py-10 md:py-14 text-center border-b border-[#0A1D2B]">
        <div className="max-w-xl mx-auto flex flex-col items-center">
          <div className="w-11 h-11 rounded-md bg-white/10 border border-white/20 flex items-center justify-center mb-3">
            <Radio className="w-6 h-6 text-teal-light" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white mb-1 font-mono">
            {t('nav.appName') || 'FloodWatch'} // {t('nav.sector') || 'FIELD OPERATIONS'}
          </span>
          <h2 className="text-base font-semibold text-teal-light mb-1.5 uppercase tracking-wider">
            {t('auth.responderLoginTitle') || 'Responder Triage & Incident Dispatch'}
          </h2>
          <p className="text-xs text-[#C4D9DF] max-w-md leading-relaxed font-mono">
            {t('auth.responderLoginSubtitle') || 'Field dispatch triage console for NDRF, SDRF, and GHMC DRF units.'}
          </p>
        </div>
      </section>

      {/* 2. FORM CONTAINER */}
      <main className="max-w-sm w-full mx-auto px-4 -mt-6 mb-12">
        <Card className="bg-surface border border-app-border rounded-md p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-app-border gap-2">
            <div>
              <h3 className="text-sm font-bold text-navy-ink leading-tight font-mono uppercase">
                {t('auth.signIn') || 'Field Unit Auth'}
              </h3>
              <p className="text-[11px] text-muted-text mt-0.5">
                {t('auth.responderRole') || 'Responder (Field Operations)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector variant="auth" />
              <Badge variant="high" size="sm">{t('auth.responderRole') || 'Field Unit'}</Badge>
            </div>
          </div>

          {serverError && (
            <div className="p-2.5 mb-3.5 rounded-md bg-[#FEF6EE] border border-[#FADCC3] flex items-start gap-2 text-xs text-[#B54708]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Agency Email */}
            <div>
              <label className="block text-[11px] font-semibold text-navy-ink uppercase tracking-wider mb-1 font-mono">
                {t('auth.email') || 'Official Agency Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="unit.callsign@resq.gov.in"
                className={`w-full px-3 py-1.5 text-xs font-mono bg-surface border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-deep focus:border-teal-deep ${
                  errors.email ? 'border-[#B42318] bg-[#FDF2F2]/30' : 'border-app-border'
                }`}
              />
              {errors.email && (
                <p className="text-xs text-[#B42318] mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-navy-ink uppercase tracking-wider mb-1 font-mono">
                {t('auth.password') || 'Security PIN / Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3 py-1.5 text-xs font-mono bg-surface border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-deep focus:border-teal-deep ${
                  errors.password ? 'border-[#B42318] bg-[#FDF2F2]/30' : 'border-app-border'
                }`}
              />
              {errors.password && (
                <p className="text-xs text-[#B42318] mt-1">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-full mt-2 font-mono"
              loading={loading}
              icon={ArrowRight}
            >
              {t('auth.signIn') || 'Verify & Connect Console'}
            </Button>
          </form>

          {/* Quick Demo Autofill */}
          <div className="mt-4 pt-3 border-t border-app-border">
            <button
              type="button"
              onClick={handleFillDemo}
              className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 text-xs font-medium text-navy-ink bg-app-bg border border-app-border rounded-md hover:bg-[#FAF9F6] transition-colors font-mono"
            >
              <Shield className="w-3.5 h-3.5 text-teal-deep" />
              <span>{t('auth.fillDemoResponder') || 'Autofill Demo (Inspector K. Vikram)'}</span>
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-app-border flex justify-between text-[11px] text-muted-text">
            <Link to="/login" className="hover:text-navy-ink underline">
              {t('auth.citizenLoginTitle') || 'Citizen Portal'}
            </Link>
            <Link to="/admin/login" className="hover:text-navy-ink underline">
              {t('auth.adminLoginTitle') || 'Command Admin'}
            </Link>
          </div>
        </Card>
      </main>

      <footer className="text-center py-3 text-xs text-muted-text border-t border-app-border bg-surface font-mono">
        <span>{t('nav.appName') || 'FloodWatch'} • {t('nav.sector') || 'HYDERABAD SECTOR'} • {t('common.demoData') || 'Drill Terminal'}</span>
      </footer>
    </div>
  );
};

export default ResponderLogin;
