export type WikiContentType = "html" | "richtext";
export type WikiRole = "viewer" | "editor";

export interface WikiCategory {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface WikiPage {
  id: string;
  org_id: string;
  title: string;
  slug: string;
  content: string | null;
  content_type: WikiContentType;
  category_id: string | null;
  category?: WikiCategory | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WikiPageWithCategory extends WikiPage {
  wiki_categories: WikiCategory | null;
}
