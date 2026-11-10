// src/types/models.ts

export type TruckStatus =
  | "available"
  | "assigned"
  | "in_transit"
  | "maintenance";

export type DriverStatus =
  | "active"
  | "on_leave"
  | "exited";

export type ComplianceType =
  | "insurance"
  | "inspection"
  | "speed_governor";

export type LoadType =
  | "20/40 dry"
  | "20/40 open top-special"
  | "20/40 Reefer -special"
  | "20/40 open reel-special";

export interface Trailer {
  trailer_id?: number;
  truck_id: number;
  registration_number?: string;
  logbook_number?: string;

  insurance_issued?: string;
  insurance_expiry?: string;
  insurance_ref?: string;

  comesa_policy_number?: string;
  comesa_insurer?: string;
  comesa_date_taken?: string;
  comesa_date_expiry?: string;
  comesa_premium_amount?: number;
}

export interface Truck {
  truck_id?: number;

  registration_number: string;

  year_of_manufacture: number;

  capacity_tonnes: number;

  controlTechUnitId?: number;

  logbook_number?: string;

  // Truck insurance
  truck_insurance_issued?: string;
  truck_insurance_expiry?: string;
  truck_insurance_ref?: string;
  truck_insurance_serial?: string;
  truck_insurance_purchase?: string;

  // TGL
  tgl_number?: string;
  tgl_year?: string;

  // Inspection
  inspection_issued?: string;
  inspection_expiry?: string;
  inspection_cert_number?: string;

  // Speed governor
  speed_governor_issued?: string;
  speed_governor_expiry?: string;

  // COMESA
  truck_comesa_policy_number?: string;
  truck_comesa_insurer?: string;
  truck_comesa_date_taken?: string;
  truck_comesa_date_expiry?: string;
  truck_comesa_premium_amount?: number;

  // Notes
  factors_to_note?: string;

  status: TruckStatus;

  trailer?: Trailer | null;

  // History
  insuranceHistory?: TruckInsuranceHistory[];
  tglHistory?: TruckTGLHistory[];
  inspectionHistory?: TruckInspectionHistory[];
}

export interface TruckInsuranceHistory {
  id: number;
  truck_id: number;
  policyNumber?: string;
  serialNumber?: string;
  insurer?: string;
  issuedDate: string;
  expiryDate: string;
  purchaseDate?: string;
  premiumAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface TruckTGLHistory {
  id: number;
  truck_id: number;
  tglNumber?: string;
  tglYear?: string;
  issuedDate?: string;
  expiryDate?: string;
  notes?: string;
  createdAt: string;
}

export interface TruckInspectionHistory {
  id: number;
  truck_id: number;
  certNumber?: string;
  inspectionBody?: string;
  issuedDate: string;
  expiryDate: string;
  notes?: string;
  createdAt: string;
}

export interface TrailerInsuranceHistory {
  id: number;
  trailer_id: number;
  policyNumber?: string;
  insurer?: string;
  issuedDate: string;
  expiryDate: string;
  premiumAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface TrailerCOMESAHistory {
  id: number;
  trailer_id: number;
  policyNumber?: string;
  insurer?: string;
  dateTaken?: string;
  dateExpiry?: string;
  premiumAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface TruckComplianceRecord {
  compliance_id?: number;

  truck_id: number;

  compliance_type: ComplianceType;

  issued_date: string;

  expiry_date: string;

  document_ref?: string;
}

export interface TrailerFormValues {
  registration_number?: string;
  logbook_number?: string;

  insurance_issued?: string;
  insurance_expiry?: string;
  insurance_ref?: string;

  comesa_policy_number?: string;
  comesa_insurer?: string;
  comesa_date_taken?: string;
  comesa_date_expiry?: string;
  comesa_premium_amount?: number;
}

export interface TruckFormValues {
  registration_number: string;

  year_of_manufacture: number;

  capacity_tonnes: number;

  controlTechUnitId?: number;

  logbook_number?: string;

  // Truck insurance
  truck_insurance_issued: string;
  truck_insurance_expiry: string;
  truck_insurance_ref?: string;
  truck_insurance_serial?: string;
  truck_insurance_purchase?: string;

  // TGL
  tgl_number?: string;
  tgl_year?: string;

  // Inspection
  inspection_issued: string;
  inspection_expiry: string;
  inspection_cert_number?: string;

  // Speed governor
  speed_governor_issued: string;
  speed_governor_expiry: string;

  // COMESA
  truck_comesa_policy_number: string;
  truck_comesa_insurer: string;
  truck_comesa_date_taken: string;
  truck_comesa_date_expiry: string;
  truck_comesa_premium_amount: number;

  // Notes
  factors_to_note?: string;

  trailer?: TrailerFormValues;
}

export interface Driver {
  id?: number;

  driver_id?: number;

  full_name: string;

  id_number: string;

  truck_id?: number | null;

  date_of_joining: string;

  kra_pin: string;

  kpa_id?: string;

  phone_number: string;

  email: string;

  nssf_number: string;

  shif_number: string;

  status: DriverStatus;
}

export interface Location {
  locationId: number;

  name: string;

  latitude: number;

  longitude: number;

  type: string;
}

export interface Customer {
  customerId: number;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerFormValues {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface OrderContainerInput {
  container_number?: string;
  container_type?: string;
  weight_tonnes: number;
  cargo_type: string;
}

export interface OrderFormValues {

  bol_number?: string;

  customer_name: string;

  load_type: LoadType;

  containers: OrderContainerInput[];

  pickup_location_id: number;

  delivery_location_id: number;

  empty_drop_off?: string;

  consignee_name: string;

  consignee_phone?: string;

  eta_discharge_date?: string;

  documentation_status?: string;

  gf_do_type?: string;
  gf_do_document?: string;
  gf_do_document_name?: string;

  im4_im7_type?: string;
  im4_im7_document?: string;
  im4_im7_document_name?: string;

  special_instructions?: string;
}