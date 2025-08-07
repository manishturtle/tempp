import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { signup as SignupComponent } from "@/app/[tenant]/store/checkout/layouts/components/signup";
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Paper,
  ThemeProvider,
  createTheme,
  Link,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Collapse,
} from "@mui/material";
import { Visibility, VisibilityOff, Timer } from "@mui/icons-material";
import {
  useCheckEmail,
  useLogin,
  useSignup,
  useVerifyOTP,
  useResendOTP,
  useResetPassword,
} from "@/app/auth/hooks/useAuth";
import { useAuthStore } from "@/app/auth/store/authStore";
import AuthService from "@/app/auth/services/authService";
import { useRouter } from "next/navigation";
import type { CheckEmailResponse } from "@/app/types/auth";

// Define a theme to get access to primary colors
const theme = createTheme({
  palette: {
    primary: {
      main: "#4f46e5", // Your indigo color
    },
  },
  typography: {
    fontFamily: "'Poppins', sans-serif",
  },
});

// A small component for the welcome overlay content
const WelcomeOverlay = ({ title, message, buttonText, onButtonClick }: any) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    textAlign="center"
    height="100%"
    p={4}
  >
    {/* <Typography variant="h4" component="h1" fontWeight="bold" mb={2}>
      {title}
    </Typography>
    <Typography mb={4}>{message}</Typography>
    <Button
      variant="outlined"
      sx={{
        borderColor: "white",
        color: "white",
        borderRadius: "20px",
        px: 4,
        py: 1,
        "&:hover": {
          backgroundColor: "white",
          color: "primary.main",
          borderColor: "white",
        },
      }}
      onClick={onButtonClick}
    >
      {buttonText}
    </Button> */}
  </Box>
);

interface LoginFormProps {
  onSuccess?: () => void;
}

