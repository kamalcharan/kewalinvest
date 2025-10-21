// backend/src/scripts/calculateInitialMetrics.ts
// One-time bulk calculation script for all schemes
// Run this ONCE after migration to calculate metrics for all historical data
// Usage: ts-node backend/src/scripts/calculateInitialMetrics.ts

import { pool } from '../src/config/database';
import { schemeMetricsCalculator } from '../src/services/schemeMetricsCalculator.service';
import { SimpleLogger } from '../src/services/simpleLogger.service';

interface ScriptConfig {
  isLive: boolean;
  batchSize: number;
  delayMs: number;
  skipAlreadyCalculated: boolean;
  prioritizeBookmarked: boolean;
  testMode: boolean;
  maxSchemes?: number; // For testing: limit number of schemes
}

interface ScriptResult {
  totalSchemes: number;
  bookmarkedCount: number;
  nonBookmarkedCount: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{
    schemeId: number;
    schemeCode: string;
    error: string;
  }>;
  executionTimeMs: number;
}

class InitialMetricsCalculationScript {
  private config: ScriptConfig;
  private result: ScriptResult;
  private startTime: number;

  constructor(config: Partial<ScriptConfig> = {}) {
    this.config = {
      isLive: config.isLive !== undefined ? config.isLive : true,
      batchSize: config.batchSize || 100,
      delayMs: config.delayMs || 5000,
      skipAlreadyCalculated: config.skipAlreadyCalculated !== undefined ? config.skipAlreadyCalculated : true,
      prioritizeBookmarked: config.prioritizeBookmarked !== undefined ? config.prioritizeBookmarked : true,
      testMode: config.testMode || false,
      maxSchemes: config.maxSchemes
    };

    this.result = {
      totalSchemes: 0,
      bookmarkedCount: 0,
      nonBookmarkedCount: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      executionTimeMs: 0
    };

    this.startTime = Date.now();
  }

  /**
   * Main execution method
   */
  async execute(): Promise<void> {
    try {
      console.log('\n========================================');
      console.log('📊 INITIAL METRICS CALCULATION SCRIPT');
      console.log('========================================\n');
      
      this.printConfig();

      // Step 1: Get all schemes with NAV data
      console.log('\n🔍 Step 1: Finding schemes with NAV data...');
      const allSchemeIds = await this.getSchemesWithNavData();
      
      if (allSchemeIds.length === 0) {
        console.log('❌ No schemes found with NAV data. Exiting.');
        return;
      }

      this.result.totalSchemes = allSchemeIds.length;
      console.log(`✅ Found ${allSchemeIds.length} schemes with NAV data`);

      // Step 2: Prioritize bookmarked schemes (if enabled)
      let orderedSchemeIds = allSchemeIds;
      if (this.config.prioritizeBookmarked) {
        console.log('\n📌 Step 2: Prioritizing bookmarked schemes...');
        orderedSchemeIds = await this.prioritizeBookmarked(allSchemeIds);
        console.log(`✅ ${this.result.bookmarkedCount} bookmarked schemes will be processed first`);
        console.log(`✅ ${this.result.nonBookmarkedCount} non-bookmarked schemes will follow`);
      } else {
        this.result.nonBookmarkedCount = allSchemeIds.length;
      }

      // Step 3: Process schemes in batches
      console.log('\n⚙️  Step 3: Processing schemes in batches...');
      console.log(`   Batch size: ${this.config.batchSize} schemes`);
      console.log(`   Delay between batches: ${this.config.delayMs}ms`);
      console.log(`   Skip already calculated: ${this.config.skipAlreadyCalculated ? 'Yes' : 'No'}`);
      console.log('');

      await this.processSchemes(orderedSchemeIds);

      // Step 4: Print summary
      this.printSummary();

    } catch (error: any) {
      console.error('\n❌ FATAL ERROR:', error.message);
      console.error(error.stack);
      process.exit(1);
    } finally {
      // Close database connection
      await pool.end();
    }
  }

  /**
   * Get all schemes that have NAV data
   */
  private async getSchemesWithNavData(): Promise<number[]> {
    try {
      let query = `
        SELECT DISTINCT sd.id, sd.scheme_code, sd.scheme_name
        FROM t_scheme_details sd
        WHERE sd.is_active = true
          AND sd.historical_data_available = true
          AND EXISTS (
            SELECT 1 FROM t_nav_data nd 
            WHERE nd.scheme_id = sd.id 
              AND nd.is_live = $1
          )
      `;

      const params: any[] = [this.config.isLive];

      // For test mode, limit results
      if (this.config.testMode && this.config.maxSchemes) {
        query += ` LIMIT $2`;
        params.push(this.config.maxSchemes);
      }

      query += ` ORDER BY sd.scheme_code`;

      const result = await pool.query(query, params);
      return result.rows.map((row: any) => row.id);

    } catch (error: any) {
      console.error('Failed to get schemes with NAV data:', error.message);
      throw error;
    }
  }

