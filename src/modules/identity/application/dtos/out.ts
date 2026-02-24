export type DniData = {
  name: string;
  lastName: string;
};

export type RucData = {
  tradeName: string;
  address: string;
};

export interface IdentityLookupResult<TData> {
  documentType: string;
  documentNumber: string;
  data: TData;
}
export type DecolectaResponse = {
  message?: {
    nombres?: string;
    apellido_paterno?: string;
    apellido_materno?: string;
    nombre_completo?: string;
    direccion?: string;
    ubigeo?: string;
  };
};