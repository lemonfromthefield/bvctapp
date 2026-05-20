"use client";

import { useId, useRef } from 'react';
import { Paperclip, Upload, X } from 'lucide-react';

type FilePickerProps = {
  label: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  description?: string;
  emptyStateText?: string;
  buttonText?: string;
  disabled?: boolean;
};

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilePicker({
  label,
  files,
  onFilesChange,
  description,
  emptyStateText = 'Sin archivos seleccionados.',
  buttonText = 'Seleccionar archivos',
  disabled = false,
}: FilePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelection = (incomingFiles: FileList | null) => {
    if (!incomingFiles) {
      return;
    }

    const nextFiles = Array.from(incomingFiles);
    const existingSignatures = new Set(files.map((file) => `${file.name}-${file.size}`));

    onFilesChange([
      ...files,
      ...nextFiles.filter((file) => !existingSignatures.has(`${file.name}-${file.size}`)),
    ]);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeFile = (fileIndex: number) => {
    onFilesChange(files.filter((_, index) => index !== fileIndex));
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-900">
          {label}
        </label>
        {description ? <p className="text-xs text-[#7d5a4f]">{description}</p> : null}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-[#d7bfb0] bg-[linear-gradient(180deg,#fffdfb_0%,#fff5ee_100%)] px-4 py-3 text-left transition hover:border-[#b42318] hover:bg-[#fff1e8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="rounded-2xl bg-white p-2 text-[#b42318] shadow-sm">
            <Paperclip className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[#1f120f]">{buttonText}</span>
            <span className="block truncate text-xs text-[#7d5a4f]">
              {files.length > 0 ? `${files.length} archivo${files.length === 1 ? '' : 's'} listo${files.length === 1 ? '' : 's'} para subir` : emptyStateText}
            </span>
          </span>
        </span>
        <Upload className="h-4 w-4 shrink-0 text-[#9a3d12]" />
      </button>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(event) => handleSelection(event.target.files)}
      />

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#ead8cf] bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1f120f]">{file.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}{file.type ? ` · ${file.type}` : ''}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={disabled}
                className="shrink-0 rounded-full p-1 text-[#9a3d12] transition hover:bg-[#fde7d8] disabled:opacity-50"
                title="Quitar archivo"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}