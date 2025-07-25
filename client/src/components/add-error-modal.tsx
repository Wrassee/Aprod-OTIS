import { useState, useEffect } from 'react';
import { ProtocolError, ErrorSeverity } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Camera, X } from 'lucide-react';
import { useLanguageContext } from './language-provider';

interface AddErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (error: Omit<ProtocolError, 'id'>) => void;
  editingError?: ProtocolError | null;
}

export function AddErrorModal({ isOpen, onClose, onSave, editingError }: AddErrorModalProps) {
  const { t } = useLanguageContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<ErrorSeverity>('medium');
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (editingError) {
      setTitle(editingError.title);
      setDescription(editingError.description);
      setSeverity(editingError.severity);
      setImages(editingError.images);
    } else {
      setTitle('');
      setDescription('');
      setSeverity('medium');
      setImages([]);
    }
  }, [editingError]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImages(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!title.trim() || !description.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      severity,
      images,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setSeverity('medium');
    setImages([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.addErrorTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Severity Level */}
          <div>
            <Label className="text-sm font-medium text-gray-700">{t.severity}</Label>
            <Select value={severity} onValueChange={(value: ErrorSeverity) => setSeverity(value)}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">{t.critical}</SelectItem>
                <SelectItem value="medium">{t.medium}</SelectItem>
                <SelectItem value="low">{t.low}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error Title */}
          <div>
            <Label className="text-sm font-medium text-gray-700">{t.errorTitle}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the error"
              className="mt-2"
            />
          </div>

          {/* Error Description */}
          <div>
            <Label className="text-sm font-medium text-gray-700">{t.errorDescription}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about the error"
              rows={4}
              className="mt-2 resize-none"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <Label className="text-sm font-medium text-gray-700">{t.attachPhotos}</Label>
            <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Camera className="h-8 w-8 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">{t.uploadPhotos}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('error-image-upload')?.click()}
              >
                {t.selectFiles}
              </Button>
              <input
                id="error-image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* Image Preview */}
            {images.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt="Error photo"
                      className="w-20 h-20 object-cover rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || !description.trim()}
              className="bg-otis-blue hover:bg-blue-700"
            >
              {t.saveError}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
