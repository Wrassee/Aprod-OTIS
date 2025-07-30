// Persistent measurement cache system to prevent value clearing
export class MeasurementCache {
  private static STORAGE_KEY = 'otis-measurement-cache';
  
  // Save to both localStorage and global window cache
  static setValue(questionId: string, value: string | number): void {
    try {
      // Global window cache (immediate access)
      if (!(window as any).measurementValues) {
        (window as any).measurementValues = {};
      }
      if (!(window as any).stableInputValues) {
        (window as any).stableInputValues = {};
      }
      
      (window as any).measurementValues[questionId] = typeof value === 'string' ? parseFloat(value) : value;
      (window as any).stableInputValues[questionId] = value.toString();
      
      // LocalStorage backup (survives page refreshes)
      const existing = this.getAllFromStorage();
      existing[questionId] = value.toString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));
      
      console.log(`MeasurementCache: Saved ${questionId} = ${value}`);
    } catch (error) {
      console.error('MeasurementCache save error:', error);
    }
  }
  
  // Get value from cache or localStorage
  static getValue(questionId: string): string | null {
    try {
      // First try global cache
      const globalValue = (window as any).measurementValues?.[questionId] || 
                         (window as any).stableInputValues?.[questionId];
      if (globalValue !== undefined) {
        return globalValue.toString();
      }
      
      // Fallback to localStorage
      const stored = this.getAllFromStorage();
      return stored[questionId] || null;
    } catch (error) {
      console.error('MeasurementCache get error:', error);
      return null;
    }
  }
  
  // Restore all measurement values from localStorage
  static restoreFromStorage(): void {
    try {
      const stored = this.getAllFromStorage();
      
      if (!(window as any).measurementValues) {
        (window as any).measurementValues = {};
      }
      if (!(window as any).stableInputValues) {
        (window as any).stableInputValues = {};
      }
      
      Object.entries(stored).forEach(([questionId, value]) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          (window as any).measurementValues[questionId] = numValue;
        }
        (window as any).stableInputValues[questionId] = value;
      });
      
      console.log('MeasurementCache: Restored from storage:', stored);
    } catch (error) {
      console.error('MeasurementCache restore error:', error);
    }
  }
  
  // Update DOM inputs with cached values
  static updateInputs(): void {
    try {
      const stored = this.getAllFromStorage();
      Object.entries(stored).forEach(([questionId, value]) => {
        const input = document.querySelector(`input[data-question-id="${questionId}"]`) as HTMLInputElement;
        if (input && input.value !== value) {
          input.value = value;
          console.log(`MeasurementCache: Updated input ${questionId} = ${value}`);
        }
      });
    } catch (error) {
      console.error('MeasurementCache updateInputs error:', error);
    }
  }
  
  // Get all current values from cache
  static getAllValues(): Record<string, any> {
    try {
      // Combine values from both global cache and localStorage
      const globalValues = (window as any).measurementValues || {};
      const stableValues = (window as any).stableInputValues || {};
      const storedValues = this.getAllFromStorage();
      
      const combined = { ...storedValues, ...stableValues, ...globalValues };
      console.log('MeasurementCache.getAllValues called, returning:', combined);
      return combined;
    } catch (error) {
      console.error('MeasurementCache getAllValues error:', error);
      return {};
    }
  }

  private static getAllFromStorage(): Record<string, string> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('MeasurementCache storage parse error:', error);
      return {};
    }
  }
}