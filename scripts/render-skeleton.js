// Renderiza la plantilla de Backstage igual que el scaffolder: skeleton-common siempre y el
// skeleton del lenguaje elegido, ambos sobre el mismo directorio de salida.
// Uso: node render-skeleton.js <carpeta de la plantilla> <salida> <python|nodejs> <lambda|k8s> [nombre]
// Dependencia: nunjucks (la misma libreria que usa fetch:template).
const nunjucks = require('nunjucks');
const fs = require('fs');
const path = require('path');

const [tpl, out, language, serviceType, name = 'demo-svc'] = process.argv.slice(2);
if (!tpl || !out || !['python', 'nodejs'].includes(language) || !['lambda', 'k8s'].includes(serviceType)) {
  console.error('Uso: node render-skeleton.js <plantilla> <salida> <python|nodejs> <lambda|k8s> [nombre]');
  process.exit(2);
}

// Las expresiones de GitHub Actions usan ${{ }}, igual que el scaffolder: se cambia el delimitador
// de variables como hace Backstage.
const env = new nunjucks.Environment(null, {
  tags: { variableStart: '${{', variableEnd: '}}' },
  autoescape: false,
});

const values = {
  name,
  description: 'Servicio de demostracion generado por verify.sh',
  owner: 'platform-team',
  serviceType,
  language,
  templateVersion: '1.1.0',
  apis: [
    { name: 'list-items', method: 'GET', path: '/items' },
    { name: 'get-item', method: 'GET', path: '/items/{id}' },
    { name: 'create-item', method: 'POST', path: '/items' },
  ],
};

// Se copian sin plantilla: workflows (copyWithoutTemplating) y lockfiles.
const copyRaw = rel =>
  rel.startsWith('.github/workflows') || rel === 'package-lock.json' || rel.endsWith('.hcl');

for (const dir of ['skeleton-common', language === 'python' ? 'skeleton-python' : 'skeleton-nodejs']) {
  const src = path.join(tpl, dir);
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      const rel = path.relative(src, p);
      if (fs.statSync(p).isDirectory()) {
        walk(p);
        continue;
      }
      const target = path.join(out, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const data = fs.readFileSync(p);
      fs.writeFileSync(target, copyRaw(rel) ? data : env.renderString(data.toString('utf8'), { values }));
      fs.chmodSync(target, fs.statSync(p).mode);
    }
  })(src);
}
console.log(`Renderizado ${language}/${serviceType} en ${out}`);
