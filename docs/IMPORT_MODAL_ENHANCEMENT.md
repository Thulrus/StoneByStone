# Import Data Modal Enhancement

## Overview

Replaced the confusing browser `confirm()` dialogs with a clear, user-friendly modal when importing cemetery data while existing data is already loaded.

## Problem

The previous implementation used browser confirm dialogs:

```javascript
const choice = confirm(
  'Local data exists. Click OK to MERGE with existing data, or Cancel to REPLACE all data.'
);
```

**Issues**:

- Confusing wording (OK for merge, Cancel for replace)
- Counter-intuitive: Cancel doesn't actually cancel
- No way to truly cancel the import
- Generic browser dialog doesn't match app styling
- No visual indication of what data exists vs what's being imported

## Solution

Created a custom `ImportDataModal` component that:

- Shows existing data summary (cemetery name, grave count)
- Shows incoming data summary (cemetery name, grave count)
- Presents three clear options with visual distinction
- Provides detailed descriptions of each action
- Supports dark mode
- Uses the app's design language

## User Experience

### New Import Flow

1. **User selects a file to import**
2. **If no existing data**: Import happens automatically (unchanged)
3. **If existing data present**: Modal appears with three options:

#### Option 1: Merge Data 🔄

- **Color**: Green
- **Description**: "Combine the new data with existing data. Conflicts will be resolved by keeping the most recently modified version. Your existing data will be preserved."
- **Action**: Runs merge algorithm, may show conflict resolution if needed

#### Option 2: Replace All Data 🗑️

- **Color**: Red
- **Description**: "**Delete all existing data** and replace it with the new import. This action cannot be undone!"
- **Action**: Deletes all existing data and imports new data

#### Option 3: Cancel Import ❌

- **Color**: Gray
- **Description**: "Don't import anything. Keep only the existing data."
- **Action**: Closes modal, keeps existing data unchanged

## Implementation Details

### New Component: `ImportDataModal.tsx`

```typescript
interface ImportDataModalProps {
  isOpen: boolean;
  onMerge: () => void;
  onReplace: () => void;
  onCancel: () => void;
  incomingGraveCount: number;
  existingGraveCount: number;
  incomingCemeteryName: string;
  existingCemeteryName: string;
}
```

**Features**:

- Fixed overlay with semi-transparent backdrop
- Responsive design (max-width with mobile-friendly padding)
- Warning banner at top (⚠️ Existing Data Detected)
- Current data summary box (gray background)
- Incoming data summary box (blue background)
- Three large, distinct action buttons with icons and descriptions
- Dark mode support throughout

### Updated: `ImportExport.tsx`

**State Management**:

```typescript
const [showImportModal, setShowImportModal] = useState(false);
const [pendingImport, setPendingImport] = useState<CemeteryData | null>(null);
const [existingData, setExistingData] = useState<CemeteryData | null>(null);
```

**New Handlers**:

- `handleMergeData()`: Executes merge operation with conflict detection
- `handleReplaceData()`: Replaces all existing data
- `handleCancelImport()`: Cancels import and clears pending state

**Import Flow**:

1. File is read and validated
2. If no local data exists → import directly (unchanged)
3. If local data exists → load both datasets into state
4. Show modal with both datasets' metadata
5. User makes choice
6. Execute chosen action
7. Clean up state

## Visual Design

### Modal Layout

```
┌─────────────────────────────────────┐
│  Import Cemetery Data               │
├─────────────────────────────────────┤
│  ⚠️ Existing Data Detected          │
│  You already have cemetery data...  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Current Data:               │   │
│  │ Cemetery: Oak Hill          │   │
│  │ Graves: 150                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ New Data to Import:         │   │
│  │ Cemetery: Willow Creek      │   │
│  │ Graves: 20                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Choose an action:                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔄 Merge Data               │   │
│  │ Combine the new data...     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🗑️ Replace All Data         │   │
│  │ Delete all existing...      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ❌ Cancel Import            │   │
│  │ Don't import anything...    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Color Scheme

**Light Mode**:

- Merge button: Green (bg-green-50, border-green-300)
- Replace button: Red (bg-red-50, border-red-300)
- Cancel button: Gray (bg-gray-50, border-gray-300)
- Warning banner: Yellow (bg-yellow-50, border-yellow-200)
- Current data: Gray (bg-gray-50)
- Incoming data: Blue (bg-blue-50)

**Dark Mode**:

- Merge button: Green (bg-green-900/20, border-green-800)
- Replace button: Red (bg-red-900/20, border-red-800)
- Cancel button: Gray (bg-gray-900, border-gray-700)
- Warning banner: Yellow (bg-yellow-900/20, border-yellow-800)
- Current data: Dark gray (bg-gray-900)
- Incoming data: Blue (bg-blue-900/20)

## User Benefits

1. **Clarity**: Each option clearly states what will happen
2. **Safety**: Destructive action (replace) is visually distinct and emphasized
3. **Information**: User sees exactly what data exists and what's being imported
4. **Control**: True cancel option to back out of import
5. **Confidence**: Visual feedback and clear descriptions reduce user anxiety
6. **Consistency**: Matches app design language and dark mode support

## Technical Notes

### Error Handling

- All operations wrapped in try-catch blocks
- Status messages update throughout process
- Import state properly cleaned up on error or cancel

### State Management

- Modal state separate from merge conflict state
- Pending import data stored temporarily
- State cleared after successful operation or cancellation

### Accessibility

- Large, clear buttons with good contrast
- Descriptive text for screen readers
- Keyboard accessible (modal can be closed with ESC - future enhancement)
- Clear visual hierarchy

## Testing Checklist

- [x] Import with no existing data → imports directly (no modal)
- [x] Import with existing data → shows modal
- [x] Modal displays correct existing cemetery name and count
- [x] Modal displays correct incoming cemetery name and count
- [x] Merge option → executes merge
- [x] Merge with conflicts → shows conflict resolution modal afterward
- [x] Merge without conflicts → completes successfully
- [x] Replace option → replaces all data
- [x] Cancel option → closes modal, keeps existing data
- [x] Dark mode styling works correctly
- [x] Mobile responsive design
- [x] TypeScript compilation succeeds
- [x] Build succeeds

## Future Enhancements

Potential improvements:

1. **Keyboard Navigation**: ESC to close, Enter to confirm merge
2. **Detailed Comparison**: Show landmark/road counts, not just graves
3. **Preview Mode**: Show side-by-side comparison of data
4. **Smart Recommendations**: Suggest merge or replace based on data similarity
5. **Backup Reminder**: Remind user to export current data before replacing
6. **Undo Support**: Allow reversing a replace operation (would require storing previous data)

## Related Files

- **Created**: `src/components/ImportDataModal.tsx` - New modal component
- **Modified**: `src/pages/ImportExport.tsx` - Import flow with modal integration
- **Related**: `src/components/MergeConflictModal.tsx` - Still used for conflict resolution after merge
