// Global state manager to prevent component re-mounting issues
// This approach completely bypasses React state management for save operations

interface GlobalQuestionnaireState {
  isInitialized: boolean;
  currentPage: number;
  formData: any;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

// Global state object
const globalState: GlobalQuestionnaireState = {
  isInitialized: false,
  currentPage: 0,
  formData: {},
  saveStatus: 'idle'
};

// State change listeners
const listeners: Array<() => void> = [];

export const GlobalStateManager = {
  // Get current state
  getState: () => ({ ...globalState }),
  
  // Update state
  setState: (updates: Partial<GlobalQuestionnaireState>) => {
    Object.assign(globalState, updates);
    // Notify all listeners
    listeners.forEach(callback => callback());
  },
  
  // Subscribe to state changes
  subscribe: (callback: () => void) => {
    listeners.push(callback);
    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  },
  
  // Save to localStorage without React state updates
  saveToStorage: () => {
    try {
      localStorage.setItem('otis-protocol-form-data', JSON.stringify(globalState.formData));
      localStorage.setItem('questionnaire-current-page', globalState.currentPage.toString());
      console.log('🔧 Global state saved to localStorage');
      return true;
    } catch (error) {
      console.error('Error saving global state:', error);
      return false;
    }
  },
  
  // Load from localStorage
  loadFromStorage: () => {
    try {
      const savedData = localStorage.getItem('otis-protocol-form-data');
      const savedPage = localStorage.getItem('questionnaire-current-page');
      
      if (savedData) {
        globalState.formData = JSON.parse(savedData);
      }
      
      if (savedPage) {
        globalState.currentPage = parseInt(savedPage, 10) || 0;
      }
      
      globalState.isInitialized = true;
      console.log('🔧 Global state loaded from localStorage');
    } catch (error) {
      console.error('Error loading global state:', error);
      globalState.isInitialized = true; // Mark as initialized even on error
    }
  }
};

// Initialize on module load
GlobalStateManager.loadFromStorage();