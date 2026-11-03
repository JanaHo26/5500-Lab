// Shared by the backend and the client (client/src/api imports this file), so
// keep everything in src/types/ free of imports from mongoose, express or models.

// shared across resource + reservation, this is what every error reply looks like
export interface ErrorResponse {
  code: string;
  message: string;
}
