// frontend/src/services/jobs.service.ts
// Generic service for all job types

import apiService from './api.service';
import { buildQueryParams } from './serviceURLs';
import {
  JobType,
  JobSchedulerConfig,
  JobStatistics,
  JobExecution,
  UpdateJobConfigRequest,
  CreateJobConfigRequest,
  GetJobConfigResponse,
  UpdateJobConfigResponse,
  TriggerJobResponse,
  GetExecutionsResponse,
  GetStatisticsResponse,
  GetJobTypesResponse
} from '../types/jobs.types';

const BASE_URL = '/api/jobs';

export class JobsService {
  /**
   * Get all available job types
   */
  static async getJobTypes(): Promise<GetJobTypesResponse> {
    try {
      const url = `${BASE_URL}/types`;
      return await apiService.get(url);
    } catch (error: any) {
      console.error('Error getting job types:', error);
      return {
        success: false,
        error: error.message || 'Failed to get job types'
      };
    }
  }

  /**
   * Get scheduler configuration for a job type
   */
  static async getConfig(
    jobType: JobType,
    environment: 'live' | 'test'
  ): Promise<GetJobConfigResponse> {
    try {
      const url = `${BASE_URL}/${jobType}/config${buildQueryParams({}, environment)}`;
      return await apiService.get(url);
    } catch (error: any) {
      console.error(`Error getting ${jobType} config:`, error);
      return {
        success: false,
        error: error.message || 'Failed to get configuration'
      };
    }
  }

  /**
   * Create scheduler configuration for a job type
   */
  static async createConfig(
    jobType: JobType,
    environment: 'live' | 'test',
    config: CreateJobConfigRequest
  ): Promise<UpdateJobConfigResponse> {
    try {
      const url = `${BASE_URL}/${jobType}/config${buildQueryParams({}, environment)}`;
      return await apiService.post(url, config);
    } catch (error: any) {
      console.error(`Error creating ${jobType} config:`, error);
      return {
        success: false,
        error: error.message || 'Failed to create configuration'
      };
    }
  }

  /**
   * Update scheduler configuration for a job type
   */
  static async updateConfig(
    jobType: JobType,
    environment: 'live' | 'test',
    updates: UpdateJobConfigRequest
  ): Promise<UpdateJobConfigResponse> {
    try {
      const url = `${BASE_URL}/${jobType}/config${buildQueryParams({}, environment)}`;
      return await apiService.put(url, updates);
    } catch (error: any) {
      console.error(`Error updating ${jobType} config:`, error);
      return {
        success: false,
        error: error.message || 'Failed to update configuration'
      };
    }
  }

  /**
   * Manually trigger job execution
   */
  static async triggerManual(
    jobType: JobType,
    environment: 'live' | 'test'
  ): Promise<TriggerJobResponse> {
    try {
      const url = `${BASE_URL}/${jobType}/execute${buildQueryParams({}, environment)}`;
      return await apiService.post(url, {});
    } catch (error: any) {
      console.error(`Error triggering ${jobType}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to trigger job execution'
      };
    }
  }

  /**
   * Get execution history for a job type
   */
  static async getExecutions(
    jobType: JobType,
    environment: 'live' | 'test',
    page: number = 1,
    pageSize: number = 20
  ): Promise<GetExecutionsResponse> {
    try {
      const url = `${BASE_URL}/${jobType}/executions${buildQueryParams({ page, page_size: pageSize }, environment)}`;
      return await apiService.get(url);
    } catch (error: any) {
      console.error(`Error getting ${jobType} executions:`, error);
      return {
        success: false,
        error: error.message || 'Failed to get execution history'
      };
    }
  }

  /**
   * Get statistics for a job type
   */
  static async getStatistics(
    jobType: JobType,
    environment: 'live' | 'test'
  ): Promise<GetStatisticsResponse> {
    try {
      const url = `${BASE_URL}/${jobType}/statistics${buildQueryParams({}, environment)}`;
      return await apiService.get(url);
    } catch (error: any) {
      console.error(`Error getting ${jobType} statistics:`, error);
      return {
        success: false,
        error: error.message || 'Failed to get statistics'
      };
    }
  }

  /**
   * Health check for a job type
   */
  static async healthCheck(
    jobType: JobType,
    environment: 'live' | 'test'
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const url = `${BASE_URL}/${jobType}/health${buildQueryParams({}, environment)}`;
      return await apiService.get(url);
    } catch (error: any) {
      console.error(`Error checking ${jobType} health:`, error);
      return {
        success: false,
        error: error.message || 'Health check failed'
      };
    }
  }
}

export default JobsService;
