#!/usr/bin/env node

const fs = require('fs');

if (!fs.existsSync('./gen')) {
  return;
}

const excludesTexFiles = ['document.tex'];
let files = [];
if (fs.existsSync('./gen/tex_files.json')) {
  const inputFile = './gen/tex_files.json';
  files = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
}

fs.readdirSync('./gen', { recursive: true }).forEach((file) => {
  if (!file.endsWith('.log')) {
    return;
  }

  const content = fs.readFileSync(`./gen/${file}`, 'utf8');
  const regx = /(?<=\/)[^\/]*?\.[\n\r]{0,1}[cst][\n\r]{0,1}[lfte][\n\r]{0,1}[sgyx]/g;
  content.match(regx)?.forEach((match) => {
    const texFile = match.replace(/[\n\r]/g, '');
    if (
      files.includes(texFile) ||
      excludesTexFiles.includes(texFile) ||
      texFile.startsWith('texstudio_')
    ) {
      return;
    }

    files.push(texFile);
  });
});

if (fs.existsSync('./gen/tex_files')) {
  fs.readdirSync('./gen/tex_files').forEach((file) => {
    file = file.replace(/\.gz$/, '');
    if (files.includes(file) || excludesTexFiles.includes(file) || file.startsWith('texstudio_')) {
      return;
    }

    files.push(file);
  });
}

files.sort();
fs.writeFileSync('./gen/tex_files.json', JSON.stringify(files, null, 2));
