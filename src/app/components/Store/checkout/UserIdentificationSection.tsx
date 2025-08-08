"use client";

import { FC, useState } from "react";
import { useAuthRefresh } from "@/app/contexts/AuthRefreshContext";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Checkbox,
  FormControlLabel,
  Link as MuiLink,
  Dialog,
  DialogContent,
  Stack,
  IconButton,
  Backdrop,
  DialogTitle,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { UserIdentificationFormData } from "@/app/types/store/checkout";
import { LoginForm } from "@/app/auth/components/LoginForm";
import { SignupForm } from "@/app/auth/components/SignupForm";
import { useStoreConfig } from "@/app/[tenant]/store/layout";

// Email validation schema using Zod
const userIdentificationSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
  saveForFuture: z.boolean().optional(),
});

interface UserIdentificationSectionProps {
  isAuthenticated: boolean;
  userEmail?: string;
  onGuestContinue: (data: UserIdentificationFormData) => void;
  onContinueToShipping: () => void;
  onLogout: () => void;
}

export const UserIdentificationSection: FC<UserIdentificationSectionProps> = ({
  isAuthenticated,
  userEmail,
  onGuestContinue,
  onContinueToShipping,
  onLogout,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isSignupDialogOpen, setIsSignupDialogOpen] = useState(false);
  const { featureToggles } = useStoreConfig();
  const { refreshAuthState } = useAuthRefresh();

  // Show loading state while featureToggles is being loaded
  if (!featureToggles) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '200px',
      }}>
        <CircularProgress />
      </Box>
    );
  }

  const handleSwitchToSignup = () => {
    setIsLoginDialogOpen(false);
    setIsSignupDialogOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsSignupDialogOpen(false);
    setIsLoginDialogOpen(true);
  };
  // Form handling with React Hook Form and Zod validation
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserIdentificationFormData>({
    resolver: zodResolver(userIdentificationSchema),
    defaultValues: {
      email: "",
      saveForFuture: false,
    },
  });

  if (isAuthenticated && userEmail) {
    return (
      <>
        <Paper
          elevation={0}
          sx={{
            p: theme.spacing(3),
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {t("common:store.checkout.accountInformation")}
          </Typography>

          <Box sx={{ mb: theme.spacing(3) }}>
            <Typography variant="body1">
              {t("common:store.checkout.loggedInAs")}{" "}
              <strong>{userEmail}</strong>
            </Typography>

            <MuiLink
              component="button"
              variant="body2"
              onClick={onLogout}
              sx={{ mt: theme.spacing(1), display: "inline-block" }}
            >
              {t("common:auth.signOut")}
            </MuiLink>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={onContinueToShipping}
            fullWidth
            sx={{ mt: theme.spacing(2) }}
          >
            {t("common:store.checkout.continueToShipping")}
          </Button>
        </Paper>
      </>
    );
  }

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: theme.spacing(3),
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
        }}
      >
        <Box component="form" onSubmit={handleSubmit(onGuestContinue)}>
          <Typography variant="h6" gutterBottom>
            {t("common:store.checkout.accountInformation")}
          </Typography>
          {featureToggles.GUEST_CHECKOUT && (
            <>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t("common:form.emailAddress")}
                    variant="outlined"
                    size="small"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    sx={{ mb: theme.spacing(2) }}
                  />
                )}
              />

              {/* <Controller
                name="saveForFuture"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={field.value || false}
                        size="small"
                      />
                    }
                    label={t("common:store.checkout.saveForFuture")}
                    sx={{ mb: theme.spacing(2) }}
                  />
                )}
              /> */}
            </>
          )}
          <Stack direction="row" spacing={2} sx={{ mb: theme.spacing(2) }}>
            {featureToggles.GUEST_CHECKOUT ? (
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={isSubmitting}
              >
                {t("common:store.checkout.continueAsGuest")}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => setIsSignupDialogOpen(true)}
              >
                {t("common:auth.signUp")}
              </Button>
            )}
            <Button
              variant={featureToggles.GUEST_CHECKOUT ? "outlined" : "outlined"}
              color="primary"
              fullWidth
              onClick={() => setIsLoginDialogOpen(true)}
            >
              {t("common:auth.signIn")}
            </Button>
          </Stack>
          {featureToggles.GUEST_CHECKOUT && (
            <Box sx={{ textAlign: "center", mb: theme.spacing(2) }}>
              <Typography
                variant="body2"
                sx={{ display: "inline-block", mr: 1 }}
              >
                {t("common:auth.dontHaveAccount")}
              </Typography>
              <MuiLink
                component="button"
                variant="body2"
                onClick={() => setIsSignupDialogOpen(true)}
              >
                {t("common:auth.signUp")}
              </MuiLink>
            </Box>
          )}
        </Box>
      </Paper>

   

      {isLoginDialogOpen && (
        <Backdrop
          open={isLoginDialogOpen}
          onClick={() => setIsLoginDialogOpen(false)}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            // backgroundColor: 'rgba(0, 0, 0, 0.5)' // Optional: to dim the background
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the form
            sx={{
              position: "relative", // Needed for the close button positioning
            }}
          >
            <LoginForm
              onSuccess={() => {
                setIsLoginDialogOpen(false);
                // Refresh auth state in Header without reloading the page
                refreshAuthState();
              }}
              onSwitchToSignup={handleSwitchToSignup}
            />
          </Box>
        </Backdrop>
      )}
   
      {/* Signup Modal */}
      {isSignupDialogOpen && (
        <Backdrop
          open={isSignupDialogOpen}
          onClick={() => setIsSignupDialogOpen(false)}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            // backgroundColor: 'rgba(0, 0, 0, 0.5)' // Optional: for a darker overlay
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the form
            sx={{
              position: "relative", // Required for positioning the close button
            }}
          >
            <SignupForm
              onSuccess={() => {
                setIsSignupDialogOpen(false);
                // Refresh auth state in Header without reloading the page
                refreshAuthState();
              }}
              onSwitchToLogin={handleSwitchToLogin}
            />
          </Box>
        </Backdrop>
      )}
    </>
  );
};
