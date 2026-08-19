export interface Snippet {
  id: string;
  text: string;
  tags: string[];
}

export interface SnippetLibrary {
  snippets: Snippet[];
}

export function emptySnippetLibrary(): SnippetLibrary {
  return { snippets: [] };
}
