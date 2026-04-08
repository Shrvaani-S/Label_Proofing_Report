import type { Requirement } from '../types';
import type { ExpectedChangesData, ExpectedChangesTabData } from '../components/ExpectedChanges';

export function requirementsToExpectedChanges(requirements: Requirement[]): ExpectedChangesData {
  const byType: Record<string, Requirement[]> = { Text: [], Symbol: [], Image: [] };
  for (const req of requirements) {
    if (req.elementType in byType) byType[req.elementType].push(req);
  }

  function toTabData(reqs: Requirement[]): ExpectedChangesTabData | undefined {
    if (!reqs.length) return undefined;
    return {
      expected: [{
        category: 'Requirements',
        items: reqs.map(r => ({ attribute: r.elementType, changeType: r.changeType, value: r.expectedValue })),
      }],
      actual: [{
        category: 'Requirements',
        items: reqs.map(r => ({ attribute: r.elementType, changeType: r.changeType, value: r.actualValue || '— NOT FOUND —' })),
      }],
    };
  }

  return {
    text:    toTabData(byType.Text),
    symbols: toTabData(byType.Symbol),
    images:  toTabData(byType.Image),
  };
}
