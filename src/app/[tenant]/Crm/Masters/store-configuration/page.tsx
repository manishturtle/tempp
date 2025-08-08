'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Typography, 
  Paper, 
  Container
} from '@mui/material';
import { HeaderConfigurationForm } from './components/header-configuration-form';
/**
 * Store Configuration page component
 * Provides header configuration interface
 */
export default function StoreConfigurationPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <>
             <HeaderConfigurationForm />
    </>
  );
}

// No TabPanel component needed anymore
