import type {
  CaseStudy,
  CaseStudyIndustry,
} from '@/services/case-study.service'

export const caseStudyIndustryLabels: Record<CaseStudyIndustry, string> = {
  fintech: 'FinTech',
  healthcare: 'Healthcare',
  logistics: 'Logistics',
  manufacturing: 'Manufacturing',
  government: 'Government',
}

export const caseStudies: CaseStudy[] = [
  {
    slug: 'realtime-ledger-modernization',
    client: 'Client F-17 (Regional Digital Bank)',
    industry: 'fintech',
    title: 'Event-Driven Ledger Modernization for Real-Time Settlement',
    description:
      'Replaced overnight settlement batches with an event-driven ledger pipeline that supports near real-time posting, reconciliation, and auditability.',
    executiveSummary:
      'A regional bank needed to retire a legacy core system that depended on nightly settlement windows and manual exception handling. Start HN delivered a phased modernization around a double-entry event ledger, preserving regulatory controls while cutting reconciliation latency from hours to minutes.',
    challenge:
      'The client operated on a monolithic COBOL-based ledger where account balances were finalized during nightly jobs. Peak transaction periods regularly exceeded batch windows, causing delayed balances, manual reversals, and elevated operational risk. Product teams could not launch instant payment features because downstream risk and compliance systems only received delayed snapshots.',
    solution:
      'Start HN introduced an append-only event stream for ledger mutations and built idempotent posting services behind a domain API. A reconciliation service continuously compared source-of-truth postings with downstream account projections, while automated exception workflows replaced spreadsheet-based incident handling. The rollout used shadow writes and dual-run comparisons before cutover to reduce migration risk.',
    architectureDecisions: [
      {
        decision: 'Append-only event model for all debit/credit movements',
        rationale:
          'Ensured complete audit lineage and simplified replay for dispute investigations and regulatory backtesting.',
      },
      {
        decision: 'CQRS split between posting commands and balance projections',
        rationale:
          'Isolated write-path consistency from read-path scale, allowing low-latency customer balance queries during traffic spikes.',
      },
      {
        decision:
          'Progressive cutover using shadow writes with deterministic diff checks',
        rationale:
          'Allowed the team to prove numerical equivalence against the legacy ledger before routing production traffic.',
      },
    ],
    techStack: [
      'TypeScript',
      'Node.js',
      'PostgreSQL',
      'Kafka',
      'Debezium',
      'Redis',
      'Docker',
      'Prometheus',
      'Grafana',
    ],
    results: [
      {
        metric: 'Settlement Latency',
        value: '4.8h -> 11m',
        description:
          'Ledger finalization moved from overnight batches to continuous settlement windows.',
      },
      {
        metric: 'Manual Reconciliation Tickets',
        value: '-63%',
        description:
          'Automated exception routing and reconciliation checks removed repetitive operations work.',
      },
      {
        metric: 'Incident MTTD',
        value: '42m -> 7m',
        description:
          'Stream-level observability made posting drift visible earlier in the transaction lifecycle.',
      },
    ],
    tags: ['Event Sourcing', 'Payments', 'Compliance', 'Observability'],
    isFeatured: false,
  },
  {
    slug: 'clinical-triage-orchestration',
    client: 'Client H-09 (Multi-Site Care Provider)',
    industry: 'healthcare',
    title: 'Clinical Triage Orchestration Across EHR Silos',
    description:
      'Implemented a triage orchestration layer that normalized intake signals from multiple EHR systems and prioritized high-risk cases in real time.',
    executiveSummary:
      'A care provider managing urgent and outpatient facilities struggled with fragmented intake workflows and delayed escalations. Start HN built an integration and rules engine that standardized triage events, improving response times while preserving HIPAA controls and clinician override paths.',
    challenge:
      'Incoming patient data arrived through incompatible EHR integrations, call-center forms, and device feeds. Nurses spent significant time manually reconciling records before escalation, and high-risk signals could be delayed when departments used different priority criteria. Leadership needed measurable response-time improvements without replacing core clinical systems.',
    solution:
      'Start HN delivered an event ingestion service with schema validation and PHI-safe routing. A configurable triage rules engine scored events using symptoms, vitals, and patient history, then published escalation tasks to clinical teams through existing workflows. Every automated recommendation remained explainable, and clinicians retained final decision control with full audit trails.',
    architectureDecisions: [
      {
        decision:
          'FHIR-aligned canonical event contract between integration boundaries',
        rationale:
          'Reduced downstream coupling and enabled additional EHR connectors without rewriting triage logic.',
      },
      {
        decision:
          'Rules-first triage engine with model-assisted scoring as secondary input',
        rationale:
          'Maintained clinical explainability and governance while still improving prioritization quality.',
      },
      {
        decision: 'Field-level encryption with scoped token access for PHI',
        rationale:
          'Protected sensitive data in transit and at rest while supporting operational observability needs.',
      },
    ],
    techStack: [
      'TypeScript',
      'NestJS',
      'PostgreSQL',
      'RabbitMQ',
      'HL7/FHIR',
      'OpenTelemetry',
      'Terraform',
      'Azure Kubernetes Service',
    ],
    results: [
      {
        metric: 'High-Risk Escalation Time',
        value: '39m -> 14m',
        description:
          'Critical triage events reached clinical teams faster across all facilities.',
      },
      {
        metric: 'Duplicate Case Creation',
        value: '-48%',
        description:
          'Canonical identity matching reduced repeated records and manual cleanup.',
      },
      {
        metric: 'Nurse Intake Admin Time',
        value: '-31%',
        description:
          'Automated normalization and task assignment reduced non-clinical workload.',
      },
    ],
    tags: ['Interoperability', 'FHIR', 'Workflow Automation', 'HIPAA'],
    isFeatured: false,
  },
  {
    slug: 'multi-region-fleet-visibility',
    client: 'Client L-22 (Cross-Border Carrier)',
    industry: 'logistics',
    title: 'Multi-Region Fleet Visibility and ETA Prediction Platform',
    description:
      'Built a resilient telemetry platform that combined vehicle, warehouse, and customs events into one operational timeline with predictive ETA updates.',
    executiveSummary:
      'The client lacked a single operational view across fleets operating in three regions. Start HN delivered a streaming data platform and dispatch console that correlated telemetry and milestone events, enabling proactive rerouting during disruptions.',
    challenge:
      'Dispatch teams relied on disconnected vendor dashboards and batch CSV uploads. ETA updates were often stale, making customer promises unreliable and increasing penalty fees for missed windows. The organization also needed a regional failover strategy due to strict uptime commitments for enterprise customers.',
    solution:
      'Start HN implemented an ingestion layer for telematics providers, yard systems, and customs events, then built a timeline service that continuously recalculated shipment state. A rules-based dispatch assistant flagged route risk and suggested alternatives. The platform exposed APIs for customer portals and internal control towers with shared consistency rules.',
    architectureDecisions: [
      {
        decision:
          'Region-local ingestion with asynchronous replication to a global read model',
        rationale:
          'Kept latency low per geography while preserving a unified cross-region operations view.',
      },
      {
        decision:
          'Outbox pattern on operational services publishing milestone events',
        rationale:
          'Prevented lost updates and ensured timeline consistency under partial failures.',
      },
      {
        decision:
          'Feature flags for dispatch heuristics and ETA model rollouts',
        rationale:
          'Allowed controlled rollout and rapid rollback during peak seasonal traffic.',
      },
    ],
    techStack: [
      'Go',
      'TypeScript',
      'Apache Kafka',
      'ClickHouse',
      'PostgreSQL',
      'Redis',
      'Kubernetes',
      'Argo CD',
      'Sentry',
    ],
    results: [
      {
        metric: 'On-Time Delivery',
        value: '+17%',
        description:
          'Improved ETA precision and early rerouting reduced missed delivery windows.',
      },
      {
        metric: 'ETA Error (P95)',
        value: '112m -> 38m',
        description:
          'Continuous event correlation significantly tightened prediction confidence.',
      },
      {
        metric: 'Major Incident Frequency',
        value: '-41%',
        description:
          'Regional fault isolation and failover reduced cross-system outages.',
      },
    ],
    tags: ['Telemetry', 'Streaming', 'Control Tower', 'Reliability'],
    isFeatured: false,
  },
  {
    slug: 'predictive-maintenance-mes',
    client: 'Client M-04 (Industrial Components Manufacturer)',
    industry: 'manufacturing',
    title: 'Predictive Maintenance Integration with MES and SCADA',
    description:
      'Integrated plant telemetry with MES workflows to predict equipment failure windows and schedule maintenance around production constraints.',
    executiveSummary:
      'A manufacturer with tight delivery SLAs faced recurring unplanned downtime on critical CNC lines. Start HN built a maintenance intelligence platform that fused sensor data with production schedules, reducing emergency stops and stabilizing throughput.',
    challenge:
      'Maintenance planning was reactive and depended on fixed intervals rather than equipment condition. Machine alarms generated noise without clear prioritization, while production planners lacked visibility into maintenance risk. Unexpected stoppages disrupted downstream assembly lines and increased overtime cost.',
    solution:
      'Start HN implemented a telemetry pipeline to aggregate machine states, vibration, and temperature signals. A risk scoring service identified failure patterns and generated maintenance recommendations tied to MES work orders. Planner dashboards exposed risk-adjusted maintenance windows to align with shift and order constraints.',
    architectureDecisions: [
      {
        decision: 'Edge buffering gateway for plant-floor telemetry ingestion',
        rationale:
          'Handled intermittent network conditions without dropping high-frequency machine signals.',
      },
      {
        decision:
          'Time-series storage separated from transactional MES integration database',
        rationale:
          'Optimized analytical workloads without impacting work-order transaction performance.',
      },
      {
        decision:
          'Model serving with deterministic fallback rules for low-confidence predictions',
        rationale:
          'Protected operations from opaque recommendations and preserved operator trust.',
      },
    ],
    techStack: [
      'Python',
      'FastAPI',
      'TimescaleDB',
      'PostgreSQL',
      'MQTT',
      'Kubernetes',
      'Grafana',
      'dbt',
    ],
    results: [
      {
        metric: 'Unplanned Downtime',
        value: '-36%',
        description:
          'Condition-based recommendations reduced emergency machine stoppages.',
      },
      {
        metric: 'Maintenance Lead Time Accuracy',
        value: '+29%',
        description:
          'Work orders were scheduled closer to actual failure risk windows.',
      },
      {
        metric: 'Overall Equipment Effectiveness',
        value: '+11 points',
        description:
          'Stable line availability translated into measurable throughput gains.',
      },
    ],
    tags: ['Industrial IoT', 'MES', 'Predictive Maintenance', 'MLOps'],
    isFeatured: false,
  },
  {
    slug: 'permit-portal-modernization',
    client: 'Client G-31 (Municipal Agency)',
    industry: 'government',
    title:
      'Permit and Inspection Portal Modernization with Workflow Automation',
    description:
      'Replaced paper-first permit workflows with a secure digital platform integrating review queues, inspections, and public status tracking.',
    executiveSummary:
      'A municipal agency needed to reduce permit backlog and improve transparency without increasing staffing. Start HN delivered a workflow platform with role-based review paths, document automation, and structured audit logs suitable for public-sector oversight.',
    challenge:
      'Permit applications were processed through email threads and disconnected legacy tools, making status tracking inconsistent for both staff and applicants. Review queues lacked prioritization, inspectors received incomplete packets, and compliance reporting required manual spreadsheet consolidation.',
    solution:
      'Start HN implemented a workflow engine with configurable review stages, SLA timers, and automated routing based on permit type. A unified document service enforced validation rules at submission time and generated reviewer packets automatically. Applicants received status updates through a self-service portal backed by the same workflow state model.',
    architectureDecisions: [
      {
        decision:
          'Role-based workflow orchestration with policy-configurable state transitions',
        rationale:
          'Allowed agency administrators to adapt review logic without redeploying application code.',
      },
      {
        decision: 'Immutable activity log for every workflow transition',
        rationale:
          'Supported legal traceability requirements and simplified compliance reporting.',
      },
      {
        decision:
          'Progressive migration from legacy records via dual-index search',
        rationale:
          'Enabled uninterrupted access to historical permits during phased onboarding.',
      },
    ],
    techStack: [
      'React',
      'TypeScript',
      '.NET',
      'PostgreSQL',
      'Elasticsearch',
      'Azure AD B2C',
      'Azure Blob Storage',
      'GitHub Actions',
    ],
    results: [
      {
        metric: 'Median Permit Cycle Time',
        value: '26d -> 15d',
        description:
          'Automated routing and complete submission validation reduced queue friction.',
      },
      {
        metric: 'Backlog Volume',
        value: '-44%',
        description: 'Prioritized review queues reduced aging applications.',
      },
      {
        metric: 'Inspector Rework Rate',
        value: '-33%',
        description:
          'Standardized packets and workflow checks reduced return-to-review loops.',
      },
    ],
    tags: ['Workflow Engine', 'Public Sector', 'Security', 'Digital Services'],
    isFeatured: false,
  },
]

export const caseStudyIndustries = Object.keys(
  caseStudyIndustryLabels,
) as CaseStudyIndustry[]

export function getCaseStudyBySlug(slug: string) {
  return caseStudies.find((caseStudy) => caseStudy.slug === slug)
}
