export interface Rule {
  id: string;
  name: string;
  cuad_category: string;
  description: string;
  criteria: string;
  severity: "high" | "medium" | "low";
}

export interface RuleResult {
  rule_id: string;
  rule_name: string;
  status: "COMPLIANT" | "WARNING" | "NON_COMPLIANT" | "NOT_FOUND" | "ERROR";
  severity: "high" | "medium" | "low";
  extracted_clause: string;
  risk_explanation: string;
}

export interface ComplianceSummary {
  score: number; // e.g. 80.0
  total_rules: number;
  passed: number;
  failed: number;
}

export interface AuditReport {
  contract_name: string;
  compliance_summary: ComplianceSummary;
  results: RuleResult[];
  error?: string;
}

export interface HealthStatus {
  status: string;
  mlx_available: boolean;
  dry_run_active: boolean;
  model_configured: string | null;
}
