from pathlib import Path
import re

root = Path('frontend/templates')
html_files = [root / 'html' / name for name in ['dashboard-admin.html','dashboard-medico.html','dashboard-paciente.html','dashboard-recepcionista.html']]
js_files = [root / 'js' / name for name in ['dashboard-utils.js','dashboard-admin.js','dashboard-medico.js','dashboard-paciente.js','dashboard-recepcionista.js']]
css_file = root / 'css' / 'dashboard.css'

font_link = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0" />\n'
source_font_link = '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>'

for path in html_files:
    text = path.read_text(encoding='utf-8')
    if font_link.strip() not in text:
        text = text.replace(source_font_link, source_font_link + '\n  ' + font_link)
    path.write_text(text, encoding='utf-8')

css_text = css_file.read_text(encoding='utf-8')
nav_icon_block = '.nav-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }'
insert_after = nav_icon_block + '\n\n.material-symbols-outlined {\n  font-family: "Material Symbols Outlined";\n  font-weight: normal;\n  font-style: normal;\n  font-size: inherit;\n  line-height: 1;\n  letter-spacing: normal;\n  text-transform: none;\n  white-space: nowrap;\n  direction: ltr;\n  font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 24;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n}\n.icon-inline { display: inline-flex; align-items: center; gap: 6px; vertical-align: middle; font-size: 18px; }\n.icon-btn .material-symbols-outlined { font-size: 18px; }\n'
if insert_after not in css_text:
    css_text = css_text.replace(nav_icon_block, insert_after)
    css_file.write_text(css_text, encoding='utf-8')

utils_path = root / 'js' / 'dashboard-utils.js'
utils_text = utils_path.read_text(encoding='utf-8')
icon_helper = '''
function iconHtml(name, extraClass) {
  var cls = 'material-symbols-outlined' + (extraClass ? ' ' + extraClass : '');
  return '<span class="' + cls + '">' + name + '</span>';
}
'''
if 'function iconHtml(name, extraClass)' not in utils_text:
    utils_text = utils_text.replace('function esc(s) {', icon_helper + '\nfunction esc(s) {')
    utils_path.write_text(utils_text, encoding='utf-8')

icon_map = {
    '⊞': 'dashboard',
    '👥': 'groups',
    '🩺': 'medical_services',
    '📋': 'article',
    '💊': 'medication',
    '📊': 'bar_chart',
    '📅': 'calendar_today',
    '🔑': 'vpn_key',
    '📄': 'description',
    '👤': 'person',
    '🔍': 'search',
    '⏳': 'schedule',
    '🕐': 'schedule',
    '✕': 'close',
    '❌': 'cancel',
    '⏻': 'power_settings_new',
    '✦': 'medical_services',
    '✅': 'check_circle',
    '⚠️': 'warning',
    '⚠': 'warning',
    '➕': 'add',
    '↻': 'refresh',
    '🔴': 'warning',
    '🟢': 'check_circle',
    '🟡': 'warning',
}

tag_pattern = re.compile(r'(<(span|div)([^>]*?)>)([^<]+?)(</\2>)')
def replace_tag_icons(html):
    def repl(m):
        open_tag, tag, attrs, content, close = m.groups()
        icon = icon_map.get(content.strip())
        if icon:
            if 'class=' in attrs:
                attrs = re.sub(r'class=["\']([^"\']*)["\']', lambda mm: 'class="' + mm.group(1) + ' material-symbols-outlined icon-inline"', attrs)
                return '<' + tag + attrs + '>' + icon + close
            return '<' + tag + ' class="material-symbols-outlined icon-inline">' + icon + close
        return m.group(0)
    return tag_pattern.sub(repl, html)

