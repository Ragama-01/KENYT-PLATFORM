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

  status: TruckStatus;

  trailer?: Trailer | null;
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

  inspection_issued: string;
  inspection_expiry: string;

  speed_governor_issued: string;
  speed_governor_expiry: string;

  truck_insurance_issued: string;
  truck_insurance_expiry: string;
  truck_insurance_ref?: string;

  truck_comesa_policy_number: string;
  truck_comesa_insurer: string;
  truck_comesa_date_taken: string;
  truck_comesa_date_expiry: string;
  truck_comesa_premium_amount: number;

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

export interface OrderFormValues {

  bol_number: string;

  customer_name: string;

  load_type: LoadType;

  cargo_type: string;

  weight_tonnes: number;

  container_number?: string;

  container_type?: string;

  pickup_location_id: number;

  delivery_location_id: number;

  consignee_name: string;

  consignee_phone?: string;

  free_storage_days: number;

  eta_discharge_date?: string;

  documentation_status?: string;

  special_instructions?: string;
}