// Build-time schema composition only; this exports no repository or service.
import { identities } from '../modules/identity/infrastructure/persistence/schema.js';
import { defineLearningSessionTable } from '../modules/learning/infrastructure/persistence/schema.js';

export const learningSessions = defineLearningSessionTable(identities.id);
