"use client";

import React from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ContractUpload from "@/components/ContractUpload";
import ScoreMeter from "@/components/ScoreMeter";
import ReportCards from "@/components/ReportCards";
import RulesViewer from "@/components/RulesViewer";
import { useCompliance } from "@/hooks/useCompliance";

export default function Home() {
  const {
    rules,
    report,
    loading,
    error,
    health,
    activeRuleId,
    setActiveRuleId,
    isRulesViewerOpen,
    setIsRulesViewerOpen,
    selectedFile,
    uploadAndAnalyze,
    clearReport,
    runHealthCheck,
    setError,
    updateRule,
  } = useCompliance();

  return (
    <div className="app-container">
      {/* App Topbar Navigation */}
      <Header health={health} onRefreshHealth={runHealthCheck} />

      {/* Main Responsive Grid Panel */}
      <div className="dashboard-wrapper">
        {/* Left Side Active Guidelines list */}
        <Sidebar
          rules={rules}
          activeRuleId={activeRuleId}
          onSelectRule={setActiveRuleId}
          onOpenRulesViewer={() => setIsRulesViewerOpen(true)}
        />

        {/* Core Analysis Dashboard */}
        <main className="main-content">
          <div className="analytics-row">
            {/* Left Block: File Uploader and Findings Breakdown */}
            <div className="flex flex-col gap-6">
              <ContractUpload
                onUpload={uploadAndAnalyze}
                loading={loading}
                selectedFile={selectedFile}
                onClear={clearReport}
                error={error}
                setError={setError}
              />
              
              <ReportCards
                results={report ? report.results : []}
                activeRuleId={activeRuleId}
                onSelectRule={setActiveRuleId}
              />
            </div>

            {/* Right Block: Overall Rating Score Ring Meter */}
            {report && (
              <div className="score-meter-column animate-fade-in">
                <ScoreMeter score={report.compliance_summary.score} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Policy Definitions Modal Overlay */}
      <RulesViewer
        rules={rules}
        isOpen={isRulesViewerOpen}
        onClose={() => setIsRulesViewerOpen(false)}
        onSaveRule={updateRule}
      />
    </div>
  );
}
