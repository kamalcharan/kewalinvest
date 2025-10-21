// frontend/src/utils/fullscreenUtils.ts
// Fullscreen utilities using native browser Fullscreen API

/**
 * Request fullscreen for an element
 * Handles browser prefixes automatically
 * 
 * @param elementId - ID of element to make fullscreen
 * @returns Promise that resolves when fullscreen is entered
 */
export async function enterFullscreen(elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  
  if (!element) {
    throw new Error(`Element with ID "${elementId}" not found`);
  }

  try {
    // Standard API
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    }
    // @ts-ignore - Webkit prefix (Safari)
    else if (element.webkitRequestFullscreen) {
      // @ts-ignore
      await element.webkitRequestFullscreen();
    }
    // @ts-ignore - Mozilla prefix (older Firefox)
    else if (element.mozRequestFullScreen) {
      // @ts-ignore
      await element.mozRequestFullScreen();
    }
    // @ts-ignore - MS prefix (IE11)
    else if (element.msRequestFullscreen) {
      // @ts-ignore
      await element.msRequestFullscreen();
    }
    else {
      throw new Error('Fullscreen API not supported by this browser');
    }
  } catch (error: any) {
    console.error('Failed to enter fullscreen:', error);
    throw error;
  }
}

/**
 * Exit fullscreen mode
 * 
 * @returns Promise that resolves when fullscreen is exited
 */
export async function exitFullscreen(): Promise<void> {
  try {
    // Standard API
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
    // @ts-ignore - Webkit prefix
    else if (document.webkitExitFullscreen) {
      // @ts-ignore
      await document.webkitExitFullscreen();
    }
    // @ts-ignore - Mozilla prefix
    else if (document.mozCancelFullScreen) {
      // @ts-ignore
      await document.mozCancelFullScreen();
    }
    // @ts-ignore - MS prefix
    else if (document.msExitFullscreen) {
      // @ts-ignore
      await document.msExitFullscreen();
    }
  } catch (error: any) {
    console.error('Failed to exit fullscreen:', error);
    throw error;
  }
}

/**
 * Toggle fullscreen for an element
 * 
 * @param elementId - ID of element to toggle fullscreen
 * @returns Promise that resolves when state changes
 */
export async function toggleFullscreen(elementId: string): Promise<void> {
  if (isFullscreen()) {
    await exitFullscreen();
  } else {
    await enterFullscreen(elementId);
  }
}

/**
 * Check if currently in fullscreen mode
 * 
 * @returns True if in fullscreen, false otherwise
 */
export function isFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    // @ts-ignore
    document.webkitFullscreenElement ||
    // @ts-ignore
    document.mozFullScreenElement ||
    // @ts-ignore
    document.msFullscreenElement
  );
}

/**
 * Get the current fullscreen element
 * 
 * @returns The element in fullscreen, or null
 */
export function getFullscreenElement(): Element | null {
  return (
    document.fullscreenElement ||
    // @ts-ignore
    document.webkitFullscreenElement ||
    // @ts-ignore
    document.mozFullScreenElement ||
    // @ts-ignore
    document.msFullscreenElement ||
    null
  );
}

/**
 * Check if fullscreen API is supported
 * 
 * @returns True if supported, false otherwise
 */
export function isFullscreenSupported(): boolean {
  return !!(
    document.fullscreenEnabled ||
    // @ts-ignore
    document.webkitFullscreenEnabled ||
    // @ts-ignore
    document.mozFullScreenEnabled ||
    // @ts-ignore
    document.msFullscreenEnabled
  );
}

/**
 * Add event listener for fullscreen changes
 * Handles browser prefixes automatically
 * 
 * @param callback - Function to call when fullscreen state changes
 * @returns Cleanup function to remove listeners
 */
export function onFullscreenChange(callback: () => void): () => void {
  // Add listeners for all prefixes
  document.addEventListener('fullscreenchange', callback);
  document.addEventListener('webkitfullscreenchange', callback);
  document.addEventListener('mozfullscreenchange', callback);
  document.addEventListener('MSFullscreenChange', callback);

  // Return cleanup function
  return () => {
    document.removeEventListener('fullscreenchange', callback);
    document.removeEventListener('webkitfullscreenchange', callback);
    document.removeEventListener('mozfullscreenchange', callback);
    document.removeEventListener('MSFullscreenChange', callback);
  };
}