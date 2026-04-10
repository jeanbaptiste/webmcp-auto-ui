import type { AnthropicTool } from './types.js';
import type { SkillEntry } from './tool-layers.js';

/** Build the use_skill meta-tool from available skills */
export function buildSkillTool(skills: SkillEntry[]): AnthropicTool {
  return {
    name: 'use_skill',
    description: `Execute a predefined skill/workflow.\nAvailable skills:\n` +
      skills.map(s => `- ${s.name}: ${s.description}${s.expectedBlocks?.length ? ` (outputs: ${s.expectedBlocks.join(', ')})` : ''}`).join('\n'),
    input_schema: {
      type: 'object',
      properties: {
        skill: {
          type: 'string',
          enum: skills.map(s => s.name),
          description: 'Skill name to execute',
        },
        params: {
          type: 'object',
          description: 'Optional parameters for the skill',
        },
      },
      required: ['skill'],
    },
  };
}

/** Activate a skill by name (lookup + return metadata; does not execute) */
export function activateSkill(
  skillName: string,
  skills: SkillEntry[],
): string {
  const skill = skills.find(s => s.name === skillName);
  if (!skill) return JSON.stringify({ error: `Unknown skill: ${skillName}. Available: ${skills.map(s => s.name).join(', ')}` });

  // Notify the app that a skill was activated
  // The app can use the skill's mcpUrl/mcpName to connect to the right MCP server
  // and the expectedBlocks to know what to expect
  return JSON.stringify({
    activated: true,
    skill: skill.name,
    description: skill.description,
    mcpUrl: skill.mcpUrl,
    mcpName: skill.mcpName,
    expectedBlocks: skill.expectedBlocks,
    hint: `Skill "${skill.name}" activated. Use DATA tools to query and UI tools to render.`,
  });
}
