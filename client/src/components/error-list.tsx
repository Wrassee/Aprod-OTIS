import { useState } from 'react';
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

export function ErrorList({ errors, onAddError, onEditError, onDeleteError }: ErrorListProps) {
  const { t } = useLanguageContext();
  const [showModal, setShowModal] = useState(false);
  const [editingError, setEditingError] = useState<ProtocolError | null>(null);

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

          {!errors || errors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>{t.noErrors}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(errors || []).map((error) => (
                <div key={error.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Badge className={`${getSeverityColor(error.severity)} text-white px-2 py-1 text-sm font-medium mr-3`}>
                          {getSeverityText(error.severity)}
                        </Badge>
                        <h4 className="font-medium text-gray-800">{error.title}</h4>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{error.description}</p>
                      
                      {error.images.length > 0 && (
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
                        onClick={() => startEdit(error)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => onDeleteError(error.id)}
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
