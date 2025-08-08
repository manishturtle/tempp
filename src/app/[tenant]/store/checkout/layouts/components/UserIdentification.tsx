import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  useTheme,
  CircularProgress,
  Alert,
  Collapse,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Visibility, VisibilityOff, Timer } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  useCheckEmail,
  useLogin,
  useVerifyOTP,
  useResendOTP,
  useResetPassword,
} from "@/app/auth/hooks/useAuth";
import AuthService from "@/app/auth/services/authService";
import { useAuthStore } from "@/app/auth/store/authStore";
import { useAuthRefresh } from "@/app/contexts/AuthRefreshContext";
import { useStoreConfig } from "@/app/[tenant]/store/layout";
import { signup as SignupComponent } from "./signup";

interface UserIdentificationProps {
  onNext: () => void;
  onPrev?: () => void;
}

interface EmailCheckResponse {
  email: string;
  exists: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  has_password?: boolean;
  message?: string;
}

/**
 * UserIdentification component for the checkout process
 * Simple email collection form that matches the provided design
 */
const UserIdentification: React.FC<UserIdentificationProps> = ({ onNext }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [receiveOffers, setReceiveOffers] = useState(true);
  const [emailExists, setEmailExists] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showNonExistentUserError, setShowNonExistentUserError] =
    useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOtpField, setShowOtpField] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [emailVerificationCompleted, setEmailVerificationCompleted] =
    useState(false);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { refreshAuthState } = useAuthRefresh();
  const { login: setAuthData } = useAuthStore();

  // Initialize hooks
  const resetPassword = useResetPassword();
  const {
    mutate: checkEmail,
    isError,
    reset,
    status: emailCheckStatus,
  } = useCheckEmail();
  const login = useLogin();
  const { mutate: verifyOTP, status: verifyOTPStatus } = useVerifyOTP();
  const { mutate: resendOTP, status: resendOTPStatus } = useResendOTP();

  // Determine loading state from mutation statuses
  const isChecking = emailCheckStatus === "pending";
  const isLoggingIn = login.status === "pending";
  const isVerifyingOtp = verifyOTPStatus === "pending";
  const isSendingOtp = resendOTPStatus === "pending";
  const isLoading =
    isChecking ||
    isLoggingIn ||
    isCheckingEmail ||
    isVerifyingOtp ||
    isSendingOtp;

  // Effect to hide the non-existent user error after 3 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (showNonExistentUserError) {
      timer = setTimeout(() => {
        setShowNonExistentUserError(false);
      }, 3000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showNonExistentUserError]);
  
  // Effect to handle OTP resend timer
  useEffect(() => {
    // Start timer when OTP field is shown
    if (showOtpField && !emailVerificationCompleted) {
      setIsResendDisabled(true);
      setTimerSeconds(60);
      
      // Clear any existing interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      
      // Start new countdown
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            setIsResendDisabled(false);
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            return 0;
          }
          return newValue;
        });
      }, 1000);
    }
    
    // Cleanup interval when component unmounts or OTP field is hidden
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [showOtpField, emailVerificationCompleted]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateEmailInput = (): boolean => {
    if (!email) {
      setEmailError("Email is required");
      return false;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleGuestContinue = (e: React.MouseEvent) => {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setShowNonExistentUserError(false);

    if (!validateEmailInput()) {
      return;
    }

    // Store the guest user's email in localStorage so Layout1 can access it
    // Create a temporary guest user object
    const guestUserData = {
      email: email,
      firstName: "",
      lastName: "",
      isGuest: true,
    };

    // Get the tenant ID from the URL path
    const tenantId = getTenantSlugFromPath();

    // Store in localStorage with tenant prefix if available
    const userKey = tenantId ? `${tenantId}_guest_user` : "guest_user";
    localStorage.setItem(userKey, JSON.stringify(guestUserData));

    // If email is valid, proceed without sign-in
    onNext();
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setShowNonExistentUserError(false);
    setShowOtpField(false);
    setEmailVerificationCompleted(false);

    if (!validateEmailInput()) {
      return;
    }

    setIsCheckingEmail(true);

    // Call the email check API
    checkEmail(email, {
      onSuccess: (data: EmailCheckResponse) => {
        setEmailExists(data.exists);

        if (!data.exists) {
          // Email doesn't exist - show signup form
          setShowSignupForm(true);
          return;
        }

        // Email exists - handle different scenarios based on user state
        if (data.is_active !== undefined) setIsActive(data.is_active);
        if (data.is_verified !== undefined) setIsVerified(data.is_verified);
        if (data.has_password !== undefined) setHasPassword(data.has_password);

        // Case 1: Email exists, active, verified, has password - show password field directly
        if (data.is_active && data.is_verified && data.has_password) {
          // No additional action needed - password field will be shown automatically
        }
        // Case 2: Email exists, active, NOT verified or NO password - show OTP input field
        else if (data.is_active && (!data.is_verified || !data.has_password)) {
          setShowOtpField(true);
        }
        // Case 3: Email exists but not active
        else if (!data.is_active) {
          setEmailError(
            "Your account is not active. Please contact support or an administrator."
          );
        }
      },
      onError: (error) => {
        console.error("Error checking email:", error);
        if (!error?.response?.data?.exists) {
          setShowSignupForm(true);
          return;
        }
        setEmailError(
          error?.response?.data?.message ||
            "Error checking email. Please try again."
        );
      },
      onSettled: () => {
        setIsCheckingEmail(false);
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailExists) {
      if (showOtpField && !emailVerificationCompleted) {
        handleOtpVerification(e);
      } else if (emailVerificationCompleted || (isVerified && hasPassword)) {
        handleLoginSubmit(e);
      }
    } else {
      handleEmailSubmit(e);
    }
  };

  // Handle OTP verification
  const handleOtpVerification = (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp) {
      setOtpError("Please enter the verification code");
      return;
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setOtpError("Please enter a valid 6-digit code");
      return;
    }

    setOtpError("");

    verifyOTP(
      { email, otp },
      {
        onSuccess: (response) => {
          if (response.success) {
            // If this is a forgot password flow or user has password but isn't verified
            if (
              (isForgotPassword || (hasPassword && isActive && !isVerified)) &&
              response.access_token &&
              response.refresh_token
            ) {
              // Store tokens
              if (response.access_token) {
                AuthService.setToken(response.access_token);
              }

              if (response.refresh_token) {
                AuthService.setRefreshToken(response.refresh_token);
              }

              // Update auth store with user data
              if (response.user) {
                useAuthStore
                  .getState()
                  .login(
                    response.access_token,
                    response.refresh_token,
                    response.user
                  );
              }
              refreshAuthState();
              onNext();
            } else {
              // Standard flow for new users setting passwords
              setEmailVerificationCompleted(true);
              setShowOtpField(false);

              // Show password field or password + confirm password field based on whether user has password
              if (!hasPassword) {
                setShowConfirmPassword(true);
              }
            }
          } else {
            setOtpError(response.message || "Verification failed");
          }
        },
        onError: (error: any) => {
          console.error("OTP verification error:", error);
          setOtpError(
            error?.response?.data?.detail ||
              "Invalid or expired verification code"
          );
        },
      }
    );
  };

  // Handle resending OTP
  const handleResendOtp = () => {
    setOtpError("");
    
    // Disable button and restart timer
    setIsResendDisabled(true);
    setTimerSeconds(60);
    
    // Clear any existing interval and start a new one
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        const newValue = prev - 1;
        if (newValue <= 0) {
          setIsResendDisabled(false);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          return 0;
        }
        return newValue;
      });
    }, 1000);

    resendOTP(
      { email },
      {
        onSuccess: (data) => {
          if (data.success) {
            setShowOtpField(true);
            // Show success message
            setOtpError("A new verification code has been sent to your email");
          }
        },
        onError: (error: any) => {
          console.error("Error sending OTP:", error);
          setOtpError(
            error?.response?.data?.detail ||
              "Failed to send verification code. Please try again."
          );
        },
      }
    );
  };

  // Handle forgot password
  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsForgotPassword(true);
    setHasPassword(false); // Hide password field when forgot password is clicked
    handleResendOtp();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setConfirmPasswordError("");

    if (!password) {
      setPasswordError("Password is required");
      return;
    }

    try {
      let response;

      // If showing confirm password field, use password reset flow
      if (showConfirmPassword) {
        if (!confirmPassword) {
          setConfirmPasswordError("Please confirm your password");
          return;
        }

        if (password !== confirmPassword) {
          setConfirmPasswordError("Passwords do not match");
          return;
        }

        // Use password reset endpoint
        response = await resetPassword.mutateAsync({
          email,
          new_password: password,
          confirm_password: confirmPassword,
        });
      } else {
        // Use regular login endpoint
        response = await login.mutateAsync({ email, password });
      }

      // Store tokens using AuthService
      if (response.access_token) {
        AuthService.setToken(response.access_token);
      }

      if (response.refresh_token) {
        AuthService.setRefreshToken(response.refresh_token);
      }

      // Update auth store with user data
      if (response.user && response.access_token && response.refresh_token && response.customer_group_id) {
        setAuthData(
          response.access_token,
          response.refresh_token,
          response.user,
          response.customer_group_id
        );
      }

      refreshAuthState();
      onNext();
    } catch (error: any) {
      console.error("Login/Password reset error:", error);
      setPasswordError(
        error?.response?.data?.detail ||
          "Invalid credentials or operation failed"
      );
    }
  };

  // Handle switch back to login
  const handleSwitchToLogin = () => {
    setShowSignupForm(false);
  };

  // Handle successful signup
  const handleSignupSuccess = () => {
    onNext();
  };

  // Extract getTenantSlug function to avoid code duplication
  const getTenantSlugFromPath = (): string => {
    const pathSegments = window.location.pathname.split("/");
    const tenantIndex = pathSegments.findIndex(
      (segment) =>
        segment === "[tenant]" ||
        (segment &&
          segment.length > 0 &&
          segment !== "store" &&
          segment !== "checkout")
    );
    return tenantIndex >= 0 ? pathSegments[tenantIndex] : "";
  };

  // If showing signup form, render the signup component
  if (showSignupForm) {
    return (
      <SignupComponent
        onSwitchToLogin={handleSwitchToLogin}
        onSuccess={handleSignupSuccess}
        email={email}
      />
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography variant="h6" fontWeight={600}>
        Account
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column" }}
      >
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Email"
            type="email"
            size="small"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
              if (emailExists) {
                setEmailExists(false);
                setShowOtpField(false);
                setEmailVerificationCompleted(false);
              }
            }}
            placeholder="username@gmail.com"
            variant="outlined"
            error={!!emailError || isError}
            helperText={
              emailError ||
              (isError ? "Error checking email. Please try again." : "")
            }
            disabled={isLoading || emailExists}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
              },
              mb: 1,
              width: "50%",
            }}
          />

          {/* OTP Verification Field */}
          <Collapse in={showOtpField && !emailVerificationCompleted}>
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Please enter the verification code sent to your email.
              </Typography>
              <TextField
                label="Verification Code"
                size="small"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  setOtpError("");
                }}
                placeholder="Enter 6-digit code"
                variant="outlined"
                error={!!otpError}
                helperText={otpError}
                disabled={isVerifyingOtp || isSendingOtp}
                inputProps={{ maxLength: 6 }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1,
                  },
                  width: "50%",
                }}
              />
              <Box sx={{ display: "flex", mt: 1, alignItems: "center" }}>
                <Tooltip title={isResendDisabled ? t("Wait before resending") : t("Resend verification code")}>
                  <span> {/* Wrapper needed for tooltip to work with disabled button */}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleResendOtp}
                      disabled={isSendingOtp || isVerifyingOtp || isResendDisabled}
                      sx={{ 
                        textTransform: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5
                      }}
                      startIcon={<Timer fontSize="small" />}
                    >
                      {isSendingOtp ? t("Sending...") : isResendDisabled ? `${t("Resend OTP")} (${timerSeconds}s)` : t("Resend OTP")}
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </Collapse>

          {/* Password Field - Show when email exists AND (user is verified with password OR email verification completed) */}
          <Collapse
            in={
              emailExists &&
              ((isVerified && hasPassword) || emailVerificationCompleted)
            }
          >
            <TextField
              label="Password"
              size="small"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError("");
              }}
              placeholder={
                hasPassword ? "Enter your password" : "Create a password"
              }
              variant="outlined"
              error={!!passwordError}
              helperText={passwordError}
              autoComplete={hasPassword ? "current-password" : "new-password"}
              disabled={isLoggingIn}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      sx={{
                        color: "text.secondary",
                        "&:hover": {
                          backgroundColor: "transparent",
                          color: "primary.main",
                        },
                      }}
                    >
                      {showPassword ? (
                        <VisibilityOff fontSize="small" />
                      ) : (
                        <Visibility fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1,
                  pr: 0.5,
                },
                mt: 2,
                width: "50%",
              }}
            />
          </Collapse>

          {/* Confirm Password Field - Show when email exists, verification completed, and no password */}
          <Collapse
            in={
              emailExists && emailVerificationCompleted && showConfirmPassword
            }
          >
            <TextField
              label="Confirm Password"
              size="small"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmPasswordError("");
              }}
              placeholder="Confirm your password"
              variant="outlined"
              error={!!confirmPasswordError}
              helperText={confirmPasswordError}
              autoComplete="new-password"
              disabled={isLoggingIn}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1,
                  pr: 0.5,
                },
                mt: 2,
                width: "50%",
              }}
            />
          </Collapse>

          {showNonExistentUserError && (
            <Typography
              variant="body2"
              color="error"
              sx={{
                mb: 2,
                textAlign: "center",
                "&:first-letter": {
                  textTransform: "uppercase",
                },
              }}
            >
              No account found with this email. Please try another email.
            </Typography>
          )}

          {isError && !emailError && !showNonExistentUserError && (
            <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
              {emailError || "Error checking email. Please try again."}
            </Alert>
          )}
        </Box>

        <Box
          sx={{ display: "flex", justifyContent: "flex-start", width: "100%" }}
        >
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={isLoading}
            sx={{
              py: 1,
              width: "30%",
              borderRadius: 1,
              textTransform: "none",
              fontWeight: 500,
              minWidth: "120px",
              position: "relative",
            }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                {isVerifyingOtp
                  ? "Verifying..."
                  : isLoggingIn
                  ? "Logging in..."
                  : isSendingOtp
                  ? "Sending..."
                  : isCheckingEmail
                  ? "Checking..."
                  : "Processing..."}
              </>
            ) : showOtpField && !emailVerificationCompleted ? (
              "Verify Code"
            ) : emailExists &&
              ((isVerified && hasPassword) || emailVerificationCompleted) ? (
              hasPassword ? (
                "Login"
              ) : (
                "Create Password"
              )
            ) : (
              "Continue"
            )}
          </Button>
        </Box>

        {!isLoading &&
          emailExists &&
          isVerified &&
          hasPassword &&
          !showOtpField && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2,
                mt: 0.5,
              }}
            >
              <Link
                href="#"
                onClick={handleForgotPassword}
                sx={{
                  color: "primary.main",
                  textDecoration: "none",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                  fontSize: "14px",
                }}
              >
                Forgot Password? Login with OTP
              </Link>
            </Box>
          )}
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={receiveOffers}
              onChange={(e) => setReceiveOffers(e.target.checked)}
              sx={{
                color: "primary.main",
                p: 0,
                mr: 1,
                "&.Mui-checked": {
                  color: "primary.main",
                },
              }}
            />
          }
          label="Keep me up to date on news and offers"
          sx={{
            m: 0,
            mt: 1,
            alignItems: "flex-start",
            "& .MuiFormControlLabel-label": {
              fontSize: "0.875rem",
              color: "text.secondary",
              marginTop: "2px",
              lineHeight: 1.2,
            },
          }}
          componentsProps={{
            typography: {
              variant: "body2",
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default UserIdentification;
