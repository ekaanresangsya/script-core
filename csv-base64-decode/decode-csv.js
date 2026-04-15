const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'SUBS-OVRXDGSVFEFG-50000.csv');  // change this to the actual input file name
const outputFile = path.join(__dirname, 'SUBS-OVRXDGSVFEFG-50000-decoded.csv'); // change this to the desired output file name

const lines = fs.readFileSync(inputFile, 'utf8').trim().split('\n');

const outputLines = ['"id","code","decoded_code"'];

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const commaIndex = line.indexOf(',');
    const id = line.substring(0, commaIndex);
    const code = line.substring(commaIndex + 1);

    const decoded = Buffer.from(code, 'base64').toString('utf8');

    outputLines.push(`${id},${code},${decoded}`);
}

fs.writeFileSync(outputFile, outputLines.join('\n'));
console.log(`Done. Output saved to ${outputFile}`);
