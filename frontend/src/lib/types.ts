export type Plan = 'free' | 'pro' | 'team'

export type Profile = {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  plan: Plan
}

export type InputMethod = 'share_link' | 'file_upload' | 'raw_text' | 'manual_description'

export type GeneratedPrompt = {
  id: string
  model_name: 'ChatGPT' | 'Claude' | 'Gemini' | 'DeepSeek' | 'Grok'
  prompt_text: string
  created_at: string
}

export type Thread = {
  id: string
  title: string
  goal: string
  context: string
  key_decisions: string[]
  last_point: string
  next_step: string
  tags: string[]
  raw_input: string
  input_method: InputMethod
  created_at: string
  updated_at: string
  prompts: GeneratedPrompt[]
}

export type ManualThreadInput = {
  working_on: string
  decisions_made: string
  last_message: string
  continue_goal: string
}
