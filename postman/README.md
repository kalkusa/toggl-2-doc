# Toggl API Postman Collection

This directory contains Postman files for interacting with the Toggl Track API.

> **Important Update**: The Toggl API v9 endpoint `/me/time_entries` only returns time entries from the last 4 months. To fetch all time entries, we now use the Reports API v3 endpoint. The collection has been updated with both approaches.
>
> **Note**: The Reports API has a 366-day maximum date range limit. To fetch data spanning more than a year, you'll need to make multiple requests with different date ranges.

## Files

- `toggl-api-collection.json` - Postman collection with requests for Toggl API
- `toggl-api-environment.json` - Environment variables for the collection

## Setup Instructions

1. Import both files into Postman:
   - In Postman, click "Import" and select both files
   - The collection and environment will be added to your workspace

2. Set up your environment variables:
   - Select the "Toggl API Environment" from the environment dropdown
   - Click the "eye" icon to view/edit variables
   - Set your `apiToken` with your Toggl API token (from Toggl Track Profile settings)
   - Set the `encodedApiToken` with a Base64 encoded string of `YOUR_API_TOKEN:api_token`
     - You can use this Pre-request Script in a request to set it automatically:
     ```js
     // This script encodes your API token in the correct format
     const apiToken = pm.environment.get('apiToken');
     if (apiToken) {
         const encodedToken = btoa(`${apiToken}:api_token`);
         pm.environment.set('encodedApiToken', encodedToken);
     }
     ```

3. After making your first request to "Get User Data", you can:
   - Extract and set your `workspaceId` from the response
   - Use the collection to fetch time entries

## Using the Collection

### API v9 Endpoints

- **Get User Data**: Authenticates and retrieves user information
- **Get Latest Time Entries**: Fetches the most recent time entries (note: limited to last ~4 months)
- **Get Time Entries Before Date**: Fetches time entries before a specific date
  - Set the `beforeDate` variable in RFC3339 format (e.g., "2023-01-01T00:00:00Z")
- **Get Current Time Entry**: Retrieves the currently running time entry (if any)
- **Get Project Details**: Fetches details for a specific project
  - Requires `workspaceId` and `projectId` to be set
- **Stop Time Entry**: Stops a running time entry
  - Requires `workspaceId` and `timeEntryId` to be set

### Reports API v3 Endpoints

The Reports API allows you to fetch all time entries without the 4-month limitation:

- **Search Time Entries (Detailed Report)**: Fetches time entries with pagination
  - Set `startDate` and `endDate` in YYYY-MM-DD format
  - The response includes `X-Next-Row-Number` header for pagination
  - Use the `firstRowNumber` value to fetch subsequent pages
  - We use a page size of 300 entries per request (maximum allowed)
  - **Important**: Maximum allowed date range is 366 days. For longer periods, make multiple requests with different date ranges.
  
- **Export Detailed Report (CSV)**: Exports all time entries as a CSV file
  - Set `startDate` and `endDate` in YYYY-MM-DD format
  - **Important**: Maximum allowed date range is 366 days. For longer periods, make multiple requests with different date ranges.

## Pagination with Reports API

The Reports API v3 uses pagination to fetch large sets of time entries:

1. Make your first request **without** the `first_row_number` parameter
2. The response includes an `X-Next-Row-Number` header
3. Set `firstRowNumber` to the value from the header in your next request
4. Continue until you no longer receive an `X-Next-Row-Number` header

**Important**: Do not include the `first_row_number` parameter in the first request for each date range. Only include it in subsequent requests after receiving a valid `X-Next-Row-Number` value.

The test script automatically updates the `firstRowNumber` environment variable after each request.

## Troubleshooting

### Missing Data in Generated Documents

If your generated document shows missing data (e.g., "-" instead of actual values) for certain fields:

1. **Reports API Response Structure**: 
   - The Reports API returns a nested structure where time entries are grouped
   - Each response item contains a `time_entries` array with the actual time entry data
   - The `seconds` field in this nested structure contains the duration value
   - Example structure:
   ```json
   [
     {
       "user_id": 123456,
       "username": "Username",
       "project_id": null,
       "description": "Task description",
       "time_entries": [
         {
           "id": 987654321,
           "seconds": 3600,
           "start": "2024-01-01T12:00:00+00:00",
           "stop": "2024-01-01T13:00:00+00:00"
         }
       ]
     }
   ]
   ```

2. **Start and Stop Times**: 
   - Check that the time entries returned from the API contain properly formatted start and stop values
   - Ensure the entries are in ISO 8601 format (e.g., "2023-01-01T12:00:00Z")
   - Running entries may not have a stop time

3. **Duration**: 
   - In the Reports API, duration is the `seconds` field in the nested time entry
   - Should be a numeric value representing seconds
   - For completed entries, ensure it's a positive integer

## Reference

For more information, refer to:
- [Toggl API v9 documentation](https://engineering.toggl.com/docs/api/time_entries/)
- [Toggl Reports API v3 documentation](https://engineering.toggl.com/docs/reports/detailed_reports/) 