# Marker Placement Improvements

**Date**: October 5, 2025

## Overview

Improved the user experience for placing cemetery elements (graves, landmarks, roads/paths) by:

1. Closing sidebars on medium/small screens during placement mode
2. Fixing z-index issues with toolbar appearing over sidebars
3. Adding visual feedback with temporary preview icons before saving

## Changes Made

### 1. MarkerToolbar Component (`src/components/MarkerToolbar.tsx`)

**Change**: Set z-index to `z-[5]` to ensure it stays below sidebars

**Purpose**: Toolbar should only be visible on the map layer and should not appear over the grave list sidebar or editor sidebar. The sidebars use `z-10`, so toolbar uses `z-[5]` to stay underneath.

```tsx
// Final:
<div className="absolute bottom-4 left-4 z-[5] flex flex-col gap-2">
```

### 2. CemeteryView Component (`src/pages/CemeteryView.tsx`)

#### A. Added State for Temporary Preview Elements

```tsx
// Temporary preview elements for placement feedback
const [tempGrave, setTempGrave] = useState<Grave | null>(null);
const [tempLandmark, setTempLandmark] = useState<Landmark | null>(null);
```

**Purpose**: Store temporary elements that show where a marker will be placed before the user saves it

#### B. Created handleMarkerTypeSelect Function

```tsx
const handleMarkerTypeSelect = (type: MarkerType | null) => {
  setActiveMarkerType(type);

  // Close sidebars on medium and small screens when entering placement mode
  if (type !== null && window.innerWidth < 1024) {
    setShowGraveList(false);
    setShowEditor(false);
  }
};
```

**Purpose**: When user clicks "Add Grave", "Add Landmark", or "Add Road/Path" button:

- Activates placement mode
- Automatically closes sidebars on screens smaller than 1024px (medium and small screens)
- Gives user clear view of the map for placing elements

#### C. Updated handleCellClick to Create Temporary Previews

```tsx
if (activeMarkerType === 'grave') {
  const newGrave: Grave = {
    uuid: crypto.randomUUID(),
    grid: position,
    properties: {
      last_modified: getCurrentTimestamp(),
      modified_by: getCurrentUserOrAnonymous(),
    },
  };

  // Set temporary preview
  setTempGrave(newGrave);

  // ... rest of placement logic
}
```

**Purpose**: When user clicks a map cell in placement mode:

- Creates a temporary preview element immediately
- Provides instant visual feedback showing where the element will be placed
- Preview persists while user fills out the editor form

#### D. Updated Save Handlers to Clear Temporary Elements

```tsx
const handleSaveGrave = async (grave: Grave) => {
  await withUserIdentification(async () => {
    // ... save logic ...

    // Clear temporary preview
    setTempGrave(null);
  });
};

const handleSaveLandmark = async (landmark: Landmark) => {
  await withUserIdentification(async () => {
    // ... save logic ...

    // Clear temporary preview
    setTempLandmark(null);
  });
};
```

**Purpose**: Remove temporary preview after successful save (converts to permanent element)

#### E. Updated handleCancel to Clear Temporary Elements

```tsx
const handleCancel = () => {
  // ... existing cancel logic ...

  // Clear temporary preview elements
  setTempGrave(null);
  setTempLandmark(null);
};
```

**Purpose**: Remove temporary preview if user cancels without saving

#### F. Updated MarkerToolbar Props

```tsx
<MarkerToolbar
  activeMarkerType={activeMarkerType}
  onSelectMarkerType={handleMarkerTypeSelect} // Changed from setActiveMarkerType
  onFinishRoad={handleFinishRoad}
  disabled={!cemeteryData}
/>
```

**Purpose**: Use new handler that manages sidebar visibility

#### G. Updated MapGrid Props

```tsx
<MapGrid
  // ... existing props ...
  tempGrave={tempGrave}
  tempLandmark={tempLandmark}
  // ... rest of props ...
/>
```

**Purpose**: Pass temporary elements to MapGrid for rendering

### 3. MapGrid Component (`src/components/MapGrid.tsx`)

#### A. Updated Interface

```tsx
interface MapGridProps {
  // ... existing props ...
  tempGrave?: Grave | null; // Temporary preview grave before saving
  tempLandmark?: Landmark | null; // Temporary preview landmark before saving
  // ... rest of props ...
}
```

#### B. Updated Function Signature

```tsx
export function MapGrid({
  // ... existing params ...
  tempGrave = null,
  tempLandmark = null,
  // ... rest of params ...
}: MapGridProps) {
```

#### C. Added Temporary Element Rendering

After regular graves and landmarks, added rendering for temporary previews:

