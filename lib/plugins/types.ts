import type MarkdownIt from 'markdown-it';

/**
 * Types derived from the markdown-it instance so the plugins do not depend on
 * which type-definition files a given @types/markdown-it version exposes.
 */
export type MD = InstanceType<typeof MarkdownIt>;
export type Token = ReturnType<MD['parse']>[number];
export type StateCore = Parameters<Parameters<MD['core']['ruler']['push']>[1]>[0];
export type StateBlock = Parameters<Parameters<MD['block']['ruler']['push']>[1]>[0];
export type StateInline = Parameters<Parameters<MD['inline']['ruler']['push']>[1]>[0];
