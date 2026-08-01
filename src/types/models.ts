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
  | "FCL"
  | "LCL"
  | "bulk"
  | "reefer"
  | "breakbulk";

export interface Truck {
  truck_id?: number;

  registration_number: string;

  year_of_manufacture: number;

  capacity_tonnes: number;

  trailer_registration?: string;

  status: TruckStatus;
}

export interface TruckComplianceRecord {
  compliance_id?: number;

  truck_id: number;

  compliance_type: ComplianceType;

  issued_date: string;

  expiry_date: string;

  document_ref?: string;
}

export interface TruckFormValues {
  registration_number: string;

  year_of_manufacture: number;

  capacity_tonnes: number;

  trailer_registration?: string;

  insurance_issued: string;
  insurance_expiry: string;
  insurance_ref?: string;

  inspection_issued: string;
  inspection_expiry: string;

  speed_governor_issued: string;
  speed_governor_expiry: string;
}

export interface Driver {
  driver_id?: number;

  full_name: string;

  id_number: string;

  truck_id?: number | null;

  date_of_joining: string;

  status: DriverStatus;
}

export interface Location {
  locationId: number;

  name: string;

  latitude: number;

  longitude: number;

  type: string;
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

  special_instructions?: string;
}