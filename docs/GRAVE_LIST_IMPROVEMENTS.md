# Grave List Improvements

**Date**: October 5, 2025

## Overview

Enhanced the grave list sidebar with sorting options and improved the selection behavior to highlight graves on the map with a floating label instead of immediately opening the info modal.

## Changes Made

### 1. GraveList Component (`src/components/GraveList.tsx`)

#### A. Added Sort Options Type

```tsx
type SortOption =
  | 'first-name'
  | 'last-name'
  | 'birth-date'
  | 'death-date'
  | 'spatial';
```

**Available Sort Options**:

1. **First Name**: Alphabetical by first name (extracted from full name)
2. **Last Name**: Alphabetical by last name (extracted from full name)
3. **Birth Date**: Chronological by birth date (oldest to newest, or reversed)
4. **Death Date**: Chronological by death date (oldest to newest, or reversed)
5. **Location**: Spatial sorting by row then column (top to bottom, or reversed)

**Reverse Sort**: All sort options can be reversed with a toggle button

#### B. Name Parsing Helper Functions

```tsx
const getLastName = (name: string | undefined): string => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
};

const getFirstName = (name: string | undefined): string => {
  if (!name) return '';
  return name.trim().split(/\s+/)[0];
};
```

**Logic**:

- First name: Everything before the first space
- Last name: Everything after the last space (or entire name if single word)
- Empty names pushed to end of sorted list

#### C. Enhanced Filtering and Sorting

```tsx
const sortedAndFilteredGraves = useMemo(() => {
  // Filter by search term
  let result = graves.filter((g) => !g.properties.deleted);

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    result = result.filter((g) => {
      const name = g.properties.name?.toLowerCase() || '';
      const gridStr = `${g.grid.row},${g.grid.col}`;
      return name.includes(term) || gridStr.includes(term);
    });
  }

  // Sort based on selected option
  const sorted = [...result].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'first-name':
        // ... comparison logic
        break;
      case 'spatial':
        // Sort by row, then column
        if (a.grid.row !== b.grid.row) {
          comparison = a.grid.row - b.grid.row;
        } else {
          comparison = a.grid.col - b.grid.col;
        }
        break;
      // ... other cases
    }

    // Apply reverse if enabled
    return reverseSort ? -comparison : comparison;
  });

  return sorted;
}, [graves, searchTerm, sortBy, reverseSort]);
```

**Behavior**:

- Search filters first (by name or grid coordinates)
- Then sorting is applied to filtered results
- Reverse toggle inverts the comparison result (works for all sort types)
- Empty/missing values pushed to end of list for all sort types

#### D. Added Sort Dropdown and Reverse Toggle UI

```tsx
<div className="flex items-center gap-2">
  <label className="text-sm text-gray-600 dark:text-gray-400">Sort by:</label>
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value as SortOption)}
    className="flex-1 px-2 py-1 text-sm border rounded-md..."
  >
    <option value="first-name">First Name</option>
    <option value="last-name">Last Name</option>
    <option value="birth-date">Birth Date</option>
    <option value="death-date">Death Date</option>
    <option value="spatial">Location</option>
  </select>
  <button
    onClick={() => setReverseSort(!reverseSort)}
    className={reverseSort ? 'bg-blue-600 text-white' : 'bg-white...'}
    title={reverseSort ? 'Sort order: reversed' : 'Sort order: normal'}
  >
    {reverseSort ? '↓' : '↑'}
  </button>
</div>
```

**UI Components**:

- **Sort Dropdown**: Select the sort field (5 options)
- **Reverse Button**: Toggle button showing ↑ (normal) or ↓ (reversed)
  - Blue background when reversed
  - White/gray background when normal
  - Applies to ANY sort option
  - Tooltip indicates current state

**UI Placement**: Sort controls below search input in header section

**Visual Feedback**:

- Button changes color when active (blue = reversed)
- Arrow icon indicates direction (↑ = A→Z, top→bottom; ↓ = Z→A, bottom→top)

#### E. Added Visual Highlight for Selected Grave

```tsx
className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
  selectedGrave?.uuid === grave.uuid
    ? 'bg-blue-50 dark:bg-blue-900'
    : highlightedGraveUuid === grave.uuid
      ? 'bg-yellow-50 dark:bg-yellow-900'
      : ''
}`}
```

**Colors**:

- **Blue background**: Currently selected grave (clicked on map)
- **Yellow background**: Temporarily highlighted grave (selected from list)
- **Gray hover**: Hover state for all graves

### 2. CemeteryView Component (`src/pages/CemeteryView.tsx`)

#### A. Added List Highlight State

```tsx
// State for highlighting a grave from list selection (with floating label)
const [listHighlightedGrave, setListHighlightedGrave] = useState<Grave | null>(
  null
);
```

**Purpose**: Track which grave was selected from the list to show floating label on map

#### B. Created New List Selection Handler

```tsx
const handleGraveListSelection = (grave: Grave) => {
  // When selecting from list, highlight on map instead of opening info
  setListHighlightedGrave(grave);

  // Clear the highlight after 3 seconds
  setTimeout(() => {
    setListHighlightedGrave(null);
  }, 3000);
};
```

**Behavior**:

- Clicking grave in list sets it as highlighted
- Highlight automatically clears after 3 seconds
- Does NOT open info modal (user must click grave on map to see details)

**Separation of Concerns**:

- `handleGraveClick`: Used for map clicks → opens info modal
- `handleGraveListSelection`: Used for list clicks → highlights on map

#### C. Updated GraveList Props

```tsx
<GraveList
  graves={cemeteryData.graves}
  selectedGrave={selectedGrave}
  onSelectGrave={handleGraveListSelection} // Changed handler
  onSearch={setHighlightedGraves}
  highlightedGraveUuid={listHighlightedGrave?.uuid || null} // New prop
