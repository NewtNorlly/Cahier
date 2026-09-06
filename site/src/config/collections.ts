export type CollectionKind = 'creator' | 'series' | 'library';

export interface CollectionConfig {
  kind: CollectionKind;
  description?: string;
}

const collectionOverrides: Record<string, CollectionConfig> = {
  文献笔记: {
    kind: 'library',
    description: '文献阅读笔记与书摘归档。',
  },
};

const defaultCollection: CollectionConfig = { kind: 'series' };

export function getCollectionConfig(name: string): CollectionConfig {
  return collectionOverrides[name] ?? defaultCollection;
}
