import { useState, useEffect } from 'react';
import { ProtocolError } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { useLanguageContext } from './language-provider';
import { AddErrorModal } from './add-error-modal';

interface ErrorListProps {
  errors: ProtocolError[];
  onAddError: (error: Omit<ProtocolError, 'id'>) => void;
  onEditError: (id: string, error: Omit<ProtocolError, 'id'>) => void;
  onDeleteError: (id: string) => void;
}

export function ErrorList({ errors = [], onAddError, onEditError, onDeleteError }: ErrorListProps) {
  const { t } = useLanguageContext();
  const [showModal, setShowModal] = useState(false);
  const [editingError, setEditingError] = useState<ProtocolError | null>(null);
  const [localStorageErrors, setLocalStorageErrors] = useState<ProtocolError[]>([]);
  
  // Listen for localStorage errors added from measurement boundary violations
  useEffect(() => {
    const updateLocalStorageErrors = () => {
      try {
        const stored = localStorage.getItem('protocol-errors');
        if (stored) {
          const parsedErrors = JSON.parse(stored);
          setLocalStorageErrors(Array.isArray(parsedErrors) ? parsedErrors : []);
        } else {
          setLocalStorageErrors([]);
        }
      } catch (error) {
        console.error('Error reading localStorage errors:', error);
        setLocalStorageErrors([]);
      }
    };

    // Initial load
    updateLocalStorageErrors();

    // Listen for custom events from measurement block
    const handleProtocolErrorAdded = () => {
      updateLocalStorageErrors();
    };

    // Listen for protocol errors cleared event (new protocol started)
    const handleProtocolErrorsCleared = () => {
      console.log('Protocol errors cleared - updating error list');
      setLocalStorageErrors([]);
    };

    window.addEventListener('protocol-error-added', handleProtocolErrorAdded);
    window.addEventListener('protocol-errors-cleared', handleProtocolErrorsCleared);
    
    return () => {
      window.removeEventListener('protocol-error-added', handleProtocolErrorAdded);
      window.removeEventListener('protocol-errors-cleared', handleProtocolErrorsCleared);
    };
  }, []);
  
  // Combine React state errors with localStorage errors
  const allErrors = [...(Array.isArray(errors) ? errors : []), ...localStorageErrors];
  const safeErrors = Array.isArray(allErrors) ? allErrors : [];

  const getSeverityColor = (severity: ProtocolError['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityText = (severity: ProtocolError['severity']) => {
    switch (severity) {
      case 'critical':
        return t.critical;
      case 'medium':
        return t.medium;
      case 'low':
        return t.low;
      default:
        return severity;
    }
  };

  const handleAddError = (error: Omit<ProtocolError, 'id'>) => {
    onAddError(error);
    setShowModal(false);
  };

  const handleEditError = (error: Omit<ProtocolError, 'id'>) => {
    if (editingError) {
      onEditError(editingError.id, error);
      setEditingError(null);
    }
    setShowModal(false);
  };

  const startEdit = (error: ProtocolError) => {
    setEditingError(error);
    setShowModal(true);
  };

  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">{t.errorList}</h2>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-otis-blue hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t.addError}
            </Button>
          </div>

          {safeErrors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>{t.noErrors}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {safeErrors.map((error) => (
                <div key={error.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="relative mr-3">
                          <Badge className={`${getSeverityColor(error.severity)} text-white px-2 py-1 text-sm font-medium relative`}>
                            {getSeverityText(error.severity)}
                          </Badge>
                          {error.severity === 'critical' && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white flex items-center justify-center text-xs font-bold transform rotate-180" style={{clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'}}>
                              ⚠
                            </div>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-800">{error.title}</h4>
                        {error.severity === 'critical' && (
                          <span className="ml-2 text-xs text-red-600 font-medium">
                            → {t.errorRegistrationRequired}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{error.description}</p>
                      
                      {error.images && error.images.length > 0 && (
                        <div className="flex space-x-2">
                          {error.images.map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt="Error documentation"
                              className="w-16 h-16 object-cover rounded border"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-otis-blue"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // Boundary errors (automatically generated) cannot be edited
                          if (error.id.startsWith('boundary-')) {
                            const toast = document.createElement('div');
                            toast.textContent = 'Automatikus hibák nem szerkeszthetők!';
                            toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#f59e0b;color:white;padding:12px 24px;border-radius:8px;z-index:9999;font-weight:500;';
                            document.body.appendChild(toast);
                            setTimeout(() => document.body.removeChild(toast), 2000);
                          } else {
                            startEdit(error);
                          }
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-500"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // Check if this is a localStorage error (boundary errors have 'boundary-' prefix)
                          if (error.id.startsWith('boundary-')) {
                            console.log('🗑️ Deleting localStorage boundary error:', error.id);
                            
                            // Remove from localStorage directly without React state updates
                            const currentErrors = JSON.parse(localStorage.getItem('protocol-errors') || '[]');
                            const filteredErrors = currentErrors.filter((e: any) => e.id !== error.id);
                            localStorage.setItem('protocol-errors', JSON.stringify(filteredErrors));
                            
                            // Update local state without triggering parent re-renders
                            setLocalStorageErrors(filteredErrors);
                            
                            // Show confirmation toast
                            const toast = document.createElement('div');
                            toast.textContent = 'Hiba törölve a hibalistából!';
                            toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:12px 24px;border-radius:8px;z-index:9999;font-weight:500;';
                            document.body.appendChild(toast);
                            setTimeout(() => document.body.removeChild(toast), 2000);
                          } else {
                            // Handle regular React state errors
                            onDeleteError(error.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddErrorModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingError(null);
        }}
        onSave={editingError ? handleEditError : handleAddError}
        editingError={editingError}
      />
    </>
  );
}
