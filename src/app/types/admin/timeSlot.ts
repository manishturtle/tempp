export interface TimeSlot {
    id: number;
    name: string;
    start_time: string;  // Format: "HH:MM"
    end_time: string;    // Format: "HH:MM"
    is_active: boolean;
    created_at: string;  // ISO 8601 format
    updated_at: string;  // ISO 8601 format
    created_by?: number;
    updated_by?: number;
  }
  
  export interface TimeSlotFormData {
    name: string;
    start_time: string;  // Format: "HH:MM"
    end_time: string;    // Format: "HH:MM"
    is_active: boolean;
  }
  
  export interface TimeSlotListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    counts: {
      active: number;
      inactive: number;
      total: number;
    };
    results: TimeSlot[];
  }
  
  // Default empty time slot
  export const EMPTY_TIME_SLOT: Omit<TimeSlot, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'> = {
    name: '',
    start_time: '09:00',
    end_time: '18:00',
    is_active: true
  };