  /**
   * Prioritize bookmarked schemes
   */
  private async prioritizeBookmarked(schemeIds: number[]): Promise<number[]> {
    try {
      const query = `
        SELECT DISTINCT scheme_id 
        FROM t_scheme_bookmarks 
        WHERE scheme_id = ANY($1) 
          AND is_active = true
      `;

      const result = await pool.query(query, [schemeIds]);
      const bookmarkedIds = result.rows.map((row: any) => row.scheme_id);
      const nonBookmarkedIds = schemeIds.filter(id => !bookmarkedIds.includes(id));

      this.result.bookmarkedCount = bookmarkedIds.length;
      this.result.nonBookmarkedCount = nonBookmarkedIds.length;

      // Return bookmarked first, then non-bookmarked
      return [...bookmarkedIds, ...nonBookmarkedIds];

    } catch (error: any) {
      console.error('Failed to prioritize bookmarked schemes:', error.message);
      // If prioritization fails, return original order
      return schemeIds;
    }
  }

  /**
   * Process schemes in batches
   */
  private async processSchemes(schemeIds: number[]): Promise<void> {
    const totalBatches = Math.ceil(schemeIds.length / this.config.batchSize);

    for (let i = 0; i < schemeIds.length; i += this.config.batchSize) {
      const batch = schemeIds.slice(i, Math.min(i + this.config.batchSize, schemeIds.length));
      const batchNumber = Math.floor(i / this.config.batchSize) + 1;

      console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (Schemes ${i + 1}-${i + batch.length})`);
      console.log('─'.repeat(60));

      for (let j = 0; j < batch.length; j++) {
        const schemeId = batch[j];
        const overallIndex = i + j + 1;

        try {
          // Check if already calculated (if skipAlreadyCalculated enabled)
          if (this.config.skipAlreadyCalculated) {
            const alreadyCalculated = await this.checkIfAlreadyCalculated(schemeId);
            if (alreadyCalculated) {
              this.result.skipped++;
              console.log(`   ⏭️  [${overallIndex}/${schemeIds.length}] Scheme ${schemeId} - Already calculated (skipped)`);
              continue;
            }
          }

          // Calculate metrics
          console.log(`   ⚙️  [${overallIndex}/${schemeIds.length}] Scheme ${schemeId} - Calculating...`);
          
          const calculationResult = await schemeMetricsCalculator.calculateForScheme(
            schemeId,
            undefined, // Use latest date
            this.config.isLive
          );

          if (calculationResult.success) {
            this.result.successful++;
            console.log(`   ✅ [${overallIndex}/${schemeIds.length}] Scheme ${schemeId} - Success (${calculationResult.date})`);
          } else {
            this.result.failed++;
            this.result.errors.push({
              schemeId,
              schemeCode: `SCHEME_${schemeId}`,
              error: calculationResult.error || 'Unknown error'
            });
            console.log(`   ❌ [${overallIndex}/${schemeIds.length}] Scheme ${schemeId} - Failed: ${calculationResult.error}`);
          }

        } catch (error: any) {
          this.result.failed++;
          this.result.errors.push({
            schemeId,
            schemeCode: `SCHEME_${schemeId}`,
            error: error.message
          });
          console.log(`   ❌ [${overallIndex}/${schemeIds.length}] Scheme ${schemeId} - Error: ${error.message}`);
        }
      }

      // Progress summary after each batch
      const processed = this.result.successful + this.result.failed + this.result.skipped;
      const remaining = schemeIds.length - processed;
      const elapsedMs = Date.now() - this.startTime;
      const avgTimePerScheme = processed > 0 ? elapsedMs / processed : 0;
      const estimatedRemainingMs = avgTimePerScheme * remaining;

      console.log('\n📊 Progress Summary:');
      console.log(`   Processed: ${processed}/${schemeIds.length}`);
      console.log(`   Successful: ${this.result.successful}`);
      console.log(`   Failed: ${this.result.failed}`);
      console.log(`   Skipped: ${this.result.skipped}`);
      console.log(`   Remaining: ${remaining}`);
      console.log(`   Elapsed: ${this.formatDuration(elapsedMs)}`);
      console.log(`   Est. Remaining: ${this.formatDuration(estimatedRemainingMs)}`);

      // Delay between batches (except for last batch)
      if (i + this.config.batchSize < schemeIds.length) {
        console.log(`\n⏳ Waiting ${this.config.delayMs}ms before next batch...`);
        await this.delay(this.config.delayMs);
      }
    }
  }

  /**
   * Check if scheme already has calculated metrics
   */
  private async checkIfAlreadyCalculated(schemeId: number): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM t_nav_data
        WHERE scheme_id = $1 
          AND is_live = $2
          AND metrics_calculated_at IS NOT NULL
      `;

      const result = await pool.query(query, [schemeId, this.config.isLive]);
      const count = parseInt(result.rows[0].count);
      
      return count > 0;

    } catch (error: any) {
      console.error(`Failed to check if scheme ${schemeId} already calculated:`, error.message);
      return false; // Assume not calculated if check fails
    }
  }