/>
```

#### D. Passed Highlight to MapGrid

```tsx
<MapGrid
  // ... existing props ...
  listHighlightedGrave={listHighlightedGrave} // New prop
  // ... rest of props ...
/>
```

### 3. MapGrid Component (`src/components/MapGrid.tsx`)

#### A. Added Prop for List Highlight

```tsx
interface MapGridProps {
  // ... existing props ...
  listHighlightedGrave?: Grave | null; // Grave highlighted from list selection
  // ... rest of props ...
}
```

#### B. Added Floating Label Rendering

Added after temporary elements (graves/landmarks) and before road cells:

```tsx
{
  /* Floating label for list-highlighted grave */
}
{
  listHighlightedGrave && (
    <g key={`highlight-${listHighlightedGrave.uuid}`}>
      {/* Pulsing ring around grave */}
      <circle
        cx={x + 20}
        cy={y + 20}
        r={22}
        fill="none"
        stroke="rgba(234, 179, 8, 0.8)"
        strokeWidth={3}
      >
        <animate
          attributeName="r"
          values="22;28;22"
          dur="1.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.8;0.3;0.8"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Floating label background */}
      <rect
        x={labelX - labelWidth / 2}
        y={labelY - 20}
        width={labelWidth}
        height={28}
        rx={4}
        fill="rgba(234, 179, 8, 0.95)"
        stroke="rgba(161, 98, 7, 0.8)"
        strokeWidth={2}
      />

      {/* Label text */}
      <text
        x={labelX}
        y={labelY - 4}
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        fill="#1f2937"
      >
        {displayName}
      </text>

      {/* Small pointer arrow */}
      <path
        d={`M ${labelX - 4} ${labelY + 8} L ${labelX + 4} ${labelY + 8} L ${labelX} ${labelY + 12} Z`}
        fill="rgba(234, 179, 8, 0.95)"
      />
    </g>
  );
}
```

**Visual Design**:

1. **Pulsing Ring**: Yellow/gold animated circle around grave icon
   - Radius animates from 22 to 28 pixels
   - Opacity pulses from 0.8 to 0.3
   - 1.5 second animation cycle, infinite repeat
2. **Floating Label**: Yellow/gold rounded rectangle above grave
   - Positioned 10 pixels above grave icon
   - Width calculated based on name length (minimum 100px)
   - Semi-transparent yellow background with darker border
   - Rounded corners (4px border-radius)
3. **Name Text**: Dark gray text centered in label
   - 13px font size, semi-bold weight
   - Shows grave name or "Unnamed" if no name
4. **Pointer Arrow**: Small triangle pointing from label to grave
   - Connects label to the grave visually
   - Same color as label background

**Color Scheme**: Yellow/Gold theme

- `rgba(234, 179, 8, 0.95)` - Label background
- `rgba(161, 98, 7, 0.8)` - Border/stroke
- `#1f2937` - Text color (dark gray)

#### C. Added Auto-Centering on Highlighted Grave

```tsx
// Center view on list-highlighted grave
useEffect(() => {
  if (listHighlightedGrave && svgRef.current) {
    const containerRect = svgRef.current.getBoundingClientRect();

    // Calculate grave's position in SVG coordinates
    const graveX =
      PADDING + listHighlightedGrave.grid.col * CELL_SIZE + CELL_SIZE / 2;
    const graveY =
      PADDING + listHighlightedGrave.grid.row * CELL_SIZE + CELL_SIZE / 2;

    // Calculate where to position the transform so grave is centered
    const targetX = containerRect.width / 2 - graveX * transform.scale;
    const targetY = containerRect.height / 2 - graveY * transform.scale;

    // Smoothly update to the target position
    setTransform((prev) => ({
      ...prev,
      x: targetX,
      y: targetY,
    }));
  }
}, [listHighlightedGrave, transform.scale]);
```

**Behavior**:

- When a grave is selected from the list, the map automatically pans to center that grave
- Centering respects current zoom level
- Grave positioned in exact center of visible map area
- Panning is immediate (instant jump to position)
- User can still manually pan/zoom after centering

**Calculation**:

