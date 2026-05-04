# Quickstart Guide - Proposal for About Page

## Visual Layout Concept

```
┌─────────────────────────────────────────────────────────────┐
│                        About Page                            │
├──────────────────────┬──────────────────────────────────────┤
│                      │                                       │
│   QUICKSTART GUIDE   │     EXISTING CONTENT                 │
│   (Left Sidebar)     │     (Hero, Features, Workflow)       │
│                      │                                       │
│   • Getting Started  │     - Mission Statement              │
│   • Upload CSV       │     - Three Layers                   │
│   • Use AI Features  │     - How It Works                   │
│   • Work Offline     │     - Footer                         │
│   • Export Data      │                                       │
│                      │                                       │
└──────────────────────┴──────────────────────────────────────┘
```

## Content Structure

### 🚀 Getting Started (30 seconds)
- Welcome message
- What Wozny does in one sentence
- Privacy guarantee

### 📤 Upload Your Data
- Drag & drop CSV
- File size limits
- Supported formats
- What happens after upload

### 🤖 Use AI Features
- **Ask Wozny**: Natural language queries
  - Example: "Show me all rows where status is pending"
  - Example: "Find duplicate emails"
- **Smart Analysis**: Automatic insights
  - Health score
  - Missing values
  - Duplicates detection
- **ML Grouping**: Semantic matching
  - Groups similar values automatically

### 🔌 Work Offline
- How offline mode works
- First-time model download
- Subsequent offline usage
- Storage requirements

### 💾 Export Your Data
- Download cleaned CSV
- Export options
- Data format

### 💡 Pro Tips
- Keyboard shortcuts
- Best practices
- Common workflows

## Design Specifications

### Layout
- **Width**: 280px fixed sidebar on desktop
- **Position**: Sticky/fixed on scroll
- **Responsive**: Collapses to accordion on mobile
- **Background**: Light gray (light mode) / Dark gray (dark mode)
- **Border**: Subtle right border

### Typography
- **Section Headers**: Bold, 16px
- **Body Text**: Regular, 14px
- **Examples**: Monospace, 13px, muted color

### Interactive Elements
- Collapsible sections (accordion style)
- Smooth scroll to relevant sections
- Click to jump to Upload tab
- Highlight active section on scroll

### Icons
- Use existing Lucide icons
- Consistent sizing (16px)
- Match color scheme

## Implementation Approach

### Option 1: Sidebar Component (Recommended)
```tsx
<div className="grid grid-cols-[280px_1fr] gap-8">
  <QuickstartSidebar />
  <AboutContent />
</div>
```

**Pros:**
- Clean separation
- Easy to maintain
- Reusable component

### Option 2: Integrated Sections
```tsx
<div className="grid grid-cols-[1fr_2fr] gap-8">
  <div>Quickstart inline</div>
  <div>About content</div>
</div>
```

**Pros:**
- Single component
- Simpler structure

### Option 3: Floating Panel
```tsx
<div className="relative">
  <FloatingQuickstart />
  <AboutContent />
</div>
```

**Pros:**
- Doesn't affect layout
- Can be toggled on/off

## Sample Content (Detailed)

### 🚀 Getting Started
```
Welcome to Wozny v3!

Your intelligent data workshop that runs 
100% in your browser. No servers, no uploads, 
no privacy concerns.

Perfect for:
✓ Cleaning messy CSV files
✓ Finding duplicates & errors
✓ Asking questions about your data
✓ Working with sensitive information
```

### 📤 Upload Your Data
```
1. Click "Upload CSV" or drag & drop
2. Files stay in your browser (never uploaded)
3. Instant analysis begins automatically

Supported:
• CSV files up to 100MB
• Any number of columns
• UTF-8 encoding

After upload, you'll see:
→ Health Score (0-100)
→ Data quality insights
→ Suggested fixes
```

### 🤖 Use AI Features

#### Ask Wozny (Natural Language)
```
Click "Ask Wozny" and type questions like:

"Show me rows with missing emails"
"Find all entries from 2024"
"Which columns have duplicates?"
"Group similar company names"

The AI understands your data and 
responds in plain English.
```

#### Smart Analysis (Automatic)
```
Wozny automatically detects:

✓ Missing values (by column)
✓ Duplicate rows
✓ Data type issues
✓ Formatting problems
✓ Outliers & anomalies

View insights in the "Insights" tab.
```

#### ML Grouping (Semantic)
```
The ML engine finds similar values:

"Google" ≈ "Google Inc"
"NYC" ≈ "New York City"
"john@gmail.com" ≈ "John@Gmail.com"

Enable in Workshop → Smart Tools
```

### 🔌 Work Offline

#### First Time Setup
```
1. Connect to internet
2. Upload any CSV file
3. AI models download automatically
   (one-time, ~50MB)
4. Wait for "Ready" indicator

This takes 2-3 minutes.
```

#### After Setup
```
✓ Disconnect from internet
✓ All features work normally
✓ Models cached in browser
✓ No data ever leaves your device

Perfect for:
• Airplanes
• Secure environments
• Privacy-sensitive work
```

### 💾 Export Your Data
```
After cleaning your data:

1. Click "Export" button
2. Choose format:
   • CSV (cleaned)
   • CSV (with changes highlighted)
   • JSON
3. Download to your computer

Your original file is never modified.
```

### 💡 Pro Tips
```
⌨️ Keyboard Shortcuts:
• Ctrl/Cmd + U: Upload
• Ctrl/Cmd + E: Export
• Ctrl/Cmd + K: Ask Wozny
• Ctrl/Cmd + F: Find in data

🎯 Best Practices:
• Start with a small sample file
• Review insights before editing
• Use "Ask Wozny" for complex filters
• Export frequently to save progress

⚡ Quick Workflows:
1. Upload → Review Insights → Fix → Export
2. Upload → Ask Wozny → Filter → Export
3. Upload → Smart Split → Clean → Export
```

## Mobile Considerations

### Collapsed by Default
- Show "📖 Quick Guide" button
- Expands to overlay/modal
- Sections are accordion-style

### Touch-Friendly
- Larger tap targets (44px min)
- Swipe to dismiss
- Sticky header in modal

## Accessibility

- Semantic HTML (nav, section, article)
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly
- Focus management

## Next Steps

1. **Review this proposal** - Does the content match your vision?
2. **Choose layout option** - Sidebar, integrated, or floating?
3. **Refine content** - Add/remove sections as needed
4. **Implement component** - Build the React component
5. **Test responsiveness** - Ensure mobile works well

---

**Questions to Consider:**
- Should the guide be collapsible/dismissible?
- Do you want progress tracking (e.g., "3/5 steps completed")?
- Should it link to more detailed docs?
- Do you want interactive demos/tooltips?
- Should it remember user's position?
