import { Location, LocationType, Asset, StockLevel, CatalogItem } from '../types/inventory';
import React from 'react';
import {
  Building2,
  DoorOpen,
  Archive,
  Layers,
  Inbox,
  Package,
  Table as TableIcon,
  FolderMinus,
  Cpu,
  MapPin,
  HelpCircle,
} from 'lucide-react';

export interface LocationTypeMeta {
  id: LocationType;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  isContainer?: boolean;
}

export const LOCATION_TYPES: LocationTypeMeta[] = [
  {
    id: 'ROOM',
    label: 'Room / Area',
    icon: DoorOpen,
    color: '#0071e3',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Laboratory rooms, open work areas, partitioned spaces',
  },
  {
    id: 'ALMIRAH',
    label: 'Almirah / Wardrobe',
    icon: Archive,
    color: '#0b3b60',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    description: 'Steel almirahs, tall storage units, locked storage cabinets',
  },
  {
    id: 'RACK',
    label: 'Rack / Stand',
    icon: Layers,
    color: '#5856d6',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    description: 'Equipment stands, shelving racks, open vertical stands',
  },
  {
    id: 'SHELF',
    label: 'Shelf / Tier',
    icon: FolderMinus,
    color: '#34c759',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Individual shelves within an almirah, rack, or wall unit',
  },
  {
    id: 'DRAWER',
    label: 'Drawer / Bin Unit',
    icon: Inbox,
    color: '#af52de',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Pull-out drawers, workbench organizers, modular bins',
    isContainer: true,
  },
  {
    id: 'BOX',
    label: 'Box / Container',
    icon: Package,
    color: '#ff9500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Hardware boxes, tool cases, component bins, trays',
    isContainer: true,
  },
  {
    id: 'TABLE',
    label: 'Table / Desk',
    icon: TableIcon,
    color: '#8e8e93',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-200',
    description: 'Lab tables, student workbenches, testing desks',
  },
  {
    id: 'WORKBENCH',
    label: 'Workbench / Station',
    icon: Cpu,
    color: '#ff2d55',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    description: 'Soldering bench, 3D printing station, calibration desk',
  },
  {
    id: 'CABINET',
    label: 'Cabinet / Cupboard',
    icon: Building2,
    color: '#30b0c7',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    description: 'Chemical cabinets, low storage cupboards, under-bench cabinets',
  },
  {
    id: 'SPOT',
    label: 'Designated Spot',
    icon: MapPin,
    color: '#ff3b30',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Floor spot, open staging area, designated testing bay',
  },
  {
    id: 'CUSTOM',
    label: 'Custom Storage Spot',
    icon: HelpCircle,
    color: '#64748b',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    description: 'Any irregular, temporary, or specialized lab spot',
  },
];

export function getLocationTypeMeta(type?: LocationType): LocationTypeMeta {
  const found = LOCATION_TYPES.find((t) => t.id === type);
  return found || LOCATION_TYPES[0];
}

/**
 * Infer a plausible location type from a name if none is explicitly set
 */
export function inferLocationType(name: string, explicitType?: LocationType): LocationType {
  if (explicitType) return explicitType;
  const n = name.toLowerCase();
  if (/almirah|almira|wardrobe/i.test(n)) return 'ALMIRAH';
  if (/rack|stand|tower/i.test(n)) return 'RACK';
  if (/shelf|tier|plank|level/i.test(n)) return 'SHELF';
  if (/drawer|tray/i.test(n)) return 'DRAWER';
  if (/box|bin|kit|case|container|tote/i.test(n)) return 'BOX';
  if (/workbench|station|soldering|printing station/i.test(n)) return 'WORKBENCH';
  if (/table|desk|bench/i.test(n)) return 'TABLE';
  if (/cabinet|cupboard|locker/i.test(n)) return 'CABINET';
  if (/room|lab|hall|area|bay|wing|block/i.test(n)) return 'ROOM';
  if (/spot|bay|corner|staging/i.test(n)) return 'SPOT';
  return 'CUSTOM';
}

/**
 * Build a quick lookup map of locations by ID and code
 */
export function buildLocationMap(locations: Location[]): Map<string, Location> {
  const map = new Map<string, Location>();
  locations.forEach((loc) => {
    map.set(loc.id, loc);
    if (loc.code) {
      map.set(loc.code, loc);
      map.set(loc.code.toLowerCase(), loc);
    }
  });
  return map;
}

/**
 * Returns parent ancestors from root down to direct parent
 */
export function getLocationAncestors(locationId: string, locations: Location[] | Map<string, Location>): Location[] {
  const map = locations instanceof Map ? locations : buildLocationMap(locations);
  const ancestors: Location[] = [];
  const visited = new Set<string>();

  let current = map.get(locationId);
  visited.add(locationId);

  while (current?.parent_id && !visited.has(current.parent_id)) {
    visited.add(current.parent_id);
    const parent = map.get(current.parent_id);
    if (parent) {
      ancestors.unshift(parent);
      current = parent;
    } else {
      break;
    }
  }

  return ancestors;
}

/**
 * Returns full breadcrumb array including target location: [Root, ...Intermediates, Target]
 */
