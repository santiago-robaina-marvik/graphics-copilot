---
date: 2026-02-02T12:00:00-03:00
researcher: santiago
git_commit: f8efd02f3b7c42101069c9efbd087d31a9cd71c9
branch: agentic-improvements
repository: graphics-copilot
topic: "Layout Drag and Drop Functionality"
tags: [research, codebase, drag-drop, templates, layout]
status: complete
last_updated: 2026-02-02
last_updated_by: santiago
---

# Research: Layout Drag and Drop Functionality

**Date**: 2026-02-02T12:00:00-03:00
**Researcher**: santiago
**Git Commit**: f8efd02f3b7c42101069c9efbd087d31a9cd71c9
**Branch**: agentic-improvements
**Repository**: graphics-copilot

## Research Question
The layout drag and drop is not working properly - document how the current implementation works.

## Summary

The layout drag and drop system uses **native HTML5 Drag and Drop API** (no external libraries) to allow users to drag charts from the gallery in `AISidebar` and drop them into template slots in `TemplateSelector`. The implementation consists of:

1. **Drag Source**: Gallery items in `AISidebar.jsx` (lines 437-441) with `draggable` attribute and `onDragStart` handler
2. **Drop Target**: Template slots in `TemplateSelector.jsx` (lines 207-248) with `onDragOver`, `onDragLeave`, and `onDrop` handlers
3. **State Management**: `slotCharts` object state that maps slot indices to chart objects
4. **Data Transfer**: Chart ID is passed via `e.dataTransfer.setData("chartId", chart.id.toString())`

## Detailed Findings

### 1. Drag Source Implementation (AISidebar)

**File**: `src/components/AISidebar.jsx:433-441`

The gallery items are made draggable with inline handlers:

```jsx
<div
  key={chart.id}
  className="gallery-item"
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData("chartId", chart.id.toString());
    e.dataTransfer.effectAllowed = "copy";
  }}
>
```

**Key aspects**:
- The `draggable` attribute is set directly on the div (boolean, no value)
- The `chartId` is converted to string and stored in DataTransfer
- `effectAllowed` is set to "copy"
- There is no `onDrag` or `onDragEnd` handler

**Styling** (`AISidebar.css:426-442`):
- `.gallery-item` has `cursor: grab`
- `.gallery-item:active` has `cursor: grabbing`
- `.gallery-item[draggable="true"]:hover` adds box-shadow and translateY(-2px) transform

### 2. Drop Target Implementation (TemplateSelector)

**File**: `src/components/TemplateSelector.jsx:207-248`

The `TemplateSlot` component handles drop events:

