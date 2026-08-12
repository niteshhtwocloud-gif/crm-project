import { useAuth } from "../../context/AuthContext";

import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  // State Management
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimatingTrigger, setIsAnimatingTrigger] = useState(false);
  const [isShakeError, setIsShakeError] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("admin@vendorcrm.com");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFormHidden, setIsFormHidden] = useState(false);
  const [isCardSuccessSize, setIsCardSuccessSize] = useState(false);
  const [isCheckmarkActive, setIsCheckmarkActive] = useState(false);
  const [ripples, setRipples] = useState([]);

  const usernameRef = useRef(null);

  // Background Particles Generation (stable random generation on mount)
  const particles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      posX: Math.random() * 100,
      delay: Math.random() * 10,
      duration: Math.random() * 10 + 8,
    }));
  }, []);

  // Card expansion morph triggers
  const handleExpandCard = () => {
    if (isExpanded) return;
    setIsAnimatingTrigger(true);

    setTimeout(() => {
      setIsExpanded(true);
      setIsAnimatingTrigger(false);
    }, 350);
  };

  const handleKeyDown = (e) => {
    if (!isExpanded && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      handleExpandCard();
    }
  };

  // Focus username input on expand
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        if (usernameRef.current) {
          usernameRef.current.focus();
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);



  // Submit and success flow
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setIsShakeError(false);

    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      showError("Please fill in all required fields.");
      return;
    }

    if (isSignUp) {
      const cp = confirmPassword.trim();
      if (!cp) {
        showError("Please confirm your password.");
        return;
      }
      if (p !== cp) {
        showError("Passwords do not match.");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const namePart = u.split('@')[0];
        const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        await register(displayName, u, p);
      } else {
        await login(u, p);
      }
      setIsLoading(false);
      showSuccessState();
    } catch (err) {
      setIsLoading(false);
      showError(err.message || "Authentication failed. Invalid credentials.");
    }
  };

  const showError = (message) => {
    setError(message);
    setIsShakeError(true);
    setTimeout(() => {
      setIsShakeError(false);
    }, 500);
  };

  const showSuccessState = () => {
    // Stage 1: Fade out form container
    setIsSuccess(true);

    setTimeout(() => {
      // Stage 2: Hide form container completely, shrink card, trigger layout change
      setIsFormHidden(true);
      setIsCardSuccessSize(true);
      
      // Stage 3: After layout changes, enable checkmark visual transition
      setTimeout(() => {
        setIsCheckmarkActive(true);
      }, 50);

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 2000);
    }, 400);
  };

  // Submit Button Ripple
  const handleRipple = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = {
      id: Date.now() + Math.random(),
      left: x,
      top: y,
    };
    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  // Morph card classes
  const morphCardClasses = [
    "morph-card",
    !isExpanded ? "collapsed" : isCardSuccessSize ? "success-state" : "expanded",
    isExpanded && isSignUp && !isCardSuccessSize ? "signup-state" : "",
    isAnimatingTrigger ? "animating-trigger" : "",
    isShakeError ? "shake-error" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="login-page">
      {/* Ambient Glow & Background FX */}
      <div className="bg-glow bg-glow-pink"></div>
      <div className="bg-glow bg-glow-cyan"></div>
      
      {/* Particles Container */}
      <div id="particles-container">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.posX}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Main Container / Morphing Card */}
      <main className="main-wrapper">
        <div
          className={morphCardClasses}
          id="morphCard"
          tabIndex={0}
          role="region"
          aria-label="Login Interface"
          onKeyDown={handleKeyDown}
        >
          {/* Rotating Animated Neon Border */}
          <div className="border-glow-wrapper">
            <div className="border-glow"></div>
          </div>

          {/* Inner Card Content Layer */}
          <div className="card-content">
            
            {/* Trigger Button View (Initial State) */}
            {!isExpanded && (
              <button
                className="trigger-btn-content"
                id="triggerBtn"
                onClick={handleExpandCard}
                aria-label="Open Login Form"
              >
                <svg className="heart-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span className="btn-text">LOGIN</span>
                <svg className="heart-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
            )}

            {/* Expanded Form View */}
            {isExpanded && !isFormHidden && (
              <div
                className={`form-container ${isSuccess ? "hidden" : ""}`}
                id="formContainer"
                aria-hidden={!isExpanded}
                style={isSuccess ? { opacity: 0, transition: "opacity 0.4s ease" } : {}}
              >
                {/* Header */}
                <div className="form-header">
                  <div className="header-title">
                    <svg className="heart-icon header-heart" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <h2>{isSignUp ? "SIGN UP" : "LOGIN"}</h2>
                    <svg className="heart-icon header-heart" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                  <p className="subtitle">
                    {isSignUp ? "Create an account to get started" : "Welcome back! Please login to continue"}
                  </p>
                </div>

                {/* Error Feedback Banner */}
                <div className={`error-banner ${error ? "visible" : ""}`} id="errorBanner" role="alert">
                  {error}
                </div>

                {/* Login Form */}
                <form id="loginForm" onSubmit={handleSubmit} noValidate>
                  {/* Username Input */}
                  <div className="input-group">
                    <div className="input-wrapper">
                      <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <input
                        ref={usernameRef}
                        type="text"
                        id="username"
                        placeholder="Username"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="input-group">
                    <div className="input-wrapper">
                      <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      <input
                        type={isPasswordVisible ? "text" : "password"}
                        id="password"
                        placeholder="Password"
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="eye-btn"
                        id="togglePassword"
                        onClick={() => setIsPasswordVisible((v) => !v)}
                        aria-label="Toggle password visibility"
                      >
                        <svg className={`eye-icon eye-off ${isPasswordVisible ? "hidden" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                        <svg className={`eye-icon eye-on ${!isPasswordVisible ? "hidden" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Input (Sign Up only) */}
                  {isSignUp && (
                    <div className="input-group">
                      <div className="input-wrapper">
                        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <input
                          type={isConfirmPasswordVisible ? "text" : "password"}
                          id="confirmPassword"
                          placeholder="Confirm Password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="eye-btn"
                          id="toggleConfirmPassword"
                          onClick={() => setIsConfirmPasswordVisible((v) => !v)}
                          aria-label="Toggle password visibility"
                        >
                          <svg className={`eye-icon eye-off ${isConfirmPasswordVisible ? "hidden" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                          <svg className={`eye-icon eye-on ${!isConfirmPasswordVisible ? "hidden" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Options Row */}
                  <div className="form-options">
                    <label className="remember-me">
                      <input type="checkbox" id="remember" />
                      <span className="custom-checkbox"></span>
                      <span className="label-text">Remember Me</span>
                    </label>
                    <a href="#" className="forgot-pass" onClick={(e) => e.preventDefault()}>
                      Forgot Password?
                    </a>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="submit-btn"
                    id="submitBtn"
                    onClick={handleRipple}
                    disabled={isLoading}
                  >
                    <span className={`submit-text ${isLoading ? "hidden" : ""}`}>
                      {isSignUp ? "SIGN UP" : "LOGIN"}
                    </span>
                    <div className={`loader-spinner ${isLoading ? "" : "hidden"}`} id="loader"></div>
                    {ripples.map((r) => (
                      <span
                        key={r.id}
                        className="ripple"
                        style={{ left: r.left, top: r.top }}
                      />
                    ))}
                  </button>
                </form>

                {/* Footer Link */}
                <div className="form-footer">
                  <p>
                    {isSignUp ? "Already have an account? " : "Don't have an account? "}
                    <a
                      href="#"
                      className="signup-link"
                      onClick={(e) => {
                        e.preventDefault();
                        setError("");
                        setIsSignUp((prev) => !prev);
                      }}
                    >
                      {isSignUp ? "Log In" : "Sign Up"}
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Success Animation View */}
            {isFormHidden && (
              <div className={`success-view ${isCheckmarkActive ? "active" : ""}`} id="successView">
                <div className="check-container">
                  <svg className="checkmark" viewBox="0 0 52 52">
                    <circle className="checkmark-circle" cx="26" cy="26" r="23" fill="none" />
                    <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                  </svg>
                </div>
                <h3>{isSignUp ? "Account Created" : "Authenticated"}</h3>
                <p>{isSignUp ? "Setting up dashboard..." : "Redirecting to dashboard..."}</p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
