# Near Future

- ✅ **DONE** Changeable cemetery size. need to be able to add/remove columns/rows on any side.
  - ✅ Implemented grid resize functionality with direction control (top/bottom/left/right)
  - ✅ Added GridResizeModal component for user interaction
  - ✅ Position recalculation for all elements (graves, landmarks, roads)
  - ✅ Conflict detection when removing space
- ✅ **DONE** Abnormally sized cemeteries where we can mask out sections as not being part of the cemetery.
  - ✅ Data model extended to support `validCells` for non-rectangular grids
  - ✅ Grid shape editing UI with paint/erase mode (GridEditToolbar)
  - ✅ Visual display of invalid cells in MapGrid with hatching pattern
  - ✅ Conflict resolution for elements outside valid areas
  - ✅ Click to paint/erase individual cells
  - ✅ Confirmation modal with change summary
- Improve what happens if we have conflicting graves when we merge. Right now it just displays two graves and makes them red, but when you click on them it just brings one up. We want it to bring up some kind of merge resolve window that allows us to choose which data to keep.
- Only give the option to merge data if the cemetery ID is the same.
- Add button to edit sidebar that lets you move an element with a click on a new square. When you click it, it closes everything except the map, highlights the current location, then when you click the new location, it changes the value in the edit sidebar and shows the icon in the new location. If you cancel, it goes back to where it was. If you save, it's permanent.
- Make the toolbar better
