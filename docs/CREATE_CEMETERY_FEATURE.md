# Create Cemetery Feature

## Overview

Added a new "Create New Cemetery" feature that allows users to create a new cemetery from scratch without needing to import a file. This makes the onboarding experience much simpler and more accessible to non-technical users.

## Changes Made

### 1. New Component: `CreateCemeteryModal.tsx`

Created a modal dialog component that:

- Explains how the cemetery grid system works in simple, user-friendly language
- Provides input fields for:
  - Cemetery name (required)
  - Number of rows (1-100)
  - Number of columns (1-100)
- Shows real-time calculation of total grid squares
- Validates all inputs before creating the cemetery
- Uses the existing `getCurrentUser()` function for change tracking
- Automatically sets sensible defaults (10×10 grid with 50px cell size)

### 2. Updated Home Page (`Home.tsx`)

The home page was significantly revised to be more welcoming and user-friendly:

#### Language Changes

- Changed from technical jargon to plain, accessible language
- Removed references to "IndexedDB", "JSON Schema validation", "progressive web app"
- Focused on what users can actually _do_ rather than technical features
- Changed "Import Data" to "Load Existing File"
- Changed "Export Data" to "Save as File"

#### New Features

- Added "Create New Cemetery" button as the primary action when no data exists
- Integrated the `CreateCemeteryModal` component
- Added navigation to the cemetery view after creation
- Updated tip section to mention both creating new and loading samples

#### UI Improvements

- Changed button layout to use flex-col on mobile for better responsiveness
- Made all action buttons consistent in styling
- Updated the features list to focus on user benefits rather than technical capabilities

### 3. User Flow

**For First-Time Users:**

1. User lands on home page
2. Sees welcoming message with simplified explanation
3. Two clear options: "Create New Cemetery" or "Load Existing File"
4. If they click "Create New Cemetery":
   - Modal opens with explanation of grid system
   - User enters cemetery name and grid dimensions
   - Modal validates inputs
   - Cemetery is created and saved to IndexedDB
   - User is automatically taken to the cemetery view

**For Returning Users:**

1. Home page shows current cemetery name
2. Options to "View Cemetery", "Save as File", or "Load Different File"

## Technical Details

### Cemetery Creation

```typescript
const cemetery: Cemetery = {
  id: 'current',
  name: name.trim(),
  grid: {
    rows: rowsNum,
    cols: colsNum,
    cellSize: 50,
  },
  last_modified: new Date().toISOString(),
  modified_by: getCurrentUser(),
};
```

### Validation Rules

- Cemetery name: Required, non-empty after trimming
- Rows: Must be an integer between 1 and 100
- Columns: Must be an integer between 1 and 100

### Default Values

- Grid dimensions: 10 rows × 10 columns (100 cells)
- Cell size: 50 pixels

## Benefits

1. **Lower Barrier to Entry**: Users can start immediately without needing a sample file
2. **User-Friendly**: Clear explanations in plain language
3. **Flexible**: Users can choose their own grid size based on their needs
4. **Consistent**: Uses existing infrastructure (`saveCemeteryMeta`, `getCurrentUser`)
5. **Safe**: Validates all inputs and provides helpful error messages

## Future Enhancements

Potential improvements for the future:

- Allow editing of cemetery metadata (name, grid size) after creation
- Add a "what size should I use?" calculator based on expected grave count
- Add presets for common cemetery sizes (small, medium, large)
- Allow changing the default cell size during creation
- Add optional description field for the cemetery

## Testing

To test the feature:

1. Clear IndexedDB data (Application tab in browser DevTools)
2. Refresh the app
3. Click "Create New Cemetery"
4. Enter a name and adjust grid dimensions
5. Click "Create Cemetery"
6. Verify navigation to cemetery view
7. Verify cemetery metadata is saved correctly
