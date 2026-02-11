import { DocumentOutput } from "./document-out";

export interface PaginatedDocumentOutputResult {
  items: DocumentOutput[];
  total: number;
  page: number;
  limit: number;
}