for path in html_files:
    text = path.read_text(encoding='utf-8')
    text = replace_tag_icons(text)
    for emoji, icon_name in icon_map.items():
        text = text.replace(f'>{emoji} ', f'> <span class="material-symbols-outlined icon-inline">{icon_name}</span> ')
        text = text.replace(f'>{emoji}</button>', f'> <span class="material-symbols-outlined icon-inline">{icon_name}</span></button>')
        text = text.replace(f'>{emoji}</h2>', f'> <span class="material-symbols-outlined icon-inline">{icon_name}</span></h2>')
        text = text.replace(f'>{emoji}</h3>', f'> <span class="material-symbols-outlined icon-inline">{icon_name}</span></h3>')
    text = text.replace('🔍 Generar reporte', '<span class="material-symbols-outlined icon-inline">search</span> Generar reporte')
    text = text.replace('📄 Exportar PDF', '<span class="material-symbols-outlined icon-inline">description</span> Exportar PDF')
    text = text.replace('📦 Registrar Entrada de Stock', '<span class="material-symbols-outlined icon-inline">inventory_2</span> Registrar Entrada de Stock')
    text = text.replace('✅ Finalizar Cita', '<span class="material-symbols-outlined icon-inline">check_circle</span> Finalizar Cita')
    text = text.replace('🔍 Ver médicos disponibles para esa fecha y hora', '<span class="material-symbols-outlined icon-inline">search</span> Ver médicos disponibles para esa fecha y hora')
    text = text.replace('🩺 <span id="horario-texto"></span>', '<span class="material-symbols-outlined icon-inline">medical_services</span> <span id="horario-texto"></span>')
    text = text.replace('check_circle Stock OK', '<span class="material-symbols-outlined icon-inline">check_circle</span> Stock OK')
    text = text.replace('warning Alerta', '<span class="material-symbols-outlined icon-inline">warning</span> Alerta')
    text = text.replace('warning Agotados', '<span class="material-symbols-outlined icon-inline">warning</span> Agotados')
    path.write_text(text, encoding='utf-8')

for path in js_files:
    text = path.read_text(encoding='utf-8')
    text = text.replace('>✏️</button>', '><span class="material-symbols-outlined">edit</span></button>')
    text = text.replace('>🗑</button>', '><span class="material-symbols-outlined">delete</span></button>')
    text = text.replace('>📋 Ver</button>', '><span class="material-symbols-outlined icon-inline">article</span> Ver</button>')
    text = text.replace('>🩺 Atender</button>', '><span class="material-symbols-outlined icon-inline">medical_services</span> Atender</button>')
    text = text.replace('>📅</button>', '><span class="material-symbols-outlined">calendar_today</span></button>')
    text = text.replace('>✕</button>', '><span class="material-symbols-outlined">close</span></button>')
    text = text.replace('>✕ Cerrar</button>', '><span class="material-symbols-outlined">close</span> Cerrar</button>')
    text = text.replace('>📅</span> ', '><span class="material-symbols-outlined">calendar_today</span> ')
    text = text.replace('>📋</span> ', '><span class="material-symbols-outlined">article</span> ')
    text = text.replace('>🔍</span> ', '><span class="material-symbols-outlined">search</span> ')
    text = text.replace('>🕐</span>', '><span class="material-symbols-outlined">schedule</span></span>')
    text = text.replace("const iconoLog = { crear:'➕', editar:'✏️', eliminar:'🗑', acceso:'🔑' };", "const iconoLog = { crear: iconHtml('add', 'log-icon-symbol'), editar: iconHtml('edit', 'log-icon-symbol'), eliminar: iconHtml('delete', 'log-icon-symbol'), acceso: iconHtml('vpn_key', 'log-icon-symbol') };")
    for pat in ['✅ ', '⚠️ ', '⚠ ', '❌ ', '🔴 ', '🟡 ', '🟢 ', '➕ ', '✏️ ', '📋 ', '🩺 ', '📅 ', '💊 ', '📄 ', '🔑 ', '🔍 ']:
        text = text.replace(pat, '')
    path.write_text(text, encoding='utf-8')

print('Icon replacement script completed.')