  /**
   * Print configuration
   */
  private printConfig(): void {
    console.log('⚙️  Configuration:');
    console.log(`   Environment: ${this.config.isLive ? 'LIVE' : 'TEST'}`);
    console.log(`   Batch Size: ${this.config.batchSize}`);
    console.log(`   Delay Between Batches: ${this.config.delayMs}ms`);
    console.log(`   Skip Already Calculated: ${this.config.skipAlreadyCalculated ? 'Yes' : 'No'}`);
    console.log(`   Prioritize Bookmarked: ${this.config.prioritizeBookmarked ? 'Yes' : 'No'}`);
    console.log(`   Test Mode: ${this.config.testMode ? 'Yes' : 'No'}`);
    if (this.config.maxSchemes) {
      console.log(`   Max Schemes (Test): ${this.config.maxSchemes}`);
    }
  }

  /**
   * Print final summary
   */
  private printSummary(): void {
    this.result.executionTimeMs = Date.now() - this.startTime;

    console.log('\n========================================');
    console.log('📊 FINAL SUMMARY');
    console.log('========================================\n');

    console.log(`Total Schemes: ${this.result.totalSchemes}`);
    console.log(`├─ Bookmarked: ${this.result.bookmarkedCount}`);
    console.log(`└─ Non-bookmarked: ${this.result.nonBookmarkedCount}`);
    console.log('');
    console.log(`Processed: ${this.result.successful + this.result.failed + this.result.skipped}/${this.result.totalSchemes}`);
    console.log(`├─ ✅ Successful: ${this.result.successful}`);
    console.log(`├─ ❌ Failed: ${this.result.failed}`);
    console.log(`└─ ⏭️  Skipped: ${this.result.skipped}`);
    console.log('');
    
    const successRate = this.result.totalSchemes > 0
      ? ((this.result.successful / this.result.totalSchemes) * 100).toFixed(1)
      : '0.0';
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Execution Time: ${this.formatDuration(this.result.executionTimeMs)}`);

    if (this.result.errors.length > 0) {
      console.log('\n❌ Errors (first 10):');
      this.result.errors.slice(0, 10).forEach((error, index) => {
        console.log(`   ${index + 1}. Scheme ${error.schemeId}: ${error.error}`);
      });
      
      if (this.result.errors.length > 10) {
        console.log(`   ... and ${this.result.errors.length - 10} more errors`);
      }
    }

    console.log('\n========================================\n');

    if (this.result.failed > 0) {
      console.log('⚠️  Some schemes failed. Check logs for details.');
      console.log('   You can re-run this script with skipAlreadyCalculated=true');
      console.log('   to only process failed schemes.\n');
    } else {
      console.log('✅ All schemes processed successfully!\n');
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =====================================================
// SCRIPT EXECUTION
// =====================================================

// Parse command line arguments
const args = process.argv.slice(2);
const config: Partial<ScriptConfig> = {};

args.forEach(arg => {
  const [key, value] = arg.split('=');
  switch (key) {
    case '--test':
      config.testMode = true;
      config.maxSchemes = parseInt(value) || 10;
      break;
    case '--batch-size':
      config.batchSize = parseInt(value);
      break;
    case '--delay':
      config.delayMs = parseInt(value);
      break;
    case '--no-skip':
      config.skipAlreadyCalculated = false;
      break;
    case '--no-priority':
      config.prioritizeBookmarked = false;
      break;
    case '--env':
      config.isLive = value === 'live';
      break;
  }
});

// Run script
const script = new InitialMetricsCalculationScript(config);

script.execute()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });