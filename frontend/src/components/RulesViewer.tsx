"use client";

import React, { useEffect, useState } from "react";
import { Rule } from "@/types/compliance";

interface RulesViewerProps {
  rules: Rule[];
  isOpen: boolean;
  onClose: () => void;
  onSaveRule: (rule: Rule) => Promise<boolean>;
}

const CUAD_TAXONOMY_OPTIONS = [
  "Governing Law",
  "Non-Compete",
  "Cap On Liability",
  "Termination For Convenience",
  "Audit Rights",
  "Exclusivity",
  "Most Favored Nation",
  "Anti-Assignment",
  "Insurance"
];

export default function RulesViewer({ rules, isOpen, onClose, onSaveRule }: RulesViewerProps) {
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCriteria, setFormCriteria] = useState("");
  const [formSeverity, setFormSeverity] = useState<"high" | "medium" | "low">("medium");

  // Prevent body scrolling when rules directory overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const startEdit = (rule: Rule) => {
    setEditingRule(rule);
    setIsAdding(false);
    setFormId(rule.id);
    setFormName(rule.name);
    setFormCategory(rule.cuad_category);
    setFormDesc(rule.description);
    setFormCriteria(rule.criteria);
    setFormSeverity(rule.severity);
  };

  const startAdd = () => {
    setEditingRule(null);
    setIsAdding(true);
    // Find next sequential ID (RULE-XX)
    const nextIdNumber = rules.reduce((max, r) => {
      const match = r.id.match(/RULE-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 0) + 1;
    const nextId = `RULE-${String(nextIdNumber).padStart(2, "0")}`;
    setFormId(nextId);
    setFormName("");
    setFormCategory(CUAD_TAXONOMY_OPTIONS[0]);
    setFormDesc("");
    setFormCriteria("");
    setFormSeverity("medium");
  };

  const resetForm = () => {
    setEditingRule(null);
    setIsAdding(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formId || !formName || !formCategory || !formDesc || !formCriteria) {
      alert("Please fill in all fields.");
      return;
    }
    const targetRule: Rule = {
      id: formId,
      name: formName,
      cuad_category: formCategory,
      description: formDesc,
      criteria: formCriteria,
      severity: formSeverity
    };
    const success = await onSaveRule(targetRule);
    if (success) {
      resetForm();
    }
  };

  const isFormActive = isAdding || editingRule !== null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="modal-content glass-card animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 className="modal-title">
              {isFormActive 
                ? (isAdding ? "Add Compliance Rule" : "Edit Compliance Rule") 
                : "Company Compliance Rules"
              }
            </h3>
            <p className="modal-subtitle">
              {isFormActive 
                ? "Define the policy parameters and LLM extraction criteria." 
                : "Declarative guidelines used by the LLM RAG audit pipeline to evaluate MSAs."
              }
            </p>
          </div>
          
          <div className="rules-header-actions">
            {!isFormActive && (
              <button className="add-rule-btn" onClick={startAdd}>
                Add New Policy
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose} aria-label="Close rules directory">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="modal-body">
          {isFormActive ? (
            <form onSubmit={handleSave} className="policy-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Rule ID</label>
                  <input type="text" value={formId} readOnly className="form-input opacity-70" />
                </div>
                <div className="form-group">
                  <label className="form-label">Severity Level</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as "high" | "medium" | "low")}
                    className="form-select"
                  >
                    <option value="high">HIGH (Immediate Rejection)</option>
                    <option value="medium">MEDIUM (Warning Flag)</option>
                    <option value="low">LOW (Audit Info Only)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Policy Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Liability Cap, Non-Compete"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Taxonomy Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="form-select"
                  >
                    {CUAD_TAXONOMY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Policy Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="State the corporate policy restriction clearly (e.g. Contract must be governed by Delaware law)..."
                  className="form-textarea"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">LLM Evaluation Criteria</label>
                <textarea
                  value={formCriteria}
                  onChange={(e) => setFormCriteria(e.target.value)}
                  placeholder="Detail instructions for the LLM to inspect retrieved text segments..."
                  className="form-textarea"
                  required
                />
              </div>

              <div className="form-actions-row">
                <button type="button" onClick={resetForm} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  Save Policy
                </button>
              </div>
            </form>
          ) : (
            rules.length === 0 ? (
              <div className="modal-empty-state">
                <p>No active policies configured in rules.json.</p>
              </div>
            ) : (
              <div className="rules-grid">
                {rules.map((rule) => {
                  const severityClass =
                    rule.severity === "high" ? "severity-badge-high" : "severity-badge-med";

                  return (
                    <div key={rule.id} className="rule-details-card animate-fade-in">
                      <div className="rule-details-header">
                        <div className="rule-details-title-row">
                          <span className="details-rule-id">{rule.id}</span>
                          <h4 className="details-rule-name">{rule.name}</h4>
                        </div>
                        <div className="card-meta-group">
                          <button onClick={() => startEdit(rule)} className="edit-rule-btn">
                            Edit Policy
                          </button>
                          <span className={`rule-item-severity ${severityClass}`}>
                            {rule.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="rule-details-body">
                        <div className="details-row">
                          <span className="details-label">Taxonomy Category:</span>
                          <span className="details-value-badge">{rule.cuad_category}</span>
                        </div>

                        <div className="details-row-vertical">
                          <span className="details-label">Rule Description:</span>
                          <p className="details-text-paragraph">{rule.description}</p>
                        </div>

                        <div className="details-row-vertical">
                          <span className="details-label">LLM Evaluation Criteria:</span>
                          <p className="details-text-paragraph criteria-text-highlight">
                            {rule.criteria}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
