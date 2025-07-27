import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguageContext } from '@/components/language-provider';
import { formatDate } from '@/lib/utils';
import { Upload, Settings, FileSpreadsheet, CheckCircle, XCircle, Eye, Edit, Home, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  type: string;
  language: string;
  fileName: string;
  isActive: boolean;
  uploadedAt: string;
}

interface AdminProps {
  onBack: () => void;
  onHome?: () => void;
}

export function Admin({ onBack, onHome }: AdminProps) {
  const { t, language } = useLanguageContext();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'questions',
    language: 'hu',
    file: null as File | null,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: t.error,
        description: 'Failed to fetch templates',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.name) {
      toast({
        title: t.error,
        description: 'Please provide a name and select a file',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('name', uploadForm.name);
    formData.append('type', uploadForm.type);
    formData.append('language', uploadForm.language);

    try {
      const response = await fetch('/api/admin/templates/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: t.success,
          description: 'Template uploaded successfully',
        });
        setUploadForm({ name: '', type: 'questions', language: 'hu', file: null });
        fetchTemplates();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      toast({
        title: t.error,
        description: 'Failed to upload template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/templates/${templateId}/activate`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: t.success,
          description: 'Template activated successfully',
        });
        fetchTemplates();
      } else {
        throw new Error('Activation failed');
      }
    } catch (error) {
      console.error('Error activating template:', error);
      toast({
        title: t.error,
        description: 'Failed to activate template',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/templates/${templateId}/preview`);
      if (response.ok) {
        const data = await response.json();
        console.log('Template preview:', data);
        // TODO: Show preview modal with sheets and cell references
      }
    } catch (error) {
      console.error('Error previewing template:', error);
    }
  };

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`Biztosan törölni szeretnéd a(z) "${templateName}" sablont? Ez a művelet nem vonható vissza.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: t.success,
          description: 'Sablon sikeresen törölve',
        });
        fetchTemplates();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: t.error,
        description: 'Sablon törlése sikertelen',
        variant: 'destructive',
      });
    }
  };

  // Show all templates but group by language
  const filteredTemplates = templates;

  return (
    <div className="min-h-screen bg-light-surface">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-12 bg-otis-blue rounded flex items-center justify-center mr-4">
                <span className="text-white font-bold text-sm">OTIS</span>
              </div>
              {onHome && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onHome}
                  className="text-gray-600 hover:text-gray-800 mr-4"
                  title="Kezdőlap"
                >
                  <Home className="h-4 w-4" />
                </Button>
              )}
              <span className="text-lg font-medium text-gray-800">{t.admin}</span>
            </div>
            <Button variant="outline" onClick={onBack}>
              {t.back}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">{t.templates}</TabsTrigger>
            <TabsTrigger value="upload">{t.uploadTemplate}</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileSpreadsheet className="h-5 w-5 mr-2" />
                  {t.templates}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No templates uploaded</p>
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-800">{template.name}</h3>
                            <Badge variant={template.isActive ? "default" : "secondary"}>
                              {template.isActive ? t.active : t.inactive}
                            </Badge>
                            <Badge variant="outline">
                              {template.type === 'questions' ? t.questionsTemplate : t.protocolTemplate}
                            </Badge>
                            <Badge variant="outline" className="bg-gray-100">
                              {template.language.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{template.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(new Date(template.uploadedAt), language)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(template.id)}
                            title="Előnézet"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!template.isActive && (
                            <Button
                              size="sm"
                              onClick={() => handleActivate(template.id)}
                              className="bg-otis-blue hover:bg-blue-700"
                            >
                              {t.activate}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id, template.name)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Törlés"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2" />
                  {t.uploadTemplate}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Name */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">{t.templateName}</Label>
                  <Input
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                    placeholder="Enter template name"
                    className="mt-2"
                  />
                </div>

                {/* Template Type */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">{t.templateType}</Label>
                  <Select 
                    value={uploadForm.type} 
                    onValueChange={(value) => setUploadForm({ ...uploadForm, type: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="questions">{t.questionsTemplate}</SelectItem>
                      <SelectItem value="protocol">{t.protocolTemplate}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Language</Label>
                  <Select 
                    value={uploadForm.language} 
                    onValueChange={(value) => setUploadForm({ ...uploadForm, language: value as 'hu' | 'de' })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hu">Hungarian</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* File Upload */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">{t.selectExcelFile}</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileSpreadsheet className="h-8 w-8 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">{t.uploadExcelFile}</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('excel-upload')?.click()}
                    >
                      {t.selectExcelFile}
                    </Button>
                    <input
                      id="excel-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    {uploadForm.file && (
                      <p className="text-sm text-green-600 mt-2">
                        Selected: {uploadForm.file.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Upload Button */}
                <Button
                  onClick={handleUpload}
                  disabled={loading || !uploadForm.file || !uploadForm.name}
                  className="w-full bg-otis-blue hover:bg-blue-700"
                >
                  {loading ? t.loading : t.upload}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}