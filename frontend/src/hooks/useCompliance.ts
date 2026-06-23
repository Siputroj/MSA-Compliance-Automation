import { useState, useEffect } from "react";
import { AuditReport, HealthStatus, Rule } from "@/types/compliance";
import { getHealth, getRules, analyzeFile, saveRule } from "@/utils/api";

export function useCompliance() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [isRulesViewerOpen, setIsRulesViewerOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Poll backend health status and rules once on mount
  useEffect(() => {
    async function init() {
      try {
        const [healthData, rulesData] = await Promise.all([
          getHealth(),
          getRules(),
        ]);
        setHealth(healthData);
        setRules(rulesData.rules);
      } catch (err: any) {
        console.error("Connectivity initialization error:", err);
        setError("Failed to connect to FastAPI backend on http://localhost:8000. Is it running?");
      }
    }
    init();
  }, []);

  const runHealthCheck = async () => {
    try {
      const data = await getHealth();
      setHealth(data);
      setError(null);
    } catch (err: any) {
      console.error("Health check error:", err);
      setHealth(null);
      setError("Lost connection to FastAPI backend server.");
    }
  };

  const uploadAndAnalyze = async (file: File) => {
    if (!file.name.endsWith(".txt")) {
      setError("Only plain text (.txt) files are allowed for auditing.");
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedFile(file);
    setReport(null);

    try {
      const auditResult = await analyzeFile(file);
      setReport(auditResult);
      if (auditResult.error) {
        setError(auditResult.error);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "An unexpected error occurred during contract audit.");
    } finally {
      setLoading(false);
    }
  };

  const clearReport = () => {
    setReport(null);
    setSelectedFile(null);
    setError(null);
  };

  const updateRule = async (newRule: Rule): Promise<boolean> => {
    try {
      const response = await saveRule(newRule);
      setRules(response.rules);
      return true;
    } catch (err: any) {
      console.error("Save rule error:", err);
      setError(err.message || "Failed to save compliance rule.");
      return false;
    }
  };

  return {
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
    setSelectedFile,
    uploadAndAnalyze,
    clearReport,
    runHealthCheck,
    setError,
    updateRule,
  };
}