```jsx
function TemplateSlot({ slotIndex, chart, onDrop }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const chartId = parseInt(e.dataTransfer.getData("chartId"), 10);
    if (chartId) {
      onDrop(slotIndex, chartId);
    }
  };

  return (
    <div
      className={`template-slot ${isDragOver ? "drag-over" : ""} ${chart ? "filled" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* slot content */}
    </div>
  );
}
```

**Key aspects**:
- `e.preventDefault()` is called in both `handleDragOver` and `handleDrop`
- `isDragOver` state controls the `drag-over` CSS class for visual feedback
- `chartId` is parsed from string to integer using `parseInt(..., 10)`
- The callback `onDrop(slotIndex, chartId)` is called on successful drop

### 3. State Update Flow

**Parent Handler** (`TemplateSelector.jsx:93-98`):

```jsx
const handleDrop = (slotIndex, chartId) => {
  setSlotCharts((prev) => ({
    ...prev,
    [slotIndex]: generatedCharts.find((c) => c.id === chartId),
  }));
};
```

The chart object is looked up from `generatedCharts` array by ID and stored in the `slotCharts` object keyed by slot index.

### 4. Template Canvas Structure

**File**: `TemplateSelector.jsx:169-197`

The template canvas is rendered as an overlay positioned absolutely below the template header:

```jsx
<div className="template-canvas-overlay" ref={containerRef}>
  <div className="template-canvas-container">
    <div className="template-canvas-wrapper" style={{ width: ..., height: ... }}>
      <div
        className={`template-canvas layout-${currentVariation.layout}`}
        ref={templateRef}
        style={{
          width: CANVAS_WIDTH,  // 960px
          height: CANVAS_HEIGHT, // 540px
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Slots rendered here */}
      </div>
    </div>
  </div>
</div>
```

**CSS positioning** (`TemplateSelector.css:16-27`):

```css
.template-canvas-overlay {
  position: absolute;
  top: 100%;
  left: 16px;
  right: 16px;
  z-index: 100;
  /* ... */
}
```

The overlay uses `position: absolute` and `z-index: 100` to float above other content.

### 5. CSS Layout Classes

**File**: `TemplateSelector.css:157-223`

Each template variation applies a different CSS grid configuration:

| Layout Class | Grid Definition |
|--------------|-----------------|
| `layout-full` | 1 column, 1 row |
| `layout-half-top` | 1 column, 2 rows, slot in row 1 |
| `layout-half-bottom` | 1 column, 2 rows, slot in row 2 |
| `layout-half-left` | 2 columns, 1 row, slot in column 1 |
| `layout-half-right` | 2 columns, 1 row, slot in column 2 |
| `layout-split-horizontal` | 2 columns, 1 row |
| `layout-split-vertical` | 1 column, 2 rows |
| `layout-grid` | 2 columns, 2 rows |

### 6. Drop Zone Visual Feedback

**File**: `TemplateSelector.css:225-246`

```css
.template-slot {
  background: var(--bg-tertiary);
  border: 2px dashed var(--border-subtle);
  transition: all 0.2s ease;
}

.template-slot.drag-over {
  border-color: var(--accent-blue);
  background: rgba(61, 90, 254, 0.1);
}

.template-slot.filled {
  border-style: solid;
  border-color: transparent;
  background: transparent;
}
```

### 7. Template Definitions

**File**: `TemplateSelector.jsx:17-46`

```javascript
const TEMPLATES = {
  full: { name: "Full", slots: 1, variations: [{ layout: "full", label: "Full" }] },
  half: {
    name: "Half", slots: 1,
    variations: [
      { layout: "half-top", label: "Top" },
      { layout: "half-bottom", label: "Bottom" },
      { layout: "half-left", label: "Left" },
      { layout: "half-right", label: "Right" }
    ]
  },
  sideBySide: {
    name: "Split", slots: 2,
    variations: [
      { layout: "split-horizontal", label: "Left/Right" },
      { layout: "split-vertical", label: "Top/Bottom" }
    ]
  },
  grid: { name: "2x2 Grid", slots: 4, variations: [{ layout: "grid", label: "Grid" }] }
}
```

## Code References

- Drag source (gallery items): `src/components/AISidebar.jsx:433-441`
- Drag source styling: `src/components/AISidebar.css:426-442`
- Drop target component: `src/components/TemplateSelector.jsx:207-248`
- State update handler: `src/components/TemplateSelector.jsx:93-98`
- Template canvas rendering: `src/components/TemplateSelector.jsx:169-197`
- Overlay positioning CSS: `src/components/TemplateSelector.css:16-27`
- Drop zone styling: `src/components/TemplateSelector.css:225-246`
- Layout grid definitions: `src/components/TemplateSelector.css:157-223`
- Template definitions: `src/components/TemplateSelector.jsx:17-46`

## Architecture Documentation

### Component Hierarchy

```
App.jsx
├── TemplateSelector (drop target container)
│   └── TemplateSlot (individual drop zones)
└── AISidebar
    └── Gallery items (drag sources)
```

### Data Flow

1. User drags chart from gallery
2. `onDragStart` stores `chartId` in DataTransfer
3. User hovers over template slot
4. `onDragOver` shows visual feedback via `isDragOver` state
5. User drops chart
6. `onDrop` extracts `chartId` from DataTransfer
7. Parent `handleDrop` updates `slotCharts` state
8. React re-renders slot with chart image

### Technology

- **No external drag-drop libraries** - Uses native HTML5 Drag and Drop API
- **CSS Grid** for template layout positioning
- **React state** for drag-over visual feedback and slot assignments
- **html-to-image** library for saving filled templates as images

## Historical Context (from thoughts/)

- `thoughts/shared/plans/2026-01-23-plot-templates-feature.md` - Original implementation plan for the template selector feature, including drag-and-drop design using HTML5 API
- `thoughts/shared/research/2026-01-22-system-specification.md` - System specification documenting component architecture and drag-drop file upload implementation

## Related Research

- None found in `thoughts/shared/research/` related to drag-drop

## Observed Issues (User Reported)

**Browser**: Chrome
**Symptoms**:
1. ✅ Drag starts correctly from gallery items
2. ❌ No blue highlight appears when dragging over template slots
3. ❌ Chart doesn't appear in slot after dropping
4. ℹ️ Highlight appears when hovering over layout selection buttons (not the slots)

**Root Cause Analysis**:

The template slots are **not receiving drag events** (`onDragOver`, `onDrop`). This indicates the drag events are being blocked or not reaching the slot elements.

### Potential Causes

#### 1. CSS Transform Interaction (Most Likely)
**File**: `TemplateSelector.jsx:177-185`

```jsx
<div
  className={`template-canvas layout-${currentVariation.layout}`}
  ref={templateRef}
  style={{
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  }}
>
```

The `transform: scale()` applied to the canvas can interfere with drag event hit detection in some browsers. The browser may calculate drag coordinates relative to the untransformed element, causing events to miss the actual visual position.

#### 2. Wrapper Element Hierarchy
**File**: `TemplateSelector.jsx:169-197`

The slot elements are nested 4 levels deep:
```
.template-canvas-overlay (absolute positioning)
  └── .template-canvas-container
      └── .template-canvas-wrapper (sized container)
          └── .template-canvas (scaled element)
              └── .template-slot (drop target)
```

The intermediate wrapper elements might be:
- Not having `pointer-events: none` set, blocking events
- Creating a stacking context that interferes with drag detection
- Sized incorrectly, causing overflow/clipping

#### 3. Absolute Positioning with Z-Index
**File**: `TemplateSelector.css:16-27`

```css
.template-canvas-overlay {
  position: absolute;
  top: 100%;
  left: 16px;
  right: 16px;
  z-index: 100;
}
```

The overlay's absolute positioning places it outside the normal document flow. Drag events might not propagate correctly through absolute positioned elements, especially when the drag source (sidebar) is in a different stacking context.

#### 4. Missing Pointer Events Style
The wrapper elements (`.template-canvas-wrapper`, `.template-canvas-container`) don't have explicit `pointer-events` CSS declarations. If any parent has `pointer-events: none`, it would block all drag events.

#### 5. Scale Calculation Impact
**File**: `TemplateSelector.jsx:56-72`

```jsx
useEffect(() => {
  const updateScale = () => {
    // ...
    const newScale = Math.min(scaleX, scaleY, 0.45);
    setScale(Math.max(newScale, 0.2));
  };
  updateScale();
  window.addEventListener("resize", updateScale);
  return () => window.removeEventListener("resize", updateScale);
}, [selectedTemplate]);
```

The scale can range from 0.2 to 0.45. At very small scales, the visual size of slots may not match their hit detection area, causing drag events to miss.

## Fix Applied

### Changes Made

**1. Removed CSS Transform** (`TemplateSelector.jsx:169-186`)

**Before**:
```jsx
<div className="template-canvas-wrapper" style={{ width: scaled, height: scaled }}>
  <div className="template-canvas" style={{ transform: `scale(${scale})` }}>
    <TemplateSlot />
  </div>
</div>
```

**After**:
```jsx
<div className="template-canvas" style={{ width: scaled, height: scaled }}>
  <TemplateSlot />
</div>
```

The canvas is now sized directly using `width` and `height` properties instead of CSS `transform: scale()`. This allows drag events to reach the slots correctly.

**2. Updated Save Handler** (`TemplateSelector.jsx:100-120`)

Added logic to temporarily restore full size before capturing:
```jsx
const handleSave = async () => {
  // Temporarily restore full size for high-quality capture
  templateRef.current.style.width = `${CANVAS_WIDTH}px`;
  templateRef.current.style.height = `${CANVAS_HEIGHT}px`;
  await new Promise(resolve => setTimeout(resolve, 100));

  await onSaveTemplate(templateRef.current, currentVariation.layout);

  // Restore scaled size
  templateRef.current.style.width = originalWidth;
  templateRef.current.style.height = originalHeight;
};
```

**3. Updated CSS** (`TemplateSelector.css`)

- Removed `.template-canvas-wrapper` styles (element no longer exists)
- Moved `border-radius` and `box-shadow` to `.template-canvas`
- Added `pointer-events: auto` to ensure events are not blocked

### Why This Fixes the Issue

CSS transforms create a new stacking context and can cause coordinate calculation issues for drag events. The browser may calculate drag positions based on the untransformed element, causing events to miss the visually scaled targets. By using direct sizing instead, the element's actual dimensions match its visual dimensions, allowing proper drag event hit detection.

### Testing

All 12 existing tests pass after the changes.
