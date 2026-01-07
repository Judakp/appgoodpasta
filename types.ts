
export type Department = 
  | 'Digital & IT Services'
  | 'Production'
  | 'Logistics'
  | 'Facilities'
  | 'Marketing & E-commerce'
  | 'Admin/Corporate';

export interface DetailedInfo {
  title: string;
  details: string;
  contact: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  detailedInfo?: DetailedInfo;
}

export interface UserProfile {
  name: string;
  department: Department;
  language: 'FR' | 'EN';
}
