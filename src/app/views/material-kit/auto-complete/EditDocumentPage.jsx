// src/app/views/document/EditDocumentPage.jsx

import { useParams } from "react-router-dom";
import AjouterDocumentForm from "./AppAutoComplete";

export default function EditDocumentPage() {
  const { id } = useParams();
  return <AjouterDocumentForm documentId={id} />;
}
