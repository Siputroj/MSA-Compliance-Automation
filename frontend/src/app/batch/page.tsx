"use client";

import React, { useRef, useState } from "react";
import Header from "@/components/Header";
import RulesViewer from "@/components/RulesViewer";
import ReportCards from "@/components/ReportCards";
import { useCompliance } from "@/hooks/useCompliance";
import { AuditReport, RuleResult } from "@/types/compliance";
import { analyzeFile } from "@/utils/api";

interface BatchFile {
  id: string;
  name: string;
  size: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  report: AuditReport | null;
  error: string | null;
  fileObject: File;
}

export default function BatchAuditPage() {
  const {
    rules,
    health,
    runHealthCheck,
    isRulesViewerOpen,
    setIsRulesViewerOpen,
    updateRule,
  } = useCompliance();

  const [uploadedFiles, setUploadedFiles] = useState<BatchFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeReportFile, setActiveReportFile] = useState<BatchFile | null>(null);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

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

    if (e.dataTransfer.files) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processSelectedFiles(Array.from(e.target.files));
    }
  };

  const processSelectedFiles = (files: File[]) => {
    setBatchError(null);
    const validFiles: BatchFile[] = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".txt")) {
        setBatchError("Only plain text (.txt) files are supported.");
        continue;
      }
      if (file.size > 2 * 1024 * 1024) {
        setBatchError("Files must be smaller than 2MB.");
        continue;
      }
      
      // Prevent duplicates in list
      if (uploadedFiles.some(f => f.name === file.name)) {
        continue;
      }

      validFiles.push({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        status: "pending",
        progress: 0,
        report: null,
        error: null,
        fileObject: file
      });
    }

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (id: string) => {
    if (isProcessing) return;
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
    if (activeReportFile?.id === id) {
      setActiveReportFile(null);
    }
  };

  const runBatchAudit = async () => {
    if (uploadedFiles.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setBatchError(null);

    // Filter to pending or failed files
    const filesToProcess = uploadedFiles.filter(f => f.status === "pending" || f.status === "failed");

    // Loop sequentially
    for (const batchFile of filesToProcess) {
      // Update status to processing
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === batchFile.id
            ? { ...f, status: "processing", progress: 50 }
            : f
        )
      );

      try {
        const report = await analyzeFile(batchFile.fileObject);

        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === batchFile.id
              ? {
                  ...f,
                  status: "completed",
                  progress: 100,
                  report: report,
                  error: report.error || null,
                }
              : f
          )
        );
      } catch (err: any) {
        console.error("Batch audit error for file:", batchFile.name, err);
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === batchFile.id
              ? {
                  ...f,
                  status: "failed",
                  progress: 100,
                  error: err.message || "Auditing process failed",
                }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const getComplianceLevel = (score: number) => {
    if (score >= 85) return { text: "Compliant", colorClass: "table-score-high" };
    if (score >= 60) return { text: "Warning", colorClass: "table-score-mid" };
    return { text: "Critical", colorClass: "table-score-low" };
  };

  const getIssuesCounts = (results: RuleResult[]) => {
    let warning = 0;
    let nonCompliant = 0;
    results.forEach(r => {
      if (r.status === "WARNING") warning++;
      if (r.status === "NON_COMPLIANT") nonCompliant++;
    });
    return { warning, nonCompliant };
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="app-container">
      <Header health={health} onRefreshHealth={runHealthCheck} />

      <main className="batch-container animate-fade-in">
        <div className="batch-upload-row">
          {/* Uploader Left Card */}
          <div className="batch-upload-card glass-card">
            <h3 className="upload-title">Batch Contract Loader</h3>
            <p className="upload-subtitle">
              Upload multiple Master Service Agreements (.txt) for batch audits.
            </p>

            <form
              className={`batch-drop-zone ${dragActive ? "batch-drop-zone-active" : ""}`}
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
                multiple
                onChange={handleFileChange}
              />
              
              <div className="drop-zone-icon-container">
                <svg className="drop-zone-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>

              <div className="drop-zone-instructions">
                <p className="primary-instructions">
                  Drag and drop files here, or{" "}
                  <button type="button" className="browse-link" onClick={() => fileInputRef.current?.click()}>
                    browse
                  </button>
                </p>
                <p className="format-restrictions">Only plain text (.txt) files. Max 2MB each.</p>
              </div>
            </form>

            {batchError && (
              <div className="error-alert-box animate-fade-in" style={{ marginTop: "16px" }}>
                <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="error-message-text">{batchError}</div>
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "600" }}>Upload Queue ({uploadedFiles.length})</h4>
                <div className="batch-files-list">
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="batch-file-item">
                      <div className="batch-file-item-header">
                        <div className="batch-file-name-group">
                          <svg className="batch-file-item-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span className="batch-file-item-name" title={file.name}>{file.name}</span>
                            <span className="batch-file-item-size">{formatBytes(file.size)}</span>
                          </div>
                        </div>

                        {!isProcessing && (
                          <button className="batch-file-remove-btn" onClick={() => removeFile(file.id)} aria-label="Remove file">
                            <svg style={{ width: "16px", height: "16px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {file.status !== "pending" && (
                        <div className="batch-progress-wrapper">
                          <div className="batch-progress-bar-track">
                            <div
                              className="batch-progress-bar-fill"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                          <span className={`batch-progress-status-text status-${file.status}`}>
                            {file.status.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="batch-run-btn"
                  onClick={runBatchAudit}
                  disabled={isProcessing || uploadedFiles.filter(f => f.status === "pending" || f.status === "failed").length === 0}
                >
                  {isProcessing ? "Auditing Files..." : "Run Batch Audit"}
                </button>
              </div>
            )}
          </div>

          {/* Results Table Right Card */}
          <div className="batch-table-card glass-card">
            <div className="batch-table-header-bar">
              <h3 className="upload-title" style={{ margin: 0 }}>Audit Results Matrix</h3>
            </div>

            <div className="batch-table-container">
              <table className="batch-table">
                <thead>
                  <tr>
                    <th>Contract Name</th>
                    <th>Compliance Score</th>
                    <th>Audit Status</th>
                    <th>Findings Breakdown</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedFiles.filter(f => f.status === "completed" && f.report).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)", fontSize: "14px" }}>
                        No completed audits. Add text contracts and run the pipeline to populate findings.
                      </td>
                    </tr>
                  ) : (
                    uploadedFiles
                      .filter(f => f.status === "completed" && f.report)
                      .map(file => {
                        const score = file.report!.compliance_summary.score;
                        const level = getComplianceLevel(score);
                        const { warning, nonCompliant } = getIssuesCounts(file.report!.results);

                        return (
                          <tr key={file.id}>
                            <td style={{ fontWeight: 600 }}>{file.name}</td>
                            <td>
                              <span className={`table-score-badge ${level.colorClass}`}>
                                {score.toFixed(1)}%
                              </span>
                            </td>
                            <td>
                              <span className={`details-value-badge`}>
                                {level.text}
                              </span>
                            </td>
                            <td>
                              <div className="issue-badge-group">
                                <span className={`issue-badge-tag ${nonCompliant > 0 ? "issue-badge-tag-red" : "issue-badge-tag-gray"}`}>
                                  {nonCompliant} Critical
                                </span>
                                <span className={`issue-badge-tag ${warning > 0 ? "issue-badge-tag-orange" : "issue-badge-tag-gray"}`}>
                                  {warning} Warning
                                </span>
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="batch-details-btn"
                                onClick={() => {
                                  setActiveReportFile(file);
                                  setActiveRuleId(null);
                                }}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Rules viewer Modal */}
      <RulesViewer
        rules={rules}
        isOpen={isRulesViewerOpen}
        onClose={() => setIsRulesViewerOpen(false)}
        onSaveRule={updateRule}
      />

      {/* Detail Slide-out Drawer */}
      {activeReportFile && activeReportFile.report && (
        <div className="drawer-overlay" onClick={() => setActiveReportFile(null)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title-group">
                <h3 className="drawer-title" title={activeReportFile.name}>{activeReportFile.name}</h3>
                <p className="drawer-subtitle">
                  Overall Compliance Score: <strong className={getComplianceLevel(activeReportFile.report.compliance_summary.score).colorClass}>
                    {activeReportFile.report.compliance_summary.score.toFixed(1)}%
                  </strong>
                </p>
              </div>
              <button
                className="drawer-close-btn"
                onClick={() => setActiveReportFile(null)}
                aria-label="Close details drawer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="drawer-body">
              <ReportCards
                results={activeReportFile.report.results}
                activeRuleId={activeRuleId}
                onSelectRule={setActiveRuleId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
