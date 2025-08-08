'use client';

import React, { useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormData } from '@/app/types/schemas';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Grid,
} from '@mui/material';
import api from '@/lib/api';

interface RegisterFormProps {
  onSuccess?: () => void;
}

/**
 * RegisterForm component using React Hook Form with Zod validation and MUI
 */
export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize form with React Hook Form and Zod resolver
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Form submission handler
  const onSubmit: SubmitHandler<RegisterFormData> = async (data) => {
    try {
      setError(null);
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registrationData } = data;
      
      // Example API call - replace with your actual registration endpoint
      await api.post('/auth/register/', registrationData);
      
      setSuccess('Registration successful! You can now log in.');
      reset();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom align="center">
        Create an Account
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={2}>
          {/* Name Field */}
          <Grid item xs={12}>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Full Name"
                  fullWidth
                  error={!!error}
                  helperText={error?.message}
                  disabled={isSubmitting}
                  autoComplete="name"
                />
              )}
            />
          </Grid>

          {/* Email Field */}
          <Grid item xs={12}>
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Email"
                  type="email"
                  fullWidth
                  error={!!error}
                  helperText={error?.message}
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              )}
            />
          </Grid>

          {/* Password Field */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Password"
                  type="password"
                  fullWidth
                  error={!!error}
                  helperText={error?.message}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
              )}
            />
          </Grid>

          {/* Confirm Password Field */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Confirm Password"
                  type="password"
                  fullWidth
                  error={!!error}
                  helperText={error?.message}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
              )}
            />
          </Grid>
        </Grid>

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
          {isSubmitting ? <CircularProgress size={24} /> : 'Register'}
        </Button>
      </Box>
    </Paper>
  );
}
