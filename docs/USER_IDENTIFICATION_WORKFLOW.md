# User Identification and Info Modal Implementation

## Overview

Implemented a two-phase workflow for viewing and editing cemetery elements, with improved user identification tracking. Users can now view element information without being asked for identification, and only provide their information when actually making changes.

## Key Changes

### 1. New Workflow

**Before:**

1. Click element → Immediately open edit sidebar → Prompt for user name
2. Users browsing were constantly prompted for their name

**After:**

1. Click element → Show read-only info modal
2. Click "Edit" button → Open edit sidebar
3. Make changes and click "Save" → Prompt for user identification (if not already provided)

### 2. New Components

#### `ElementInfoModal.tsx`

A read-only modal that displays comprehensive information about any cemetery element (grave, landmark, or road) without entering edit mode.

**Features:**

- Shows all available data for the element
- Clean, formatted display with proper spacing
- Grid position information
- Last modified timestamp and user
- GPS coordinates if available
- "Edit" button to transition to editing
- "Close" button to dismiss

#### `UserIdentificationModal.tsx`

An improved modal for collecting user identification information when saving changes.

**Features:**

- Clear explanation of why we need the information
- Emphasizes that email is preferred for contact purposes
- Lists benefits: credit, contact, review/verification
- Validates input (requires non-empty value)
- Can be cancelled (cancels the save operation)

### 3. Updated User Library (`lib/user.ts`)

**New Functions:**

- `getCurrentUser()` - Returns `string | null` (no longer prompts)
- `getCurrentUserOrAnonymous()` - Returns string, defaults to "Anonymous"
- `hasUserIdentifier()` - Checks if user has been identified
- `setCurrentUser(identifier)` - Stores user identification
- `clearUserIdentifier()` - Removes stored identifier

**Breaking Change:**

- Old `getCurrentUser()` automatically prompted user → Now returns null if not set
- All save handlers must use `getCurrentUserOrAnonymous()` or handle null

### 4. Updated CemeteryView Workflow

**State Management:**

```typescript
// Info modal state (view mode)
const [showInfoModal, setShowInfoModal] = useState(false);
const [infoElement, setInfoElement] = useState<...>(null);
const [infoElementType, setInfoElementType] = useState<...>(null);

// User identification state
const [showUserIdModal, setShowUserIdModal] = useState(false);
const [pendingSaveAction, setPendingSaveAction] = useState<...>(null);
```

**Click Handlers:**

- `handleGraveClick()` → Shows info modal (not edit sidebar)
- `handleLandmarkClick()` → Shows info modal (not edit sidebar)
- `handleRoadClick()` → Shows info modal (not edit sidebar)
- `handleEditFromInfo()` → Transitions from info modal to edit sidebar

**Save Flow:**

```typescript
const withUserIdentification = async (saveAction: () => Promise<void>) => {
  if (!hasUserIdentifier()) {
    setPendingSaveAction(() => saveAction);
    setShowUserIdModal(true);
  } else {
    await saveAction();
  }
};
```

All save handlers (`handleSaveGrave`, `handleSaveLandmark`, `handleSaveRoad`) wrap their logic with `withUserIdentification()`.

### 5. Updated All Editor Components

All editor components that create new elements now use `getCurrentUserOrAnonymous()`:

- `GraveEditor.tsx`
- `LandmarkEditor.tsx`
- `RoadEditor.tsx`
- `CreateCemeteryModal.tsx`

This ensures temporary/unsaved elements have a valid user field.

## User Experience Flow

### Browsing (No Identification Required)

1. User clicks on a grave marker on the map
2. Info modal appears showing:
   - Name (or "No name recorded")
   - Birth and death dates
   - Grid position
   - Inscription and notes
   - GPS coordinates
   - Last modified info
3. User clicks "Close" → Modal disappears
4. No user identification requested

### Editing (Identification Required)

1. User clicks on a grave marker → Info modal appears
2. User clicks "Edit" button → Edit sidebar opens
3. User makes changes to the grave information
4. User clicks "Save"
5. **If user hasn't identified themselves:**
   - User identification modal appears
   - Explains why we need the info
   - Suggests using email for contact
   - User enters email or name
   - Clicks "Continue"
6. **If user has already identified themselves:**
   - Save happens immediately
