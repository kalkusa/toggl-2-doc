# Toggl API Postman Collection

This directory contains Postman files for interacting with the Toggl Track API.

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

- **Get User Data**: Authenticates and retrieves user information
- **Get Latest Time Entries**: Fetches the most recent time entries
- **Get Time Entries Before Date**: Fetches time entries before a specific date
  - Set the `beforeDate` variable in RFC3339 format (e.g., "2023-01-01T00:00:00Z")
- **Get Current Time Entry**: Retrieves the currently running time entry (if any)
- **Get Project Details**: Fetches details for a specific project
  - Requires `workspaceId` and `projectId` to be set
- **Stop Time Entry**: Stops a running time entry
  - Requires `workspaceId` and `timeEntryId` to be set

## Reference

For more information, refer to the [Toggl API documentation](https://engineering.toggl.com/docs/api/time_entries/). 