// frontend/src/pages/auth/Register.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import toastService from '../../services/toast.service';
import { ButtonLoader } from '../../components/common/Loader';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { theme, isDarkMode } = useTheme();
  
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirmPassword: false
  });

  // Get theme colors
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms agreement validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms of Service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof RegisterFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing/changing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toastService.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    
    try {
      await register({
        email: formData.email,
        password: formData.password
      });
      
      toastService.success('Account created successfully! Redirecting to dashboard...');
      
      // Navigate after showing success message
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (err: any) {
      // Extract meaningful error message
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.message) {
        if (err.message.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please try logging in instead.';
        } else if (err.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else {
          errorMessage = err.message;
        }
      }
      
      toastService.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    return Math.min(strength, 5);
  };

  const getStrengthColor = (strength: number) => {
    if (strength <= 1) return colors.semantic.error;
    if (strength <= 3) return colors.semantic.warning;
    return colors.semantic.success;
  };

  const getStrengthText = (strength: number) => {
    if (strength <= 1) return 'Weak';
    if (strength <= 3) return 'Medium';
    return 'Strong';
  };

  const passwordStrength = getPasswordStrength(formData.password);

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

  const UserPlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
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
              Start your financial journey today
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { title: 'Professional Portfolio Management', desc: 'Advanced tools for managing your investment portfolio', color: colors.semantic.success },
                { title: 'AI-Powered Insights', desc: 'Get intelligent recommendations for your financial goals', color: colors.brand.primary },
                { title: 'Real-time Market Data', desc: 'Stay updated with live market information and analysis', color: colors.brand.tertiary },
                { title: 'Secure & Private', desc: 'Your financial data is protected with enterprise-grade security', color: colors.semantic.info }
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
                    <CheckIcon />
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
          </div>
        </div>

        {/* Right Side - Registration Form */}
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

          {/* Registration Card */}
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
                color: colors.utility.primaryText,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <UserPlusIcon />
                <span>Create Account</span>
              </h2>
              <p style={{
                color: colors.utility.secondaryText
              }}>
                Start your financial planning journey
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
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={isLoading}
                    placeholder="Enter your email address"
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '12px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      border: `1px solid ${errors.email ? colors.semantic.error : colors.utility.secondaryText + '40'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      if (!errors.email) {
                        e.target.style.borderColor = colors.brand.primary;
                        e.target.style.boxShadow = `0 0 0 3px ${colors.brand.primary}20`;
                      }
                    }}
                    onBlur={(e) => {
                      if (!errors.email) {
                        e.target.style.borderColor = `${colors.utility.secondaryText}40`;
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  />
                </div>
                {errors.email && (
                  <p style={{
                    fontSize: '12px',
                    marginTop: '4px',
                    color: colors.semantic.error
                  }}>
                    {errors.email}
                  </p>
                )}
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
                    type={showPasswords.password ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={isLoading}
                    placeholder="Create a secure password"
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '40px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      border: `1px solid ${errors.password ? colors.semantic.error : colors.utility.secondaryText + '40'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      if (!errors.password) {
                        e.target.style.borderColor = colors.brand.primary;
                        e.target.style.boxShadow = `0 0 0 3px ${colors.brand.primary}20`;
                      }
                    }}
                    onBlur={(e) => {
                      if (!errors.password) {
                        e.target.style.borderColor = `${colors.utility.secondaryText}40`;
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('password')}
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
                    {showPasswords.password ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        color: getStrengthColor(passwordStrength)
                      }}>
                        Password Strength: {getStrengthText(passwordStrength)}
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: `${colors.utility.secondaryText}20`,
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(passwordStrength / 5) * 100}%`,
                        backgroundColor: getStrengthColor(passwordStrength),
                        transition: 'all 0.3s'
                      }} />
                    </div>
                  </div>
                )}
                
                {errors.password && (
                  <p style={{
                    fontSize: '12px',
                    marginTop: '4px',
                    color: colors.semantic.error
                  }}>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: colors.utility.primaryText
                }}>
                  Confirm Password
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
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPasswords.confirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    disabled={isLoading}
                    placeholder="Confirm your password"
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '40px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      border: `1px solid ${errors.confirmPassword ? colors.semantic.error : colors.utility.secondaryText + '40'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      if (!errors.confirmPassword) {
                        e.target.style.borderColor = colors.brand.primary;
                        e.target.style.boxShadow = `0 0 0 3px ${colors.brand.primary}20`;
                      }
                    }}
                    onBlur={(e) => {
                      if (!errors.confirmPassword) {
                        e.target.style.borderColor = `${colors.utility.secondaryText}40`;
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirmPassword')}
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
                    {showPasswords.confirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p style={{
                    fontSize: '12px',
                    marginTop: '4px',
                    color: colors.semantic.error
                  }}>
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Terms Agreement */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '24px'
              }}>
                <input
                  id="agreeToTerms"
                  name="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                  disabled={isLoading}
                  style={{
                    marginTop: '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    accentColor: colors.brand.primary,
                    cursor: 'pointer'
                  }}
                />
                <div style={{ fontSize: '14px' }}>
                  <label 
                    htmlFor="agreeToTerms"
                    style={{
                      color: colors.utility.primaryText,
                      cursor: 'pointer'
                    }}
                  >
                    I agree to the{' '}
                    <button
                      type="button"
                      style={{
                        fontWeight: '500',
                        color: colors.brand.primary,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        // Handle Terms of Service click
                      }}
                    >
                      Terms of Service
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      style={{
                        fontWeight: '500',
                        color: colors.brand.primary,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        // Handle Privacy Policy click
                      }}
                    >
                      Privacy Policy
                    </button>
                  </label>
                  {errors.agreeToTerms && (
                    <p style={{
                      fontSize: '12px',
                      marginTop: '4px',
                      color: colors.semantic.error
                    }}>
                      {errors.agreeToTerms}
                    </p>
                  )}
                </div>
              </div>

              {/* Create Account Button */}
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
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlusIcon />
                    <span>Create Account</span>
                    <ArrowRightIcon />
                  </>
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <p style={{
                fontSize: '14px',
                color: colors.utility.secondaryText
              }}>
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  style={{
                    fontWeight: '500',
                    color: colors.brand.primary,
                    textDecoration: 'none',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  Sign in here
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

export default Register;