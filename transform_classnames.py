#!/usr/bin/env python3
"""Transform plain className strings to CSS Module styles references
in saju-love result page sub-components (after line 1742).
"""
import re
import sys

SKIP_CLASSES = {'material-icons', 'material-symbols-outlined', 'material-symbols-rounded'}

def transform_simple_classname(match):
    """Transform className="class1 class2" to CSS Module format."""
    class_str = match.group(1)
    classes = class_str.split()
    if any(c in SKIP_CLASSES for c in classes):
        return match.group(0)
    if len(classes) == 1:
        return f'className={{styles.{classes[0]}}}'
    styled = ' '.join(f'${{styles.{c}}}' for c in classes)
    return f'className={{`{styled}`}}'

def parse_template_content(content):
    """Transform class names inside template literal content."""
    result = []
    i = 0

    while i < len(content):
        # Whitespace
        if content[i] in ' \n\t\r':
            result.append(content[i])
            i += 1
            continue

        # ${...} expression
        if content[i:i+2] == '${':
            depth = 1
            j = i + 2
            while j < len(content) and depth > 0:
                if content[j] == '{':
                    depth += 1
                elif content[j] == '}':
                    depth -= 1
                j += 1
            expr = content[i+2:j-1]

            # Simple identifier used as class name: ${status} -> ${styles[status]}
            if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', expr):
                result.append(f'${{styles[{expr}]}}')
            # Already using styles -> leave as is
            elif 'styles.' in expr or 'styles[' in expr:
                result.append('${' + expr + '}')
            else:
                # Transform quoted class names: "highlight" -> styles.highlight
                # But keep empty strings "" as is
                transformed = re.sub(
                    r'"([a-z_][a-z0-9_]+)"',
                    lambda m: f'styles.{m.group(1)}',
                    expr
                )
                result.append('${' + transformed + '}')

            i = j
            continue

        # Bare word (potential class name)
        if content[i].isalpha() or content[i] == '_':
            j = i
            while j < len(content) and (content[j].isalnum() or content[j] == '_'):
                j += 1
            word = content[i:j]

            # Dynamic suffix: elem_${var} -> styles["elem_" + var]
            if j < len(content) and content[j:j+2] == '${':
                depth = 1
                k = j + 2
                while k < len(content) and depth > 0:
                    if content[k] == '{':
                        depth += 1
                    elif content[k] == '}':
                        depth -= 1
                    k += 1
                var_expr = content[j+2:k-1]
                result.append(f'${{styles["{word}" + {var_expr}]}}')
                i = k
            elif word in SKIP_CLASSES:
                result.append(word)
                i = j
            else:
                result.append(f'${{styles.{word}}}')
                i = j
            continue

        # Other characters
        result.append(content[i])
        i += 1

    return ''.join(result)

def transform_template_classname(match):
    """Transform className={`...`} pattern."""
    content = match.group(1)
    # Skip if already using styles
    if 'styles.' in content or 'styles[' in content:
        return match.group(0)
    transformed = parse_template_content(content)
    return 'className={`' + transformed + '`}'

def main():
    filepath = sys.argv[1]

    with open(filepath, 'r') as f:
        content = f.read()

    lines = content.split('\n')
    START = 1742  # 0-indexed, transform from this line onwards

    # Step 1: Transform className="..." patterns
    count_simple = 0
    for i in range(START, len(lines)):
        new_line, n = re.subn(r'className="([^"]+)"', transform_simple_classname, lines[i])
        count_simple += n
        lines[i] = new_line

    # Step 2: Transform className={`...`} patterns
    before_text = '\n'.join(lines[:START])
    after_text = '\n'.join(lines[START:])
    after_text, count_template = re.subn(
        r'className=\{`([\s\S]*?)`\}',
        transform_template_classname,
        after_text
    )

    # Write result
    with open(filepath, 'w') as f:
        f.write(before_text + '\n' + after_text)

    print(f"Done! Transformed {count_simple} simple + {count_template} template literal classNames.")

if __name__ == '__main__':
    main()
