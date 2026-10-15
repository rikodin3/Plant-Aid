export interface User {
  id: number;
  user_name: string;
  email_address: string;
  phone_number?: string | null;
  role?: 'user' | 'admin' | string;
  is_2fa_enabled?: boolean;
  account_status?: string;
  last_login_at?: string | null;
  created_at?: string | null;
  session_id?: string | null;
  otp_code_dev?: string | null;
}

export type RegisterResponse = User;

export interface TwoFactorChallengeResponse {
  session_id: string;
  expires_in: number;
  message: string;
  otp_code_dev?: string | null;
}

export interface TokenResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
  user_id: number;
  user_name: string;
  email_address: string;
  role?: string;
}

export interface MessageResponse {
  message: string;
}

export interface UpdateProfilePayload {
  user_name?: string;
  phone_number?: string | null;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  confidence?: number;
}

export interface Remedy {
  id: number;
  disease_id: string;
  category: 'Organic' | 'Chemical' | 'Preventive' | string;
  title: string;
  description: string;
  application_instructions?: string | null;
  remedy_type?: string;
  treatment_name?: string;
  dosage?: string | null;
}

export interface InferenceResponse {
  disease_id: number | string;
  disease_name: string;
  plant_species: string;
  scientific_name?: string | null;
  confidence: number;
  confidence_score: number;
  bounding_box?: BoundingBox | null;
  bounding_boxes?: BoundingBox[] | null;
  cam_heatmap_b64?: string | null;
  frame_id: string;
  is_healthy_or_uncertain: boolean;
  s3_storage_uri?: string | null;
  remedies?: Remedy[];
  diagnosis_timestamp?: string;
}

export interface HistoryLog {
  id: number;
  user_id: number;
  disease_id: string;
  disease_name: string;
  confidence_score: number;
  s3_storage_uri?: string | null;
  media_url?: string | null;
  bounding_box_json?: string | null;
  diagnosis_timestamp: string;
  deleted_at?: string | null;
}

export interface PaginatedHistoryResponse {
  items: HistoryLog[];
  total: number;
  total_count: number;
  page: number;
  limit: number;
  size: number;
  total_pages: number;
  pages: number;
}

export interface CreateHistoryPayload {
  disease_id: string;
  disease_name?: string;
  confidence_score: number;
  s3_storage_uri?: string | null;
  image_b64?: string | null;
  bounding_box?: BoundingBox | null;
}

export interface DiseaseInfo {
  id: string;
  numeric_id: number;
  disease_name: string;
  scientific_name?: string | null;
  category: string;
  description: string;
  symptoms?: string[];
  remedies?: Remedy[];
}

export interface AdminUserItem extends User {
  history_count: number;
}

export interface AdminPaginatedUsersResponse {
  items: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AdminHistoryItem extends HistoryLog {
  user_name: string;
  email_address: string;
}

export interface AdminPaginatedHistoryResponse {
  items: AdminHistoryItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface RemedyMutationPayload {
  disease_id: string;
  remedy_type: string;
  title: string;
  description: string;
  application_instructions?: string;
  category: string;
}

