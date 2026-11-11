import os, re
reps = {
    'طالب': 'تلميذ', 'الطالب': 'التلميذ', 'طالبا': 'تلميذا', 'طالبًا': 'تلميذًا',
    'طالبك': 'تلميذك', 'طلاب': 'تلاميذ', 'الطلاب': 'التلاميذ', 'للطالب': 'للتلميذ',
    'للطلاب': 'للتلاميذ', 'بطلابك': 'بتلاميذك', 'طلابك': 'تلاميذك'
}
for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.ts') or f.endswith('.tsx'):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8') as fh: c = fh.read()
            oc = c
            for k,v in reps.items():
                c = re.sub(r'(?<![ء-يأإآؤئة])' + k + r'(?![ء-يأإآؤئة])', v, c)
            if c != oc:
                with open(p, 'w', encoding='utf-8') as fh: fh.write(c)
                print(f"Updated {p}")
