import { ItemOutput } from "../../document-item/output/item-out";
import { DocumentOutput } from "./document-out";

export interface DocumentDetailOutput {
  doc: DocumentOutput;
  items: ItemOutput[];
}