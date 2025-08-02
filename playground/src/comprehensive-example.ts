export const comprehensiveExample = `# Comprehensive Markdown Example

This document demonstrates all the markdown nodes supported by @vaneui/md.

## Headings

# Heading 1
## Heading 2
### Heading 3 with [link](https://example.com)
#### Heading 4
##### Heading 5
###### Heading 6

## Paragraphs and Text Formatting

This is a regular paragraph with various inline elements. You can use **bold text** (strong), *italic text* (emphasis), ~~strikethrough text~~, and \`inline code\`. You can also combine them: ***bold and italic***, **_bold and italic_**, or ~~**strikethrough and bold**~~.

This is another paragraph separated by a blank line. It demonstrates that paragraphs are properly spaced. And here is [inline link](https://example.com)

## Links

Here are different types of links:
- [External link](https://example.com)
- [Link with title](https://example.com "Example Website")
- [Reference-style link][1]
- Direct URL: https://example.com

[1]: https://example.com "Reference Link"

## Images

![Sample Image](https://placehold.co/600x400 "Image Title")

![Another Image](https://placehold.co/300x200)

## Lists

### Unordered Lists

- First level item
- Another first level item
  - Second level item
  - Another second level item
    - Third level item
    - Another third level item
  - Back to second level
- Back to first level

### Ordered Lists

1. First item
2. Second item
   1. Nested item 2.1
   2. Nested item 2.2
3. Third item
   1. Nested item 3.1
      1. Deep nested 3.1.1
      2. Deep nested 3.1.2
   2. Nested item 3.2
4. Fourth item

### Mixed Lists

1. Ordered item one
   - Unordered sub-item
   - Another unordered sub-item
2. Ordered item two
   1. Ordered sub-item
   2. Another ordered sub-item
      - Deep unordered item
      - Another deep unordered item

## Blockquotes

> This is a simple blockquote.

> This is a multi-line blockquote.
> It continues on the second line.
> And even has a third line.

> Blockquotes can contain other elements:
> 
> - Lists work inside quotes
> - **Bold text** works too
> 
> > And they can be nested!
> > This is a nested quote.

## Code Blocks

### JavaScript Example

\`\`\`javascript
// Function to greet users
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return {
    message: \`Welcome, \${name}!\\,
    timestamp: new Date()
  };
}

// Using the function
const result = greet('World');
console.log(result);
\`\`\`

### TypeScript Example

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

class UserService {
  private users: Map<number, User> = new Map();

  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  getUser(id: number): User | undefined {
    return this.users.get(id);
  }
}
\`\`\`

### CSS Example

\`\`\`css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card {
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
\`\`\`

### Code without language

\`\`\`
This is a code block without syntax highlighting.
It can contain any text.
    Including indentation.
\`\`\`

## Tables

### Simple Table

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
| Cell 7   | Cell 8   | Cell 9   |

### Table with Alignment

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Left         | Center         | Right         |
| 123          | 456            | 789           |
| Lorem        | Ipsum          | Dolor         |

### Complex Table

| Feature | Description | Status | Priority |
|---------|-------------|--------|----------|
| Markdown Parsing | Parse all standard markdown elements | ✅ Complete | High |
| Custom Components | Use VaneUI components for rendering | ✅ Complete | High |
| Configuration | Allow component overrides | ✅ Complete | Medium |
| Dark Mode | Support dark theme | ✅ Complete | Medium |
| Syntax Highlighting | Highlight code blocks | 🔄 In Progress | Low |

## Horizontal Rules

Text before horizontal rule.

---

Text after first horizontal rule.

***

Text after second horizontal rule.

___

Text after third horizontal rule.

## Line Breaks

This line ends with two spaces for a hard break.  
This line appears immediately after.

This line has no special ending.
This line has a soft break (treated as space).

This line is followed by a backslash hard break.\\
This line also appears immediately after.

## Special Characters and Escaping

You can escape special characters with backslashes: \\* \\_ \\# \\[ \\] \\( \\) \\! \\

HTML entities work too: &copy; &trade; &reg; &mdash; &ndash; &hellip;

## Inline HTML (if supported)

Some <em>emphasized text</em> using HTML tags.

<div style="padding: 10px; background: #f0f0f0; border-radius: 5px;">
  This is a div with inline styles.
</div>

## Error Handling

This section might demonstrate error handling if there are any parsing errors or unsupported elements.

## Conclusion

This document has demonstrated all the major markdown elements supported by the @vaneui/md component, including:

- All heading levels (h1-h6)
- Paragraphs with various inline formatting
- Links and images
- Ordered, unordered, and nested lists
- Blockquotes (including nested)
- Code blocks with syntax highlighting
- Tables with alignment
- Horizontal rules
- Line breaks (hard and soft)
- Special character escaping

The component uses VaneUI components for rendering, providing a consistent design system integration.`;