// The main authentication form component
const LoginFormComponent = ({
  onSuccess,
}: LoginFormProps): React.ReactElement => {
  // Core state variables
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  // User account status flags from API response
  const [emailChecked, setEmailChecked] = useState<boolean>(false);
  const [emailExists, setEmailExists] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [hasPassword, setHasPassword] = useState<boolean>(true);
  const [showOtpField, setShowOtpField] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>("");

  // Additional state for OTP flow
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);
  const [emailVerificationCompleted, setEmailVerificationCompleted] =
    useState<boolean>(false);

  // OTP resend timer state
  const [resendDisabled, setResendDisabled] = useState<boolean>(false);
  const [resendCountdown, setResendCountdown] = useState<number>(60); // Countdown in seconds
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Hooks
  const router = useRouter();
  const checkEmailMutation = useCheckEmail();
  const loginMutation = useLogin();
  const signupMutation = useSignup();
  const verifyOTPMutation = useVerifyOTP();
  const resendOTPMutation = useResendOTP();
  const resetPasswordMutation = useResetPassword();

  // Loading states
  const isCheckingEmail = checkEmailMutation.isPending;
  const isLoggingIn = loginMutation.isPending;
  const isVerifyingOtp = verifyOTPMutation.isPending;
  const isResendingOtp = resendOTPMutation.isPending;
  const isResettingPassword = resetPasswordMutation.isPending;
  const isLoading =
    isCheckingEmail ||
    isLoggingIn ||
    isVerifyingOtp ||
    isResendingOtp ||
    isResettingPassword;

  // Effect to start timer when OTP field is displayed
  useEffect(() => {
    if (showOtpField) {
      startResendTimer();
    }

    // Cleanup timer on unmount
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [showOtpField]); // Re-run when showOtpField changes

  // Toggle sign in/sign up panels
  const togglePanel = (): void => {
    // Reset all form fields and errors when switching panels
    if (isSignUp) {
      // If switching from signup to login, keep the email
      setPassword("");
    } else {
      // If switching from login to signup, reset all fields
      setEmail("");
      setPassword("");
    }

    setFirstName("");
    setLastName("");
    setConfirmPassword("");
    setPhoneNumber("");
    setEmailError(null);
    setPasswordError(null);
    setNameError(null);
    setSignupError(null);
    setEmailChecked(false);
    setIsSignUp((prev) => !prev);
  };

  // Handle email check and verification logic
  const handleEmailNext = (): void => {
    // Reset errors
    setEmailError(null);
    setPasswordError(null);
    setShowOtpField(false);

    // Basic validation
    if (!email) {
      setEmailError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    checkEmailMutation.mutate(email, {
      onSuccess: (data: CheckEmailResponse) => {
        setEmailExists(data.exists);

        // Check if the account is active
        if (data.is_active !== undefined) setIsActive(data.is_active);
        if (data.is_verified !== undefined) setIsVerified(data.is_verified);
        if (data.has_password !== undefined) setHasPassword(data.has_password);

        // If email doesn't exist, show signup form
        if (!data.exists) {
          setIsSignUp(true); // Switch to signup form
        }
        // If email exists but account is inactive
        else if (data.exists && !data.is_active) {
          setEmailError(
            "Your account is not active. Please contact support or an administrator."
          );
        }
        // If email exists, account is active but not verified or doesn't have password
        else if (
          data.exists &&
          data.is_active &&
          (!data.is_verified || !data.has_password)
        ) {
          setShowOtpField(true);
          // Here we would typically call an API to send OTP
          console.log("Should send OTP to", email);
        }

        setEmailChecked(true);
      },
      onError: (error: any) => {
        console.error("Error checking email:", error);
        if (!error?.response?.data?.exists) {
          setIsSignUp(true);
        }
        setEmailError(
          error?.response?.data?.message ||
            "Error checking email. Please try again."
        );
      },
    });
  };

  // Handle OTP verification
  const handleOtpVerification = (e?: React.FormEvent): void => {
    if (e) e.preventDefault();
    setOtpError(null);

    if (!otp) {
      setOtpError("Please enter the verification code");
      return;
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setOtpError("Please enter a valid 6-digit code");
      return;
    }

    verifyOTPMutation.mutate(
      { email, otp },
      {
        onSuccess: (response) => {
          if (response.success) {
            if (
              (isForgotPassword || (hasPassword && isActive && !isVerified)) &&
              response.access_token &&
              response.refresh_token
            ) {
              // Store tokens
              AuthService.setToken(response.access_token);
              AuthService.setRefreshToken(response.refresh_token);

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

              // Execute the success callback if provided
              if (onSuccess) onSuccess();
              else router.push("/");
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

  // Start resend timer function
  const startResendTimer = (): void => {
    setResendDisabled(true);
    setResendCountdown(60); // Reset countdown to 60 seconds

    // Clear any existing interval
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    // Set new interval
    const interval = setInterval(() => {
      setResendCountdown((prevCount) => {
        // When countdown reaches 0, enable the resend button
        if (prevCount <= 1) {
          clearInterval(interval);
          setResendDisabled(false);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    setTimerInterval(interval);
  };

  // Reset and restart timer
  const resetResendTimer = (): void => {
    startResendTimer();
  };

  // Handle resending OTP
  const handleResendOtp = (): void => {
    setOtpError(null);
    resetResendTimer();

    resendOTPMutation.mutate(
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
  const handleForgotPassword = (e: React.MouseEvent): void => {
    e.preventDefault();
    setIsForgotPassword(true);
    setHasPassword(false); // Hide password field when forgot password is clicked
    handleResendOtp();
  };

  // Handle sign in button click
  const handleSignIn = async (): Promise<void> => {
    // Reset error messages
    setPasswordError(null);

    if (!password) {
      setPasswordError("Password is required");
      return;
    }

    try {
      let response;

      // If showing confirm password field, use password reset flow
      if (showConfirmPassword) {
        console.log("Password reset flow");
        if (!confirmPassword) {
          setPasswordError("Please confirm your password");
          return;
        }

        if (password !== confirmPassword) {
          setPasswordError("Passwords do not match");
          return;
        }

        // Use password reset endpoint
        response = await resetPasswordMutation.mutateAsync({
          email,
          new_password: password,
          confirm_password: confirmPassword,
        });
      } else {
        // Use regular login endpoint
        response = await loginMutation.mutateAsync({ email, password });
      }

      // Store tokens using AuthService
      if (response.access_token) {
        AuthService.setToken(response.access_token);
      }

      if (response.refresh_token) {
        AuthService.setRefreshToken(response.refresh_token);
      }

      // Update auth store with user data
      let accessToken = response.access_token;
      let refreshToken = response.refresh_token;
      let userData = response.user;

      if (userData && accessToken && refreshToken) {
        useAuthStore.getState().login(accessToken, refreshToken, userData);
      }

      // Execute the success callback if provided
      if (onSuccess) onSuccess();
      else router.push("/");
    } catch (error: any) {
      console.error("Login/Password reset error:", error);
      setPasswordError(
        error?.response?.data?.detail ||
          "Invalid credentials or operation failed"
      );
    }
  };

  // Toggle password visibility
  const handleTogglePasswordVisibility = (): void => {
    setShowPassword((prev) => !prev);
  };

  // Toggle confirm password visibility
  const handleToggleConfirmPasswordVisibility = (): void => {
    setShowConfirmPassword((prev) => !prev);
  };

  // // Handle signup submission
  // const handleSignUp = (): void => {
  //   // Reset errors
  //   setEmailError(null);
  //   setPasswordError(null);
  //   setNameError(null);
  //   setSignupError(null);

  //   // Basic validation
  //   let hasError = false;

  //   if (!firstName || !lastName) {
  //     setNameError("First name and last name are required");
  //     hasError = true;
  //   }

  //   if (!email) {
  //     setEmailError("Email is required");
  //     hasError = true;
  //   } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  //     setEmailError("Please enter a valid email address");
  //     hasError = true;
  //   }

  //   if (!password) {
  //     setPasswordError("Password is required");
  //     hasError = true;
  //   } else if (password.length < 8) {
  //     setPasswordError("Password must be at least 8 characters");
  //     hasError = true;
  //   }

  //   if (password !== confirmPassword) {
  //     setPasswordError("Passwords do not match");
  //     hasError = true;
  //   }

  //   if (hasError) return;

  //   // Call the signup API
  //   signupMutation.mutate(
  //     {
  //       account_type: "INDIVIDUAL",
  //       first_name: firstName,
  //       last_name: lastName,
  //       email: email,
  //       password: password,
  //       password_confirm: confirmPassword,
  //       phone: phoneNumber,
  //     },
  //     {
  //       onSuccess: (response) => {
  //         // If signup returns tokens directly, handle authentication
  //         if (response.access_token) {
  //           AuthService.setToken(response.access_token);
  //           AuthService.setRefreshToken(response.refresh_token);
  //           useAuthStore
  //             .getState()
  //             .login(
  //               response.access_token,
  //               response.refresh_token,
  //               response.user
  //             );
  //         }

  //         // Show success message and/or redirect
  //         togglePanel(); // Switch back to sign in
  //         onSuccess?.();
  //       },
  //       onError: (error: any) => {
  //         console.error("Signup error:", error);
  //         // @ts-ignore - Response type may vary depending on API
  //         const errorMessage =
  //           error?.response?.data?.detail || "Signup failed. Please try again.";
  //         setSignupError(errorMessage);
  //       },
  //     }
  //   );
  // };

  const mainWidth = "70%";

  return (
    <ThemeProvider theme={theme}>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="white"
        minWidth="100vw"
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            height: "100%",
            width: "50%",
            transition: "all 0.6s ease-in-out",
            left: 0,
            transform: isSignUp ? "translateX(100%)" : "translateX(0)",
            zIndex: 5,
            overflow: "hidden",
          }}
        >
          {isSignUp ? (
            // Sign Up Form Side - Using the imported SignupComponent
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
                overflow: "auto",
              }}
            >
              <SignupComponent
                email={email}
                onSuccess={onSuccess}
                onSwitchToLogin={() => setIsSignUp(false)}
              />
            </Box>
          ) : (
            // Sign In Form Side
            <Box
              height="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={4}
            >
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography
                    variant="h4"
                    component="h1"
                    fontWeight="bold"
                    mb={4}
                    textAlign="center"
                    color="black"
                  >
                    Sign In
                  </Typography>
                </Grid>

                <Collapse in={!!emailError} sx={{ width: "100%", mb: 2 }}>
                  <Grid item xs={12} display="flex" justifyContent="center">
                    <Alert severity="error" sx={{ width: mainWidth }}>
                      {emailError}
                    </Alert>
                  </Grid>
                </Collapse>

                <Collapse in={!emailChecked} sx={{ width: "100%" }}>
                  <Grid item xs={12} display="flex" justifyContent="center">
                    <TextField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={!!emailError}
                      helperText={emailError ? emailError : ""}
                      sx={{ width: mainWidth }}
                    />
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    display="flex"
                    justifyContent="center"
                    sx={{ mt: 2 }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleEmailNext}
                      disabled={checkEmailMutation.isPending}
                      sx={{
                        py: 1.5,
                        color: "white",
                        borderRadius: "20px",
                        width: mainWidth,
                      }}
                    >
                      {checkEmailMutation.isPending ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        "Next"
                      )}
                    </Button>
                  </Grid>
                </Collapse>

                <Collapse
                  in={
                    emailChecked &&
                    emailExists &&
                    isActive &&
                    ((isVerified && hasPassword) || emailVerificationCompleted)
                  }
                  sx={{ width: "100%" }}
                >
                  <Grid item xs={12} display="flex" justifyContent="center">
                    <TextField
                      label="Email"
                      type="email"
                      value={email}
                      disabled
                      sx={{ width: mainWidth }}
                    />
                  </Grid>

                  <Collapse in={!!passwordError} sx={{ width: "100%", mt: 1 }}>
                    <Grid item xs={12} display="flex" justifyContent="center">
                      <Alert severity="error" sx={{ width: mainWidth }}>
                        {passwordError}
                      </Alert>
                    </Grid>
                  </Collapse>

                  <Grid
                    item
                    xs={12}
                    display="flex"
                    justifyContent="center"
                    sx={{ mt: 2 }}
                  >
                    <TextField
                      label={hasPassword ? "Password" : "Create Password"}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      placeholder={
                        hasPassword
                          ? "Enter your password"
                          : "Create a password"
                      }
                      autoComplete={
                        hasPassword ? "current-password" : "new-password"
                      }
                      sx={{ width: mainWidth }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={handleTogglePasswordVisibility}
                              edge="end"
                            >
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Collapse
                    in={
                      showConfirmPassword ||
                      (!hasPassword && emailVerificationCompleted)
                    }
                  >
                    <Grid
                      item
                      xs={12}
                      display="flex"
                      justifyContent="center"
                      sx={{ mt: 2 }}
                    >
                      <TextField
                        label="Confirm Password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        sx={{ width: mainWidth }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                                edge="end"
                              >
                                {showConfirmPassword ? (
                                  <VisibilityOff />
                                ) : (
                                  <Visibility />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </Collapse>

                  <Collapse in={hasPassword && !emailVerificationCompleted}>
                    <Grid item xs={12}>
                      <Link
                        href="#"
                        variant="body2"
                        display="block"
                        textAlign="center"
                        my={2}
                        onClick={handleForgotPassword}
                      >
                        Forgot Your Password? Login with OTP
                      </Link>
                    </Grid>
                  </Collapse>

                  <Grid
                    item
                    xs={12}
                    display="flex"
                    justifyContent="center"
                    sx={{ mt: 2 }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSignIn}
                      disabled={
                        isLoading ||
                        !password ||
                        (showConfirmPassword && !confirmPassword)
                      }
                      sx={{
                        py: 1.5,
                        color: "white",
                        borderRadius: "20px",
                        width: mainWidth,
                      }}
                    >
                      {isLoggingIn || isResettingPassword ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : hasPassword && !emailVerificationCompleted ? (
                        "SIGN IN"
                      ) : (
                        "SET PASSWORD"
                      )}
                    </Button>
                  </Grid>
                </Collapse>

                <Collapse
                  in={emailChecked && emailExists && showOtpField}
                  sx={{ width: "100%" }}
                >
                  <Grid item xs={12} display="flex" justifyContent="center">
                    <TextField
                      label="Email"
                      type="email"
                      value={email}
                      disabled
                      sx={{ width: mainWidth }}
                    />
                  </Grid>

                  <Grid item xs={12} sx={{ mt: 2, px: 2 }}>
                    <Typography
                      variant="body2"
                      textAlign="center"
                      sx={{ mb: 1 }}
                    >
                      Please enter the verification code sent to your email.
                    </Typography>
                  </Grid>

                  <Collapse in={!!otpError} sx={{ width: "100%" }}>
                    <Grid item xs={12} display="flex" justifyContent="center">
                      <Alert
                        severity={
                          otpError?.includes("sent") ? "success" : "error"
                        }
                        sx={{ width: mainWidth, mb: 2 }}
                      >
                        {otpError}
                      </Alert>
                    </Grid>
                  </Collapse>

                  <Grid
                    item
                    xs={12}
                    display="flex"
                    justifyContent="center"
                    sx={{ mt: 1 }}
                  >
                    <TextField
                      label="Verification Code"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value);
                        setOtpError(null);
                      }}
                      sx={{ width: mainWidth }}
                      error={!!otpError && !otpError.includes("sent")}
                      disabled={isVerifyingOtp || isResendingOtp}
                      inputProps={{ maxLength: 6 }}
                    />
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    display="flex"
                    justifyContent="center"
                    sx={{ mt: 2 }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleOtpVerification}
                      disabled={isVerifyingOtp || isResendingOtp || !otp}
                      sx={{
                        py: 1.5,
                        color: "white",
                        borderRadius: "20px",
                        width: mainWidth,
                      }}
                    >
                      {isVerifyingOtp ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        "Verify Code"
                      )}
                    </Button>
                  </Grid>

                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Button
                        variant="text"
                        size="small"
                        onClick={handleResendOtp}
                        disabled={
                          resendDisabled || isResendingOtp || isVerifyingOtp
                        }
                        startIcon={resendDisabled && <Timer fontSize="small" />}
                        sx={{ textTransform: "none" }}
                      >
                        {isResendingOtp
                          ? "Sending..."
                          : resendDisabled
                          ? `Resend in ${resendCountdown}s`
                          : "Resend Code"}
                      </Button>
                    </Box>
                  </Grid>
                </Collapse>
              </Grid>
            </Box>
          )}
        </Box>

        {/* Overlay Container */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            height: "100%",
            width: "50%",
            transition: "all 0.6s ease-in-out",
            left: "50%",
            transform: isSignUp ? "translateX(-100%)" : "translateX(0)",
            zIndex: 10,
            color: "white",
            bgcolor: "primary.main",
            borderTopLeftRadius: isSignUp ? "0px" : "200px",
            borderBottomLeftRadius: isSignUp ? "0px" : "200px",
            borderTopRightRadius: isSignUp ? "200px" : "0px",
            borderBottomRightRadius: isSignUp ? "200px" : "0px",
          }}
        >
          {isSignUp ? (
            <WelcomeOverlay
              title="Glad to see you!"
              message="If you already have an account with us, please sign in."
              buttonText="SIGN IN"
              onButtonClick={togglePanel}
            />
          ) : (
            <WelcomeOverlay
              title="Hello, Friend!"
              message="Register with your personal details to use all of site features"
              buttonText="SIGN UP"
              onButtonClick={togglePanel}
            />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export const LoginForm = dynamic(() => Promise.resolve(LoginFormComponent), {
  ssr: false,
});
