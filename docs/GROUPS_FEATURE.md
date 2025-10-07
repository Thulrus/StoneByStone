# Groups Feature Implementation

## Overview

The Groups feature allows users to organize graves into flexible, multi-membership groups. A grave can belong to multiple groups simultaneously (e.g., a "Smith Family" group and a "Section A" location group).

## Implementation Date

October 6, 2025

## Features

### 1. **Multiple Group Membership**

- Graves can belong to zero or more groups
- No limit on the number of groups a grave can join
- Groups are identified by UUIDs for reliable cross-referencing

### 2. **Group Management in GraveEditor**

- **Add to Existing Groups**: Select from a list of available groups with checkboxes
- **Create New Groups**: Inline group creation directly from the grave editor
- **Group Properties**:
  - Name (required)
  - Description (optional)
  - Color (optional, defaults to #3b82f6)

### 3. **Group Display in ElementInfoModal**

- Shows all groups the grave belongs to
- Lists other members of each group
- Clickable member names to navigate between graves in the same group
- Visual color indicators for each group

### 4. **Data Model**

#### Group Type

```typescript
interface Group {
  uuid: string;
  properties: {
    name: string;
    description?: string;
    color?: string; // Hex color (e.g., '#3b82f6')
    deleted?: boolean;
    last_modified: string; // ISO8601
    modified_by: string;
  };
}
```

#### Grave Properties Extension

```typescript
interface GraveProperties {
  // ... existing fields ...
  group_ids?: string[]; // Array of group UUIDs
  // ... other fields ...
}
```

### 5. **IndexedDB Storage**

- New object store: `groups` (version 4)
- Keyed by `uuid`
- Helper functions:
  - `saveOrUpdateGroup(group)`
  - `getAllGroups()`
  - `getGroup(uuid)`
  - `deleteGroup(uuid)` (soft delete)
  - `getGravesByGroupId(groupId)`
  - `getGroupsForGrave(graveUuid)`

### 6. **JSON Schema**

Groups are added to the schema as an optional array:

```json
{
  "groups": {
    "type": "array",
    "description": "List of groups for organizing graves",
    "items": {
      "type": "object",
      "required": ["uuid", "properties"],
      "properties": {
        "uuid": { "type": "string", "pattern": "^[0-9a-f]{8}-..." },
        "properties": {
          "required": ["name", "last_modified", "modified_by"],
          "properties": {
            "name": { "type": "string" },
            "description": { "type": "string" },
            "color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
            "deleted": { "type": "boolean" },
            "last_modified": { "type": "string", "format": "date-time" },
            "modified_by": { "type": "string" }
          }
        }
      }
    }
  }
}
```

## Backwards Compatibility

### Import/Export

- **Groups field is optional** in the schema
- Old data files without groups will import successfully
- Graves without `group_ids` are treated as belonging to no groups
- Export includes groups only if they exist

### Database Migration

- Database version upgraded from 3 to 4
- New `groups` object store created automatically
- Existing data remains intact
- No migration of old data needed

### Merge Logic

- Groups are merged using last-write-wins strategy
- `group_ids` field in graves is treated like other optional properties
- New groups from incoming data are added
- Existing groups are updated if incoming version is newer

## User Workflow

### Creating a Group

1. Open grave editor (new or existing grave)
2. Scroll to "Groups" section
3. Click "+ New Group"
4. Fill in:
   - Name (required)
   - Description (optional)
   - Color (optional, color picker)
5. Click "Create & Add"
6. Group is created and automatically added to the current grave

### Adding to Existing Group

1. Open grave editor
2. Scroll to "Groups" section
3. Check the box next to desired group(s)
4. Save grave

### Viewing Group Members

1. View grave information (click grave on map or in list)
2. Scroll to "Groups" section
3. See all groups the grave belongs to
4. Each group shows:
   - Group name and description
   - Color indicator
   - List of other members
5. Click on a member name to view that grave

### Navigating Between Group Members

1. In ElementInfoModal, click any group member name
2. Modal updates to show the selected grave's information
3. Can continue clicking through related graves

## Files Modified

### Type Definitions

- `src/types/cemetery.ts`
  - Added `Group` interface
  - Added `GroupProperties` interface
  - Added `group_ids?: string[]` to `GraveProperties`
  - Added `groups?: Group[]` to `CemeteryData`

### Schema

- `schema/cemetery.schema.json`
  - Added `groups` array definition
  - Added `group_ids` to grave properties

### Database

- `src/lib/idb.ts`
  - Added `groups` object store to schema
  - Incremented database version to 4
  - Added group management functions
  - Updated `loadCemetery()` to include groups
  - Updated `replaceAllData()` to handle groups
  - Updated `clearAllData()` to clear groups

### Merge Logic

- `src/lib/merge.ts`
  - Added `Group` import
  - Added `group_ids` to property fields for merging
  - Updated `applyMergeResult()` to merge groups

### Components

- `src/components/GraveEditor.tsx`
  - Added group selection UI
  - Added new group creation form
  - Added state management for groups
  - Integrated group management functions

- `src/components/ElementInfoModal.tsx`
  - Added group display section
  - Added group member navigation
  - Added `onNavigateToGrave` prop
  - Load and display group information

- `src/pages/CemeteryView.tsx`
  - Added `onNavigateToGrave` handler
  - Enables navigation between group members

## Testing Recommendations

### Manual Tests

1. **Create a new group** from grave editor
2. **Add multiple graves** to the same group
3. **View group members** from each grave
4. **Navigate between members** using clickable names
5. **Add grave to multiple groups** (e.g., family + location)
6. **Export data** and verify groups are included
7. **Import data** with groups and verify they load
8. **Import old data** without groups (should work)
9. **Test merge** with conflicting group memberships

### Edge Cases

- Empty groups (no members)
- Grave in many groups
- Very long group names/descriptions
- Groups with special characters
- Deleted groups (soft delete)
- Orphaned group_ids (reference to deleted group)

## Future Enhancements

Potential improvements for future versions:

1. **Group Management Page**
   - Dedicated UI to view/edit all groups
   - Bulk operations on group membership
   - Group statistics (member count, etc.)

2. **Visual Indicators on Map**
   - Color-code graves by group on the map
   - Toggle group visibility
   - Group-based filtering

3. **Advanced Filtering**
   - Filter grave list by group
   - Multi-group AND/OR queries
   - Group search functionality

4. **Group Templates**
   - Predefined group types (Family, Location, etc.)
   - Bulk import of group memberships

5. **Group Relationships**
   - Hierarchical groups (parent/child)
   - Group intersections and unions

## Migration Guide

For users with existing data:

1. **No action required** - groups are optional
2. **Update will be automatic** when opening the app
3. **Database version** will upgrade from 3 to 4
4. **All existing data** remains intact
5. **Start using groups** immediately after update

## API Reference

### Group Functions (idb.ts)

```typescript
// Save or update a group
saveOrUpdateGroup(group: Group): Promise<void>

// Get all groups (including deleted)
getAllGroups(): Promise<Group[]>

// Get a single group by UUID
getGroup(uuid: string): Promise<Group | undefined>

// Soft delete a group
deleteGroup(uuid: string): Promise<void>

// Get all graves in a specific group
getGravesByGroupId(groupId: string): Promise<Grave[]>

// Get all groups a grave belongs to
getGroupsForGrave(graveUuid: string): Promise<Group[]>
```

### Component Props

#### ElementInfoModal

```typescript
interface ElementInfoModalProps {
  // ... existing props ...
  onNavigateToGrave?: (grave: Grave) => void;
}
```

## Notes

- Groups use soft delete (set `deleted: true`) like graves
- Group colors are stored as hex strings (e.g., '#3b82f6')
- Groups are tracked with change logs like other entities
- Group membership is stored in the grave's `group_ids` array
- Empty `group_ids` array is the same as undefined (no groups)