export function getLocationBreadcrumbs(
  locationId: string | undefined | null,
  locations: Location[] | Map<string, Location>
): Location[] {
  if (!locationId) return [];
  const map = locations instanceof Map ? locations : buildLocationMap(locations);
  const target = map.get(locationId);
  if (!target) return [];

  const ancestors = getLocationAncestors(locationId, map);
  return [...ancestors, target];
}

/**
 * Computes human-readable full path string:
 * "Main Laboratory › Electronics Room › Almirah A › Shelf 2 › Box B04"
 */
export function getLocationFullPathString(
  location: Location | string | undefined | null,
  locations: Location[],
  separator: string = ' › '
): string {
  if (!location) return '';
  const locObj = typeof location === 'string' ? locations.find((l) => l.id === location || l.code === location) : location;
  if (!locObj) {
    return typeof location === 'string' ? location : '';
  }

  const map = buildLocationMap(locations);
  const breadcrumbs = getLocationBreadcrumbs(locObj.id, map);
  if (breadcrumbs.length > 0) {
    return breadcrumbs.map((b) => b.name).join(separator);
  }

  // Fallback to existing storage_path if parent links were not populated
  if (locObj.storage_path) {
    return locObj.storage_path.replace(/>|\//g, separator);
  }

  return locObj.name;
}

/**
 * Get direct child locations of a given parent ID
 */
export function getChildLocations(parentId: string | null | undefined, locations: Location[]): Location[] {
  if (!parentId) {
    return locations.filter((l) => !l.parent_id);
  }
  return locations.filter((l) => l.parent_id === parentId);
}

/**
 * Get all descendant location IDs recursively
 */
export function getDescendantLocationIds(locationId: string, locations: Location[]): Set<string> {
  const descendants = new Set<string>();
  const queue = [locationId];

  while (queue.length > 0) {
    const parent = queue.shift()!;
    const children = locations.filter((l) => l.parent_id === parent);
    for (const child of children) {
      if (!descendants.has(child.id)) {
        descendants.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return descendants;
}

/**
 * Location Tree Node for the hierarchical explorer
 */
export interface LocationTreeNode {
  location: Location;
  children: LocationTreeNode[];
  depth: number;
  directAssetCount: number;
  directItemCount: number;
  totalAssetCount: number;
  totalItemCount: number;
}

/**
 * Builds a hierarchical tree of locations with child nodes and item counts
 */
export function buildLocationTree(
  locations: Location[],
  assets: Asset[] = [],
  stockLevels: StockLevel[] = []
): LocationTreeNode[] {
  // Precompute asset counts per location ID
  const assetCountMap = new Map<string, number>();
  assets.forEach((a) => {
    if (a.status !== 'ISSUED' && a.location_id) {
      assetCountMap.set(a.location_id, (assetCountMap.get(a.location_id) || 0) + 1);
    }
  });

  // Precompute stock quantities per location ID
  const stockCountMap = new Map<string, number>();
  stockLevels.forEach((s) => {
    if (s.location_id && s.quantity > 0) {
      stockCountMap.set(s.location_id, (stockCountMap.get(s.location_id) || 0) + s.quantity);
    }
  });

  // Group children by parent_id
  const childrenMap = new Map<string, Location[]>();
  const rootLocations: Location[] = [];

  locations.forEach((loc) => {
    if (!loc.parent_id || !locations.some((l) => l.id === loc.parent_id)) {
      rootLocations.push(loc);
    } else {
      const list = childrenMap.get(loc.parent_id) || [];
      list.push(loc);
      childrenMap.set(loc.parent_id, list);
    }
  });

  function buildNode(loc: Location, depth: number): LocationTreeNode {
    const children = (childrenMap.get(loc.id) || []).map((child) => buildNode(child, depth + 1));
    const directAssets = assetCountMap.get(loc.id) || 0;
    const directItems = stockCountMap.get(loc.id) || 0;

    const totalAssets = directAssets + children.reduce((sum, c) => sum + c.totalAssetCount, 0);
    const totalItems = directItems + children.reduce((sum, c) => sum + c.totalItemCount, 0);

    return {
      location: loc,
      children,
      depth,
      directAssetCount: directAssets,
      directItemCount: directItems,
      totalAssetCount: totalAssets,
      totalItemCount: totalItems,
    };
  }

  return rootLocations.map((root) => buildNode(root, 0));
}

/**
 * Get contents stored directly in this location (assets and stock levels)
 */
export function getLocationContents(
  locationId: string,
  locations: Location[],
  assets: Asset[],
  stockLevels: StockLevel[],
  catalogItems: CatalogItem[]
) {
  const catalogMap = new Map<string, CatalogItem>();
  catalogItems.forEach((c) => {
    catalogMap.set(c.id, c);
    if (c.item_code) catalogMap.set(c.item_code, c);
  });

  // Direct assets
  const directAssets = assets.filter((a) => a.status !== 'ISSUED' && a.location_id === locationId);

  // Direct stock
  const directStock = stockLevels.filter((s) => s.location_id === locationId && s.quantity > 0);

  // Child locations
  const childLocations = locations.filter((l) => l.parent_id === locationId);

  // Total quantity of consumables in direct stock
  const consumableQty = directStock.reduce((sum, s) => sum + (s.quantity || 0), 0);

  return {
    directAssets,
    directStock,
    childLocations,
    consumableQty,
    catalogMap,
  };
}
