#!/usr/bin/env node

const fs = require('fs');
const zlib = require('zlib');
const tar = require('tar-fs');
const spawnSync = require('child_process').spawnSync;

const inputFile = './gen/tex_files.json';
fs.mkdirSync('./gen/tex_files', { recursive: true });
const processedFiles = [];
const files = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

for (const texFile of files) {
  if (!texFile || processedFiles.includes(texFile)) continue;
  console.log(`\tAttempting to locate ${texFile}.`);

  let sysFile = spawnSync('kpsewhich', [texFile]).stdout.toString().trim();
  if (sysFile == '') {
    console.log(`\t\x1b[31mUnable to locate ${texFile}.\x1b[0m`);
    continue;
  }

  processedFiles.push(texFile);

  console.log(`\tResolved ${texFile} to ${sysFile}`);
  fs.copyFileSync(sysFile, './gen/tex_files/' + texFile);
}
tar
  .pack('./gen/tex_files/')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('./tex/tex_files.tar.gz'));
