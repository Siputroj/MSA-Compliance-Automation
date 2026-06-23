"use client";

import React, { useState } from "react";
import { RuleResult } from "@/types/compliance";

interface ReportCardsProps {
  results: RuleResult[];
  activeRuleId: string | null;
  onSelectRule: (ruleId: string) => void;
}

export default function ReportCards({
  results,
  activeRuleId,
  onSelectRule,
}: ReportCardsProps) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "COMPLIANT":
        return {
          bgClass: "card-status-compliant",
          borderClass: "border-compliant",
          badgeLabel: "Compliant",
          icon: (
            <svg className="card-icon text-compliant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case "WARNING":
        return {
          bgClass: "card-status-warning",
          borderClass: "border-warning",
          badgeLabel: "Warning",
          icon: (
            <svg className="card-icon text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        };
      case "NON_COMPLIANT":
        return {
          bgClass: "card-status-non-compliant",
          borderClass: "border-non-compliant",
          badgeLabel: "Non-Compliant",
          icon: (
            <svg className="card-icon text-non-compliant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      default:
        return {
          bgClass: "card-status-not-found",
          borderClass: "border-not-found",
          badgeLabel: "Not Found",
          icon: (
            <svg className="card-icon text-not-found" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  return (
    <div className="report-cards-container">
      <h3 className="section-title">Analysis Findings</h3>
      
      {results.length === 0 ? (
        <div className="report-empty glass-card">
          <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="empty-title">Ready for Auditing</span>
          <span className="empty-desc">Upload a contract to view the granular legal clause analysis details here.</span>
        </div>
      ) : (
        <div className="report-grid">
          {results.map((result) => {
            const config = getStatusConfig(result.status);
            const isSelected = activeRuleId === result.rule_id;
            const isExpanded = expandedCardId === result.rule_id;

            return (
              <div
                key={result.rule_id}
                className={`report-card glass-card ${config.borderClass} ${
                  isSelected ? "card-highlight-active" : ""
                }`}
                onClick={() => onSelectRule(result.rule_id)}
              >
                {/* Card Top Row Header */}
                <div className="card-header">
                  <div className="card-title-group">
                    <span className="card-rule-id">{result.rule_id}</span>
                    <h4 className="card-rule-name">{result.rule_name}</h4>
                  </div>
                  
                  <div className="card-meta-group">
                    <span className={`severity-tag severity-tag-${result.severity}`}>
                      {result.severity.toUpperCase()}
                    </span>
                    <div className={`status-badge ${config.bgClass}`}>
                      {config.icon}
                      <span className="status-badge-label">{config.badgeLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Card Body Risk Explanation */}
                <div className="card-body">
                  <p className="risk-explanation">{result.risk_explanation}</p>

                  {/* Legal Quote / Extracted Clause */}
                  {result.extracted_clause ? (
                    <div className="clause-expand-wrapper">
                      <div className="clause-action-header">
                        <span className="clause-label">Extracted Clause Context</span>
                        <button
                          type="button"
                          className="clause-toggle-btn"
                          onClick={(e) => toggleExpand(result.rule_id, e)}
                        >
                          {isExpanded ? "Hide Excerpt" : "Show Excerpt"}
                          <svg
                            className={`w-3.5 h-3.5 arrow-icon ${isExpanded ? "arrow-rotate" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      
                      {isExpanded && (
                        <blockquote className="clause-quote animate-slide-down">
                          <p className="clause-text">
                            &ldquo;{result.extracted_clause.trim()}&rdquo;
                          </p>
                        </blockquote>
                      )}
                    </div>
                  ) : (
                    <p className="clause-missing">No corresponding clause extracted from document.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
