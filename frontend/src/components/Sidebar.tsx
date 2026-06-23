"use client";

import React from "react";
import { Rule } from "@/types/compliance";

interface SidebarProps {
  rules: Rule[];
  activeRuleId: string | null;
  onSelectRule: (ruleId: string) => void;
  onOpenRulesViewer: () => void;
}

export default function Sidebar({
  rules,
  activeRuleId,
  onSelectRule,
  onOpenRulesViewer,
}: SidebarProps) {
  return (
    <aside className="sidebar glass-card">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Active Policies</h2>
        <button
          className="rules-details-link"
          onClick={onOpenRulesViewer}
          title="Browse policy definitions"
        >
          View Definitions
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
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </button>
      </div>

      <div className="sidebar-content">
        {rules.length === 0 ? (
          <div className="sidebar-empty">
            <span className="sidebar-empty-text">No rules loaded from backend.</span>
          </div>
        ) : (
          <ul className="rules-list">
            {rules.map((rule) => {
              const isActive = activeRuleId === rule.id;
              const severityClass =
                rule.severity === "high" ? "severity-badge-high" : "severity-badge-med";

              return (
                <li key={rule.id}>
                  <button
                    className={`rule-item-btn ${isActive ? "rule-item-active" : ""}`}
                    onClick={() => onSelectRule(rule.id)}
                  >
                    <div className="rule-item-top">
                      <span className="rule-item-id">{rule.id}</span>
                      <span className={`rule-item-severity ${severityClass}`}>
                        {rule.severity.toUpperCase()}
                      </span>
                    </div>
                    <span className="rule-item-name">{rule.name}</span>
                    <span className="rule-item-desc">{rule.description}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="sidebar-footer">
        <span className="footer-text">MSA Audit v1.0.0</span>
      </div>
    </aside>
  );
}
