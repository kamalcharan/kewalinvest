import apiService from './api.service';

export interface DailyPanchang {
  calendar_date: string;
  tithi_name: string;
  tithi_end_ist: string;       // "HH:MM" or "HH:MM:SS" in IST
  tithi_next_name?: string;    // name of the tithi that follows today's
  nakshatra_name: string;
  nakshatra_end_ist: string;   // "HH:MM" or "HH:MM:SS" in IST
  nakshatra_next_name?: string;
}

export class PanchangService {
  static async getToday(): Promise<DailyPanchang> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const response = await apiService.get<{ success: boolean; data: DailyPanchang }>(
      `/api/panchang/daily?date=${today}`
    );
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch panchang data');
    }
    return response.data;
  }
}
