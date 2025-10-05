# Grid Resize Feature - User Guide

## Quick Start

The Grid Resize feature allows you to expand or shrink your cemetery dimensions after creation. You can add or remove rows and columns from any side of the cemetery.

## Accessing Grid Resize

1. Open a cemetery in the main view
2. Look for the **"Resize Grid"** button in the bottom-right corner of the map (next to the marker toolbar)
3. Click the button to open the Grid Resize modal

**Note:** The Resize Grid button is disabled while you're editing an element. Finish or cancel your edit first.

## Using the Grid Resize Modal

### Step 1: Choose Direction

Select which side you want to add to or remove from:

- **⬆️ Top** - Add/remove rows above existing layout
- **⬇️ Bottom** - Add/remove rows below existing layout
- **⬅️ Left** - Add/remove columns to the left
- **➡️ Right** - Add/remove columns to the right

### Step 2: Enter Count

- **Positive numbers** = Add rows/columns
- **Negative numbers** = Remove rows/columns

Examples:

- Enter `5` to add 5 rows/columns
- Enter `-3` to remove 3 rows/columns

### Step 3: Review Preview

The modal shows:

- Current dimensions (e.g., "10 rows × 10 columns")
- New dimensions after change (e.g., "15 rows × 10 columns")
- Warning if elements will be shifted
- Warning if elements would go out of bounds

### Step 4: Apply or Cancel

- Click **"Resize Grid"** to apply changes
- Click **"Cancel"** to close without changes

## Important Behavior

### When Adding Space

**Adding to Bottom or Right:**

- No elements move
- New space is added
- Safest option

**Adding to Top or Left:**

- ALL elements shift to make room
- Top: Everything shifts down
- Left: Everything shifts right
- A warning is shown before applying

### When Removing Space

**Conflicts:**

- If graves, landmarks, or roads would be outside the new boundaries, they are marked as **conflicts**
- Conflicted elements are NOT moved
- You'll see a list of affected elements
- You can still proceed, but should manually move or delete those elements

**Example:**

- Cemetery is 15 rows tall
- You remove 5 rows from the top
- Graves in rows 0-4 will be out of bounds
- Those graves stay in place (conflict)
- Other graves shift up

## Tips and Best Practices

### Planning Your Layout

1. **Start Small, Expand Later**: Better to start with a smaller grid and expand as needed
2. **Expand Down and Right**: These directions don't shift existing elements
3. **Think About Growth**: Leave room for future graves in active sections

### Avoiding Conflicts

1. **Check Before Removing**: Review what's in the area you're about to remove
2. **Move First, Then Remove**: Manually relocate elements before shrinking
3. **Use List View**: The grave list helps you find elements by position

### Common Workflows

**Expanding an Active Cemetery:**

```
1. Cemetery running out of space on bottom
2. Click "Resize Grid"
3. Select "Bottom"
4. Enter number of new rows needed
5. Apply → Instant expansion!
```

**Fixing Initial Size Mistake:**

```
1. Realized you made cemetery too wide
2. Check right edge for graves (use grave list)
3. If empty, remove columns from right
4. Click "Resize Grid"
5. Select "Right"
6. Enter negative number (e.g., -5)
7. Apply if no conflicts
```

**Making Room for New Section:**

```
1. Want to add a new section on the left
2. Click "Resize Grid"
3. Select "Left"
4. Enter number of columns
5. Confirm shift warning
6. Apply → All elements shift right, new space on left
```

## Troubleshooting

### "The button is disabled"

- Make sure you're not currently editing a grave, landmark, or road
- Close any open editor panels
- The button should become enabled

### "Conflicts detected"

- Some elements would be outside the new boundaries
- Options:
  1. Cancel and manually move those elements first
  2. Proceed anyway (elements stay in original positions)
  3. Change the resize parameters

### "Everything shifted unexpectedly"

- This happens when adding to Top or Left
- All elements must shift to make room for new space
- Always read the warning message before applying
- Use Undo if you have unsaved work (refresh browser)

### "Lost my place after resize"

- Use the grave list to find elements
- Cemetery dimensions are now different
- Grid positions updated in all elements
- Changes are logged in history

## User Identification

If you haven't set a user identifier yet, you'll be prompted when you click "Resize Grid":

1. Enter your name or identifier
2. This tracks who made the change
3. Stored for future operations

## Data Safety

- All changes are saved atomically (all-or-nothing)
- Change history logs every resize operation
- Export your data before major changes
- Browser cache persists between sessions

## What About Non-Rectangular Cemeteries?

The data model supports non-rectangular layouts, but the UI for creating them is not yet implemented. Coming in a future update:

- Paint/erase mode to create custom shapes
- L-shaped, T-shaped, and irregular layouts
- Visual overlay showing valid/invalid areas

For now, all cemeteries are rectangular.

## Keyboard Shortcuts

- **Esc** - Cancel marker add mode (if active)

## Related Features

- **Marker Toolbar** - Add graves, landmarks, roads
- **Grave List** - Find elements by name or position
- **Element Editors** - Edit individual element properties
- **Import/Export** - Backup and share cemetery data

## Need Help?

See also:

- `docs/CEMETERY_DIMENSION_MANAGEMENT.md` - Technical details
- `docs/GRID_RESIZE_IMPLEMENTATION.md` - Implementation notes
- `README.md` - General app documentation
