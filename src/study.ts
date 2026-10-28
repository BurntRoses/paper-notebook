export type GenerationEnvironment = 'conversation' | 'workspace';
export type GenerationPrompts = Record<GenerationEnvironment, string>;

/** Keep the selected entry prompt and the user's answers together. Workflow lives in the kit. */
export function generationPrompt(brief: object, prompts: GenerationPrompts, environment: GenerationEnvironment = 'conversation') {
  return prompts[environment].trim() + '\n\n已填写的学习偏好（保留已有答案，只补问缺项）：\n' + JSON.stringify(brief, null, 2);
}
