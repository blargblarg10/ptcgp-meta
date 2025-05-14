/**
 * Profile feature module
 * @module features/profile
 */

// Export components
export { default as UserProfile } from './components/UserProfile';
export { default as UserAvatar } from './components/UserAvatar';
export { default as UserProfileMenu } from './components/UserProfileMenu';

// Export dialog components
export { default as ErrorDialog } from './components/dialogs/ErrorDialog';
export { default as UploadInfoDialog } from './components/dialogs/UploadInfoDialog';
export { default as LoadingIndicator } from './components/dialogs/LoadingIndicator';

// Export hooks
export { useUserProfileDropdown } from './hooks/useUserProfileDropdown';
export { useMatchDataExport } from './hooks/useMatchDataExport';
export { useMatchDataImport } from './hooks/useMatchDataImport';