```tsx
{
  /* Temporary preview grave (before saving) */
}
{
  tempGrave && (
    <g key={`temp-${tempGrave.uuid}`} className="temp-grave-marker">
      {(() => {
        const x = PADDING + tempGrave.grid.col * CELL_SIZE;
        const y = PADDING + tempGrave.grid.row * CELL_SIZE;
        const stoneIconPath = `${import.meta.env.BASE_URL}stone.png`;

        return (
          <>
            <image
              href={stoneIconPath}
              x={x + 5}
              y={y + 5}
              width={30}
              height={30}
              opacity={0.7}
            />
            {/* Blue overlay to indicate temporary state */}
            <rect
              x={x + 5}
              y={y + 5}
              width={30}
              height={30}
              fill="rgba(59, 130, 246, 0.4)"
              pointerEvents="none"
            />
            <title>New grave (unsaved)</title>
          </>
        );
      })()}
    </g>
  );
}

{
  /* Temporary preview landmark (before saving) */
}
{
  tempLandmark && (
    <g key={`temp-${tempLandmark.uuid}`} className="temp-landmark-marker">
      {(() => {
        const x = PADDING + tempLandmark.grid.col * CELL_SIZE;
        const y = PADDING + tempLandmark.grid.row * CELL_SIZE;

        // Map landmark type to icon filename
        const iconMap: Record<string, string> = {
          bench: 'bench.png',
          tree: 'tree.png',
          pine: 'pine.png',
          statue: 'statue.png',
          building: 'building.png',
          other: 'other.png',
        };
        const iconPath = `${import.meta.env.BASE_URL}${iconMap[tempLandmark.landmark_type] || 'other.png'}`;

        return (
          <>
            <image
              href={iconPath}
              x={x + 5}
              y={y + 5}
              width={30}
              height={30}
              opacity={0.7}
            />
            {/* Blue overlay to indicate temporary state */}
            <rect
              x={x + 5}
              y={y + 5}
              width={30}
              height={30}
              fill="rgba(59, 130, 246, 0.4)"
              pointerEvents="none"
            />
            <title>New {tempLandmark.landmark_type} (unsaved)</title>
          </>
        );
      })()}
    </g>
  );
}
```

**Visual Design**:

- Icons rendered at 70% opacity (slightly faded)
- Semi-transparent blue overlay (40% opacity) to indicate unsaved/temporary state
- Tooltip indicates "unsaved" status
- Uses same icon system as permanent elements

## User Experience Flow

### Before Changes

1. User clicks "Add Grave" button
2. Sidebars remain open (may obscure map on small screens)
3. User clicks map cell
4. Editor sidebar opens
5. **No visual feedback on map until save**
6. User fills form and saves
7. Grave appears on map

### After Changes

1. User clicks "Add Grave" button
2. **Sidebars automatically close on small/medium screens**
3. User has clear view of entire map
4. User clicks map cell
5. **Temporary grave icon appears immediately (faded with blue overlay)**
6. Editor sidebar opens
7. User fills form and saves
8. **Temporary icon becomes permanent (full opacity, no overlay)**

OR

7. User cancels
8. **Temporary icon disappears**

## Benefits

1. **Better Map Visibility**: On medium and small screens, sidebars close automatically during placement mode, giving users an unobstructed view of the cemetery grid

2. **Immediate Visual Feedback**: Users see exactly where their element will be placed as soon as they click, before filling out any details

3. **Clear Temporary State**: The faded appearance and blue overlay make it obvious the element isn't saved yet

4. **Proper Z-Index Layering**: Toolbar stays below sidebars (`z-[5]` vs `z-10`), only visible on the map layer

5. **Consistent with Road Placement**: The temporary preview behavior matches the existing road/path cell selection visualization

## Technical Notes

- Temporary elements use same icon system as permanent elements (stone.png for graves, landmark-specific icons for landmarks)
- Temporary state tracked separately from selected element state
- Preview cleared on both save success and cancel actions
- Window width check (`window.innerWidth < 1024`) ensures large screens keep sidebars open for multitasking
- Blue overlay color matches existing selected element highlight for consistency

## Testing Recommendations

1. Test on small screens (mobile): Verify sidebars close when entering placement mode
2. Test on medium screens (tablet): Verify sidebars close when entering placement mode
3. Test on large screens (desktop): Verify sidebars remain open during placement mode
4. Test icon appearance: Verify temporary icons appear faded with blue overlay
5. Test cancel action: Verify temporary icon disappears when user cancels
6. Test save action: Verify temporary icon becomes permanent after save
7. Test toolbar z-index: Verify buttons don't appear behind sidebar in small screen mode
8. Test road/path mode: Verify existing cell selection still works (no temporary preview for roads)
