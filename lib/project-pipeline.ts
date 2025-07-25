import { supabase } from './supabase'
import type { PipelineProject, PipelineStage, PipelineMetrics, ProjectStageColumn } from './types/pipeline'

export async function fetchPipelineStages(): Promise<PipelineStage[]> {
  try {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching pipeline stages:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching pipeline stages:', error)
    return []
  }
}

export async function fetchPipelineProjects(): Promise<PipelineProject[]> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients (
          id,
          name,
          company,
          email,
          phone,
          avatar_url
        )
      `)
      .eq('status', 'pipeline')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pipeline projects:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching pipeline projects:', error)
    return []
  }
}

export async function updateProjectStage(projectId: string, newStage: string, probability?: number): Promise<boolean> {
  try {
    const updateData: any = { pipeline_stage: newStage }
    if (probability !== undefined) {
      updateData.deal_probability = probability
    }

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)

    if (error) {
      console.error('Error updating project stage:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating project stage:', error)
    return false
  }
}

export async function updatePipelineProject(projectId: string, projectData: Partial<PipelineProject>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .update(projectData)
      .eq('id', projectId)

    if (error) {
      console.error('Error updating pipeline project:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating pipeline project:', error)
    return false
  }
}

export async function convertProjectToActive(projectId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .update({ 
        status: 'active',
        pipeline_stage: null,
        deal_probability: null 
      })
      .eq('id', projectId)

    if (error) {
      console.error('Error converting project to active:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error converting project to active:', error)
    return false
  }
}

export async function deletePipelineProject(projectId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      console.error('Error deleting pipeline project:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting pipeline project:', error)
    return false
  }
}

export async function createPipelineProject(projectData: Partial<PipelineProject>): Promise<PipelineProject | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        ...projectData,
        status: 'pipeline',
        pipeline_stage: 'lead',
        deal_probability: 10
      }])
      .select(`
        *,
        clients (
          id,
          name,
          company,
          email,
          phone,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating pipeline project:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating pipeline project:', error)
    return null
  }
}

export function calculateProjectPipelineMetrics(projects: PipelineProject[], stages: PipelineStage[]): PipelineMetrics {
  const leadCount = projects.filter(p => p.pipeline_stage === 'lead').length
  const pitchedCount = projects.filter(p => p.pipeline_stage === 'pitched').length
  const discussionCount = projects.filter(p => p.pipeline_stage === 'in discussion').length
  
  // Calculate total potential value (budget)
  const totalValue = projects.reduce((sum, project) => {
    return sum + (project.budget || 0)
  }, 0)
  
  // Calculate weighted value (budget * probability)
  const weightedValue = projects.reduce((sum, project) => {
    const potential = project.budget || 0
    const probability = (project.deal_probability || 0) / 100
    return sum + (potential * probability)
  }, 0)
  
  // Revenue forecast (same as weighted value for now)
  const revenueForeccast = weightedValue
  
  // Conversion rate (placeholder - would need historical data)
  const conversionRate = 68 // Default placeholder
  
  // Win rate (placeholder - would need historical data)
  const winRate = 42 // Default placeholder

  return {
    totalValue,
    leadCount,
    pitchedCount,
    discussionCount,
    revenueForeccast,
    weightedValue,
    conversionRate,
    winRate
  }
}

export function groupProjectsByStage(projects: PipelineProject[], stages: PipelineStage[]): ProjectStageColumn[] {
  const stageMap = new Map(stages.map(stage => [stage.name.toLowerCase(), stage]))
  
  return stages.map(stage => ({
    id: stage.name.toLowerCase().replace(/\s+/g, '-'),
    title: stage.name,
    color: stage.color,
    defaultProbability: stage.default_probability,
    projects: projects.filter(project => 
      project.pipeline_stage?.toLowerCase() === stage.name.toLowerCase()
    )
  }))
} 