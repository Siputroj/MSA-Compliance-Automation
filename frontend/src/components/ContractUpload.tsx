"use client";

import React, { useRef, useState } from "react";

interface ContractUploadProps {
  onUpload: (file: File) => void;
  loading: boolean;
  selectedFile: File | null;
  onClear: () => void;
  error: string | null;
  setError: (err: string | null) => void;
}

export default function ContractUpload({
  onUpload,
  loading,
  selectedFile,
  onClear,
  error,
  setError,
}: ContractUploadProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const validateAndProcessFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Unsupported format. Only plain text (.txt) files can be audited.");
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB max
      setError("File is too large. Max size allowed is 2MB.");
      return;
    }

    setError(null);
    onUpload(file);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="upload-container glass-card">
      <h3 className="upload-title">Contract Audit Pipeline</h3>
      <p className="upload-subtitle">
        Upload a Master Service Agreement (MSA) text document to evaluate policy compliance.
      </p>

      {/* Main Drag & Drop Zone */}
      {!selectedFile ? (
        <form
          className={`upload-drop-zone ${dragActive ? "drop-zone-active" : ""}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="file-input-hidden"
            accept=".txt"
            onChange={handleChange}
          />
          
          <div className="drop-zone-icon-container">
            <svg
              className="drop-zone-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
          </div>

          <div className="drop-zone-instructions">
            <p className="primary-instructions">
              Drag and drop your contract here, or{" "}
              <button type="button" className="browse-link" onClick={onButtonClick}>
                browse files
              </button>
            </p>
            <p className="format-restrictions">Only plain text (.txt) files are supported.</p>
          </div>
        </form>
      ) : (
        /* Selected File Card View */
        <div className="selected-file-card">
          <div className="file-info-header" style={{ marginBottom: loading ? "12px" : "0px" }}>
            <div className="file-icon-title">
              <svg
                className="file-doc-icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <div className="file-meta">
                <span className="file-name" title={selectedFile.name}>
                  {selectedFile.name}
                </span>
                <span className="file-size">{formatBytes(selectedFile.size)}</span>
              </div>
            </div>

            {!loading && (
              <button
                className="file-clear-btn"
                onClick={onClear}
                aria-label="Clear selected file"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Analysis State Indicator */}
          {loading && (
            <div className="analysis-progress-container">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" />
              </div>
              <div className="progress-label-pulsing">
                <span>RAG Retrieval & GPU Inference Active...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Error Alert Box */}
      {error && (
        <div className="error-alert-box animate-fade-in">
          <svg
            className="error-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="error-message-text">{error}</div>
        </div>
      )}
    </div>
  );
}
