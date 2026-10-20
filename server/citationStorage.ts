export function citationSourceColumns(documentId:string, knowledgeSourceExists:boolean, assignedKmsDocumentExists:boolean){
  if(assignedKmsDocumentExists)return{sourceId:null as string|null,kmsDocumentId:documentId};
  if(knowledgeSourceExists)return{sourceId:documentId,kmsDocumentId:null as string|null};
  throw new Error('Citation source is not available in this workspace');
}
