import { useDropzone } from 'react-dropzone';
import { ImagePlus } from 'lucide-react';

interface Props {
  onFiles: (files: File[]) => void;
  slotsLeft: number;
  compact?: boolean;
}

export function DropZone({ onFiles, slotsLeft, compact = false }: Props) {
  const disabled = slotsLeft <= 0;
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    multiple: true,
    disabled,
    onDrop: (accepted) => {
      if (accepted.length) onFiles(accepted);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={[
        'flex items-center justify-center rounded-card border-2 border-dashed transition cursor-pointer select-none',
        compact ? 'h-20 px-4' : 'h-48 px-6',
        isDragActive
          ? 'border-accent-primary bg-accent-primary/5'
          : 'border-border-subtle bg-surface-card hover:border-accent-primary/40',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <input {...getInputProps()} />
      <div className="text-center">
        <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-accent-primary/10 grid place-items-center">
          <ImagePlus size={20} className="text-accent-primary" />
        </div>
        <p className="font-medium text-[15px]">
          {disabled
            ? 'Max 8 pages reached'
            : isDragActive
              ? 'Drop the images here'
              : 'Drag images here, or click to pick'}
        </p>
        {!disabled && (
          <p className="text-ink-muted text-[12px] mt-1">
            {slotsLeft} slot{slotsLeft === 1 ? '' : 's'} left · JPG, PNG, HEIC
          </p>
        )}
      </div>
    </div>
  );
}
