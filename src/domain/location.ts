import type { Container, Item, Traveller, UUID } from './types';

export const UNASSIGNED_LABEL = 'Unassigned';

export interface LocationContext {
  containers: readonly Container[];
  travellers: readonly Traveller[];
}

/**
 * The answer to "where's my charger?" — an outermost-first breadcrumb, e.g.
 * ['Marta', 'Big black Samsonite', 'Blue cube'].
 * An unassigned item is ['Unassigned'] (§4.2).
 */
export function resolveLocation(item: Pick<Item, 'containerId'>, ctx: LocationContext): string[] {
  if (!item.containerId) return [UNASSIGNED_LABEL];

  const container = ctx.containers.find((c) => c.id === item.containerId);
  if (!container) return [UNASSIGNED_LABEL];

  // Nesting is capped at one level, so the chain is at most parent → child.
  const chain: Container[] = [container];
  if (container.parentContainerId) {
    const parent = ctx.containers.find((c) => c.id === container.parentContainerId);
    if (parent) chain.unshift(parent);
  }

  const traveller = ctx.travellers.find((t) => t.id === container.travellerId);
  const crumbs = chain.map((c) => c.label);
  return traveller ? [traveller.name, ...crumbs] : crumbs;
}

/** Single-line form for list rows and the search result summary. */
export function formatLocation(crumbs: readonly string[], separator = ' › '): string {
  return crumbs.join(separator);
}

/** Every container belonging to a traveller, parents before their children. */
export function containersForTraveller(
  containers: readonly Container[],
  travellerId: UUID,
): Container[] {
  const mine = containers.filter((c) => c.travellerId === travellerId);
  const tops = mine.filter((c) => !c.parentContainerId);
  return tops.flatMap((top) => [top, ...mine.filter((c) => c.parentContainerId === top.id)]);
}
