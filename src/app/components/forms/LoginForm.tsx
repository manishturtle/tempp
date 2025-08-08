'use client';

import React from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/app/types/schemas';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { useState } from 'react';

interface LoginFormProps {
  onSuccess?: () => void;
}

/**
 * LoginForm component using React Hook Form with Zod validation and MUI
 */
export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Initialize form with React Hook Form and Zod resolver
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Form submission handler
  const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
    try {
      setError(null);
      await login(data);
      reset();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom align="center">
        Login
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Email Field with Controller for better MUI integration */}
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              error={!!error}
              helperText={error?.message}
              disabled={isSubmitting}
              autoComplete="email"
              InputProps={{
                autoComplete: 'email',
              }}
            />
          )}
        />

        {/* Password Field with Controller */}
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              error={!!error}
              helperText={error?.message}
              disabled={isSubmitting}
              autoComplete="current-password"
              InputProps={{
                autoComplete: 'current-password',
              }}
            />
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          disabled={isSubmitting}
          sx={{ mt: 3, mb: 2 }}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Login'}
        </Button>
      </Box>
    </Paper>
  );
}