7. Changes are saved with user identifier in metadata

### First-Time User Identification

The modal explains:

- "We track who makes changes so that:"
  - Contributors can be credited for their work
  - Other users can contact you with questions
  - Changes can be reviewed and verified
- Email is preferred for contact purposes
- Required field with validation

Once identified, the user won't be asked again (stored in localStorage).

## Technical Details

### User Identification Storage

- Stored in `localStorage` with key `cemetery_user`
- Persists across sessions
- Can be cleared manually via browser tools
- Used for all `modified_by` fields in data model

### Save Operation Flow

1. User clicks "Save" in any editor
2. `withUserIdentification()` checks for stored user ID
3. If not found:
   - Stores the save function as pending
   - Shows user identification modal
   - Waits for user input
4. When user submits identification:
   - Stores identifier in localStorage
   - Executes pending save function
5. If user cancels:
   - Clears pending save
   - Closes modal
   - No changes saved

### Backwards Compatibility

- Existing data with `modified_by` values continues to work
- Import/export handles user fields correctly
- Change logs track anonymous vs identified users
- No database migrations required

## Benefits

### For Casual Users (Browsing)

- Can view all information without interruption
- No prompts for name when just looking
- Clean, focused information display

### For Contributors (Editing)

- Only asked for identification when actually saving
- Clear explanation of why it's needed
- One-time setup (stored for future edits)

### For Data Quality

- Better tracking of who made changes
- Contact information for questions
- Credit for contributors
- Audit trail maintained

## Files Changed

### New Files

- `src/components/ElementInfoModal.tsx` - Info display modal
- `src/components/UserIdentificationModal.tsx` - User ID collection modal

### Modified Files

- `src/lib/user.ts` - Updated user management functions
- `src/pages/CemeteryView.tsx` - New workflow implementation
- `src/components/GraveEditor.tsx` - Use new user functions
- `src/components/LandmarkEditor.tsx` - Use new user functions
- `src/components/RoadEditor.tsx` - Use new user functions
- `src/components/CreateCemeteryModal.tsx` - Use new user functions
- `src/pages/ImportExport.tsx` - Use new user functions

## Future Enhancements

### Potential Additions

1. **User Profile Management**
   - Allow users to edit their stored information
   - Show current identifier in settings
   - Option to clear and re-enter

2. **Contributor Credits**
   - Page showing all contributors
   - Stats on contributions per user
   - Export contributor list

3. **Change Attribution**
   - Show who made specific changes
   - Link to contact contributor
   - View contributor's other changes

4. **Guest Mode Warning**
   - Optional banner for anonymous users
   - Suggest providing identification for credit
   - Non-intrusive reminder

## Testing Recommendations

### Manual Testing Scenarios

1. **First-Time User Flow:**
   - Clear localStorage
   - Click on element → Should show info modal
   - Click Edit → Should open sidebar
   - Make change and Save → Should prompt for ID
   - Provide ID → Should save successfully
   - Make another change → Should NOT prompt again

2. **Browsing Flow:**
   - Click multiple elements
   - View their information
   - Close modals
   - Never prompted for ID

3. **Edit Without Browsing:**
   - Use "Add Grave" button
   - Fill in details
   - Click Save → Should prompt for ID (if first time)

4. **Cancel Identification:**
   - Try to save without prior ID
   - When prompted, click Cancel
   - Should not save changes
   - Should close modal

5. **Multi-Element Cell:**
   - Click cell with multiple elements
   - Select one from modal
   - Should show info modal for that element

## Migration Notes

### For Developers

**Old Pattern (Don't Use):**

```typescript
import { getCurrentUser } from '../lib/user';

const user = getCurrentUser(); // Might be null now!
```

**New Pattern (Use This):**

```typescript
import {
  getCurrentUserOrAnonymous,
  hasUserIdentifier,
  setCurrentUser,
} from '../lib/user';

// For display or logging (guaranteed string)
const user = getCurrentUserOrAnonymous();

// For conditional logic
if (hasUserIdentifier()) {
  // User has been identified
}

// For saving with wrapper
await withUserIdentification(async () => {
  // Save logic here
});
```

### For Users

No migration needed! Existing data works as-is. The first time you try to save a change after this update, you'll be asked for your email or name.
