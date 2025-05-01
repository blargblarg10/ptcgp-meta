/**
 * Utility functions for handling file system operations
 */
import { useEffect, useState } from 'react';
import { loadMatchData } from './matchStatsCalculator';

/**
 * Opens the file picker and returns a file handle
 */
export const openFilePicker = async () => {
  const options = {
    types: [{
      description: 'JSON Files',
      accept: {
        'application/json': ['.json']
      }
    }],
    multiple: false,
    createNewFileIfNeeded: true
  };

  try {
    const [handle] = await window.showOpenFilePicker(options);
    return handle;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error opening file picker:', error);
    }
    return null;
  }
};

/**
 * Requests read/write permission for a file handle
 */
export const requestFilePermission = async (handle) => {
  try {
    const permissionState = await handle.queryPermission({ mode: 'readwrite' });
    if (permissionState !== 'granted') {
      const newPermission = await handle.requestPermission({ mode: 'readwrite' });
      return newPermission === 'granted';
    }
    return true;
  } catch (error) {
    console.error('Error requesting file permission:', error);
    return false;
  }
};

/**
 * Saves the file path to localStorage
 */
export const saveFilePath = async (handle) => {
  try {
    const file = await handle.getFile();
    localStorage.setItem('lastFilePath', file.name);
    return true;
  } catch (error) {
    console.warn('Could not save file path:', error);
    return false;
  }
};

/**
 * Gets the last used file path from localStorage
 */
export const getLastFilePath = () => {
  return localStorage.getItem('lastFilePath');
};

/**
 * Checks if the File System Access API is supported
 */
export const isFileSystemApiSupported = () => {
  return 'showOpenFilePicker' in window;
};

/**
 * Handles the complete file selection process
 * Returns an object with the file handle and any error information
 */
export const handleFileSelection = async () => {
  if (!isFileSystemApiSupported()) {
    return {
      handle: null,
      error: true,
      errorMessage: 'File System API not supported in this browser'
    };
  }

  try {
    const handle = await openFilePicker();
    if (!handle) {
      return {
        handle: null,
        error: true,
        errorMessage: 'No file selected'
      };
    }

    const hasPermission = await requestFilePermission(handle);
    if (!hasPermission) {
      return {
        handle: null,
        error: true,
        errorMessage: 'Permission not granted'
      };
    }

    await saveFilePath(handle);

    return {
      handle,
      error: false,
      errorMessage: ''
    };
  } catch (error) {
    console.error('Error in file selection:', error);
    return {
      handle: null,
      error: true,
      errorMessage: error.message || 'Error accessing file'
    };
  }
};

/**
 * React hook for handling file selection
 * Returns state and handlers for file system operations
 */
export const useFileSystem = () => {
  const [fileHandle, setFileHandle] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check for last used file on mount
  useEffect(() => {
    const lastPath = getLastFilePath();
    if (lastPath) {
      setErrorMessage(`Last used file: ${lastPath}`);
    }

    if (!isFileSystemApiSupported()) {
      setLoadError(true);
      setErrorMessage('File System API not supported in this browser');
    }
  }, []);

  const handleFileSelect = async () => {
    const { handle, error, errorMessage } = await handleFileSelection();
    
    if (error) {
      setLoadError(true);
      setErrorMessage(errorMessage);
      return;
    }

    try {
      const result = await loadMatchData(handle);
      if (!result) {
        throw new Error('Failed to load or parse file');
      }
      
      setFileHandle(handle);
      setLoadError(false);
      setErrorMessage('');
    } catch (error) {
      setLoadError(true);
      console.error('Error loading match data:', error);
      setErrorMessage(error.message || 'Error loading file data');
    }
  };

  return {
    fileHandle,
    loadError,
    errorMessage,
    handleFileSelect
  };
};