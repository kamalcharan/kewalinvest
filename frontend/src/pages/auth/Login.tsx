// frontend/src/pages/auth/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import toastService from '../../services/toast.service';
import { ButtonLoader } from '../../components/common/Loader';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { theme, isDarkMode } = useTheme();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get theme colors
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Get return URL from location state
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.password) {
      toastService.warning('Please enter both email and password');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toastService.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      await login(formData);
      toastService.success('Login successful! Redirecting to dashboard...');
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid email or password';
      toastService.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Icons
  const MailIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  );

  const LockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );

  const EyeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  const TrendingUpIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );

  const ArrowRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );

  return (
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        transition: 'background-color 0.2s',
        background: isDarkMode 
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground}, ${colors.brand.primary}20)`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground}, ${colors.brand.primary}10)`
      }}
    >
      {/* Background Pattern */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isDarkMode ? 0.1 : 0.05,
          backgroundImage: `
            linear-gradient(${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px),
            linear-gradient(90deg, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '48px',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        
        {/* Left Side - Branding & Features */}
        <div style={{
          display: window.innerWidth >= 1024 ? 'block' : 'none'
        }}>
          {/* Logo & Brand */}
          <div style={{ marginBottom: '32px' }}>
            <Link to="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none'
            }}>
              <div 
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  background: `linear-gradient(to bottom right, ${colors.brand.primary}, ${colors.brand.secondary})`
                }}
              >
                <TrendingUpIcon />
              </div>
              <div>
                <h1 style={{
                  fontSize: '30px',
                  fontWeight: 'bold',
                  color: colors.utility.primaryText,
                  margin: 0
                }}>
                  KewalInvest
                </h1>
                <p style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  margin: 0
                }}>
                  Personal Financial Planning System
                </p>
              </div>
            </Link>
          </div>

          {/* Value Proposition */}
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '24px'
            }}>
              Welcome back to your financial hub
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { title: 'Smart Portfolio Management', desc: 'AI-powered insights for your financial portfolio', color: colors.semantic.success },
                { title: 'Real-time Analytics', desc: 'Live market data and performance tracking', color: colors.brand.primary },
                { title: 'Personalized Recommendations', desc: 'Tailored investment strategies for your goals', color: colors.brand.tertiary }
              ].map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: `${item.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: item.color
                    }} />
                  </div>
                  <div>
                    <h3 style={{
                      fontWeight: '500',
                      color: colors.utility.primaryText,
                      margin: '0 0 4px 0'
                    }}>
                      {item.title}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: colors.utility.secondaryText,
                      margin: 0
                    }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Free Trial Banner */}
            <div style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '8px',
              border: `1px solid ${colors.semantic.success}40`,
              background: `linear-gradient(to right, ${colors.semantic.success}10, ${colors.semantic.success}05)`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: colors.semantic.success
              }}>
                <TrendingUpIcon />
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                  Start your financial journey today!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div style={{ width: '100%', maxWidth: '448px', margin: '0 auto' }}>
          {/* Mobile Logo */}
          <div style={{
            textAlign: 'center',
            marginBottom: '32px',
            display: window.innerWidth < 1024 ? 'block' : 'none'
          }}>
            <Link to="/" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                background: `linear-gradient(to bottom right, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}>
                <TrendingUpIcon />
              </div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: colors.utility.primaryText,
                margin: 0
              }}>
                KewalInvest
              </h1>
            </Link>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              Personal Financial Planning System
            </p>
          </div>

          {/* Login Card */}
          <div style={{
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            padding: '32px',
            backgroundColor: `${colors.utility.secondaryBackground}95`,
            border: `1px solid ${colors.utility.primaryText}20`
          }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: colors.utility.primaryText
              }}>
                Welcome Back
              </h2>
              <p style={{
                color: colors.utility.secondaryText
              }}>
                Sign in to your financial dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Email Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: colors.utility.primaryText
                }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.utility.secondaryText
                  }}>
                    <MailIcon />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    placeholder="Enter your email"
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '12px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      border: `1px solid ${colors.utility.secondaryText}40`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = colors.brand.primary;
                      e.target.style.boxShadow = `0 0 0 3px ${colors.brand.primary}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = `${colors.utility.secondaryText}40`;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: colors.utility.primaryText
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.utility.secondaryText
                  }}>
                    <LockIcon />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '40px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      border: `1px solid ${colors.utility.secondaryText}40`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = colors.brand.primary;
                      e.target.style.boxShadow = `0 0 0 3px ${colors.brand.primary}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = `${colors.utility.secondaryText}40`;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: colors.utility.secondaryText,
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.brand.primary,
                    textDecoration: 'none',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  fontWeight: '500',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                  color: 'white',
                  opacity: isLoading ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.opacity = '0.9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.opacity = '1';
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <ButtonLoader />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRightIcon />
                  </>
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <p style={{
                fontSize: '14px',
                color: colors.utility.secondaryText
              }}>
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  style={{
                    fontWeight: '500',
                    color: colors.brand.primary,
                    textDecoration: 'none',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  Start your free account
                </Link>
              </p>
            </div>
          </div>

          {/* Security Note */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              color: colors.utility.secondaryText
            }}>
              <TrendingUpIcon />
              <span>Your financial data is secured with enterprise-grade encryption</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;