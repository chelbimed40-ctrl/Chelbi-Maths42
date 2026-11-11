import os, re
for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.ts') or f.endswith('.tsx') or f.endswith('.css'):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8') as fh: c = fh.read()
            oc = c
            c = c.replace('نجاح في الرياضيات', 'النجاح في الرياضيات')
            if c != oc:
                with open(p, 'w', encoding='utf-8') as fh: fh.write(c)
                print(f"Updated {p}")
