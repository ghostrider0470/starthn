export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  author: string
  readTime: string
  category: string
  subcategory?: string
  tags: string[]
  content: string[]
  isFeatured?: boolean
  coverImage?: string
  bannerImage?: string
  authorSlug?: string
  authorAvatarUrl?: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'shipping-ai-features-with-engineering-guardrails',
    title: 'Shipping AI Features with Engineering Guardrails',
    excerpt:
      'How product teams can move quickly on LLM features without sacrificing observability, safety, or maintainability.',
    publishedAt: '2026-02-23',
    author: 'Amina Kovacevic',
    readTime: '8 min read',
    category: 'AI Engineering',
    tags: ['LLM Ops', 'Prompt Engineering', 'Observability', 'Safety'],
    content: [
      'Most AI initiatives fail for the same reason: teams treat model output as magic instead of software behavior. The moment an LLM response influences user workflows, finance operations, or customer support decisions, that response becomes part of your production system and deserves the same rigor as any other dependency.',
      'A strong delivery pattern starts with contracts. Every prompt template, retrieval strategy, and post-processing rule should map to a concrete interface that downstream services can validate. When responses are normalized into typed objects, teams can write meaningful tests and avoid fragile parsing logic spread across the codebase.',
      'The second guardrail is evaluation at the boundary. Before a feature ships, run scenario suites that reflect realistic user intent, ambiguous requests, and adversarial phrasing. Store pass rates by category, not only global accuracy, because reliability in edge scenarios usually determines support volume after launch.',
      'Operational telemetry is equally important. Track latency percentiles, token usage, refusal rates, and fallback activation by feature flag and model version. These metrics let teams decide when to optimize prompts, when to introduce caching, and when to roll back a model update before business impact grows.',
      'Risk controls should be explicit in architecture reviews. Teams need policy filters for sensitive categories, deterministic fallbacks for low-confidence outputs, and escalation paths when confidence thresholds are not met. A safe AI path is not about one perfect model; it is about predictable behavior when the model is uncertain.',
      'The teams that scale AI effectively treat model improvements as iterative infrastructure work. They maintain prompt repositories, version evaluations, and document operational playbooks. Over time, this discipline turns isolated experiments into a reusable engineering capability that supports multiple products.',
    ],
  },
  {
    slug: 'reference-architecture-for-multi-product-enterprises',
    title: 'Reference Architecture for Multi-Product Enterprises',
    excerpt:
      'A practical blueprint for aligning domain ownership, integration boundaries, and platform standards across business units.',
    publishedAt: '2026-02-20',
    author: 'David Lin',
    readTime: '9 min read',
    category: 'Enterprise Architecture',
    tags: ['Domain Design', 'Integration', 'Governance', 'Platform Strategy'],
    content: [
      'Enterprise architecture is often criticized because diagrams grow while delivery speed shrinks. The problem is not architecture itself; the problem is static blueprints that ignore team topology and product lifecycle. Useful architecture models focus on decision rights, boundary contracts, and the minimum standards needed for interoperability.',
      'For multi-product organizations, start by defining domains that mirror real business capabilities rather than org charts. Ownership should include data semantics, API compatibility windows, and reliability objectives. When teams understand where authority starts and ends, integration becomes a predictable engineering activity instead of recurring negotiation.',
      'A reference architecture should include clear lanes for platform, product, and shared services work. Platform teams own paved roads such as identity, audit logging, deployment tooling, and observability scaffolding. Product teams own differentiated workflows, while shared services are reserved for cross-domain capabilities that truly require centralization.',
      'Governance works best when it is automated. Use templates, scorecards, and CI checks to validate service metadata, API versioning policy, and security posture. Engineers should not wait for quarterly review boards to discover drift that could have been detected at pull request time.',
      'Financial alignment is another frequently missed component. Architecture decisions create long-term cost profiles, so teams need visibility into run costs, integration overhead, and platform usage patterns. A design that looks elegant on a whiteboard but multiplies operational burden across ten teams is not enterprise-ready.',
      'Organizations that treat reference architecture as a living product outperform those that publish one-time standards. They run architecture retrospectives, update conventions based on incident learnings, and keep the framework lightweight enough that delivery teams can actually adopt it.',
    ],
  },
  {
    slug: 'platform-golden-paths-for-cloud-delivery',
    title: 'Platform Golden Paths for Cloud Delivery',
    excerpt:
      'Designing cloud and DevOps workflows that reduce cognitive load while increasing release throughput.',
    publishedAt: '2026-02-18',
    author: 'Marta Petrovic',
    readTime: '7 min read',
    category: 'Cloud & DevOps',
    tags: ['Platform Engineering', 'CI/CD', 'Kubernetes', 'Developer Experience'],
    content: [
      'Golden paths are not rigid rules; they are optimized defaults. A mature platform team builds self-service templates that encode deployment patterns, logging conventions, policy checks, and runtime safeguards so product engineers can focus on business logic instead of infrastructure choreography.',
      'The most effective starting point is service bootstrapping. New services should inherit repository structure, pipeline configuration, health endpoints, and baseline dashboards by default. Consistency at project creation eliminates weeks of ad hoc setup and prevents hidden reliability debt from entering production.',
      'CI/CD should prioritize confidence over raw speed. Fast pipelines are useful only when they provide actionable signals. Include contract tests, migration safety checks, and environment parity validation to catch rollout regressions before traffic shifts. Teams move faster when they trust the system to block unsafe changes.',
      'Operational guardrails belong in the platform layer. Progressive delivery, automated rollbacks, and rate-based alerting should be available as standardized capabilities, not custom scripts hidden in individual repositories. This approach keeps incident response predictable, even as service count grows.',
      'Cloud cost awareness needs first-class treatment in golden paths. Tag workloads automatically, surface run cost per environment, and provide templates for scale-to-zero or right-sized compute profiles. Engineers make better architecture choices when cost tradeoffs are visible during implementation, not after invoices arrive.',
      'A healthy golden path is continuously improved through feedback loops. Track adoption, friction points, and escape-hatch usage so the platform evolves with product reality. The goal is not to eliminate flexibility; it is to make the safe and maintainable path the easiest one to follow.',
    ],
  },
  {
    slug: 'building-event-driven-automation-control-planes',
    title: 'Building Event-Driven Automation Control Planes',
    excerpt:
      'Patterns for orchestrating large automation systems with strong traceability, safety boundaries, and rollback paths.',
    publishedAt: '2026-02-15',
    author: 'Noah Whitaker',
    readTime: '10 min read',
    category: 'Automation Systems',
    tags: ['Event-Driven', 'Workflow Orchestration', 'Control Planes', 'Resilience'],
    content: [
      'Automation initiatives become fragile when orchestration logic is scattered across scripts, cron jobs, and manual runbooks. A control plane centralizes workflow intent, execution state, and policy enforcement so teams can reason about automation behavior as a coherent system.',
      'Event-driven architecture is a strong foundation because it decouples producers from action handlers. Instead of direct service-to-service triggering, automation tasks subscribe to typed events and execute idempotent steps. This pattern improves scalability and allows independent evolution of upstream systems.',
      'Traceability must be designed in from day one. Every workflow run should emit a durable audit trail that captures trigger source, decision branches, external side effects, and human approvals. During incidents, teams can reconstruct behavior quickly without reverse-engineering logs from multiple services.',
      'Policy boundaries are essential in enterprise automation. Define which actions can auto-execute, which require human review, and which must be blocked under compliance conditions. Embedding these rules in the control plane creates consistent enforcement and reduces risk from ad hoc override logic.',
      'Rollback strategy is frequently underdeveloped. For each automated action, design compensating transactions or safe fallback states before enabling broad rollout. Automation that cannot recover from partial failure usually increases operational burden instead of reducing it.',
      'Successful control planes evolve as internal products. They provide reusable workflow primitives, versioned execution contracts, and observability dashboards that product teams can trust. When teams stop reinventing orchestration logic, automation quality improves across the organization.',
    ],
  },
  {
    slug: 'reliability-by-design-for-fast-moving-teams',
    title: 'Reliability by Design for Fast-Moving Teams',
    excerpt:
      'Embedding SLOs, failure-mode thinking, and graceful degradation into everyday software design decisions.',
    publishedAt: '2026-02-12',
    author: 'Priya Raman',
    readTime: '8 min read',
    category: 'Software Reliability & Design',
    tags: ['SRE', 'SLOs', 'Failure Modes', 'Resilience Engineering'],
    content: [
      'Reliability is often treated as a post-launch concern, but most incidents trace back to design decisions made weeks earlier. Teams that consistently ship stable systems evaluate reliability risks during architecture and API design, not after telemetry turns red.',
      'Start with explicit service-level objectives tied to user outcomes. Availability, latency, and correctness targets should reflect real product expectations, then shape implementation choices such as caching strategy, timeout budgets, and dependency isolation. Without these targets, reliability debates become subjective.',
      'Failure-mode analysis should become a normal part of technical planning. Ask what happens when dependencies slow down, queues fill, configuration drifts, or data contracts break. Designing graceful degradation upfront is far cheaper than inventing emergency fixes during an incident.',
      'Resilience patterns need practical boundaries. Circuit breakers, retries, and bulkheads are useful only when teams understand their side effects. Unbounded retries can amplify outages, while poorly scoped isolation can hide failures until customer impact is widespread.',
      'Operational readiness includes more than dashboards. Teams need clear ownership, actionable alerts, and documented recovery procedures that are tested in game days. Practice creates confidence, and confidence reduces mean time to recover when real incidents occur.',
      'Fast-moving organizations do not choose between velocity and reliability. They invest in design-time reliability thinking, platform safeguards, and incident learning loops that compound over time, allowing teams to release often without normalizing instability.',
    ],
  },
  {
    slug: 'evaluation-pipelines-product-teams-trust',
    title: 'Evaluation Pipelines Product Teams Trust',
    excerpt:
      'Turning AI quality measurement into a repeatable engineering workflow that supports confident releases.',
    publishedAt: '2026-02-08',
    author: 'Jules Hart',
    readTime: '7 min read',
    category: 'AI Engineering',
    tags: ['Evaluation', 'Quality Engineering', 'Datasets', 'Release Management'],
    content: [
      'Many AI releases rely on anecdotal demos because evaluation workflows are bolted on too late. Product teams need a repeatable pipeline where scenarios, scoring methods, and pass thresholds are versioned alongside application code.',
      'A dependable evaluation system begins with dataset strategy. Curate cases that represent common tasks, long-tail behavior, and policy-sensitive prompts. Label sets should evolve as product scope changes; stale datasets create a false sense of model quality and miss new failure modes.',
      'Scoring should combine automated metrics with targeted human review. Structured checks can validate schema adherence, factual grounding, and latency budgets, while human review catches ambiguity and tone issues that numeric metrics often miss. The combination gives teams both scale and nuance.',
      'Tie evaluation results directly to release controls. If a model or prompt change drops below threshold in high-risk categories, deployment should pause automatically. Engineers trust pipelines when quality gates are objective, transparent, and enforced consistently across teams.',
      'Cost and latency tradeoffs belong in evaluation outputs, not separate dashboards. A model that improves accuracy by one point but doubles response time may degrade user experience in production. Good release decisions require performance, quality, and economics in one view.',
      'When evaluation pipelines are treated as core product infrastructure, teams avoid reactive quality firefighting. They iterate with confidence, understand risk before launch, and build institutional knowledge about what reliable AI behavior actually looks like in their domain.',
    ],
  },
  {
    slug: 'incident-informed-architecture-decisions',
    title: 'Incident-Informed Architecture Decisions',
    excerpt:
      'Using incident data as a feedback loop to evolve enterprise architecture and reduce recurring operational risk.',
    publishedAt: '2026-02-04',
    author: 'Elena Markovic',
    readTime: '9 min read',
    category: 'Enterprise Architecture',
    tags: ['Incident Management', 'Architecture Evolution', 'Risk Reduction', 'Postmortems'],
    content: [
      'Architecture strategy gains credibility when it learns from operational reality. Incident records contain concrete evidence about coupling, dependency fragility, and decision tradeoffs that architecture forums often debate abstractly. Teams that mine this data can prioritize improvements with much greater precision.',
      'The first step is standardized incident taxonomy. Classify events by failure type, blast radius, recovery blockers, and root cause category. Without consistent labeling, patterns remain hidden and architecture priorities drift toward whichever outage was most recent or most visible.',
      'Postmortems should produce architecture-level actions, not only service-level patches. If multiple incidents involve the same integration pattern or deployment dependency, that is a signal for platform or reference-architecture change. Treat recurring failures as design debt, not isolated mistakes.',
      'Decision records help close the loop. When architecture teams choose to introduce an API gateway pattern, data replication boundary, or resilience standard, document the incident evidence that motivated the change. This traceability improves adoption because delivery teams can see the operational context behind standards.',
      'Leadership reporting should include recurrence and prevention metrics, not just incident counts. Measuring how architecture changes reduce repeated failure modes provides a clearer view of progress than raw outage volume, which can fluctuate with product growth.',
      'Organizations that integrate incident learning into architecture governance create stronger systems over time. They replace one-off heroics with systematic risk reduction and build a shared language between platform engineers, architects, and product teams.',
    ],
  },
  {
    slug: 'progressive-delivery-for-cloud-native-systems',
    title: 'Progressive Delivery for Cloud-Native Systems',
    excerpt:
      'A release strategy for reducing deployment risk through staged rollouts, observability gates, and fast recovery.',
    publishedAt: '2026-01-30',
    author: 'Gabriel Shaw',
    readTime: '8 min read',
    category: 'Cloud & DevOps',
    tags: ['Progressive Delivery', 'Canary Releases', 'Feature Flags', 'Observability'],
    content: [
      'Cloud-native teams deploy frequently, but deployment frequency alone does not reduce risk. Progressive delivery introduces control points that validate behavior under real traffic before a release reaches full user population. This approach turns deployment from a binary event into an observable sequence.',
      'Effective progressive delivery begins with segmentation strategy. Choose rollout cohorts by region, tenant type, or internal users to maximize signal while limiting blast radius. Cohort design should reflect business risk so early rollout stages capture relevant usage patterns.',
      'Automated analysis is critical during staged rollout. Compare key service indicators against baseline windows and halt promotion when error rate, latency, or resource usage exceeds policy thresholds. Manual judgment remains valuable, but automated gates prevent avoidable delays and inconsistent decisions.',
      'Feature flags and deployment versions should be coordinated but decoupled. Deploying code without activation allows teams to test runtime behavior safely, while flag controls enable rapid disablement if user-facing issues emerge. This separation shortens recovery time during incidents.',
      'Observability dashboards must be release-aware. Teams need views that overlay rollout stage, traffic share, and recent config changes so they can correlate anomalies quickly. Generic dashboards often hide rollout signals in aggregate metrics and slow down diagnosis.',
      'Progressive delivery succeeds when it becomes a default operating model rather than a special process for high-risk launches. With clear policy, tooling, and runbooks, teams can release continuously while maintaining predictable reliability.',
    ],
  },
]

function sortByPublishedDateDesc(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug)
}

export function getBlogCategories(): string[] {
  return [...new Set(BLOG_POSTS.map((post) => post.category))]
}

export function getLatestBlogPost(): BlogPost | undefined {
  return sortByPublishedDateDesc(BLOG_POSTS)[0]
}

export function getRelatedBlogPosts(
  category: string,
  currentSlug: string,
  limit = 3,
): BlogPost[] {
  return sortByPublishedDateDesc(
    BLOG_POSTS.filter(
      (post) => post.category === category && post.slug !== currentSlug,
    ),
  ).slice(0, limit)
}
