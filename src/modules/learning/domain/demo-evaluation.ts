// Pure Learning engine. Structural inputs are supplied through the Content owner
// boundary; the Learning domain neither imports Content nor accesses storage/HTTP.
export interface EvaluationPack {
  readonly blocks: readonly {
    readonly id: string;
    readonly kind: 'SINGLE_CHOICE';
    readonly options: readonly string[];
    readonly expectedOptionIndex: number;
    readonly feedback: readonly string[];
  }[];
}

export interface Evaluation {
  readonly engineVersion: '1.0.0';
  readonly blockId: string;
  readonly selectedOptionIndex: number;
  readonly matchesExpectedChoice: boolean;
  readonly feedback: string;
}

/** Engine 1.0.0 has no randomness, clock, mutable state or external dependency. */
export function evaluateResponse(pack: EvaluationPack, blockId: string, selectedOptionIndex: number, seed: number): Evaluation {
  if (seed !== 0) throw new RangeError('Engine 1.0.0 requires fixed seed 0');
  if (!pack || !Array.isArray(pack.blocks) || pack.blocks.length !== 3) throw new TypeError('A validated three-block pack is required');
  if (new Set(pack.blocks.map(block => block.id)).size !== 3) throw new TypeError('Block identities must be unique');
  const block = pack.blocks.find(candidate => candidate.id === blockId);
  if (!block) throw new RangeError('Block does not belong to this exact content version');
  if (block.kind !== 'SINGLE_CHOICE' || !Array.isArray(block.options) || block.options.length < 2 || block.options.length > 5
    || !Number.isInteger(block.expectedOptionIndex) || block.expectedOptionIndex < 0 || block.expectedOptionIndex >= block.options.length
    || !Array.isArray(block.feedback) || block.feedback.length !== block.options.length) throw new TypeError('Invalid authored block');
  if (!Number.isInteger(selectedOptionIndex) || selectedOptionIndex < 0 || selectedOptionIndex >= block.options.length) {
    throw new RangeError('Selected option index is outside the authored range');
  }
  const feedback = block.feedback[selectedOptionIndex];
  if (typeof feedback !== 'string' || feedback.length === 0) throw new TypeError('Authored feedback is missing');
  return Object.freeze({
    engineVersion: '1.0.0', blockId, selectedOptionIndex,
    matchesExpectedChoice: selectedOptionIndex === block.expectedOptionIndex, feedback,
  });
}