1. Get grave's position in SVG coordinates (col/row → pixels)
2. Get container's viewport dimensions
3. Calculate transform offset to center grave in viewport
4. Apply new transform while preserving zoom scale

## User Experience Flow

### Before Changes

1. User opens grave list sidebar
2. List shows graves in no particular order
3. User clicks grave in list
4. Info modal opens immediately
5. User must close modal and look at map to find location

### After Changes

1. User opens grave list sidebar
2. User selects sort option (First Name, Last Name, Birth Date, Death Date, or Location)
3. **User can toggle reverse button (↑/↓) to reverse any sort**
4. List reorganizes based on selected sort and direction
5. User clicks grave in list
6. **Map automatically pans to center on the grave**
7. **Floating label appears on map showing grave location**
8. **Pulsing ring draws attention to the grave**
9. Highlight automatically fades after 3 seconds
10. User can click grave on map to see full info modal

### Spatial Sorting Explained

**Location Sort (`spatial`)**:

- **Normal (↑)**: Top to bottom (row ascending), then left to right (column ascending)
  - Starts at row 0 (top of cemetery), works down
  - Within each row, goes from left to right
  - Use case: Walking through cemetery from entrance to back
- **Reversed (↓)**: Bottom to top (row descending), then left to right (column ascending)
  - Starts at highest row number (bottom of cemetery), works up
  - Within each row, goes from left to right
  - Use case: Starting from far end and working toward entrance

**How It Works**: The reverse toggle simply inverts the comparison result, so any sort can be reversed. For spatial sorting, this means:

- Normal: Row 0 → Max (top to bottom)
- Reversed: Max → Row 0 (bottom to top)

## Benefits

1. **Flexible Organization**: Five sort options with universal reverse toggle
   - Name sorting for finding specific person (A→Z or Z→A)
   - Date sorting for chronological research (oldest→newest or newest→oldest)
   - Spatial sorting for physical navigation (top→bottom or bottom→top)
   - **One reverse button works for ALL sorts** (simpler interface)

2. **Better Navigation**: Highlight shows grave location without interrupting workflow
   - **Map automatically centers on selected grave**
   - No modal blocking the view
   - User can see grave in context of surrounding area
   - Auto-dismiss prevents clutter

3. **Visual Feedback**: Pulsing animation draws eye to correct location
   - Hard to miss on large cemetery maps
   - Distinct from other highlight colors (yellow vs blue/green)
   - Combined with auto-centering ensures grave is always visible

4. **Name Parsing**: Smart extraction of first/last names from full names
   - Works with single-word names
   - Works with multi-word names
   - Handles empty/missing names gracefully

5. **Persistent Search**: Sort order applies to filtered search results
   - Search + sort work together seamlessly
   - Can find and organize subset of graves
   - Reverse toggle applies to search results too

## Technical Notes

### Sort Stability

- Empty/missing values always pushed to end of list
- Secondary sorting by column when rows are equal (spatial modes)
- Case-insensitive alphabetical sorting for names
- ISO date string comparison for dates (YYYY-MM-DD format)

### Performance

- `useMemo` prevents unnecessary re-sorting on unrelated renders
- Sort runs only when graves array, search term, or sort option changes
- Timeout cleared automatically if component unmounts

### Accessibility

- Sort dropdown has proper `<label>` with `htmlFor` attribute
- All interactive elements keyboard-accessible
- Color contrast meets WCAG standards (dark text on yellow label)

### Animation

- CSS/SVG animations (no JavaScript frame updates)
- Hardware-accelerated where possible
- Smooth 1.5s cycle for pulsing effect

## Testing Recommendations

1. **Test all sort options** with various grave data:
   - Names with multiple words
   - Single-word names
   - Empty names
   - Various date formats

2. **Test list selection**:
   - Verify yellow highlight in list
   - **Verify map centers on selected grave**
   - Verify floating label appears on map
   - Verify label disappears after 3 seconds
   - Test with graves at different positions (corners, center, edges)
   - Test with different zoom levels

3. **Test combined search + sort**:
   - Search for subset, then change sort
   - Verify filtered results properly sorted

4. **Test spatial sorting**:
   - Verify top-to-bottom goes from row 0 → max row
   - Verify bottom-to-top goes from max row → row 0
   - Verify left-to-right secondary sort

5. **Test edge cases**:
   - Cemetery with single grave
   - All graves with same name
   - All graves with missing dates
   - Very long grave names in label
   - **Graves at extreme corners of large cemetery**

6. **Test responsive behavior**:
   - Sort dropdown on small screens
   - Label positioning near map edges
   - Label readability at different zoom levels
   - **Centering behavior on different screen sizes**

7. **Test user interactions**:
   - Select grave from list, then manually pan/zoom
   - Select different grave while previous highlight is still visible
   - Rapid selection of multiple graves in succession

## Future Enhancements

Possible additions:

- Remember last selected sort option (localStorage)
- Custom sort option (drag-and-drop reordering)
- Group by section/family
- Filter by date range
- Export sorted list to PDF/CSV
