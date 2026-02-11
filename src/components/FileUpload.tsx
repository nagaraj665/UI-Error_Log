import { useState, useRef } from 'react';
import { Upload, X, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type FileUploadProps = {
  onUploadComplete: (uploadId: string) => void;
};

type UploadedFile = {
  name: string;
  size: number;
  linesDetected: number;
  uploadTime: string;
};

const INSERT_BATCH_SIZE = 500;

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error('Invalid JSON format');
      }

      const categories = new Set(data.map((entry: any) => entry.category || entry.ElementName || 'Unknown'));
      const now = new Date();

      const { data: uploadData, error: uploadError } = await supabase
        .from('log_uploads')
        .insert({
          filename: file.name,
          file_size: file.size,
          total_entries: data.length,
          total_errors: data.length,
          categories_found: categories.size,
          uploaded_at: now.toISOString(),
        })
        .select()
        .maybeSingle();

      if (uploadError) throw uploadError;
      if (!uploadData) throw new Error('Failed to create upload record');

      const entries = data.map((entry: any) => ({
        upload_id: uploadData.id,
        customer: entry.customer || '',
        project: entry.project || '',
        doi: entry.doi || '',
        stage: entry.stage || '',
        date: entry.date || null,
        date_time: entry.dateTime || null,
        error_msg: entry.ErrorMsg || '',
        code: entry.code || 0,
        column_num: entry.column || 0,
        domain: entry.domain || 0,
        level: entry.level || 0,
        line: entry.line || 0,
        element: entry.Element || '',
        element_name: entry.ElementName || '',
        parent_element: entry.ParentElement || '',
        attribute_name: entry.AttributeName || '',
        category: entry.category || entry.ElementName || 'Unknown',
        type: entry.type || '',
      }));

      for (let i = 0; i < entries.length; i += INSERT_BATCH_SIZE) {
        const batch = entries.slice(i, i + INSERT_BATCH_SIZE);
        const { error: entriesError } = await supabase
          .from('log_entries')
          .insert(batch);

        if (entriesError) throw entriesError;
      }

      setUploadedFile({
        name: file.name,
        size: file.size,
        linesDetected: data.length,
        uploadTime: now.toLocaleTimeString(),
      });

      onUploadComplete(uploadData.id);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please ensure it is a valid JSON log file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.json') || file.name.endsWith('.txt'))) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-8">
      {!uploadedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`text-center ${isDragging ? 'bg-orange-50' : ''}`}
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload your JSON log file to analyze errors by category
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Drag and drop your file here or click to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt"
            onChange={handleFileInput}
            className="hidden"
            disabled={isUploading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Browse Files'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-orange-500" />
            <div>
              <p className="font-medium text-gray-900">{uploadedFile.name}</p>
              <p className="text-sm text-gray-600">
                {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Uploaded {uploadedFile.uploadTime}
              </p>
              <p className="text-sm text-gray-600">
                {uploadedFile.linesDetected.toLocaleString()} lines detected
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveFile}
            className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
}
