import { z } from 'zod';
import { ValidationOutcome } from '../provider-adapter.interface';
import { RawTalabatDocument } from './talabat.types';

// Boundary validation schema for Locations document
const rawLocationsDocSchema = z.object({
  statusCode: z.number().refine((code) => code === 200, {
    message: 'Expected HTTP 200 status code',
  }),
  payload: z.object({
    results: z.array(z.record(z.unknown())).min(1, 'Locations results array is empty'),
  }),
});

// Boundary validation schema for Restaurant listings document
const rawRestaurantsDocSchema = z.object({
  statusCode: z.number().refine((code) => code === 200, {
    message: 'Expected HTTP 200 status code',
  }),
  payload: z.object({
    results: z.array(z.record(z.unknown())).min(1, 'Restaurant listings results array is empty'),
  }),
});

// Boundary validation schema for Menus document
const rawMenusDocSchema = z.object({
  statusCode: z.number().refine((code) => code === 200, {
    message: 'Expected HTTP 200 status code',
  }),
  payload: z.object({
    results: z.array(z.record(z.unknown())).min(1, 'Menu details results array is empty'),
  }),
});

export class TalabatValidator {
  static validate(collectionName: string, doc: unknown): ValidationOutcome {
    if (!doc || typeof doc !== 'object') {
      return {
        isValid: false,
        reason: 'Document is null, undefined, or not an object',
      };
    }

    const rawDoc = doc as RawTalabatDocument;

    // Check for explicit scraper error message at the root payload level
    if (rawDoc.payload?.Message) {
      return {
        isValid: false,
        reason: `Scraper error: ${rawDoc.payload.Message}`,
        errorDetails: { Message: rawDoc.payload.Message },
      };
    }

    if (rawDoc.payload?.['Page Error Message']) {
      return {
        isValid: false,
        reason: `Pagination error: ${rawDoc.payload['Page Error Message']}`,
        errorDetails: { pageErrorMessage: rawDoc.payload['Page Error Message'] },
      };
    }

    if (rawDoc.payload?.error !== undefined && rawDoc.payload?.results === undefined) {
      return {
        isValid: false,
        reason: `Payload contains error status with missing results`,
        errorDetails: { error: rawDoc.payload.error },
      };
    }

    let parseResult: z.SafeParseReturnType<any, any>;

    switch (collectionName) {
      case 'raw_locations':
      case 'locations':
        parseResult = rawLocationsDocSchema.safeParse(doc);
        break;

      case 'raw_restaurants':
      case 'restaurants':
        parseResult = rawRestaurantsDocSchema.safeParse(doc);
        break;

      case 'raw_menus':
      case 'menus':
        parseResult = rawMenusDocSchema.safeParse(doc);
        break;

      default:
        // Generic fallback check
        if (!rawDoc.payload || !Array.isArray(rawDoc.payload.results)) {
          return {
            isValid: false,
            reason: `Document payload.results is missing or not an array for collection '${collectionName}'`,
          };
        }
        return { isValid: true };
    }

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return {
        isValid: false,
        reason: `Boundary validation failed: ${firstIssue?.path.join('.') || 'root'} - ${firstIssue?.message || 'Invalid structure'}`,
        errorDetails: parseResult.error.format(),
      };
    }

    return { isValid: true };
  }
}
