# Groups Demo Cemetery

This sample file demonstrates the **Groups** feature in StoneByStone.

## Overview

This sample contains:

- **5 graves** arranged in a 5x5 grid
- **2 groups** demonstrating different use cases
- Multiple group membership examples

## Groups

### 1. Smith Family (Blue - #3b82f6)

A family group containing:

- John Smith (Row 0, Col 0)
- Mary Smith (Row 0, Col 1)
- Robert Smith Jr. (Row 1, Col 0)

### 2. Section A - North (Green - #10b981)

A location-based group containing:

- John Smith (Row 0, Col 0)
- Mary Smith (Row 0, Col 1)
- Sarah Johnson (Row 2, Col 0)
- David Johnson (Row 2, Col 1)

## Key Features Demonstrated

### Multiple Group Membership

- **John Smith** and **Mary Smith** belong to both groups:
  - Smith Family (family relationship)
  - Section A - North (location)

### Single Group Membership

- **Robert Smith Jr.** only in Smith Family
- **Sarah & David Johnson** only in Section A - North

## How to Use This Sample

1. **Import the file**:
   - Go to Import/Export page
   - Click "Import Cemetery Data"
   - Select `groups-demo.cem.json`

2. **View group information**:
   - Click on any grave to view its details
   - Scroll to the "Groups" section
   - See which groups the grave belongs to
   - See other members of each group

3. **Navigate between members**:
   - In the grave info modal, click on any group member's name
   - The modal will update to show that grave's information
   - Continue clicking to explore relationships

4. **Edit group membership**:
   - Click "Edit" on any grave
   - Scroll to "Groups" section
   - Check/uncheck groups to add/remove membership

5. **Create a new group**:
   - Edit any grave
   - Click "+ New Group" in the Groups section
   - Fill in name, description, and color
   - Click "Create & Add"

## Testing Scenarios

### Scenario 1: Family Relationships

1. View John Smith's information
2. See he's in "Smith Family" group
3. Click on "Mary Smith" (his spouse)
4. Click on "Robert Smith Jr." (their son)
5. Notice the family connections

### Scenario 2: Location Navigation

1. View any grave in "Section A - North"
2. See all neighbors in the same section
3. Use member links to tour the section
4. Notice some are also in family groups

### Scenario 3: Adding to Groups

1. Create a new grave at Row 3, Col 0
2. Add it to "Section A - North" group
3. View the group members - your new grave appears
4. Navigate to other members from your grave

### Scenario 4: Creating New Groups

1. Edit Robert Smith Jr.
2. Create a new group "Veterans"
3. Add a description and color
4. Notice it's automatically added to Robert
5. Edit other graves to add them to "Veterans"

## Data Structure

This sample follows the updated schema with:

- `group_ids` array in grave properties
- `groups` array at the top level
- Proper UUID references between graves and groups
- Optional group descriptions and colors

## Backwards Compatibility

Try importing older sample files (like `willow-creek-example.cem.json`) that don't have groups:

- They will import successfully
- Graves will have no groups initially
- You can add groups to them later
- Export will include groups you've added
