export type HeaderOperation = 'set' | 'remove' | 'append';
export type HeaderDirection = 'request' | 'response';
export type UrlMatchType = 'equals' | 'contains' | 'wildcard' | 'regex';

export interface HeaderAction {
  operation: HeaderOperation;
  header: string;
  value?: string;
  direction: HeaderDirection;
}

export interface Rule {
  id: string;
  enabled: boolean;
  urlPattern: string;
  urlMatchType?: UrlMatchType;
  methods?: string[];
  resourceTypes?: string[];
  headers: HeaderAction[];
}

export interface Profile {
  id: string;
  name: string;
  enabled: boolean;
  rules: Rule[];
}
