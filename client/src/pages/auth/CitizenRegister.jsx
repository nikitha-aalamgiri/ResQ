import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge } from '../../components/ui';
import { AlertCircle, ArrowRight, LifeBuoy, ShieldCheck } from 'lucide-react';

export const CitizenRegister = () => {
  const { signUp, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      if (role === 'citizen') navigate('/citizen/dashboard');
      else if (role === 'responder') navigate('/responder/dashboard');
      else if (role === 'admin') navigate('/admin/dashboard');
    }
  }, [isAuthenticated, role, navigate]);

  const validate = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = 'Full legal name is required.';
    if (!phone.trim()) {
      errs.phone = 'Contact phone number is required.';
    } else if (!/^[+0-9\s-]{10,15}$/.test(phone.trim())) {
      errs.phone = 'Please enter a valid phone number (10-15 digits).';
    }
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
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
      await signUp(email, password, { full_name: fullName, phone });
      navigate('/citizen/dashboard');
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg text-navy-ink font-sans flex flex-col justify-between antialiased">
      {/* 1. LOGIN HERO: Single allowed navy-to-teal gradient per DESIGN.md */}
      <section className="bg-[linear-gradient(135deg,#0F2A3D_0%,#1F6F78_100%)] text-white px-6 py-10 md:py-14 text-center border-b border-[#0A1D2B]">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-md bg-white/10 border border-white/20 flex items-center justify-center mb-3">
            <LifeBuoy className="w-7 h-7 text-teal-light" />
          </div>
          <span className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1.5">
            FloodWatch
          </span>
          <h2 className="text-lg md:text-xl font-medium text-teal-light mb-2">
            Citizen Emergency Registration
          </h2>
          <p className="text-xs md:text-sm text-[#C4D9DF] max-w-lg leading-relaxed">
            Register your household details so emergency relief teams (NDRF, GHMC, SDRF) can locate and prioritize your family during flood alerts.
          </p>
        </div>
      </section>

      {/* 2. FORM CONTAINER: Plain white card with 1px border per DESIGN.md */}
      <main className="max-w-md w-full mx-auto px-4 -mt-6 mb-12">
        <Card className="bg-surface border border-app-border rounded-md p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-app-border">
            <div>
              <h3 className="text-base font-semibold text-navy-ink leading-tight">
                Create Citizen Profile
              </h3>
              <p className="text-xs text-muted-text mt-0.5">
                Role: Citizen (Public Emergency Registrant)
              </p>
            </div>
            <Badge variant="teal" size="sm">Citizens Only</Badge>
          </div>

          {serverError && (
            <div className="p-3 mb-4 rounded-md bg-[#FDF2F2] border border-[#F8D2D0] flex items-start gap-2.5 text-xs text-[#B42318]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className={`w-full px-3 py-2 text-sm bg-surface border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-deep focus:border-teal-deep ${
                  errors.fullName ? 'border-[#B42318] bg-[#FDF2F2]/30' : 'border-app-border'
                }`}
              />
              {errors.fullName && (
                <p className="text-xs text-[#B42318] mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1">
                Emergency Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91-9876543210"
                className={`w-full px-3 py-2 text-sm bg-surface border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-deep focus:border-teal-deep ${
                  errors.phone ? 'border-[#B42318] bg-[#FDF2F2]/30' : 'border-app-border'
                }`}
              />
              {errors.phone && (
                <p className="text-xs text-[#B42318] mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="resident@example.com"
                className={`w-full px-3 py-2 text-sm bg-surface border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-deep focus:border-teal-deep ${
                  errors.email ? 'border-[#B42318] bg-[#FDF2F2]/30' : 'border-app-border'
                }`}
              />
              {errors.email && (
                <p className="text-xs text-[#B42318] mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className={`w-full px-3 py-2 text-sm bg-surface border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-deep focus:border-teal-deep ${
                  errors.password ? 'border-[#B42318] bg-[#FDF2F2]/30' : 'border-app-border'
                }`}
              />
              {errors.password && (
                <p className="text-xs text-[#B42318] mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className={`w-full px-3 py-2 text-sm bg-surface border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-deep focus:border-teal-deep ${
                  errors.confirmPassword ? 'border-[#B42318] bg-[#FDF2F2]/30' : 'border-app-border'
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-[#B42318] mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              loading={loading}
              icon={ArrowRight}
            >
              Complete Registration
            </Button>
          </form>

          <div className="mt-4 pt-3 border-t border-app-border text-center">
            <p className="text-xs text-muted-text">
              Already registered?{' '}
              <Link to="/login" className="text-teal-deep font-semibold hover:underline">
                Sign In to Citizen Portal
              </Link>
            </p>
          </div>
        </Card>
      </main>

      <footer className="text-center py-4 text-xs text-muted-text border-t border-app-border bg-surface">
        <span>FloodWatch Emergency Operations • Hyderabad Sector Drill</span>
      </footer>
    </div>
  );
};

export default CitizenRegister;
