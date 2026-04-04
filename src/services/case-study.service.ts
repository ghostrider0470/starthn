import api from './api'

// --- Types (canonical source, imported by components) ---

export type CaseStudyIndustry =
  | 'fintech'
  | 'healthcare'
  | 'logistics'
  | 'manufacturing'
  | 'government'

export interface CaseStudyArchitectureDecision {
  decision: string
  rationale: string
}

export interface CaseStudyResult {
  metric: string
  value: string
  description: string
}

export interface CaseStudy {
  slug: string
  client: string
  industry: CaseStudyIndustry
  title: string
  description: string
  executiveSummary: string
  challenge: string
  solution: string
  architectureDecisions: CaseStudyArchitectureDecision[]
  techStack: string[]
  results: CaseStudyResult[]
  tags: string[]
  isFeatured: boolean
  coverImage?: string
}

export interface AdminCaseStudy extends CaseStudy {
  id: string
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCaseStudyDto {
  slug?: string
  title: string
  client: string
  industry: string
  description: string
  executiveSummary: string
  challenge: string
  solution: string
  architectureDecisions: CaseStudyArchitectureDecision[]
  techStack: string[]
  results: CaseStudyResult[]
  tags: string[]
  isPublished: boolean
  isFeatured?: boolean
  coverImage?: string
}

export interface UpdateCaseStudyDto {
  slug?: string
  title?: string
  client?: string
  industry?: string
  description?: string
  executiveSummary?: string
  challenge?: string
  solution?: string
  architectureDecisions?: CaseStudyArchitectureDecision[]
  techStack?: string[]
  results?: CaseStudyResult[]
  tags?: string[]
  isPublished?: boolean
  isFeatured?: boolean
  coverImage?: string
}

class CaseStudyService {
  // Public endpoints

  async fetchCaseStudies(): Promise<CaseStudy[]> {
    const response = await api.get<CaseStudy[]>('/case-studies')
    return response.data
  }

  async fetchCaseStudyBySlug(slug: string): Promise<CaseStudy> {
    const response = await api.get<CaseStudy>(`/case-studies/${slug}`)
    return response.data
  }

  // Admin endpoints

  async fetchAdminCaseStudies(): Promise<AdminCaseStudy[]> {
    const response = await api.get<AdminCaseStudy[]>('/manage/case-studies')
    return response.data
  }

  async createCaseStudy(data: CreateCaseStudyDto): Promise<AdminCaseStudy> {
    const response = await api.post<AdminCaseStudy>('/manage/case-studies', data)
    return response.data
  }

  async updateCaseStudy(slug: string, data: UpdateCaseStudyDto): Promise<AdminCaseStudy> {
    const response = await api.put<AdminCaseStudy>(`/manage/case-studies/${slug}`, data)
    return response.data
  }

  async deleteCaseStudy(slug: string): Promise<void> {
    await api.delete(`/manage/case-studies/${slug}`)
  }

  async seedCaseStudies(
    items: CreateCaseStudyDto[],
  ): Promise<{ message: string; inserted: number }> {
    const response = await api.post<{ message: string; inserted: number }>(
      '/manage/case-studies/seed',
      items,
    )
    return response.data
  }
}

export default new CaseStudyService()
