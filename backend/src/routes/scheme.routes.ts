// backend/src/routes/scheme.routes.ts
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';
import { SchemeService } from '../services/scheme.service';

const router = Router();
const schemeService = new SchemeService();

// Apply middleware
router.use(authMiddleware);
router.use(environmentMiddleware);

/**
 * GET /api/schemes/types
 * Get all scheme types
 */
router.get('/types', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 1;
    const isLive = (req as any).isLive !== false;
    
    const types = await schemeService.getSchemeTypes(tenantId, isLive);
    
    return res.json({
      success: true,
      data: types,
      count: types.length
    });
  } catch (error: any) {
    console.error('Error fetching scheme types:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch scheme types'
    });
  }
});

/**
 * GET /api/schemes/categories
 * Get all scheme categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 1;
    const isLive = (req as any).isLive !== false;
    
    const categories = await schemeService.getSchemeCategories(tenantId, isLive);
    
    return res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error: any) {
    console.error('Error fetching scheme categories:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch scheme categories'
    });
  }
});

/**
 * GET /api/schemes/masters
 * Get both types and categories in one call
 */
router.get('/masters', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 1;
    const isLive = (req as any).isLive !== false;
    
    const [types, categories] = await Promise.all([
      schemeService.getSchemeTypes(tenantId, isLive),
      schemeService.getSchemeCategories(tenantId, isLive)
    ]);
    
    return res.json({
      success: true,
      data: {
        types,
        categories
      }
    });
  } catch (error: any) {
    console.error('Error fetching scheme masters:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch scheme masters'
    });
  }
});

/**
 * GET /api/schemes
 * Get paginated list of schemes with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 1;
    const isLive = (req as any).isLive !== false;
    
    const {
      page = '1',
      pageSize = '20',
      search,
      amcName,
      schemeType,
      schemeCategory
    } = req.query;
    
    const result = await schemeService.getSchemes(tenantId, isLive, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      search: search as string,
      amcName: amcName as string,
      schemeType: schemeType ? parseInt(schemeType as string) : undefined,
      schemeCategory: schemeCategory ? parseInt(schemeCategory as string) : undefined
    });
    
    return res.json({
      success: true,
      data: result.schemes,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.total / result.pageSize)
      }
    });
  } catch (error: any) {
    console.error('Error fetching schemes:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch schemes'
    });
  }
});

/**
 * GET /api/schemes/:schemeCode
 * Get a specific scheme by code
 */
router.get('/:schemeCode', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 1;
    const isLive = (req as any).isLive !== false;
    const { schemeCode } = req.params;
    
    const scheme = await schemeService.getSchemeByCode(tenantId, isLive, schemeCode);
    
    if (!scheme) {
      return res.status(404).json({
        success: false,
        error: 'Scheme not found'
      });
    }
    
    return res.json({
      success: true,
      data: scheme
    });
  } catch (error: any) {
    console.error('Error fetching scheme:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch scheme'
    });
  }
});

/**
 * POST /api/schemes
 * Create a new scheme
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 1;
    const isLive = (req as any).isLive !== false;
    const userId = (req as any).user?.id;
    
    const schemeData = {
      ...req.body,
      tenant_id: tenantId,
      is_live: isLive,
      created_by: userId
    };
    
    // Validate required fields
    if (!schemeData.scheme_code || !schemeData.scheme_name) {
      return res.status(400).json({
        success: false,
        error: 'Scheme code and name are required'
      });
    }
    
    // Check for duplicate
    const isDuplicate = await schemeService.checkSchemeDuplicate(
      tenantId,
      isLive,
      schemeData.scheme_code
    );
    
    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        error: 'Scheme with this code already exists'
      });
    }
    
    const newScheme = await schemeService.createScheme(schemeData);
    
    return res.status(201).json({
      success: true,
      data: newScheme,
      message: 'Scheme created successfully'
    });
  } catch (error: any) {
    console.error('Error creating scheme:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create scheme'
    });
  }
});

/**
 * PUT /api/schemes/:schemeCode
 * Update an existing scheme
 */
router.put('/:schemeCode', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || 1;
    const isLive = (req as any).isLive !== false;
    const { schemeCode } = req.params;
    
    const updatedScheme = await schemeService.updateScheme(
      tenantId,
      isLive,
      schemeCode,
      req.body
    );
    
    if (!updatedScheme) {
      return res.status(404).json({
        success: false,
        error: 'Scheme not found'
      });
    }
    
    return res.json({
      success: true,
      data: updatedScheme,
      message: 'Scheme updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating scheme:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update scheme'
    });
  }
});

/**
 * POST /api/schemes/validate-isin
 * Validate ISIN format
 */
router.post('/validate-isin', async (req: Request, res: Response) => {
  try {
    const { isin } = req.body;
    
    if (!isin) {
      return res.status(400).json({
        success: false,
        error: 'ISIN is required'
      });
    }
    
    const isValid = schemeService.validateISIN(isin);
    
    return res.json({
      success: true,
      data: {
        isin,
        isValid,
        message: isValid ? 'Valid ISIN format' : 'Invalid ISIN format'
      }
    });
  } catch (error: any) {
    console.error('Error validating ISIN:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate ISIN'
    });
  }
});

export default router;