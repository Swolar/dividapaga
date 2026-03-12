import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import { Upload, X, FileText } from 'lucide-react'

interface FileUploadProps {
  label: string
  accept?: string
  onFileSelect: (file: File | null) => void
  error?: string
  maxSizeMB?: number
}

export function FileUpload({
  label,
  accept = 'image/jpeg,image/png,application/pdf',
  onFileSelect,
  error,
  maxSizeMB = 5,
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      return
    }

    setFileName(file.name)
    onFileSelect(file)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const clear = () => {
    setPreview(null)
    setFileName(null)
    onFileSelect(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>

      {fileName ? (
        <div className="glass-sm flex items-center gap-3 p-4">
          {preview ? (
            <img src={preview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-neon-purple/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-neon-purple" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 truncate">{fileName}</p>
          </div>
          <button onClick={clear} className="text-slate-500 hover:text-red-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            glass-sm flex flex-col items-center justify-center gap-2 p-8 cursor-pointer
            border-2 border-dashed transition-all duration-200
            ${dragOver ? 'border-neon-purple/50 bg-neon-purple/5' : 'border-border-glass hover:border-neon-purple/30'}
            ${error ? 'border-red-500/50' : ''}
          `}
        >
          <div className="w-10 h-10 rounded-full bg-neon-purple/10 flex items-center justify-center">
            <Upload className="w-5 h-5 text-neon-purple" />
          </div>
          <p className="text-sm text-slate-400">
            Arraste ou clique para enviar
          </p>
          <p className="text-xs text-slate-600">
            JPEG, PNG ou PDF (max {maxSizeMB}MB)
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
}
