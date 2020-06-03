export interface DirectoryCurationApiObject {
  displayName: string;
  merchants: string[];
}

export interface DirectoryCategoryApiObject {
  displayName: string;
  emoji: string;
  tags: string[];
}

export interface CurationsObject {
  [curation: string]: DirectoryCurationApiObject;
}

export interface CategoriesObject {
  [category: string]: DirectoryCategoryApiObject;
}

export interface DirectoryRawData {
  curated: CurationsObject;
  categories: CategoriesObject;
}

export interface DirectoryCuration extends DirectoryCurationApiObject {
  index: number;
  name: string;
}

export interface DirectoryCategory extends DirectoryCategoryApiObject {
  index: number;
  name: string;
}

export interface Directory {
  curated: DirectoryCuration[];
  categories: DirectoryCategory[];
}

export interface DirectIntegrationApiObject {
  displayName: string;
  caption: string;
  cta?: {
    displayText: string;
    link: string;
  };
  icon: string;
  link: string;
  displayLink: string;
  tags: string[];
  domains: string[];
  discount?: {
    type: string;
    amount: number;
    currency?: string;
  };
  theme: string;
  instructions: string;
}

export interface DirectIntegration extends DirectIntegrationApiObject {
  name: string;
}

export interface DirectIntegrationMap {
  [name: string]: DirectIntegrationApiObject;
}

export const getDirectIntegrations = (
  res: DirectIntegrationMap
): DirectIntegration[] =>
  Object.keys(res).map(name => ({ ...res[name], name }));

export function fetchDirectIntegrations(): Promise<DirectIntegration[]> {
  return fetch(`${process.env.API_ORIGIN}/merchant-directory/integrations`)
    .then(res => res.json())
    .then((merchantMap: DirectIntegrationMap) =>
      getDirectIntegrations(merchantMap)
    );
}

export function convertToArray<T>(object: { [key: string]: T }): T[] {
  return Object.keys(object).map(key => ({ name: key, ...object[key] }));
}

export function convertObjectsToArrays(directory: DirectoryRawData): Directory {
  const categories = convertToArray(directory.categories);
  const curated = convertToArray(directory.curated);
  // .map(curation =>
  //   curation.displayName === 'Popular Brands'
  //     ? { ...curation, merchants: ['Amazon'] }
  //     : curation
  // );
  const newDirectory = { curated, categories } as Directory;
  return newDirectory;
}

export async function fetchDirectory(): Promise<Directory> {
  const directory = await fetch(
    `https://marty.bp:8088/merchant-directory/directory`
  ).then(res => res.json());
  const newDirectory: Directory = convertObjectsToArrays(directory);
  return newDirectory;
}
